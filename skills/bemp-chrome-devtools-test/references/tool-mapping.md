# CDP 工具 → BEMP 操作映射表

## 页面导航与生命周期

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 打开目标页面 | `navigate_page` | `type: "url"`, `url: "http://127.0.0.1:8091/#/{path}"` | hash 路由模式 |
| 等待页面加载完成 | `wait_for` | `text: "查询"` 或等待 networkidle | 等待查询按钮出现 = 页面渲染完成 |
| 查看所有页面 | `list_pages` | | 确认当前打开的页面列表 |
| 切换到指定页面 | `select_page` | `pageIdx: N` | 先 list_pages 确认索引 |
| 关闭页面 | `close_page` | `pageIdx: N` | 谨慎使用，弹窗残留时可能无效 |
| 新建页面 | `new_page` | `url: "http://127.0.0.1:8091/#/"` | 替代清理弹窗的最后手段 |

## 登录操作

> 标准登录流程详见 [SKILL.md](../SKILL.md#第二步登录系统)。以下仅列出 CDP 工具映射，不重复完整流程。

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 填写用户名 | `evaluate_script` | 设置 value + dispatchEvent('input') | **不要用 fill_form** |
| 填写密码 | `evaluate_script` | 同上 | **不要用 fill_form** |
| 点击登录按钮 | `click` | `uid: {登录按钮UID}` | 或 `text: "登录"` |
| 处理强制登录 | `click` | `text: "是"` | 在 .h-msg-box-confirm 内 |
| 确认登录成功 | `take_snapshot` | | 确认无登录表单 |

## 页面内容查看

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 全页面截图 | `take_screenshot` | `format: "png"` | 默认 fullPage |
| 获取可访问性树 | `take_snapshot` | | 用于定位元素UID |
| 提取表格数据 | `evaluate_script` | 提取 .h-datagrid 内容 | JSON.stringify 返回结构化数据 |
| 查看可见文本 | `playwright_get_visible_text` | | 仅当前视口文本 |
| 提取元素属性 | `evaluate_script` | `getAttribute('disabled')` | 验证只读/禁用状态 |

## 表单交互

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 填写 HUI-Input | `evaluate_script` | 设置 value + dispatchEvent | 对 HUI 组件 fill 不可靠 |
| 日期选择 | `evaluate_script` | 直接设置日期 input.value | HUI DatePicker 合并输入 |
| HUI-Select 下拉 | `click` + `click` | 先点触发器，再点选项 | 两步操作 |
| 金额字段 | `evaluate_script` | 设置 value 为纯数字 | HUI 自动格式化 |
| 表单重置 | `click` | `text: "重置"` | 弹窗内按钮 |

## 弹窗操作

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 等待弹窗打开 | `wait_for` | `text: "弹窗标题"` | 或 networkidle |
| 弹窗内操作 | `click` / `evaluate_script` | | 先确认弹窗可见 |
| 确认提交 | `click` | 弹窗内"确定"按钮 | 之后 wait_for networkidle |
| 关闭弹窗(X) | `click` | .h-msg-box-close 或 .h-modal-close | |
| 取消弹窗 | `click` | "取消"/"关闭"按钮 | |
| 确认弹窗关闭 | `take_screenshot` | | 截图确认无遮罩 |
| 处理确认对话框 | `click` | .h-msgbox-confirm 内按钮 | 确认/取消二次确认 |

## 状态流转

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 提交复核 | `click(提交复核)` + `click(确认)` | 两步 | wait_for networkidle 每个之后 |
| 复核确认 | `click(复核)` + `click(确认)` | | 在复核页面操作 |
| 撤销复核 | `click(撤销复核)` + `click(确认)` | | |
| 撤销提交 | `click(撤销提交)` + `click(确认)` | | 在明细页面操作 |
| 验证状态文本 | `evaluate_script` | 提取状态列 cell 文本 | 与预期状态字符串比较 |
| 状态截图 | `take_screenshot` | | 每步操作前后各一张 |

## 控制台与网络

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 查看所有控制台消息 | `list_console_messages` | | 页面级 |
| 查看特定网络请求 | `get_network_request` | `reqid: N` | 先 list_network_requests |
| 查看网络请求列表 | `list_network_requests` | | |
| 检查 JS 错误 | `list_console_messages` | 过滤 TypeError/ReferenceError | 验收必检项 |
| 验证 API 路径前缀 | `list_network_requests` | 过滤 /hnnxbank/ 前缀 | 个性化验证 |

## DataGrid 交互

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 选中行 | `click` | 行首 checkbox/radio | |
| 多选行 | `click` 多个 checkbox → `wait_for_timeout(500ms)` | 等待currentSelectList同步 | |
| 获取选中行ID | `evaluate_script` | 提取currentSelectList | `grid.__vue__.currentSelectList` |
| 计数行数 | `evaluate_script` | `document.querySelectorAll('.h-datagrid tbody tr').length` | |
| 获取单元格文本 | `evaluate_script` | 定位 tr:nth-child(X) td:nth-child(Y) | |
| 排序 | `click` | 列头 | |
| 分页 | `click` | 分页组件页码按钮 | |
| 强制选中行 | `evaluate_script` | 同时设置selects+selectIds+currentSelectList+$forceUpdate | click无效时使用，见模式12 |

## Dropdown 组件交互

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 展开下拉 | `evaluate_script` | `dropdown.__vue__.visible = true` | 必须通过Vue实例设置，直接click无效 |
| 等待展开 | `wait_for_timeout` | 300ms | 等待下拉动画完成 |
| 点击下拉项 | `click` | take_snapshot获取UID后点击 | |
| 检测Dropdown | `evaluate_script` | 查找`.h-dropdown`元素 | 确认按钮是否为Dropdown组件 |

## Window-Layer 弹窗交互

| BEMP 操作 | CDP 工具 | 参数/用法 | 说明 |
|-----------|---------|----------|------|
| 检测弹窗 | `take_snapshot` | 查找`.window-layer`元素 | 区分h-modal和window-layer |
| 恢复最小化 | `evaluate_script` | `layer.__vue__.minimized = false` + `$emit('on-restore')` | |
| 强制显示 | `evaluate_script` | CSS设置display/visibility/opacity | Vue实例方式无效时降级 |
| 确认可见 | `take_screenshot` | 截图确认弹窗内容可见 | |

## 关键工具组合模式

### 模式1：查询并验证数据刷新
```
click(查询按钮) → wait_for(networkidle) → take_screenshot → evaluate_script(提取行数) → 断言
```

### 模式2：弹窗 CRUD 操作
```
click(新增/修改) → wait_for(弹窗标题) → evaluate_script(填表单) → click(确定) → wait_for(networkidle) → take_screenshot
```

### 模式3：状态流转完整链
```
操作前截图 → click(操作按钮) → click(确认) → wait_for(networkidle) → 操作后截图 → evaluate_script(提取状态) → 断言状态变更
```

### 模式4：登录 + 导航一体
```
evaluate_script(填用户名) → dispatchEvent → evaluate_script(填密码) → dispatchEvent → click(登录) → click(是) → wait_for(networkidle) → navigate_page(目标) → wait_for(networkidle) → take_snapshot
```

### 模式5：Vue动态路由导航
```
evaluate_script(定位菜单项并点击) → wait_for(networkidle) → take_snapshot(确认页面渲染) → take_screenshot
```

适用场景：BEMP使用Vue懒加载路由，银行个性化路由需要通过菜单点击触发mergeMenus()注册，直接URL导航会404。每步菜单点击后必须wait_for(networkidle)等待路由注册完成。

### 模式6：嵌套弹窗操作
```
click(外层按钮) → wait_for(外层弹窗) → click(内层按钮) → wait_for(内层弹窗) → 操作 → click(内层关闭) → click(外层关闭) → take_screenshot
```

适用场景：BEMP常见弹窗嵌套（如批次页面→批复明细弹窗→新增/修改明细弹窗）。关闭顺序必须先内后外，使用`.h-msg-box:visible`定位当前可见弹窗。

### 模式7：跨页面状态验证
```
页面A操作 → take_screenshot → evaluate_script(提取状态) → 菜单导航到页面B → wait_for(networkidle) → 查询 → evaluate_script(验证状态) → take_screenshot
```

适用场景：额度申请页面提交复核后，需切换到额度复核页面验证状态。两个页面使用不同路由，需分别通过菜单点击注册。

### 模式8：双账号数据隔离验证
```
账号A登录 → navigate_page(目标) → evaluate_script(提取数据) → take_screenshot
→ new_page → 账号B登录 → navigate_page(目标) → evaluate_script(提取数据) → take_screenshot
→ 对比数据范围
```

适用场景：验证不同用户类型（法人管理员/分行柜员）的数据隔离是否生效。需两个独立浏览器上下文。

### 模式9：通过 Vue 实例调用后端 API
```
evaluate_script(获取Vue实例和$http) → evaluate_script(调用API并返回结果) → 解析retCode
```

适用场景：前端界面无对应菜单但需要执行后端操作（如解锁用户、查询特定数据）。需要已登录用户的会话。

### 模式10：Dropdown 组件操作
```
evaluate_script(设置dropdown.visible=true) → wait_for_timeout(300ms) → take_snapshot(获取下拉选项) → click(目标下拉项) → wait_for(networkidle)
```

适用场景：BEMP 操作按钮使用 `h-dropdown` 组件（如"新增"含多个子类型、"导出"含多种格式）。直接 click Dropdown 按钮不会展开下拉菜单，必须先通过 Vue 实例设置 `visible=true`。详见 [pitfalls/dialog.md 陷阱20](pitfalls/dialog.md#陷阱20dropdown-组件操作需两步触发p0)。

### 模式11：Window-Layer 弹窗恢复
```
click(操作按钮) → take_snapshot(检测window-layer) → evaluate_script(恢复最小化窗口) → wait_for_timeout(500ms) → take_screenshot(确认弹窗可见) → 弹窗内操作
```

适用场景：BEMP 部分弹窗使用 `window-layer` 组件而非标准 `h-modal`，可能默认最小化打开。需要检测并恢复窗口状态。详见 [pitfalls/dialog.md 陷阱21](pitfalls/dialog.md#陷阱21window-layer-弹窗被最小化p1)。

### 模式12：DataGrid 行选中（Vue 实例直设）
```
evaluate_script(定位目标行数据) → evaluate_script(同时设置currentSelectList+selects+selectIds+currentSelect) → $forceUpdate() → wait_for_timeout(500ms) → evaluate_script(验证选中状态) → click(操作按钮)
```

适用场景：click checkbox/radio 后 Vue 数据未同步，或仅设置 `currentSelectList` 后操作按钮仍无反应。需同时设置所有选中相关属性。详见 [pitfalls/datagrid.md 陷阱23](pitfalls/datagrid.md#陷阱23datagrid-行选中需同时设置-selects-和-selectidsp0)。

### 模式13：v-if 条件字段验证
```
evaluate_script(检测字段可见性) → 若不可见：evaluate_script(设置触发条件值) → wait_for_timeout(500ms) → evaluate_script(再次检测可见性) → evaluate_script(设置字段值)
```

适用场景：BEMP 表单使用 `v-if` 条件渲染，字段是否显示取决于其他表单值（如交易类型决定"回购总金额"是否显示）。测试时必须先满足 v-if 条件再验证字段。详见 [pitfalls/datagrid.md 陷阱24](pitfalls/datagrid.md#陷阱24v-if-条件字段验证需区分场景p1)。

### 模式14：弹窗关闭后路由恢复
```
click(弹窗关闭按钮) → wait_for_timeout(300ms) → evaluate_script(检查当前URL) → 若URL跳转：navigate_page(目标页面) → wait_for(networkidle) → take_snapshot(确认页面)
```

适用场景：关闭弹窗后页面 URL 意外跳转（如跳转到 mainIndex），需检测并恢复到目标页面。详见 [pitfalls/dialog.md 陷阱22](pitfalls/dialog.md#陷阱22弹窗关闭导致页面路由跳转p1)。

---

## evaluate_script 常用代码片段库

> 以下片段是最常用的 evaluate_script 操作，按场景分类。直接复制使用，替换 `{...}` 占位符。

### 数据表操作

```javascript
// 获取 DataGrid 行数
document.querySelectorAll('.h-datagrid tbody tr').length
```

```javascript
// 获取指定行列的文本
document.querySelector('.h-datagrid tbody tr:nth-child({rowIndex}) td:nth-child({colIndex})')?.textContent?.trim()
```

```javascript
// 提取所有行的状态列文本
(() => {
  const rows = document.querySelectorAll('.h-datagrid tbody tr');
  const results = [];
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    const statusCell = cells[cells.length - 2];
    if (statusCell) {
      results.push({ row: index + 1, status: statusCell.textContent.trim() });
    }
  });
  return JSON.stringify(results);
})()
```

### 选中行操作

```javascript
// 获取 DataGrid 的 Vue currentSelectList
(() => {
  const grid = document.querySelector('.h-datagrid');
  const vueInstance = grid?.__vue__;
  if (vueInstance && vueInstance.currentSelectList) {
    return JSON.stringify({ count: vueInstance.currentSelectList.length, ids: vueInstance.currentSelectList });
  }
  return '无法获取选中行数据';
})()
```

### 页面状态检测

```javascript
// 检测页面是否白屏（核心元素缺失）
(() => {
  const hasForm = !!document.querySelector('.h-form-search');
  const hasGrid = !!document.querySelector('.h-datagrid');
  const hasMenu = !!document.querySelector('.h-sidebar-leftfixed');
  return JSON.stringify({ hasForm, hasGrid, hasMenu, isBlank: !hasForm && !hasGrid && !hasMenu });
})()
```

```javascript
// 检测是否仍在登录页
(() => {
  const hasLoginForm = !!document.querySelector('input[placeholder*="用户名"]');
  return hasLoginForm ? '仍在登录页' : '已登录';
})()
```

### 弹窗操作

```javascript
// 获取当前所有可见弹窗信息
(() => {
  const visibleDialogs = document.querySelectorAll('.h-msg-box, .h-modal');
  const results = [];
  visibleDialogs.forEach((dialog, index) => {
    if (dialog.offsetParent !== null || getComputedStyle(dialog).display !== 'none') {
      const title = dialog.querySelector('.h-msg-box-title, .h-modal-title');
      results.push({ index, title: title?.textContent.trim() || '无标题', visible: true });
    }
  });
  return JSON.stringify(results);
})()
```

```javascript
// 强制移除残留遮罩层（异常恢复用）
document.querySelectorAll('.h-modal-mask, .h-msg-box-wrapper').forEach(el => el.remove());
```

```javascript
// 关闭最内层弹窗
(() => {
  const closeButtons = document.querySelectorAll('.h-msg-box:visible .h-msg-box-close, .h-modal:visible .h-modal-close');
  if (closeButtons.length > 0) {
    closeButtons[closeButtons.length - 1].click();
    return '已关闭最内层弹窗';
  }
  return '未找到可见弹窗的关闭按钮';
})()
```

### 菜单导航

```javascript
// 通用菜单点击（按文本匹配）
// 用法：替换 {menuText} 为目标菜单名称
(() => {
  const selector = '{selector}';  // 如 .h-menu-submenu-title span 或 .h-menu-item span
  const menus = document.querySelectorAll(selector);
  for (const menu of menus) {
    if (menu.textContent.trim() === '{menuText}') {
      menu.click();
      return '已点击{menuText}';
    }
  }
  return '未找到{menuText}';
})()
```

### HUI 组件表单

```javascript
// 设置普通 Input 并触发 Vue 响应（用于 h-input）
(() => {
  const input = document.querySelector('{selector}');
  if (!input) return '未找到输入框';
  input.value = '{value}';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return '已设置输入值';
})()
```

```javascript
// 设置 h-date-picker 日期（通过 Vue 实例）
(() => {
  const picker = document.querySelector('.h-date-picker');
  if (!picker) return '未找到日期选择器';
  const vueInstance = picker.__vue__;
  if (!vueInstance) return '未找到Vue实例';
  vueInstance.value = '{date}';
  vueInstance.$emit('input', '{date}');
  return '日期已设置';
})()
```

```javascript
// 设置 h-typefield 金额（通过 Vue 实例）
(() => {
  const input = document.querySelector('.h-typefield input');
  if (!input) return '未找到金额输入框';
  const vueInstance = input.__vue__ || input.closest('[data-v-]')?.__vue__;
  if (vueInstance) {
    vueInstance.currentValue = '{amount}';
    vueInstance.$emit('input', '{amount}');
    return '金额已通过Vue实例设置';
  }
  input.value = '{amount}';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return '金额已通过DOM设置';
})()
```

### 截图 vs 快照 使用决策

| 场景 | 使用工具 | 原因 |
|------|---------|------|
| 留存操作证据 | `take_screenshot` | 视觉完整，可人工复查 |
| 定位元素 UID | `take_snapshot` | 返回可访问性树，用于 click 的 uid 参数 |
| 提取结构化数据 | `evaluate_script` | 返回 JSON，可编程比较 |
| 确认弹窗关闭 | `take_screenshot` | 直观确认无遮罩残留 |
| 确认页面渲染完成 | `take_snapshot` | 返回文本列表，可搜索关键元素名 |

### 登录与认证

```javascript
// 通过 Vue 实例设置登录表单并触发登录
(() => {
    const vue = document.querySelector('#app').__vue__;
    const loginComp = vue.$children.find(c => c.loginForm);
    if (loginComp) {
        loginComp.loginForm.userNo = '{username}';
        loginComp.loginForm.username = '{username}';
        loginComp.loginForm.tempPassword = '{password}';
        loginComp.loginForm.password = '{password}';
        loginComp.loginForm.forceLogin = '1';
        loginComp.handleLogin();
        return { triggered: true };
    }
    return { triggered: false };
})()
```

```javascript
// 获取当前登录用户信息
(() => {
    const vue = document.querySelector('#app').__vue__;
    const user = vue.$store?.state?.user;
    if (!user) return '未登录';
    return JSON.stringify({
        userNo: user.userNo,
        userType: user.userType,
        brchNo: user.brchNo,
        legalNo: user.legalNo,
        userName: user.userName,
        optAuths: user.optAuths?.length || 0
    });
})()
```

```javascript
// 通过 Vue 实例调用后端 API
(async () => {
    const vue = document.querySelector('#app').__vue__;
    const http = vue.$http || vue.$store._vm.$http;
    const token = vue.$store.state.user?.fwToken || '';
    const res = await http.post('{api_path}', { fwToken: token });
    return { retCode: res.data?.retCode, retMsg: res.data?.retMsg };
})()
```

### 多选组件检测

```javascript
// 检查页面中的选择组件是否为多选
(() => {
    const selects = document.querySelectorAll('.h-selectTable, .h-select');
    const result = [];
    selects.forEach(s => {
        const label = s.closest('.h-form-item')?.querySelector('label')?.textContent || '';
        const isMultiple = s.classList.contains('h-selectTable-multiple') || s.classList.contains('h-select-multiple');
        const isSingle = s.classList.contains('h-select-single');
        result.push({ label, isMultiple, isSingle, classes: s.className });
    });
    return JSON.stringify(result);
})()
```

### Dropdown 组件操作

```javascript
// 展开 Dropdown 下拉列表并点击目标项
(() => {
    const dropdowns = document.querySelectorAll('.h-dropdown');
    for (const dropdown of dropdowns) {
        const trigger = dropdown.querySelector('.h-dropdown-rel button, .h-dropdown-rel a');
        if (trigger && trigger.textContent.trim().includes('{按钮文本}')) {
            const vueInstance = dropdown.__vue__;
            if (vueInstance) {
                vueInstance.visible = true;
                return 'Dropdown 已展开，请 take_snapshot 获取下拉选项后 click 目标项';
            }
            trigger.click();
            return '已点击 Dropdown 触发器';
        }
    }
    return '未找到目标 Dropdown';
})()
```

### Window-Layer 弹窗恢复

```javascript
// 检测并恢复 window-layer 最小化弹窗
(() => {
    const layers = document.querySelectorAll('.window-layer');
    if (layers.length === 0) return '未找到 window-layer';

    const results = [];
    layers.forEach((layer, index) => {
        const vueInstance = layer.__vue__;
        if (vueInstance) {
            const isMinimized = vueInstance.minimized || layer.classList.contains('window-layer-minimized');
            if (isMinimized) {
                vueInstance.minimized = false;
                vueInstance.$emit('on-restore');
                results.push({ index, restored: true });
            } else {
                results.push({ index, restored: false, state: 'normal' });
            }
        }
    });
    return JSON.stringify(results);
})()
```

### DataGrid 行选中（Vue 实例直设，完整版）

```javascript
// 完整设置 DataGrid 行选中状态（同时设置所有选中属性）
(() => {
    const grid = document.querySelector('.h-datagrid');
    if (!grid) return '未找到 DataGrid';
    const vueInstance = grid.__vue__;
    if (!vueInstance) return '未找到 Vue 实例';

    // 获取目标行数据
    const rows = vueInstance.data || vueInstance.bodyData || [];
    const targetRow = rows.find(row => row.{keyField} === '{targetValue}');
    if (!targetRow) return '未找到目标行';

    const rowId = targetRow.id || targetRow.ID || targetRow._index;

    // 同时设置所有选中相关属性
    if (vueInstance.currentSelectList !== undefined) vueInstance.currentSelectList = [targetRow];
    if (vueInstance.selects !== undefined) vueInstance.selects = [targetRow];
    if (vueInstance.selectIds !== undefined) vueInstance.selectIds = [rowId];
    if (vueInstance.currentSelect !== undefined) vueInstance.currentSelect = targetRow;

    vueInstance.$forceUpdate();

    return JSON.stringify({
        setSelectList: vueInstance.currentSelectList?.length || 0,
        setSelects: vueInstance.selects?.length || 0,
        setSelectIds: vueInstance.selectIds?.length || 0,
        hasCurrentSelect: !!vueInstance.currentSelect,
        rowId: rowId
    });
})()
```

### v-if 条件字段检测

```javascript
// 检测 v-if 条件字段是否可见
(() => {
    const fieldLabel = '{fieldLabel}';  // 如 "回购总金额"
    const formItems = document.querySelectorAll('.h-form-item');
    for (const item of formItems) {
        const label = item.querySelector('label');
        if (label && label.textContent.includes(fieldLabel)) {
            const isVisible = getComputedStyle(item).display !== 'none';
            return JSON.stringify({ found: true, visible: isVisible, label: label.textContent.trim() });
        }
    }
    return JSON.stringify({ found: false, visible: false, reason: 'DOM元素不存在(v-if=false)' });
})()
```

### 弹窗关闭后 URL 验证

```javascript
// 弹窗关闭后检查 URL 是否跳转
(() => {
    const currentHash = window.location.hash;
    const expectedPath = '{expected_route}';  // 如 /pc/be/market
    const isJumped = !currentHash.includes(expectedPath);
    return JSON.stringify({
        currentHash,
        expectedPath,
        isJumped,
        needRecovery: isJumped
    });
})()
```

### 批量导入弹窗验证

```javascript
// 检查批量导入弹窗内的表格列头
(() => {
    const dialog = document.querySelector('.h-msg-box:visible') || document.querySelector('.h-modal:visible');
    if (!dialog) return '未找到可见弹窗';
    const headers = dialog.querySelectorAll('th');
    const columns = [];
    headers.forEach(th => columns.push(th.textContent?.trim()));
    return JSON.stringify({ columns, hasSimpleBranch: columns.some(c => c.includes('是否简单机构')) });
})()
```