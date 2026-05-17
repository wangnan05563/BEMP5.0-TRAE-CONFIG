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
| 全量回归 | [execution-checklist](references/execution-checklist.md) 全部 | 全部 references |
| 生成报告 | [output-standards](references/output-standards.md) + [report-template](assets/verification-report-template.md) | — |

## 核心职责

基于 Chrome DevTools MCP 在真实浏览器中逐步骤验证 BEMP 业务功能。与 `bemp-webapp-testing`(Playwright) 互补：Playwright 用于一轮测试/批量回归；本 Skill 用于二轮验证/缺陷确认/探索性测试。

## 目录结构

```
bemp-chrome-devtools-test/
├── SKILL.md                             本文件（执行框架 + 加载指引）
├── config/bemptest-config.json          环境/账号/超时/选择器
├── references/
│   ├── execution-checklist.md           分阶段检查清单（含快速模式）
│   ├── common-pitfalls.md               已知陷阱 + 自动检测脚本
│   ├── tool-mapping.md                  CDP工具映射 + 片段库
│   ├── advanced-workflows.md            实战经验与关键发现
│   └── output-standards.md              报告格式/PASS-FAIL标准
├── assets/
│   ├── verification-report-template.md  报告模板
│   └── test-step-template.md            单步骤模板
└── scripts/organize-screenshots.ps1    截图归档
```

---

## 执行步骤

### 第一步：环境预检

确认服务可达（配置见 [config](config/bemptest-config.json)）：

| 服务 | 端口 | 检查方式 |
|------|------|---------|
| 后端 | 8010 | `navigate_page` → `http://127.0.0.1:8010/bemp-served/` |
| 前端 | 8091 | `navigate_page` → `http://127.0.0.1:8091/` |
| Redis | 6379 | 端口监听 |
| ZK | 2181 | 端口监听 |

服务未启动 → 调用 `bemp-automation-startserver` Skill。

### 第二步：登录系统

> 详细流程见 [tool-mapping.md 模式4](references/tool-mapping.md#模式4登录--导航一体)。**关键**：禁止 `fill_form`，HUI 组件必须 `evaluate_script` + `dispatchEvent('input')`。

流程：填用户名 → dispatchEvent → 填密码 → dispatchEvent → click(登录) → 处理强制登录弹窗 → take_snapshot 确认。

### 第三步：导航到目标页面

**方式A — 直接URL**（已注册路由）：`navigate_page` → `wait_for(networkidle)` → 验证 `.h-form-search`/`.h-datagrid` 存在。

**方式B — 菜单点击**（Vue 懒加载路由必须）：见 [advanced-workflows.md §1](references/advanced-workflows.md#1-vue动态路由导航工作流)。核心：逐级点击菜单 → 每步 `wait_for(networkidle)` → 路由注册后可直接 `navigate_page`。

**关键注意**：不同子菜单需分别点击注册；菜单文本因银行而异，先用 `take_snapshot` 确认。

### 第四步：执行功能操作

操作模式速查（完整代码见 [tool-mapping.md §片段库](references/tool-mapping.md#evaluate_script-常用代码片段库)）：

| 操作 | 模式 |
|------|------|
| 查询 | click(查询) → wait_for(networkidle) → take_screenshot |
| 下拉选择 | click(触发器) → wait_for(列表) → click(选项) |
| 弹窗CRUD | click(按钮) → wait_for(弹窗) → evaluate_script(填表) → click(确定) → wait_for(networkidle) |
| 状态变更 | 操作前截图 → click(操作)→click(确认) → wait_for(networkidle) → 操作后截图 → 提取状态文本对比 |
| 控制台检查 | list_console_messages → 过滤 TypeError/ReferenceError/ChunkLoadError |

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
└─ 不可恢复(500/构建失败/DB异常) → 标记 BLOCKED → 跳过全部后续
```

**重试上限**：同一操作最多 2 次。连续 3 次失败 → BLOCKED。

### 第五步：生成验证报告

详见 [output-standards.md](references/output-standards.md)。使用 [verification-report-template.md](assets/verification-report-template.md) 模板。

必须包含：步骤+状态(PASS/FAIL/BLOCKED) + 截图路径 + 控制台错误 + 缺陷汇总。

---

## 输出标准（摘要）

- **截图命名**：`step{序号}_{操作}_{状态}.png`，目录 `d:\code\QJ\BEMP5.0DEV\screenshots\`
- **判定标准**：PASS = 预期结果 + 无致命JS错误；FAIL = 不符预期 或 致命错误；BLOCKED = 前置不满足
- **缺陷编号**：`BUG-{序号}`，严重度 P0(阻塞全部)/P1(阻塞模块)/P2(不影响主流程)

完整标准见 [output-standards.md](references/output-standards.md)。

---

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