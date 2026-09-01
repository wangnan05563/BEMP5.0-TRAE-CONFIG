# SonarQube 四级降级与环境自愈链

> 来源：反洗钱四阶段校验需求 SonarQube 扫描实测复盘（2026-08）。所有端点/Token/项目 key/阈值均从 `config/scan_config.json` 的 `degradation` 段解析，本文命令示例中的 `{host}`、`{project_key}`、`{es_api_base}` 等均为占位符，禁止在执行时写死环境真实值。

## 降级链总览

**访问链（2026-09-01 修订）**：MCP 工具粒度优先 → CLI（sonar-scanner）→ ES 水位自愈 → 降级记录。访问 Sonar 服务器时第一优先级永远是 MCP 工具（run_mcp → mcp_sonarqube 服务）。

| 级别 | 触发条件 | 动作 | 失败后去向 |
|------|---------|------|-----------|
| L1 | 每次扫描前必执行 | 前置自检：服务连通 → Token 有效（解析链见 1.2）→ 项目 key 核实 | L1.5 |
| L1.5 | L1 通过后必执行 | MCP 工具粒度优先判定：鉴权验证通过即视为 MCP 可用，可用工具直接走 MCP（判定规则见 L1.5 节） | L2 |
| L2 | MCP 不可用 / 鉴权失败 / 所需工具全部受限 | sonar-scanner CLI 降级扫描 | L3 |
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

按 `degradation.token_resolution_order` 依次解析，取第一个非空值（与 `scripts/resolve-sonar-token.ps1` 的 `Resolve-SonarToken` 实现一致）：

1. 环境变量 `SONARQUBE_TOKEN`（首选）；`SONAR_TOKEN` 为兼容项
2. **MCP server 进程环境块中的 `SONARQUBE_TOKEN`**——shell 会话/配置文件引用的 Token 失效（401）时的实测优先来源：MCP server 启动时注入进程的有效 Token 认证 200 通过（W9-02 实战）。提取方式：经 MCP 自身通道读取进程环境（禁止要求用户手工粘贴 Token）；提取的 Token 仅入内存使用，禁止写回任何配置文件或临时明文文件落盘残留
3. `_shared/env-config.json#environmentDefaults.SONARQUBE_TOKEN` —— 全技能库唯一配置入口、会话无关的永久兜底：结构化 JSON 解析（`ConvertFrom-Json`，PS5.1 自带）优先取值，仅结构解析失败时才退化为按 `"SONARQUBE_TOKEN"` 键名文本搜索
4. 项目根 `sonar-project.properties` 中 `sonar.token` 历史值（该文件为扫描临时产物，含明文 Token 时扫描结束后应清理——`run-sonar-scanner.ps1` 已在 finally 中自动清理）
5. 配置文件引用（如 `scripts` 生成的 `last-generated-token.json`）——仅允许引用文件路径，禁止把 Token 明文写进 `scan_config.json`

> **实现约束（2026-09-01 机构管理增量扫描降级记录教训）**：`SONARQUBE_TOKEN` 仅初始终端会话环境变量可见，新会话取不到导致 validate 401，故解析链必须有会话无关的 `_shared` 兜底：
> - 动态环境变量名必须用 `[Environment]::GetEnvironmentVariable($name)`（`$env:$name` 语法无效）
> - 技能侧禁止硬编码 Token 真值，统一经 `${ENV:SONARQUBE_TOKEN}` 占位符引用或运行时从 `_shared` 读取
> - Token 更新入口：`_shared/env-config.json` 的 `environmentDefaults.SONARQUBE_TOKEN`（不得在本技能内改写该文件）

验证方式：`GET {host}/api/authentication/validate` 携带 `Authorization: Bearer {token}`，返回 `{"valid":true}` = Token 有效；返回 401/403 或 `valid:false` = Token 无效 → **继续按 resolution_order 取下一来源**（配置来源失效≠服务不可用，W9-02 中 sqa_ Token 401 但进程环境 Token 有效）；全部来源无效 → 输出修复建议并终止，禁止跳过鉴权硬扫。

### 1.3 项目 key 核实（实测而非假设）

1. `GET {host}/api/projects/search?q={keyword}` 实测服务端项目列表（Token 与 host 均来自 L1 已解析值）
2. 将实测 key 与 `scan_config.json` → `project.key` 及本次传入参数比对
3. 不一致 → 以实测为准更新本次扫描参数，禁止凭假设或上次会话记忆继续

