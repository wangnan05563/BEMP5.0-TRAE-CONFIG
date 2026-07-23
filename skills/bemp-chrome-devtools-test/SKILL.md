---
name: bemp-chrome-devtools-test
description: "基于 Chrome DevTools MCP 实现 BEMP 票据系统的浏览器端自动化功能验证。利用 Chrome DevTools 的导航、快照、截图、网络监听、控制台检测能力，在真实的浏览器环境中逐步骤验证 BEMP 业务功能，适用于二轮测试验证、缺陷复现确认、状态流转端到端验证。"
whenToUse: "二轮/回归 测试/验证时、需要控制和检查实时 Chrome 浏览器、需要深入的调试和性能分析时、前端debug时调用"
triggers:
  - "二轮/浏览器/chrome/CDP/端到端/状态流转/复现/回归/弹窗验证/测试"
  - "debug菜单渲染"
  - "检查页面加载"
  - "验证路由注册"
---

# BEMP Chrome DevTools 功能验证 Skill

## 按需加载指引

根据任务类型，选择性读取 references 文件（非全量加载）：

| 任务场景 | 必读 | 按需 |
|---------|------|------|
| 环境/登录问题 | [config](config/bemptest-config.json) + [tool-mapping](references/tool-mapping.md) §片段库 | [pitfalls](references/common-pitfalls.md) 陷阱1 |
| 页面导航异常 | [advanced-workflows](references/advanced-workflows.md) §1 | [pitfalls](references/common-pitfalls.md) 陷阱8 |
| HUI 组件操作 | [tool-mapping](references/tool-mapping.md) §片段库 | [advanced-workflows](references/advanced-workflows.md) §2 |
| 弹窗/菜单交互 | [pitfalls](references/common-pitfalls.md) 陷阱2 | [advanced-workflows](references/advanced-workflows.md) §5 |
| 状态流转验证 | [execution-checklist](references/execution-checklist.md) 阶段零+阶段六 | [advanced-workflows](references/advanced-workflows.md) §3 |
| 缺陷回归验证 | [execution-checklist](references/execution-checklist.md) 快速模式 + 阶段九 | [pitfalls](references/common-pitfalls.md) §自动检测 |
| API直接验证 | [advanced-workflows](references/advanced-workflows.md) §10 + [config](config/bemptest-config.json) api_validation | [pitfalls](references/common-pitfalls.md) 陷阱16 |
| 批量用例执行 | [advanced-workflows](references/advanced-workflows.md) §10.4 | [config](config/bemptest-config.json) response_codes |
| 全量回归 | [execution-checklist](references/execution-checklist.md) 全部 | 全部 references |
| 生成报告 | [output-standards](references/output-standards.md) + [report-template](assets/verification-report-template.md) | — |

## 核心职责

基于 Chrome DevTools MCP 在真实浏览器中逐步骤验证 BEMP 业务功能。与 `bemp-webapp-testing`(Playwright) 互补：Playwright 用于一轮测试/批量回归；本 Skill 用于二轮验证/缺陷确认/探索性测试。

### 接收 Playwright 工具切换用例（FP-08）

> **完整策略文档**：[_shared/tool-switching-strategy.md](../_shared/tool-switching-strategy.md)

当 Playwright MCP 因 HUI 组件能力限制导致用例 BLOCKED 时，本 Skill 接收移交用例并完成验证：

**接收场景**（与 Playwright 能力互补）：
- HUI隐藏组件操作（h-typefield/h-select 包裹的 input，需 evaluate_script + 原生setter + dispatchEvent）
- Vue响应式表单（fill 后未触发更新，需 evaluate_script + dispatchEvent('input')）
- 文件上传/下载（HUI 文件组件，需 evaluate_script 模拟）
- 复杂弹窗（h-dropdown 两步操作、window-layer 恢复最小化）
- DataGrid行选中（需同时设置 selects+selectIds+currentSelectList）

**移交信息接收流程**：
```
[1] 接收 bemp-auto-tester 生成的用例移交信息（JSON格式）
[2] 解析移交信息：用例ID/失败步骤/推荐模式/已完成步骤/目标URL
[3] 重建登录态（Playwright 会话不共享，需在 Chrome DevTools 中重新登录）
[4] 从失败步骤开始执行（跳过已完成步骤）
[5] 执行完成后回填结果到原用例（PASS/FAIL/BLOCKED）
[6] 记录使用的 evaluate_script 片段到 references/tool-mapping.md 片段库
```

