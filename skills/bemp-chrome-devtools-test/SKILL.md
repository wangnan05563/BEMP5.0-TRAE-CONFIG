---
name: bemp-chrome-devtools-test
description: "基于 Chrome DevTools MCP 实现 BEMP 票据系统的浏览器端自动化功能验证。利用 Chrome DevTools 的导航、快照、截图、网络监听、控制台检测能力，在真实的浏览器环境中逐步骤验证 BEMP 业务功能，适用于二轮测试验证、缺陷复现确认、状态流转端到端验证。"
triggers:
  - "二轮验证"
  - "二轮测试"
  - "chrome验证"
  - "浏览器验证"
  - "CDP验证"
  - "端到端验证"
  - "功能验证（浏览器）"
  - "状态流转验证"
  - "复现验证"
  - "回归验证"
---

# BEMP Chrome DevTools 功能验证 Skill

## Skill 职责

基于 Chrome DevTools MCP（chrome-devtools-mcp）实现 BEMP 票据系统的浏览器端自动化功能验证。与基于 Playwright 的 bemp-webapp-testing 互补，本 Skill 侧重使用 Chrome DevTools 原生工具（navigate_page、take_snapshot、take_screenshot、click、fill、evaluate_script、list_console_messages 等）在真实浏览器中执行逐步骤交互验证。

**核心职责**：
- 浏览器端逐步骤功能验证（替代手动点击测试）
- 状态流转端到端确认（如 未提交→待复核→已复核→撤销→回退）
- 缺陷修复后的二轮回归验证
- 弹窗/模态框/菜单导航交互验证
- 控制台错误检测与分类
- 接口请求路径个性化验证

## 与 bemp-webapp-testing 的关系

| 维度 | bemp-webapp-testing (Playwright) | bemp-chrome-devtools-test (CDP) |
|------|----------------------------------|--------------------------------|
| 执行方式 | Python脚本，自动化执行 | Agent驱动的逐步骤交互 |
| 适用阶段 | 一轮测试、批量回归 | 二轮验证、缺陷确认、探索性测试 |
| 截图能力 | 失败时截图 | 每步骤按需截图 |
| 登录态 | LoginManager 会话复用 | evaluate_script 绕过 fill_form 截断 |
| 选择器 | CSS选择器/文本选择器 | take_snapshot 后的UID定位 |

## 目录结构

```
bemp-chrome-devtools-test/
├── SKILL.md                             本文件
├── config/
│   └── bemptest-config.json             系统URL、测试账号、超时配置、截图目录
├── references/
│   ├── execution-checklist.md           分阶段执行检查清单
│   ├── output-standards.md              验证报告输出格式标准
│   ├── common-pitfalls.md               已知陷阱与解决方案
│   ├── tool-mapping.md                  CDP工具→BEMP操作映射表
│   └── advanced-workflows.md            高级工作流（Vue路由/HUI组件/状态流转/弹窗嵌套）
├── scripts/
│   └── organize-screenshots.ps1         按时间戳归档截图脚本
└── assets/
    ├── verification-report-template.md  验证报告模板
    └── test-step-template.md            单步骤验证模板
```

---

## 触发场景

| 场景 | 描述 | 示例 |
|------|------|------|
| **二轮验证** | 缺陷修复后，在真实浏览器中逐步骤确认修复效果 | "帮我二轮验证提交复核BUG修复" |
| **状态流转验证** | 端到端验证完整的状态机流转 | "验证额度从0到1到5再回退到0的完整流程" |
| **缺陷复现确认** | 用浏览器实际操作复现缺陷，截图保存证据 | "帮我在浏览器中复现删除报错的问题" |
| **浏览器行为调试** | 检查控制台错误、网络请求、页面渲染状态 | "检查复核页面的控制台是否有JS报错" |
| **回归验证** | P0修复后，对受影响模块做完整回归 | "BUG-001修复后，帮我回归验证整个额度管理" |
| **弹窗交互测试** | 验证模态框打开/关闭/提交/重置全流程 | "验证新增批次弹窗的X关闭和取消关闭" |
| **Vue路由验证** | 验证懒加载路由是否正确注册 | "验证承兑行额度管理路由是否可访问" |
| **嵌套弹窗验证** | 验证多层弹窗打开/关闭/数据传递 | "验证批复明细弹窗内新增明细弹窗的完整流程" |

---

## 执行步骤

### 第一步：环境预检

确认以下服务已启动且可访问：

| 服务 | 端口 | 健康检查 |
|------|------|---------|
| SpringBoot 后端 | 8010 | HTTP GET `http://127.0.0.1:8010/bemp-served/` |
| 前端 DevServer | 8091 | HTTP GET `http://127.0.0.1:8091/` |
| Redis | 6379 | 端口监听检测 |
| ZooKeeper | 2181 | 端口监听检测 |

