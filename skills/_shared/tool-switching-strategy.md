# BEMP 测试工具切换策略（FP-08）

> **版本**: v1.0.0 | **创建日期**: 2026-07-22
> **目的**: 标准化测试工具切换决策流程，避免因工具选择不当导致的用例 BLOCKED
> **适用技能**: bemp-webapp-testing（Playwright MCP）、bemp-chrome-devtools-test（Chrome DevTools MCP）、bemp-auto-tester（编排智能体）

## 设计动机

本次"机构管理优化"测试中，30条用例因 Playwright MCP 无法操作 HUI 隐藏组件而 BLOCKED（文件上传16条+文件下载5条+表单填写4条等），最后通过 Chrome DevTools MCP 的 `evaluate_script` 解决。根因是缺乏标准化的工具切换策略，导致：
1. 智能体在 Playwright 失败后不知道何时该切换工具
2. 切换后缺乏统一的用例移交流程
3. 切换决策依赖经验而非规则

## 工具能力矩阵

| 工具 | 擅长场景 | 不擅长场景 | 输出产物 |
|------|---------|-----------|---------|
| **Playwright MCP** | 标准HTML组件（button/input/select）、页面导航、批量回归、会话复用 | HUI隐藏input、Vue响应式表单、文件上传/下载、复杂弹窗（h-dropdown/window-layer） | aotutests-playwright/ |
| **Chrome DevTools MCP** | HUI组件evaluate_script、Vue实例操作、复杂弹窗、文件操作、API直接验证、控制台检测 | 批量回归（效率低）、会话复用（需重新登录） | aotutests-devtools/ |
| **Oracle MCP** | 数据库只读查询、数据一致性校验、测试数据准备 | DML操作（只读限制）、性能测试 | SQL查询结果 |
| **MySQL MCP** | 数据库读写、安全执行模式（事务包裹） | 复杂分析查询 | SQL查询结果 |

## 切换触发条件（Playwright → Chrome DevTools）

当 Playwright MCP 执行用例时出现以下情况，应切换到 Chrome DevTools MCP：

| 触发条件 | 具体表现 | 切换动作 |
|---------|---------|---------|
| **元素不可见** | `fill`/`click` 报"element not visible"或"element not interactable" | 切换到 Chrome DevTools 的 `evaluate_script` 直接操作DOM |
| **HUI隐藏组件** | input 被 HUI 组件包裹（如 h-typefield/h-select），Playwright 无法直接 fill | 切换到 Chrome DevTools 的 `evaluate_script` + 原生setter + dispatchEvent |
| **Vue响应式未触发** | fill 后 Vue 组件未更新（如 datagrid 未刷新、表单未提交） | 切换到 Chrome DevTools 的 `evaluate_script` + `dispatchEvent('input')` |
| **文件上传/下载** | Playwright 的 `set_input_files`/下载管理对 HUI 组件无效 | 切换到 Chrome DevTools 的 `evaluate_script` 模拟文件操作 |
| **复杂弹窗** | h-dropdown（需两步操作）、window-layer（可能最小化）、h-modal（隐藏input） | 切换到 Chrome DevTools 的 `evaluate_script` 设置 visible/恢复最小化 |
| **DataGrid行选中** | Playwright click checkbox 后 `currentSelectList` 未更新 | 切换到 Chrome DevTools 的 `evaluate_script` 同时设置 selects+selectIds+currentSelectList |

**不触发切换的场景**（Playwright 可处理）：
- 标准button点击（查询/新增/修改/删除按钮）
- 标准input填写（非HUI组件包裹的可见input）
- 页面导航与URL验证
- 会话复用与批量回归
- 控制台错误检测

## 切换决策流程

```
Playwright MCP 执行用例
  ├─ 用例PASS → 继续下一用例（无需切换）
  ├─ 用例FAIL（断言失败） → 测试失败自动诊断（不切换工具）
  ├─ 用例BLOCKED（服务/数据问题） → 修复环境/数据后重试（不切换工具）
  └─ 用例BLOCKED（工具能力限制） → 触发切换 ↓

工具切换流程：
[1] 标记用例状态为"TOOL_SWITCH_REQUIRED"，记录失败表现
[2] 判断是否匹配"切换触发条件"表中任一条件
    ├─ 不匹配 → 尝试Playwright降级策略（如更换选择器/增加等待）
    └─ 匹配 → 执行切换 ↓
[3] 生成用例移交信息：
    - 用例ID、失败步骤、失败表现
    - 推荐的Chrome DevTools操作模式（evaluate_script/click/screenshot）
    - 已完成的步骤（避免重复执行）
    - 已建立的登录态（需在Chrome DevTools中重建）
[4] 移交到 bemp-chrome-devtools-test 技能执行
[5] Chrome DevTools 完成后回填结果到原用例
```