**验证闭环要求**：切换后的结果必须回填到原用例（bemp-test-common/test-cases/），确保测试报告完整性。

## 目录结构

```
bemp-chrome-devtools-test/
├── SKILL.md                             本文件（执行框架 + 加载指引）
├── config/
│   ├── bemptest-config.json          环境/账号/超时/选择器/输出路径
│   └── defect-classification-rules.json  缺陷自动分类规则（8类+修复推荐）
├── references/
│   ├── execution-checklist.md           分阶段检查清单（含快速模式）
│   ├── common-pitfalls.md               已知陷阱 + 自动检测脚本
│   ├── tool-mapping.md                  CDP工具映射 + 片段库
│   ├── advanced-workflows.md            实战经验与关键发现
│   └── output-standards.md              报告格式/PASS-FAIL标准/产出管理
├── assets/
│   ├── verification-report-template.md  报告模板
│   └── test-step-template.md            单步骤模板
└── scripts/organize-screenshots.ps1     截图归档（旧版，保留兼容）

aotutests-devtools/                       项目根目录下的统一输出目录
├── index.json                            全局索引（元数据记录）
├── manage-index.ps1                      索引管理脚本
├── organize-screenshots.ps1              截图归档脚本（新版）
├── cleanup-old-tests.ps1                 过期内容清理脚本
├── reports/{日期}/                        验证报告
├── screenshots/
│   ├── _incoming/                        验证过程中临时截图
│   └── {日期}/{任务ID}/                  归档截图
├── console-logs/{日期}/                  控制台日志
└── archives/                             过期归档暂存（清理前缓冲）
```

---

## 执行步骤

### 第一步：环境预检

确认服务可达（配置见 [config](config/bemptest-config.json)）：

> **地址必须使用 127.0.0.1，禁止使用 localhost**：Windows 环境下 localhost 可能因 DNS 解析或 IPv6 优先导致连接超时

| 服务 | 端口 | 检查方式 |
|------|------|---------|
| 后端 | 8010 | `navigate_page` → `http://127.0.0.1:8010/bemp-served/` |
| 前端 | 8091 | `navigate_page` → `http://127.0.0.1:8091/` |
| Redis | 6379 | 端口监听 |
| ZK | 2181 | 端口监听 |

服务未启动 → 调用 `bemp-automation-startserver` Skill。

### 第二步：登录系统

