# Chrome DevTools MCP 高级工作流

基于BEMP承兑行额度管理功能二轮测试实战经验提炼的高级工作流模式。这些工作流解决了Vue动态路由、HUI组件交互、状态流转端到端验证等复杂场景。

---

## 1. Vue动态路由导航工作流

### 问题背景

BEMP使用Vue懒加载路由，银行个性化路由（如hnnxbank的承兑行额度管理）不在初始路由表中。直接通过`navigate_page`访问URL会导致页面空白或404，因为这些路由需要通过菜单点击触发`mergeMenus()`注册后才能访问。

### 标准流程

```
evaluate_script(定位菜单项并点击) → wait_for(networkidle) → take_snapshot(确认页面渲染) → take_screenshot
```

### 菜单点击代码模板

```javascript
// 第一步：展开"业务管理子系统"菜单
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
```

```javascript
// 第二步：展开"承兑行额度管理"子菜单
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
```

```javascript
// 第三步：点击具体功能菜单（额度申请/额度复核）
(() => {
  const items = document.querySelectorAll('.h-menu-item span');
  for (const item of items) {
    if (item.textContent.trim() === '额度申请') {
      item.click();
      return '已点击额度申请';
    }
  }
  return '未找到额度申请菜单项';
})()
```

### 关键发现

- 不同子菜单（额度申请/额度复核）需要分别点击注册路由，点击"额度申请"不会自动注册"额度复核"的路由
- 菜单点击后必须`wait_for(networkidle)`等待路由注册和组件加载完成
- 每次菜单点击后用`take_snapshot`确认目标页面已正确渲染
- 已注册的路由在当前会话中保持有效，后续可直接`navigate_page`访问

---

## 2. HUI组件交互工作流

### 2.1 h-date-picker 日期选择器

h-date-picker是复合组件，直接设置`input.value`不会触发组件内部日期解析逻辑。

**错误做法**：
```javascript
// 仅设置input.value无法触发Vue组件内部日期解析
document.querySelector('.h-date-picker input').value = '2026-05-15';
document.querySelector('.h-date-picker input').dispatchEvent(new Event('input', {bubbles:true}));
```

**正确做法**：通过`evaluate_script`直接设置Vue组件的data值
```javascript
// 找到日期选择器对应的Vue实例并修改其data
(() => {
  const picker = document.querySelector('.h-date-picker');
  if (!picker) return '未找到日期选择器';
  const vueInstance = picker.__vue__;
  if (!vueInstance) return '未找到Vue实例';
  vueInstance.value = '2026-05-15';
  vueInstance.$emit('input', '2026-05-15');
  return '日期已设置';
})()
```

### 2.2 h-typefield 金额输入

h-typefield使用`document.execCommand('insertText')`无法触发Vue v-model双向绑定，修改后提交列表中金额不会更新。

**错误做法**：
```javascript
// insertText不会触发v-model绑定
const input = document.querySelector('.h-typefield input');
input.focus();
document.execCommand('insertText', false, '1000000');
```

**正确做法**：直接修改Vue实例的data属性
```javascript
// 通过Vue实例修改金额字段
(() => {
  const input = document.querySelector('.h-typefield input');
  if (!input) return '未找到金额输入框';
  const vueInstance = input.__vue__ || input.closest('[data-v-]')?.__vue__;
  if (vueInstance) {
    // 直接修改组件data中的金额字段
    vueInstance.currentValue = '1000000';
    vueInstance.$emit('input', '1000000');
    return '金额已通过Vue实例设置';
  }
  // 降级方案：设置value并触发input事件
  input.value = '1000000';
  input.dispatchEvent(new Event('input', {bubbles: true}));
  input.dispatchEvent(new Event('change', {bubbles: true}));
  return '金额已通过DOM设置';
})()
```

### 2.3 h-select 下拉框

两步操作模式：
```javascript
// 第一步：点击触发器打开下拉列表
document.querySelector('.h-select-selection').click();
```
```
wait_for → 下拉列表可见
```
```javascript
// 第二步：点击目标选项
(() => {
  const options = document.querySelectorAll('.h-option');
  for (const opt of options) {
    if (opt.textContent.trim() === '目标选项文本') {
      opt.click();
      return '已选择目标选项';
    }
  }
  return '未找到目标选项';
})()
```

### 2.4 h-datagrid 行选择

checkbox/radio选择后Vue的`currentSelectList`数据同步有延迟，需要等待：
```javascript
// 点击checkbox选中行
document.querySelector('.h-datagrid tbody tr:first-child input[type="checkbox"]').click();
```
```
wait_for_timeout → 500ms（等待currentSelectList同步）
```
```javascript
// 验证选中状态
(() => {
  const grid = document.querySelector('.h-datagrid');
  const vueInstance = grid?.__vue__;
  if (vueInstance && vueInstance.currentSelectList) {
    return `已选中${vueInstance.currentSelectList.length}行`;
  }
  return '无法获取选中行数据';
})()
```

---

## 3. 状态流转端到端验证工作流

### 完整状态机

```
草稿(0) ──提交复核──→ 待复核(1) ──复核──→ 已复核(5)
   ↑                    │                    │
   └──撤销提交──────────┘                    │
                        ↑                    │
                        └──撤销复核──────────┘
```

### 验证模式

每个状态变更操作遵循以下四步模式：

```
1. 操作前 take_screenshot → 记录当前状态
2. click(操作按钮) → wait_for(确认弹窗) → click(确定)
3. wait_for(networkidle) → take_screenshot → 记录操作后状态
4. evaluate_script(提取状态列文本) → 与预期状态比较
```

### 状态文本提取