## 用例移交信息格式

切换工具时，bemp-auto-tester 智能体应生成以下移交信息：

```json
{
  "testCaseId": "TC-F04-P1-002",
  "switchReason": "HUI隐藏组件，Playwright无法fill",
  "failedStep": "步骤3：填写机构名称",
  "failedExpression": "playwright_fill(selector='input[name=orgName]') → element not interactable",
  "recommendedMode": "evaluate_script + 原生setter + dispatchEvent('input')",
  "completedSteps": ["步骤1：登录", "步骤2：导航到机构管理"],
  "loginRequired": true,
  "targetUrl": "http://127.0.0.1:8091/#/sm/auth/branch/branch",
  "notes": "机构名称字段被h-typefield包裹，需通过evaluate_script设置value并触发input事件"
}
```

## 切换后的验证闭环

```
Chrome DevTools 执行移交用例
  ├─ PASS → 回填原用例状态为PASS，记录使用的evaluate_script片段
  ├─ FAIL → 回填原用例状态为FAIL，进入缺陷诊断流程
  └─ BLOCKED → 回填原用例状态为BLOCKED，记录阻塞原因
```

**验证闭环要求**：
1. 切换后的结果必须回填到原用例（bemp-test-common/test-cases/）
2. 切换过程中使用的 evaluate_script 片段应记录到 bemp-chrome-devtools-test/references/tool-mapping.md 的片段库
3. 切换统计（切换用例数/成功率）应纳入测试报告

## 智能体编排职责

| 智能体 | 职责 |
|--------|------|
| **bemp-auto-tester** | 识别切换触发条件、生成移交信息、调度工具切换、回填结果 |
| **bemp-webapp-testing** | 执行Playwright测试、失败时输出工具能力限制标记（非断言失败） |
| **bemp-chrome-devtools-test** | 接收移交用例、执行Chrome DevTools验证、输出结果与evaluate_script片段 |

## 配置化设计

切换触发条件规则集中管理在 `bemp-webapp-testing/config/tool-switch-rules.json`（新建），支持：

| 配置节 | 字段 | 说明 |
|--------|------|------|
| `switchTriggers[].condition` | `element_not_visible`/`hui_hidden_component`/`vue_reactive_not_triggered`等 | 触发条件类型 |
| `switchTriggers[].pattern` | 正则表达式 | 匹配失败错误信息 |
| `switchTriggers[].recommendedMode` | `evaluate_script`/`click`/`screenshot` | 推荐的Chrome DevTools操作模式 |
| `noSwitchScenarios[]` | 场景列表 | 不触发切换的场景（如断言失败） |

**零硬编码原则**：所有触发条件、推荐模式均从配置读取，不在智能体提示词中硬编码。

## 与现有流程的集成

| 测试阶段 | 工具切换集成点 |
|---------|--------------|
| **功能测试**（bemp-auto-tester） | Playwright用例BLOCKED时，按切换策略移交Chrome DevTools |
| **二轮调试测试**（chrome-devtools-debugger） | 直接使用Chrome DevTools，接收一轮测试的移交用例 |
| **缺陷修复验证** | 根据缺陷类型选择工具：前端缺陷→Chrome DevTools，后端缺陷→API验证 |

## 复盘经验总结

本次"机构管理优化"测试的工具切换实践：

| 场景 | Playwright结果 | Chrome DevTools结果 | 经验 |
|------|---------------|-------------------|------|
| 文件上传（16条） | BLOCKED（set_input_files无效） | PASS（evaluate_script模拟） | HUI文件上传组件必须用evaluate_script |
| 文件下载（5条） | BLOCKED（下载管理对HUI无效） | PASS（evaluate_script触发） | HUI下载组件必须用evaluate_script |
| 表单填写（4条） | BLOCKED（fill不触发Vue更新） | PASS（原生setter+dispatchEvent） | HUI表单必须用evaluate_script |
| 弹窗操作（3条） | BLOCKED（h-dropdown两步操作） | PASS（visible=true+click） | 复杂弹窗必须用evaluate_script |
| DataGrid选中（2条） | BLOCKED（currentSelectList未更新） | PASS（同时设置三属性） | DataGrid必须用evaluate_script |

**核心经验**：HUI组件框架的隐藏input和Vue响应式更新机制与Playwright fill不兼容，这是系统性问题而非偶发问题。遇到HUI组件应直接切换Chrome DevTools，无需反复尝试Playwright。