如果服务未启动，通过 `bemp-automation-startserver` Skill 启动。

**验证命令**（通过 Agent 执行）：
```
使用 navigate_page 访问 http://127.0.0.1:8091，确认加载正常
```

### 第二步：登录系统

BEMP 使用 HUI 组件库的登录表单。**关键陷阱**：`fill_form` 会截断用户名/密码输入，必须使用 `evaluate_script`。

```javascript
// 标准登录流程（通过 evaluate_script）
// 步骤1：填写用户名
evaluate_script: document.querySelector('input[placeholder*="用户名"]').value = 'USERNAME';
// 步骤2：填写密码
evaluate_script: document.querySelector('input[placeholder*="密码"]').value = 'PASSWORD';
// 步骤3：触发input事件（框架需要监听此事件）
evaluate_script: document.querySelector('input[placeholder*="用户名"]').dispatchEvent(new Event('input', {bubbles:true}));
evaluate_script: document.querySelector('input[placeholder*="密码"]').dispatchEvent(new Event('input', {bubbles:true}));
// 步骤4：点击登录
click: button "登录"
// 步骤5：处理强制登录弹窗
click: button "是"（如弹出"
// 步骤6：确认登录成功
take_snapshot → 确认不再有登录表单
```

### 第三步：导航到目标页面

#### 方式A：直接URL导航（仅适用于已注册路由）

```yaml
操作:
  - navigate_page: http://127.0.0.1:8091/#/{target_path}
  - wait_for: networkidle
  - take_snapshot: 确认页面渲染完成

验证点:
  - 查询表单是否存在（locator: .h-form-search）
  - 工具栏按钮是否存在（查询、重置、新增等）
  - DataGrid 表格是否存在（locator: .h-datagrid）
  - 无白屏（take_screenshot 确认）
```

#### 方式B：Vue动态路由导航（银行个性化页面必须使用此方式）

BEMP使用Vue懒加载路由，银行个性化路由需要通过菜单点击触发`mergeMenus()`注册，直接URL导航会404。

```javascript
// 第一步：展开一级菜单
evaluate_script:
(() => {
  const menus = document.querySelectorAll('.h-sidebar-leftfixed .h-menu-submenu-title span');
  for (const menu of menus) {
    if (menu.textContent.trim() === '业务管理子系统') {
      menu.click();
      return '已点击业务管理子系统';
    }
  }
  return '未找到业务管理子系统菜单';
})()

// 第二步：展开二级菜单
evaluate_script:
(() => {
  const submenus = document.querySelectorAll('.h-sidebar-menu .h-menu-submenu-title span');
  for (const submenu of submenus) {
    if (submenu.textContent.trim() === '承兑行额度管理') {
      submenu.click();
      return '已点击承兑行额度管理';
    }
  }
  return '未找到承兑行额度管理子菜单';
})()

// 第三步：点击功能菜单项
evaluate_script:
(() => {
  const items = document.querySelectorAll('.h-menu-item span');
  for (const item of items) {
    if (item.textContent.trim() === '{目标菜单名称}') {
      item.click();
      return '已点击目标菜单';
    }
  }
  return '未找到目标菜单项';
})()

// 每步菜单点击后
wait_for → networkidle
take_snapshot → 确认页面渲染完成
```

**关键注意**：
- 不同子菜单需要分别点击注册路由，点击"额度申请"不会自动注册"额度复核"
- 已注册的路由在当前会话中保持有效，后续可直接`navigate_page`访问
- 菜单文本可能因银行个性化而不同，需先`take_snapshot`确认实际菜单名称

### 第四步：执行功能操作

**BEMP 常见操作模式**：

#### 4.1 条件查询
```
click → 查询按钮
wait_for → networkidle
take_snapshot → 确认 DataGrid 加载完成
```

#### 4.2 下拉选择（HUI-Select）
```
click → 下拉触发器（.h-select-selection）
wait_for → 下拉列表可见
click → 目标选项
```

#### 4.3 弹窗操作
```
打开: click(新增按钮) → wait_for(弹窗标题可见) → take_screenshot
表单: select/fill 各字段 → 触发 input/change 事件
提交: click(确定按钮) → wait_for(弹窗关闭) → wait_for(networkidle)
关闭: click(X按钮) 或 click(关闭按钮) → wait_for(弹窗不可见)
```

#### 4.4 状态变更确认
```
操作前: take_screenshot → 记录当前状态文本
操作: click(提交复核) → wait_for(确认弹窗) → click(确定)
操作后: take_screenshot → 提取状态文本 → 对比 → take_screenshot(结果)
```

