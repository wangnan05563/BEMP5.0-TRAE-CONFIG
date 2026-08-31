# SonarQube 四级降级与环境自愈链

> 来源：反洗钱四阶段校验需求 SonarQube 扫描实测复盘（2026-08）。所有端点/Token/项目 key/阈值均从 `config/scan_config.json` 的 `degradation` 段解析，本文命令示例中的 `{host}`、`{project_key}`、`{es_api_base}` 等均为占位符，禁止在执行时写死环境真实值。

## 降级链总览

| 级别 | 触发条件 | 动作 | 失败后去向 |
|------|---------|------|-----------|
| L1 | 每次扫描前必执行 | 前置自检：服务连通 → Token 有效 → 项目 key 核实 | L2 |
| L2 | MCP 不可用 | sonar-scanner CLI 降级扫描 | L3 |
| L3 | 服务 UP 但扫描失败 / CE 任务 FAILED | ES 磁盘洪水水位自愈 + 重扫 | L4 |
| L4 | 全部不可行 | 输出降级记录，流程终止（不虚构结果） | 终止 |

配置来源：`config/scan_config.json` → `degradation` 节点（阈值/端点/Token 解析顺序/CLI 开关均在此调整，改配置不改文档）。

---

## L1 前置自检

### 1.1 服务连通性探测

1. 读取 `scan_config.json` → `sonarqube_server.host`（占位符经 `_shared/load_config.py` 解析，勿在命令中写死 URL）
2. `GET {host}/api/system/status`，期望 `status == "UP"`
3. 探测失败 → 先走 `scripts/start-sonarqube.ps1` 启动流程（见 [scan-workflow.md](scan-workflow.md) 第 0 章），再回到本步

### 1.2 Token 有效性验证（按序解析，禁止明文写死）

按 `degradation.token_resolution_order` 依次解析，取第一个非空值：

1. 环境变量 `SONAR_TOKEN`（兼容既有脚本约定，回退 `SONARQUBE_TOKEN`）
2. 项目根 `sonar-project.properties` 中 `sonar.token` 历史值（该文件为扫描临时产物，含明文 Token 时扫描结束后应清理）
3. 配置文件引用（如 `scripts` 生成的 `last-generated-token.json`）——仅允许引用文件路径，禁止把 Token 明文写进 `scan_config.json`

验证方式：`GET {host}/api/system/status` 携带 `Authorization: Bearer {token}`，返回 401/403 = Token 无效 → 输出修复建议并终止，禁止跳过鉴权硬扫。

### 1.3 项目 key 核实（实测而非假设）

1. `GET {host}/api/projects/search?q={keyword}` 实测服务端项目列表（Token 与 host 均来自 L1 已解析值）
2. 将实测 key 与 `scan_config.json` → `project.key` 及本次传入参数比对
3. 不一致 → 以实测为准更新本次扫描参数，禁止凭假设或上次会话记忆继续

> **实战教训（2026-08 反洗钱四阶段校验扫描）**：预期 key 为 `bemp-ext-hnnxbank`（既有配置默认值），服务端实际项目为 `bemp-ext-hnnxbank-antimoney`。假设式传参导致扫描结果与目标项目错位。教训：L1 必须实测核实 key，预期值与实际值不符时以 `api/projects/search` 实测结果为准。

---

## L2 MCP 不可用 → sonar-scanner CLI

**进入前提**：L1 三项自检全部通过（服务 UP + Token 有效 + 项目 key 已实测核实）。

**参数来源**（全部来自既有配置，不在命令行写死）：

| 参数 | 来源 |
|------|------|
| scanner 可执行文件 | `sonar_scanner.scanner_home`（`${ENV:SONAR_SCANNER_HOME}`）+ `sonar_scanner.scanner_bin` |
| 服务地址 | `sonarqube_server.host` |
| 项目 key | `-ProjectKey`（取 L1 实测值）；未传时回退 `sonar_scanner.default_project_key` |
| 源码范围 | `-Sources`（默认 `sonar_scanner.default_sources`） |
| 等待超时 | `sonar_scanner.wait_timeout_seconds`（CLI 开关与超时亦可查 `degradation.cli_fallback`） |

**调用方式**：