> **实战教训（2026-08 反洗钱四阶段校验扫描）**：预期 key 为 `bemp-ext-hnnxbank`（既有配置默认值），服务端实际项目为 `bemp-ext-hnnxbank-antimoney`。假设式传参导致扫描结果与目标项目错位。教训：L1 必须实测核实 key，预期值与实际值不符时以 `api/projects/search` 实测结果为准。

---

## L1.5 MCP 工具粒度优先判定（访问链第一优先级）

**判定规则**（按工具粒度，不做全有/全无判定）：

1. **鉴权验证通过（validate 返回 `valid:true`）即视为 MCP 可用**——优先用 MCP 工具完成扫描、查询与分析，不再探测更多前置条件
2. **查询类 API 403 不代表 MCP 全链不可用**（2026-09-01 实测：当前 Token 为 admin 分析类 Token，`projects/search` 查询 403 但 `analyze_code_snippet` 等分析类工具正常）——按工具粒度降级：受限的查询类调用改走 HTTP API（携带 Token）或 CLI 查询，其余可用工具（分析类）继续走 MCP
3. 仅当 MCP 不可用 / 鉴权失败 / 本次所需工具全部受限时，才整链降级 CLI（进入 L2）

**工具粒度降级示例**：

| 场景 | 处置 |
|------|------|
| validate 401/403 | 按解析链换下一来源；全部无效 → 输出修复建议并终止 |
| `projects/search` 403，`analyze_code_snippet` 可用 | 问题检索走 HTTP API，片段分析继续走 MCP（不整链降级） |
| MCP 服务未注册 / run_mcp 通道异常 | 整链降级 L2 CLI 扫描 |
| 项目级数据需 sonar-scanner 上传（CLI 才能产生） | 直接走 L2，MCP 负责后续查询与分析（混合模式） |

---

## L2 MCP 不可用/所需工具全部受限 → sonar-scanner CLI

**进入前提**：L1 三项自检全部通过（服务 UP + Token 有效 + 项目 key 已实测核实），且 L1.5 判定 MCP 无可用工具（或 MCP 服务本身不可用）。Token 来源按 1.2 解析链取值，执行前先经 `/api/authentication/validate` 实测（`run-sonar-scanner.ps1` 已内置该前置实测，401 不得硬扫）。

**参数来源**（全部来自既有配置，不在命令行写死）：

| 参数 | 来源 |
|------|------|
| scanner 可执行文件 | `sonar_scanner.scanner_home`（`${ENV:SONAR_SCANNER_HOME}`）+ `sonar_scanner.scanner_bin` |
| 服务地址 | `sonarqube_server.host` |
| 项目 key | `-ProjectKey`（取 L1 实测值）；未传时回退 `sonar_scanner.default_project_key` |
| 源码范围 | `-Sources`（默认 `sonar_scanner.default_sources`） |
| 编译产物 | `degradation.cli_fallback.java_binaries`：`sonar.java.binaries={module}/target/classes`（**sonar-java 强制要求，缺省直接 EXECUTION FAILURE**）；含测试代码扫描时须同步 `sonar.java.test.binaries={module}/target/test-classes`。模块清单由本次变更文件路径推导，禁止硬编码 |
| 等待超时 | `sonar_scanner.wait_timeout_seconds`（CLI 开关与超时亦可查 `degradation.cli_fallback`） |

**调用方式**：

```powershell
cd scripts/
.\run-sonar-scanner.ps1 -ProjectKey "{project_key}" -Sources "{sources}"
```

**失败判定**：脚本退出码非 0，或服务端 CE（Compute Engine）任务长时间 PENDING / FAILED → 进入 L3。

**基线对比核销口径（W9-03）**：修复后回扫做问题对比核销时，必须声明本轮与基线的 binaries 口径是否一致——首次补齐 `sonar.java.test.binaries` 后，此前因类型解析不完整漏报的规则问题（如测试方法签名 `throws Exception` 的 S112）会在"新增"栏浮现，属口径差异暴露而非本轮引入；核销报告须单列"口径差异暴露"类目，禁止把口径差异计为新增缺陷，也不得把基线漏报当作"本轮已修复"。

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
