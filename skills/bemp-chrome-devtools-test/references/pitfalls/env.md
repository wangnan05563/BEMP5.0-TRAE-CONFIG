# 陷阱分片：环境、数据与输出（env）

> 代码 SSoT 原则：结构化提取代码见 [tool-mapping.md §片段库-数据表操作](../tool-mapping.md#数据表操作)。

## 症状速查

| 症状 | 陷阱 |
|------|------|
| snapshot 输出不完整 | 陷阱6 |
| 操作成功但状态未变 | 陷阱7 |
| API调用返回404 | 陷阱16 |
| 测试结果不可靠 | 陷阱17 |
| Maven打包失败 | 陷阱18 |
| 时效类断言与预期相反 | 陷阱26（F10） |
| 索引脚本报错中断 | 陷阱27（F12） |

---

## 陷阱6：take_snapshot 输出过长导致信息丢失（D3 铁律来源）

**现象**：snapshot 完整输出过长，关键信息（表单字段/按钮文本）被截断。

**标准方案**：
- 提取关键信息用 evaluate_script 返回 `JSON.stringify`（行数/状态/按钮列表/弹窗标题），代码见 [片段库-数据表操作](../tool-mapping.md#数据表操作) 与 [片段库-页面状态检测](../tool-mapping.md#页面状态检测)
- 可见文本用 `playwright_get_visible_text`（仅当前视口）

**铁律**（详见 SKILL.md）：take_snapshot **仅用于 UID 定位**；断言类一律 evaluate_script 返回精简 JSON。

---

## 陷阱7：已复核状态操作被静默拒绝（P1）

**现象**：已复核记录尝试修改/删除/提交复核，操作"好像成功"但状态未变。

**根因**：Service 层状态守卫（如 `if (!CREDIT_STATUS_DRAFT.equals(existing.getCreditStatus()))`）静默跳过，不抛异常不修改数据。

**标准方案**：每个状态变更操作后必须验证——操作后截图状态列 → evaluate_script 提取状态文本 → 断言 === 预期状态。

---

## 陷阱16：前端代理缺少个性化路径导致 API 404（P0）

**现象**：evaluate_script 调 fetch 访问个性化 Controller 返回 404。

**根因**：webpack-dev-server 的 `proxyTable`（`deploy/bemp-front/config/index.js` dev.proxyTable）未包含银行个性化路径（如 `/hnnxbank`），未配置路径由前端自行处理。

**标准方案**：
1. 检查 proxyTable 是否含个性化路径
2. 补充代理（路径从 [config](../../config/bemptest-config.json) `proxy_paths` 读取，禁止硬编码）：
```javascript
'/hnnxbank': {
    target: 'http://127.0.0.1:8010',
    changeOrigin: true,
    pathRewrite: { '^/hnnxbank': '/bemp-served/hnnxbank' }
}
```
3. 重启前端开发服务器

**验证代理生效**：evaluate_script fetch 简单请求返回 `{status, ok}`（代码见 [advanced-workflows §10.1](../advanced-workflows.md)）。

**预防**：每次切换银行环境检查 proxyTable。

---

## 陷阱17：数据库脏数据导致测试结果不可靠（P1）

**现象**：测试结果与预期不符但代码逻辑正确（字段为空/关联不匹配）。

**根因**：测试环境历史脏数据（手动操作或迁移遗留），正常业务流程不会出现。

**标准方案**：
1. Oracle MCP 修复脏数据（修复 SQL 模板见 [config](../../config/bemptest-config.json) `test_data_fix.sql_templates`）
2. 刷新页面验证修复
3. UI 数据受脏数据影响时，改用 API 直接验证核心逻辑

**预防**：测试前检查关键表数据完整性；脏数据敏感用例优先 API 验证。

---

## 陷阱18：Maven 编译内存不足导致打包失败（P2）

**现象**：`mvn install/package` 报 OutOfMemoryError 或进程被杀。

**根因**：Redis/ZK/后端/前端同跑时内存紧张，Maven 默认堆不足。

**标准方案**（按序）：
- 方案A：`$env:MAVEN_OPTS = "-Xms256m -Xmx512m"` 后重试
- 方案B：直接复制已编译 jar 到部署目录（跳过重新打包）
- 方案C：临时关前端服务释放内存，编译完再启

**预防**：编译前查可用内存（<2GB 先关非必要服务）；优先增量编译；保留一次成功编译产物。

---

## 陷阱26（F10）：业务日期基准未校准导致时效断言失真（P1）

**现象**：时效类测试数据（生效期内/已过期/未生效）按自然日期落库后，校验结果与用例预期相反或不一致。

**根因**：系统按**业务日期**做时效校验，业务日期与自然日期有偏差（跨日时点/初始化差异）。

**标准方案**：
1. 写 SQL 前先查系统业务日期（获取 SQL 由模块配置提供，表/字段占位符化，禁止硬编码）
2. 时效字段以业务日期为基准偏移生成（业务日期-1天=已过期，+1天=未生效）
3. 断言前重新读取业务日期校准预期（防跨日基准漂移）

**配置依赖**：`bemp-webapp-testing/config/data-readiness-check.json` → `biz-date-baseline-check`

**预防**：用例前置条件含时效语义时标注"以系统业务日期为基准"；数据准备文档写明业务日期获取方法（SQL 出处可追溯）。

---

## 陷阱27（F12）：manage-index 类脚本自身解析错误（P2）

**现象**：索引管理脚本在自身解析层报错中断（分隔符/编码/字段数与输入不符），索引未产出。

**根因**：脚本对输入格式刚性假设，实际输入不符时解析层崩溃。脚本自身问题，非被测系统问题。

**标准方案**：
- 方案A（推荐）——降级直编：直编维护索引内容保证交付不中断；报告记录"脚本异常 → 已降级直编"附错误消息与输入特征；禁止静默跳过索引维护
- 方案B——修复后重跑（仅错误原因明确且修复成本低）：定位解析假设 → 修正后重跑；仍失败立即转方案A，不现场反复调试

**预防**：索引脚本必须输出可解释错误（指出失败行与字段），禁止裸堆栈；报告模板预留"降级记录"栏位。