> 详细流程见 [tool-mapping.md 模式4](references/tool-mapping.md#模式4登录--导航一体)。**关键**：禁止 `fill_form`，HUI 组件必须 `evaluate_script` + `dispatchEvent('input')`。

**登录多策略降级**（按优先级依次尝试）：

| 策略 | 方法 | 适用场景 | 失败时降级到 |
|------|------|---------|-------------|
| A（首选） | 原生 setter + dispatchEvent | 大多数场景 | 策略B |
| B（备选） | Vue 实例 handleLogin() | 策略A密码加密未触发时 | 策略C |
| C（最终） | fill + dispatchEvent + blur | 策略B组件树查找失败时 | BLOCKED |

**策略A 标准流程**：
```
evaluate_script(原生setter设置用户名) → dispatchEvent('input'+'change') → evaluate_script(原生setter设置密码) → dispatchEvent('input'+'change'+'blur') → click(登录按钮) → 处理强制登录弹窗 → take_snapshot确认
```

**强制登录弹窗处理**（必须检测）：
```
click(登录) → wait_for_timeout(1000ms) → take_snapshot → 若出现"强制登录确认"弹窗 → click("是") → wait_for(networkidle) → take_snapshot确认
```

**密码来源**（禁止硬编码）：优先环境变量 → bemptest-config.json accounts → env-config.json 默认值。详见 [pitfalls](references/common-pitfalls.md) 陷阱25。

### 第三步：导航到目标页面

**方式A — 直接URL**（已注册路由）：`navigate_page` → `wait_for(networkidle)` → 验证 `.h-form-search`/`.h-datagrid` 存在。

**方式B — 菜单点击**（Vue 懒加载路由必须）：见 [advanced-workflows.md §1](references/advanced-workflows.md#1-vue动态路由导航工作流)。核心：逐级点击菜单 → 每步 `wait_for(networkidle)` → 路由注册后可直接 `navigate_page`。

**菜单精确匹配**（避免歧义）：
```
1. 从 config selectors_by_bank.{bank_profile}.menu_tree 读取菜单层级
2. evaluate_script 遍历 DOM 精确文本匹配（非模糊搜索）
3. 每级菜单点击后 wait_for(networkidle)
4. 若菜单文本不匹配 → take_snapshot 获取实际菜单文本 → 更新配置
```

**关键注意**：
- 不同子菜单需分别点击注册；菜单文本因银行而异，先用 `take_snapshot` 确认
- 点击一级菜单可能展开错误的子菜单（如点击"场内交易"却展开了"票据池"），需精确匹配菜单文本
- 已注册路由在当前会话中有效，后续可直接 `navigate_page` 访问

### 第四步-A：UI 操作模式

操作模式速查（完整代码见 [tool-mapping.md §片段库](references/tool-mapping.md#evaluate_script-常用代码片段库)）：

| 操作 | 模式 | 详见 |
|------|------|------|
| 查询 | click(查询) → wait_for(networkidle) → take_screenshot | — |
| 下拉选择 | click(触发器) → wait_for(列表) → click(选项) | — |
| 弹窗CRUD | click(按钮) → wait_for(弹窗) → evaluate_script(填表) → click(确定) → wait_for(networkidle) | — |
| 状态变更 | 操作前截图 → click(操作)→click(确认) → wait_for(networkidle) → 操作后截图 → 提取状态文本对比 | — |
| 控制台检查 | list_console_messages → 过滤 TypeError/ReferenceError/ChunkLoadError | — |
| Dropdown操作 | evaluate_script(visible=true) → wait(300ms) → take_snapshot → click(下拉项) | [pitfalls](references/common-pitfalls.md) 陷阱20 / [tool-mapping](references/tool-mapping.md) 模式10 |
| Window-Layer弹窗 | take_snapshot(检测) → evaluate_script(恢复最小化) → wait(500ms) → take_screenshot(确认) | [pitfalls](references/common-pitfalls.md) 陷阱21 / [tool-mapping](references/tool-mapping.md) 模式11 |
| DataGrid行选中 | evaluate_script(同时设置selects+selectIds+currentSelectList) → $forceUpdate → wait(500ms) | [pitfalls](references/common-pitfalls.md) 陷阱23 / [tool-mapping](references/tool-mapping.md) 模式12 |
| v-if条件字段 | evaluate_script(检测可见性) → 设置触发条件 → wait(500ms) → 设置字段值 | [pitfalls](references/common-pitfalls.md) 陷阱24 / [tool-mapping](references/tool-mapping.md) 模式13 |
| 弹窗关闭后恢复 | click(关闭) → evaluate_script(检查URL) → 若跳转则navigate_page恢复 | [pitfalls](references/common-pitfalls.md) 陷阱22 / [tool-mapping](references/tool-mapping.md) 模式14 |

### 第四步-B：API 直接验证模式

> 详细工作流与代码模板见 [advanced-workflows.md §10](references/advanced-workflows.md#10-api直接验证工作流)。

**适用场景**（优先于 UI 验证）：
- 验证个性化 Controller/Service 的校验逻辑（如报备校验、参数校验）
- 批量执行 P0/P1 测试用例（API 级别效率远高于 UI 操作）
- UI 流程受阻但需确认后端逻辑是否正确
- 数据准备/修复后快速验证

**不适用场景**：
- 需验证前端 UI 渲染效果、CSS 样式、布局
- 需验证浏览器兼容性
- 需验证 Vue 组件属性覆盖是否生效（需 evaluate_script 而非 fetch）

**验证策略决策树**：

```
测试目标
├─ 核心校验逻辑验证 → 优先 API 直接验证（高效、稳定、不受 UI 干扰）
├─ UI 交互验证 → Chrome DevTools UI 操作（第四步-A）
├─ Vue 组件属性覆盖验证 → evaluate_script 读取组件实例
└─ 数据准备/修复 → Oracle MCP + 前端刷新
```

**标准流程**：

```
1. 确保已登录（有 Admin-Token cookie）
2. evaluate_script: 构造 URLSearchParams 请求体
3. evaluate_script: fetch(apiPath, {method:'POST', headers, body})
4. 解析 response.json()，比对 retCode 和 retMsg 与预期值
5. 记录结果：{pass, actual, expected}
```

**批量用例执行模板**：

| 用例ID | apiPath | params | expected_retCode | expected_retMsg_contains | 实际结果 |
|--------|---------|--------|------------------|-------------------------|---------|

> 响应码映射见 [config](config/bemptest-config.json) `response_codes`。API 路径与代理配置见 `api_validation` 和 `proxy_paths`。

### 异常处理决策树

当步骤 FAIL 或异常时，按以下决策树处理：

```
步骤异常
├─ 弹窗/遮罩残留 → 强制移除遮罩 → 重试；仍失败 → new_page 重新登录
├─ 登录态丢失 → new_page → 重新登录 → 回到失败步骤
├─ 网络超时 → 延长等待 → 重试(最多2次) → 仍失败标记 BLOCKED
├─ Vue路由未注册 → 改用菜单点击 → wait_for(networkidle) → 重试
├─ TypeError/ReferenceError → 截图留存 → 标记 FAIL → 评估是否影响后续
├─ 状态静默拒绝 → 标记 FAIL → 记录缺陷 → 跳过依赖步骤
├─ Dropdown按钮无反应 → 检测是否为h-dropdown组件 → evaluate_script设置visible=true → 重试
├─ 弹窗最小化(window-layer) → evaluate_script恢复minimized=false → 重试
├─ DataGrid选中无效 → evaluate_script同时设置selects+selectIds+currentSelectList → $forceUpdate → 重试
├─ 弹窗关闭后页面跳转 → evaluate_script检查URL → navigate_page恢复 → 重试
├─ 表单字段不存在(v-if) → 检查触发条件值 → 先设置条件使字段可见 → 重试
└─ 不可恢复(500/构建失败/DB异常) → 标记 BLOCKED → 跳过全部后续
```

**重试上限**：同一操作最多 2 次。连续 3 次失败 → BLOCKED。

### 第五步：生成验证报告与归档

详见 [output-standards.md](references/output-standards.md)。使用 [verification-report-template.md](assets/verification-report-template.md) 模板。

**强制流程**：

1. **生成报告**：按命名规范 `{模块}_{测试类型}_{日期}_v{序号}.md` 生成，保存到 `aotutests-devtools/reports/{日期}/`
2. **导出控制台日志**：将 `list_console_messages` 结果导出为 JSON，保存到 `aotutests-devtools/console-logs/{日期}/`
3. **归档截图**：运行 `.\aotutests-devtools\organize-screenshots.ps1 -TaskId "{任务ID}"`
4. **更新索引**：运行 `.\aotutests-devtools\manage-index.ps1 -Action add -TaskId "..." -Module "..." ...`

报告必须包含：步骤+状态(PASS/FAIL/BLOCKED) + 截图路径 + 控制台错误 + 缺陷汇总。

---

## 输出标准（摘要）

- **统一输出目录**：`aotutests-devtools/`（项目根目录）
- **截图命名**：`step{序号}_{操作}_{状态}.png`，临时存放 `screenshots/_incoming/`，归档至 `screenshots/{日期}/{任务ID}/`
- **报告命名**：`{模块}_{测试类型}_{日期}_v{序号}.md`，存放至 `reports/{日期}/`
- **判定标准**：PASS = 预期结果 + 无致命JS错误；FAIL = 不符预期 或 致命错误；BLOCKED = 前置不满足
- **缺陷编号**：`BUG-{序号}`，严重度 P0(阻塞全部)/P1(阻塞模块)/P2(不影响主流程)
- **索引管理**：每次验证后更新 `index.json`，记录任务元数据
- **定期清理**：每月执行 `cleanup-old-tests.ps1`，默认保留 30 天，支持归档模式

完整标准见 [output-standards.md](references/output-standards.md)。

---

## 智能体操作指南：缺陷自动分类

二轮调试时，根据失败现象自动分类缺陷并推荐修复智能体，提升缺陷分派效率：

### 执行步骤

1. **读取配置**：加载 `config/defect-classification-rules.json`
2. **匹配规则**：对每个失败用例的错误信息，与 `classification_rules[].pattern` 做正则匹配
3. **执行检查**：对匹配到的规则，按 `checks` 列表逐项验证，确认分类
4. **检查备选分类**：若 `alternative_classification.condition` 满足，切换到备选分类
5. **生成分类结果**：
   - 缺陷编号：BUG-{序号}
   - 严重度：按 `output_format.severity_rules` 判定
   - 分类：code_defect / test_defect / data_defect / env_defect / config_defect
   - 推荐修复智能体：`classification_summary` 中对应的 `fix_agent`
   - 推荐修复技能：`classification_summary` 中对应的 `fix_skill`
6. **输出缺陷报告**：按 `output_format.defect_report_entry` 格式输出

### 分类决策流程

```
失败现象
├─ 匹配RULE-01(弹窗未出现) → test_defect → 检查前置步骤 → 满足备选条件则code_defect
├─ 匹配RULE-02(按钮名称不匹配) → data_defect → 检查实现是否缺失 → 满足备选条件则code_defect
├─ 匹配RULE-03(strict violation) → test_defect → 修复选择器
├─ 匹配RULE-04(遮罩层残留) → code_defect → 修复前端关闭事件
├─ 匹配RULE-05(超时/端口不可达) → env_defect → 启动服务
├─ 匹配RULE-06(JS运行时错误) → code_defect → 修复代码
├─ 匹配RULE-07(数据不存在) → data_defect → 准备数据
├─ 匹配RULE-08(接口返回异常) → code_defect → 检查参数则config_defect
└─ 无匹配 → code_defect(默认归因，需人工复核)
```

### 新增配置文件

| 文件 | 说明 |
|------|------|
| `config/defect-classification-rules.json` | 分类规则 + 检查清单 + 严重度判定 + 修复推荐 |

> 新增分类规则时，只需在 `classification_rules` 数组中追加条目，无需修改技能逻辑。

## 关键设计原则

| # | 原则 | 含义 |
|---|------|------|
| 1 | 先截图后断言 | 操作后先 take_screenshot 留存证据 |
| 2 | fill_form 不可信 | HUI 组件统一 evaluate_script + dispatchEvent |
| 3 | 弹窗 = 阻塞 | 关弹窗前不导航；残留则 new_page |
| 4 | 双向验证 | 状态正逆向都要验证 |
| 5 | 快照优于选择器 | take_snapshot UID 比 CSS 选择器稳定 |
| 6 | networkidle = 完成 | 每次操作后等待异步完毕 |
| 7 | 菜单点击优先URL | Vue 懒加载路由需菜单触发注册 |
| 8 | 选择后等500ms | DataGrid checkbox → currentSelectList 同步延迟 |
| 9 | API验证优先校验逻辑 | 核心校验逻辑验证用 API 直接验证，UI 验证留给交互场景 |
| 10 | 配置驱动无硬编码 | API路径/响应码/代理路径/修复SQL均从 config 读取 |
| 11 | Dropdown需两步 | h-dropdown组件先设visible=true再点击下拉项 |
| 12 | Window-Layer需恢复 | 检测最小化状态并恢复，不能假设弹窗自动可见 |
| 13 | 选中需全属性 | DataGrid行选中需同时设置selects+selectIds+currentSelectList |
| 14 | v-if字段先条件 | 条件渲染字段需先满足v-if条件再验证 |
| 15 | 关弹窗后验URL | 弹窗关闭可能触发路由跳转，需验证并恢复 |
| 16 | 密码禁止硬编码 | 从config/env-config读取，优先环境变量 |

---

## 测试结束清理规范

**【强制】** 测试验证全部完成后，必须执行以下清理操作：

1. **关闭浏览器页面**：调用 `close_page` 关闭当前测试页面，释放 Chrome DevTools 连接
2. **确认清理完成**：通过 `list_pages` 确认无残留页面

> 不关闭页面会导致：Chrome 进程持续占用内存、DevTools 连接未释放、后续测试可能因端口冲突失败

---

## 参考文件索引

| 文件 | 用途 |
|------|------|
| [config/bemptest-config.json](config/bemptest-config.json) | 环境/账号/超时/选择器 |
| [references/execution-checklist.md](references/execution-checklist.md) | 执行检查清单（含快速模式+数据准备） |
| [references/common-pitfalls.md](references/common-pitfalls.md) | 已知陷阱 + 自动检测脚本 |
| [references/tool-mapping.md](references/tool-mapping.md) | CDP工具映射 + evaluate_script 片段库 |
| [references/advanced-workflows.md](references/advanced-workflows.md) | 实战经验与关键发现 |
| [references/output-standards.md](references/output-standards.md) | 报告格式/PASS-FAIL标准/截图规范 |
| [assets/verification-report-template.md](assets/verification-report-template.md) | 报告模板 |
| [assets/test-step-template.md](assets/test-step-template.md) | 单步骤模板 |
| [scripts/organize-screenshots.ps1](scripts/organize-screenshots.ps1) | 截图归档 |