```javascript
// 提取DataGrid中指定行的状态列文本
(() => {
  const rows = document.querySelectorAll('.h-datagrid tbody tr');
  const results = [];
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    // 状态列通常在倒数第2或第3列，根据实际页面调整
    const statusCell = cells[cells.length - 2];
    if (statusCell) {
      results.push({ row: index + 1, status: statusCell.textContent.trim() });
    }
  });
  return JSON.stringify(results);
})()
```

### 跨页面状态验证

额度申请页面提交复核后，需切换到额度复核页面验证：

```
1. 额度申请页面 → 提交复核 → 确认 → wait_for(networkidle)
2. take_screenshot → 记录申请页面状态变为"待复核"
3. 通过菜单导航到"额度复核"页面（必须菜单点击注册路由）
4. wait_for(networkidle) → 点击查询
5. evaluate_script → 验证复核页面中该记录状态为"待复核"
6. take_screenshot → 记录复核页面状态
```

### 关键注意

- 选中checkbox后需等待`currentSelectList`同步（500ms），否则提交复核会报"ID不能为空"
- 状态变更操作后必须验证，因为Service层可能静默拒绝不符合状态前置条件的操作
- 跨页面验证时，两个页面使用不同的路由，需要分别通过菜单点击注册

---

## 4. 删除功能验证工作流

### 验证步骤

```
1. 选中草稿状态的明细行（checkbox）
2. wait_for_timeout(500ms) → 等待currentSelectList同步
3. 点击删除按钮
4. 确认二次确认弹窗
5. wait_for(networkidle)
6. evaluate_script → 检查DataGrid行数是否减少
```

### 行数变化验证

```javascript
// 删除前后对比DataGrid行数
(() => {
  const rows = document.querySelectorAll('.h-datagrid tbody tr');
  return `当前DataGrid行数: ${rows.length}`;
})()
```

### 边界验证

非草稿状态（待复核/已复核）的记录删除应被拒绝：
```javascript
// 尝试删除非草稿状态记录，验证操作被拒绝
(() => {
  const rows = document.querySelectorAll('.h-datagrid tbody tr');
  const nonDraftRows = [];
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    const statusCell = cells[cells.length - 2];
    if (statusCell && statusCell.textContent.trim() !== '草稿') {
      nonDraftRows.push({ row: index + 1, status: statusCell.textContent.trim() });
    }
  });
  return JSON.stringify(nonDraftRows);
})()
```

### 修复案例参考

`delCreditInfo`方法从`infoDto.getId()`改为`HnnxAcceptBankCreditUtil.parseIds(infoDto.getIds())`，修复了删除时ID传递不正确的问题。验证时需确认删除操作能正确传递选中行的ID列表。

---

## 5. 弹窗嵌套操作工作流

### BEMP常见弹窗嵌套结构

```
批次页面 → 批复明细弹窗 → 新增/修改明细弹窗
```

### 操作模式

```
1. 外层弹窗：click(按钮) → wait_for(外层弹窗标题) → take_screenshot
2. 内层弹窗：在外层弹窗中 click(新增/修改) → wait_for(内层弹窗标题) → take_screenshot
3. 内层操作：evaluate_script(填表单) → click(确定) → wait_for(networkidle)
4. 关闭顺序：先关内层 → 再关外层
```

### 定位当前可见弹窗

```javascript
// 使用:visible定位当前可见的弹窗
(() => {
  const visibleDialogs = document.querySelectorAll('.h-msg-box');
  const results = [];
  visibleDialogs.forEach((dialog, index) => {
    if (dialog.offsetParent !== null || getComputedStyle(dialog).display !== 'none') {
      const title = dialog.querySelector('.h-msg-box-title, .h-modal-title');
      results.push({
        index,
        title: title?.textContent.trim() || '无标题',
        visible: true
      });
    }
  });
  return JSON.stringify(results);
})()
```

### 遮罩层残留处理

弹窗关闭后遮罩层可能残留，导致页面无法操作：
```javascript
// 强制移除残留遮罩层
document.querySelectorAll('.h-modal-mask').forEach(el => el.remove());
```

### 关闭弹窗的最佳实践

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

---

## 6. 控制台错误检测与分类工作流

### 错误分类

| 级别 | 错误类型 | 处理方式 |
|------|---------|---------|
| 致命 | TypeError / ReferenceError | 必须修复，阻塞测试通过 |
| 严重 | ChunkLoadError | 组件加载失败，需检查路由和打包配置 |
| 可忽略 | WebSocket连接失败、favicon.ico 404 | 不影响功能，记录即可 |

### 检测时机

每个关键操作步骤后执行`list_console_messages`，检测是否有新增错误：

```
1. 登录后 → list_console_messages → 检查致命错误
2. 导航到目标页面后 → list_console_messages → 检查ChunkLoadError
3. CRUD操作后 → list_console_messages → 检查TypeError
4. 状态流转后 → list_console_messages → 检查所有级别
5. 测试结束 → 汇总所有控制台错误到验证报告
```

### 错误过滤脚本

```javascript
// 从控制台消息中过滤致命和严重错误
(() => {
  // 此脚本需在list_console_messages返回结果后手动分析
  // 致命错误关键词: TypeError, ReferenceError, SyntaxError
  // 严重错误关键词: ChunkLoadError, NetworkError
  // 可忽略: WebSocket, favicon.ico, chrome-extension
  return '请在list_console_messages输出中按上述关键词过滤';
})()
```

### 错误与测试结果判定

- 出现致命错误（TypeError/ReferenceError）→ 当前步骤判定为FAIL
- 出现严重错误（ChunkLoadError）→ 需评估是否影响当前测试功能
- 仅出现可忽略错误 → 不影响PASS判定