```powershell
cd scripts/
.\run-sonar-scanner.ps1 -ProjectKey "{project_key}" -Sources "{sources}"
```

**失败判定**：脚本退出码非 0，或服务端 CE（Compute Engine）任务长时间 PENDING / FAILED → 进入 L3。

---

## L3 环境自愈：ES 磁盘洪水水位

**典型症状**：服务 `status == "UP"`，但扫描报错 / CE 任务 FAILED，日志出现 `disk usage exceeded flood-stage watermark`、`read_only_allow_delete`、`cluster block` 类信息；Web 界面写入被拒绝（索引强制只读）。

**根因**：ES 数据盘使用率 ≥ flood_stage 水位（默认 95%，可配置）→ 索引被加 `read_only_allow_delete` 块 → 写入拒绝 → CE 任务 FAILED。

**诊断顺序**：

1. 磁盘水位确认：查看 ES 数据盘使用率，对照 `degradation.es_self_heal.disk_watermark_pct` 各档阈值（≥ cleanup_alert 档时先人工清理磁盘再自愈）
2. 块确认：`GET {es_api_base}/_all/_settings?filter_path=*.settings.index.blocks.read_only_allow_delete`，确认只读块是否存在
3. 存在只读块 → 执行自愈三步；不存在 → 按 L4 处理并保留扫描日志证据

**自愈三步**（端点/方法/请求体模板均来自 `degradation.es_self_heal` 配置，`{watermark.*}` 占位符取同节阈值）：

Step 1 — transient 调高洪水水位（集群级临时设置，重启即失效，安全）：

```
PUT {es_api_base}/_cluster/settings
{
  "transient": {
    "cluster.routing.allocation.disk.watermark.flood_stage": "{watermark.flood_stage_heal_high}",
    "cluster.routing.allocation.disk.watermark.high": "{watermark.high}",
    "cluster.routing.allocation.disk.watermark.low": "{watermark.low}"
  }
}
```

Step 2 — 解除索引只读块：

```
PUT {es_api_base}/_all/_settings
{ "index.blocks.read_only_allow_delete": null }
```

Step 3 — 复核 + 重扫：

- `GET {es_api_base}/_cluster/health` 确认集群绿/黄且只读块已消失
- `degradation.es_self_heal.rescan_after_heal == true` → 回到 L2 重跑 CLI 扫描

**注意事项**：

- ES 认证信息经 `degradation.es_self_heal.es_auth` 占位符解析（`${ENV:...}`），禁止明文
- Step 1 为临时措施：磁盘释放（清理旧索引/扫描工作目录/日志）后，应将水位恢复标准档（`restore_watermark_after_cleanup == true` 提示）；长期方案是扩盘，而非永久调高水位
- ≥ cleanup_alert 档（99）时磁盘已接近满，自愈只能争取窗口，必须立即人工清理

---

## L4 降级记录（全部不可行）

L1–L3 全部失败时：

1. 按 `degradation.degradation_record.output_file` 输出降级记录文件
2. 必填字段（`degradation.degradation_record.required_fields`）：失败原因（L1/L2/L3 各步具体失败点）、影响范围（本次未完成的扫描项与门禁项）、回归计划（环境修复后的重扫安排）、时间戳
3. **铁律**：不得虚构扫描结果、不得声称门禁通过；工作流中标注"⚠ 降级"，按流程降级规则推进，交付文档"已知问题"章节明确列出

---

## 附加：blame 缺失时的存量/新增问题区分

**背景**：SonarQube 依赖 SCM blame 判定新代码；blame 缺失（scm 配置未启用、git 历史不全等）时，被修改过的文件会整文件计入"新代码"，导致存量问题被误报为新增问题，门禁指标虚高。

**git diff 交叉验证方法**：

1. 取 Sonar 报告的"新增问题"清单（issues 列表，含文件与行号）
2. 对每个问题文件，定位本次需求实际变更行区间：

```powershell
git diff {base_ref}...HEAD --unified=0 -- "{file_path}"
```

3. 判定：问题行号落在 diff 新增行区间内 → 真新增问题；落在未变更行 → 存量问题（blame 缺失导致的整文件误计）
4. 报告输出时分为"本次新增问题"与"存量问题（blame 误计）"两组，修复优先级与门禁差距按真新增问题计算