#### 4.5 控制台错误检查
```
list_console_messages → 过滤 TypeError / ReferenceError / ChunkLoadError
```

### 第五步：生成验证报告

详见 [output-standards.md](references/output-standards.md)。

报告必须包含：
1. 步骤编号 + 操作描述 + 结果状态（PASS/FAIL/BLOCKED）
2. 关键步骤截图路径
3. 控制台错误列表
4. 缺陷汇总（如有）

---

## 输出标准

### 验证报告格式

```markdown
# {模块名称} - Chrome DevTools 功能验证报告

## 测试环境
- 前端: http://127.0.0.1:8091
- 后端: http://127.0.0.1:8010
- 测试账号: {username}
- 测试时间: {timestamp}

## 验证步骤

| 步骤 | 操作 | 预期结果 | 实际结果 | 状态 | 截图 |
|------|------|---------|---------|------|------|
| 1 | 登录系统 | 登录成功，进入首页 | ... | PASS | step1.png |
| ... | ... | ... | ... | ... | ... |

## 测试结果汇总

| 统计项 | 数量 |
|--------|------|
| 总测试项 | N |
| 通过 | N |
| 失败 | N |
| 未验证 | N |

## 缺陷清单

| 编号 | 严重程度 | 模块 | 描述 |
|------|----------|------|------|
| BUG-XXX | P0/P1/P2 | ... | ... |

## 截图索引

| 文件名 | 步骤 | 说明 |
|--------|------|------|
| ... | ... | ... |
```

### 截图命名规范

```
step{序号}_{操作描述}_{状态}.png
例: step6_submit_confirm.png, step11_review_confirm.png
```

截图目录：`d:\code\QJ\BEMP5.0DEV\screenshots\`

### PASS/FAIL/BLOCKED 判定

| 状态 | 条件 |
|------|------|
| PASS | 操作按预期完成，无 TypeError/ReferenceError |
| FAIL | 操作结果不符预期，或出现 JS 致命错误 |
| BLOCKED | 前置条件不满足（服务不可达、登录失败、数据缺失） |

---

## 配置文件

位置：`config/bemptest-config.json`

| 配置节点 | 说明 |
|---------|------|
| `environment` | 服务端口和URL配置 |
| `accounts` | 测试账号（不包含真实密码） |
| `timeouts` | 各类操作的超时配置 |
| `screenshots` | 截图目录和命名规则 |
| `selectors` | BEMP/HUI 常用选择器映射 |

---

## 关键设计原则

1. **先截图后断言**：操作后先 `take_screenshot` 留存证据，再验证状态
2. **fill_form 不可信**：HUI 组件库的输入框对 Playwright fill 支持不完整，统一用 `evaluate_script` 的原生 value 赋值 + `dispatchEvent` 模式
3. **弹窗 = 阻塞**：BEMP 弹窗使用绝对定位遮罩层，关闭弹窗前不要导航到其他页面；若弹窗残留，用 `new_page` 重新登录
4. **状态流转 = 双向验证**：每个状态变更既要验证正向流转（0→1），也要验证逆向回退（1→0）
5. **快照优于选择器**：用 `take_snapshot` 获取可访问性树定位元素UID，比 CSS 选择器更稳定
6. **networkidle = 完成信号**：每次点击/提交后等待 `networkidle` 确认异步操作完成
7. **菜单点击优先于URL导航**：BEMP的Vue懒加载路由需要菜单点击触发注册，直接URL导航会失败
8. **选择后等待同步**：DataGrid行选择后需等待500ms让Vue数据同步

---

## 参考文件

| 文件 | 说明 |
|------|------|
| [references/execution-checklist.md](references/execution-checklist.md) | 分阶段执行检查清单（登录/导航/查询/CRUD/状态流转/验收） |
| [references/output-standards.md](references/output-standards.md) | 验证报告格式标准、截图规范、缺陷记录规范 |
| [references/common-pitfalls.md](references/common-pitfalls.md) | 已知陷阱（fill_form截断/弹窗阻塞/菜单歧义）与标准解决方案 |
| [references/tool-mapping.md](references/tool-mapping.md) | CDP工具→BEMP操作的精确映射表 |
| [references/advanced-workflows.md](references/advanced-workflows.md) | 高级工作流（Vue动态路由/HUI组件交互/状态流转/弹窗嵌套/控制台检测） |
| [scripts/organize-screenshots.ps1](scripts/organize-screenshots.ps1) | 按时间戳组织截图到子目录 |
| [assets/verification-report-template.md](assets/verification-report-template.md) | 可直接复用的验证报告模板 |
| [assets/test-step-template.md](assets/test-step-template.md) | 单步骤操作验证模板 |
| [config/bemptest-config.json](config/bemptest-config.json) | 可配置项（URL/超时/选择器/账号占位） |