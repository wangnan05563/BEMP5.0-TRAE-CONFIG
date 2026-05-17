# Chrome DevTools MCP 常见陷阱与解决方案

## 陷阱1：fill_form 截断输入值（P0 级影响）

**现象**：
使用 `fill_form` 填写 BEMP 登录表单或其他 HUI 表单时，输入的值被截断——只输入了前半部分字符。

**根因**：
HUI 组件库的表单（尤其是登录页）使用了 Vue 的 `v-model` 双向绑定。`fill_form` 工具在填充时会触发一系列事件，但 HUI 的组件对事件的处理方式导致输入值被框架重新计算覆盖，输出结果被截断。

**影响范围**：
- 登录表单（用户名/密码）
- 所有 HUI 输入框（h-input）
- 日期选择器的输入框
- 金额输入框

**标准解决方案**：
```javascript
// 步骤1：直接设置原生 input.value
evaluate_script:
  document.querySelector('input[placeholder*="用户名"]').value = 'actual_username';
  document.querySelector('input[placeholder*="密码"]').value = 'actual_password';

// 步骤2：手动触发 input 事件（Vue v-model 需要监听此事件）
evaluate_script:
  document.querySelector('input[placeholder*="用户名"]').dispatchEvent(new Event('input', {bubbles:true}));
  document.querySelector('input[placeholder*="密码"]').dispatchEvent(new Event('input', {bubbles:true}));

// 步骤3：验证输入成功
take_snapshot → 确认输入框中可见实际用户名
```

**不推荐方案**（已证实不可靠）：
- `type_text` → 逐字符键入太慢，且可能触发输入法干扰
- `fill` 单个字段 → 同样存在截断问题
- 多次 `fill_form` 重试 → 不稳定

---

## 陷阱2：模态弹窗阻塞页面操作（P0 级影响）

**现象**：
关闭 BEMP 的 DataGrid 弹窗（如额度明细弹窗）后，导航到其他页面时仍然卡在弹窗遮罩层上，无法操作新页面。

**根因**：
BEMP 弹窗使用 `position: absolute` 全屏遮罩层。当弹窗通过 `close_page` 或某些方式关闭时，DOM 可能未完全清除遮罩元素。再次 `navigate_page` 到同一域名下的其他路径时，残留的遮罩层仍阻挡交互。

**影响范围**：
- 额度明细弹窗（从批次页面打开）
- 修改弹窗（从 DataGrid 行打开）
- 所有 HUI Modal 组件

**标准解决方案（优先级递减）**：

**方案A - 弹窗内关闭**（首选）
```
click(弹窗右上角X按钮) → wait_for(弹窗不可见) → take_screenshot 确认
或
click(弹窗底部关闭/取消按钮) → wait_for(弹窗不可见) → take_screenshot 确认
```

**方案B - 新页面重新登录**（弹窗已阻塞时）
```
new_page → navigate_page(http://127.0.0.1:8091) → 重新执行登录流程 → navigate_page(目标页面)
```

**方案C - 强制移除遮罩**（调试用）
```javascript
evaluate_script:
  document.querySelectorAll('.h-modal-mask, .h-msg-box-wrapper').forEach(el => el.remove());
```

**预防措施**：
- 每次弹窗操作后，立即 `take_screenshot` 确认弹窗已关闭
- 弹窗关闭后等待 500ms 再执行下一步操作
- 不要用 `close_page` 关闭包含弹窗的页面

---

## 陷阱3：菜单导航搜索歧义（P1 级影响）

**现象**：
在 BEMP 左侧菜单中搜索"额度复核"等关键词，导航到了错误的页面（如通用复核页面而非承兑行额度复核页面）。

**根因**：
BEMP 不同的个性化银行可能共享相似的菜单名称。搜索功能返回的匹配项中，排在前面的可能是其他银行或通用模块的页面，而非当前银行（hnnxbank）的个性化页面。

**标准解决方案**：
```
# 方案A - 直接 URL 导航（最可靠）
navigate_page: http://127.0.0.1:8091/#/pc/credit/acceptBankCreditGrantInfoReCheck

# 方案B - 展开子菜单定位
1. 在菜单树中找到"承兑行额度管理"节点
2. 展开子节点 → 找到"额度复核"
3. click 精确点击
```

**不推荐方案**：
- 搜索"额度复核"后盲点第一个结果 → 可能进入错误模块
- 搜索"复核"等过于宽泛的词

---

## 陷阱4：select_page 索引漂移（P2 级影响）

**现象**：
`list_pages` 返回的页面列表中，页面索引可能因弹窗打开/关闭而变化，使用硬编码的页面索引（如 `select_page(1)`）可能选错页面。

**标准解决方案**：
```
# 每次操作前先 list_pages 确认当前页面列表
list_pages → 查看所有页面及其 URL
select_page → 根据 URL 匹配的目标页面索引选择
```

**最佳实践**：
- 操作前 `list_pages` 确认页面状态
- 用 URL 内容而非索引来识别目标页面
- 不使用硬编码的页面索引

---

## 陷阱5：wait_for_timeout 硬编码等待不可靠（P2 级影响）

**现象**：
使用 `wait_for_timeout(2000)` 等待数据加载，但服务端响应时间可能因数据量/网络波动而变化，导致等待不足或浪费时间。

**标准解决方案**：
```
# 优先使用语义化等待
wait_for: networkidle    # 所有网络请求完成
wait_for: 特定元素出现     # 如 DataGrid 行、状态标签等

# 仅在以下场景使用 wait_for_timeout
- 动画过渡需要固定时间（如弹窗打开/关闭动画 500ms）
- 非网络驱动的 UI 更新（如 CSS transition）
```

---

## 陷阱6：take_snapshot 输出过长导致信息丢失

**现象**：
`take_snapshot` 的完整输出可能非常长，导致关键信息（如表单字段、按钮文本）被截断。

**标准解决方案**：
```javascript
// 方案A - 使用 evaluate_script 提取关键信息
evaluate_script:
  JSON.stringify({
    rows: document.querySelectorAll('.h-datagrid tbody tr').length,
    status: document.querySelector('.status-cell')?.textContent,
    buttons: [...document.querySelectorAll('.h-btn')].map(b => b.textContent.trim()),
    dialogTitle: document.querySelector('.h-modal-title')?.textContent
  })

// 方案B - 获取可见文本
playwright_get_visible_text → 聚焦于当前视口内的文本
```

---

## 陷阱7：已复核状态操作被静默拒绝

**现象**：
已复核状态的记录尝试修改/删除/提交复核时，操作看起来"好像成功了"但实际状态未变化。

**根因**：
Service 层有状态守卫（`if (!CREDIT_STATUS_DRAFT.equals(existing.getCreditStatus()))`），如果状态不符，操作被静默跳过，不抛异常但也不修改数据。

**标准解决方案**：
```javascript
// 每个状态变更操作后，必须验证
take_screenshot → 截图状态列
evaluate_script 提取状态列文本 → 与预期状态比较
断言: 提取的状态 === 预期状态
```

---

## 陷阱8：Vue动态路由直接URL导航失败（P0 级影响）

**现象**：
使用`navigate_page`直接访问`http://127.0.0.1:8091/#/pc/credit/acceptBankCreditGrantBatch`后页面空白或404。

**根因**：
BEMP使用Vue懒加载路由，银行个性化路由（如hnnxbank的承兑行额度管理）不在初始路由表中。这些路由需要通过菜单点击触发`mergeMenus()`注册后才能访问，直接URL导航时路由尚未注册。

**标准解决方案**：
必须通过`evaluate_script`模拟菜单点击来注册路由：

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

// 第三步：点击具体功能菜单
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

// 每步菜单点击后必须等待路由注册完成
wait_for → networkidle
take_snapshot → 确认页面渲染
```

**不推荐方案**：
- 直接`navigate_page`到目标URL → 路由未注册，页面空白
- 只点击父菜单不点击子菜单 → 子路由未注册

---

## 陷阱9：h-typefield组件值绑定失效（P1 级影响）

**现象**：
修改金额字段后提交，列表中金额未更新，仍然是旧值。

**根因**：
h-typefield是HUI的金额输入组件，使用`document.execCommand('insertText')`或直接设置`input.value`无法触发Vue v-model双向绑定。DOM层面的修改不会同步到Vue的data中，提交时发送的仍是旧值。

**标准解决方案**：
直接修改Vue实例的data属性而非操作DOM input元素：

```javascript
// 通过Vue实例修改金额字段
(() => {
  const input = document.querySelector('.h-typefield input');
  if (!input) return '未找到金额输入框';
  const vueInstance = input.__vue__ || input.closest('[data-v-]')?.__vue__;
  if (vueInstance) {
    vueInstance.currentValue = '1000000';
    vueInstance.$emit('input', '1000000');
    return '金额已通过Vue实例设置';
  }
  // 降级方案
  input.value = '1000000';
  input.dispatchEvent(new Event('input', {bubbles: true}));
  input.dispatchEvent(new Event('change', {bubbles: true}));
  return '金额已通过DOM设置';
})()
```

**不推荐方案**：
- `document.execCommand('insertText')` → 不触发v-model
- `fill` 工具 → 同样存在截断和绑定问题

---

## 陷阱10：checkbox选择后currentSelectList未同步（P1 级影响）

**现象**：
选中DataGrid行后点击"提交复核"，报错"ID不能为空"。

**根因**：
checkbox点击后Vue的`currentSelectList`数据同步有延迟。点击checkbox触发了DOM事件，但Vue组件内部的数据更新是异步的，立即执行后续操作时选中数据尚未同步。

**标准解决方案**：
click checkbox后`wait_for_timeout(500ms)`，再通过`evaluate_script`验证`currentSelectList`长度：

```javascript
// 点击checkbox
click → DataGrid行首checkbox

// 等待Vue数据同步
wait_for_timeout → 500ms

// 验证选中状态
evaluate_script:
(() => {
  const grid = document.querySelector('.h-datagrid');
  const vueInstance = grid?.__vue__;
  if (vueInstance && vueInstance.currentSelectList) {
    return `已选中${vueInstance.currentSelectList.length}行`;
  }
  return '无法获取选中行数据';
})()

// 确认选中数量大于0后再执行提交操作
```

---

## 陷阱11：h-date-picker日期选择器无法直接输入（P1 级影响）

**现象**：
使用`fill`或`evaluate_script`设置`input.value`后日期未生效，提交时日期字段为空。

**根因**：
h-date-picker是复合组件，内部有独立的日期解析逻辑。仅设置`input.value`不会触发组件内部的日期解析，Vue组件的data值仍为空。

**标准解决方案**：
通过`evaluate_script`直接设置Vue组件的data值：

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

**不推荐方案**：
- `fill` 工具 → 不触发组件内部逻辑
- `input.value = '2026-05-15'` + `dispatchEvent('input')` → 仅更新DOM，不更新Vue data

---

## 陷阱12：BEMP 登录密码加密未触发（P0 级影响）

**现象**：
使用 Chrome DevTools 的 `fill` 或 `type_text` 填写 `input[name="tempPassword"]` 后点击登录，返回"用户名或密码错误"或"用户已锁定"。

**根因**：
BEMP 登录使用 SM4 加密，加密在 `login()` API 函数内部自动完成。`tempPassword` 是用户可见的密码输入框，`password` 是隐藏的加密后字段。当使用 `fill` 或 `type_text` 设置 `tempPassword` 时，Vue 的响应式系统可能未正确触发 `passwordTempChange()` 方法，导致 `password` 字段仍为空或为原始密码（非加密后值）。

**标准解决方案**：

**方案A - 通过 Vue 实例设置（最可靠）**：
```javascript
// evaluate_script: 通过 Vue 实例设置登录表单
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

**方案B - 通过原生 setter 设置（备选）**：
```javascript
// evaluate_script: 通过原生 setter 设置并触发 Vue 响应
(() => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const usernameInput = document.querySelector('input[name="username"]');
    const tempPwdInput = document.querySelector('input[name="tempPassword"]');
    
    nativeSetter.call(usernameInput, '{username}');
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    nativeSetter.call(tempPwdInput, '{password}');
    tempPwdInput.dispatchEvent(new Event('input', { bubbles: true }));
    tempPwdInput.dispatchEvent(new Event('change', { bubbles: true }));
    tempPwdInput.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return { username: usernameInput.value, tempPassword: tempPwdInput.value };
})()
```

**不推荐**：`fill_form`（截断+绑定问题）、`fill` 单字段（可能不触发 Vue 响应）、`type_text`（逐字慢+输入法干扰）

**关键发现**：
- 登录表单字段映射：`input[name="username"]`(用户名)、`input[name="tempPassword"]`(密码)、`input[name="password"]`(隐藏加密字段)
- 登录按钮选择器：`button.h-btn-primary`（非 `button:has-text("登录")`，因为按钮文本可能含空格）
- 三种登录方式：密码登录(`div.login-type-content-pwd`)、指纹登录、手机号登录

---

## 陷阱13：用户账号被锁定后无法解锁（P0 级影响）

**现象**：
测试账号多次登录失败后被系统自动锁定，后续登录返回"用户已锁定"(错误码0BE229904013)，即使数据库中已解锁仍然失败。

**根因**：
1. 后端实际连接的数据库可能与 Oracle MCP 连接的数据库不同（如后端连10.20.29.136而MCP连10.20.18.177）
2. 密码错误次数达到配置值后，后端将 `IS_ENABLE` 设为 `0` 并增加 `PWD_ERR_TIMES`
3. 即使在MCP数据库中解锁，实际数据库中账号仍为锁定状态

**标准解决方案**：

**方案A - 通过前端管理界面解锁（最可靠）**：
```
1. 用法人管理员(mllzs01)登录
2. 导航到系统管理 → 柜员管理/管理员管理
3. 找到被锁定的用户
4. 通过界面操作解锁
```

**方案B - 通过前端 Vue 实例调用解锁 API**：
```javascript
// evaluate_script: 通过 Vue 实例调用后端解锁API
(async () => {
    const vue = document.querySelector('#app').__vue__;
    const http = vue.$http || vue.$store._vm.$http;
    const token = vue.$store.state.user?.fwToken || '';
    
    const res = await http.post('/sm/auth/branch/branchAdmin/func_unLockLegalPersonManager', {
        userNo: '{locked_user_no}',
        fwToken: token
    });
    return { retCode: res.data?.retCode, retMsg: res.data?.retMsg };
})()
```

**方案C - 通过 SQL*Plus 在正确数据库上解锁**：
```sql
UPDATE TM_USER SET IS_ENABLE = '1', PWD_ERR_TIMES = 0, LOGIN_STATUS = '0' WHERE USER_NO = '{user_no}';
COMMIT;
```

**关键字段映射**（TM_USER 表）：
| 常见误解字段名 | 实际字段名 | 说明 |
|---------------|-----------|------|
| USER_CODE | USER_NO | 用户编号 |
| STATUS | IS_ENABLE | 启用状态(1=启用/0=禁用) |
| LOCK_FLAG | LOGIN_STATUS | 登录锁定(0=正常/1=锁定) |
| LOGIN_FAIL_COUNT | PWD_ERR_TIMES | 密码错误次数 |

**预防措施**：
- 测试前先确认后端实际连接的数据库地址
- 避免连续多次错误登录同一账号
- 准备备用测试账号

---

## 陷阱14：弹窗重叠无法关闭（P1 级影响）

**现象**：
在机构管理页面中，点击"批量导入"按钮弹出导入弹窗后，关闭弹窗再点击"批量复制角色"会导致两个弹窗同时存在且重叠，批量导入弹窗的关闭按钮无法正常关闭。

**根因**：
BEMP 弹窗组件的状态管理存在缺陷，关闭弹窗时未完全清理 Vue 组件状态和 DOM 元素，导致再次打开其他弹窗时出现重叠。

**标准解决方案**：

**方案A - 强制移除残留弹窗 DOM**：
```javascript
// evaluate_script: 强制移除所有残留弹窗
document.querySelectorAll('.h-modal-mask, .h-modal, .h-msg-box-wrapper').forEach(el => el.remove());
```

**方案B - 刷新页面后重新操作**：
```
navigate_page(当前页面URL) → wait_for(networkidle) → 重新执行操作
```

**方案C - 新标签页重新登录**：
```
new_page → 重新登录 → navigate_page(目标页面)
```

**预防措施**：
- 每次弹窗操作后，立即 `take_screenshot` 确认弹窗已完全关闭
- 打开新弹窗前，先用 `evaluate_script` 检查可见弹窗数量
- 不同弹窗操作之间增加 500ms 等待

---

## 陷阱15：后端数据库地址与 MCP 数据库不一致（P1 级影响）

**现象**：
通过 Oracle MCP 解锁用户后，登录仍然失败，提示"用户已锁定"。

**根因**：
后端 Spring Boot 应用实际连接的数据库地址（配置在 `merge.properties` 的 `jdbc.url` 中）可能与 Oracle MCP 配置的数据库地址不同。在 MCP 数据库上执行的解锁操作不会影响后端实际使用的数据库。

**标准解决方案**：

1. **先确认后端实际数据库地址**：
```javascript
// 方式1：通过前端 Vue 实例查询后端配置
// 方式2：查看 deploy/bemp-home/src/main/resources/configcenter/banks/{bankName}/merge.properties 中的 jdbc.url
```

2. **在正确的数据库上执行解锁**：
```powershell
# 使用后端配置的数据库连接信息
$sqlFile = "unlock_user.sql"
[System.IO.File]::WriteAllText($sqlFile, "UPDATE TM_USER SET IS_ENABLE='1', PWD_ERR_TIMES=0 WHERE USER_NO='{user_no}'; COMMIT; EXIT;", [System.Text.Encoding]::ASCII)
& sqlplus -S "{jdbc_username}/{jdbc_password}@{jdbc_host}:{jdbc_port}:{jdbc_service}" "@$sqlFile"
```

3. **通过前端管理界面解锁（最可靠）**：见陷阱13方案A

**注意事项**：
- `merge.properties` 中的密码可能使用 SM4 加密（`sm4:` 前缀）
- SQL*Plus 执行 SQL 文件时需使用 ASCII 编码（非 UTF8，避免 BOM 问题）
- 解锁后需重启后端服务或清除 Redis 缓存才能生效

---

## 快速问题排查索引

| 症状 | 可能原因 | 参考陷阱 |
|------|---------|---------|
| 登录失败，密码错误 | fill_form 截断 | 陷阱1 |
| 页面操作无响应 | 残留弹窗遮罩层 | 陷阱2 |
| 导航到错误页面 | 菜单搜索歧义 | 陷阱3 |
| 操作成功但状态未变 | 状态守卫静默拒绝 | 陷阱7 |
| 选择器找不到元素 | 页面索引变化 | 陷阱4 |
| 数据未加载完成就断言 | 硬编码等待不足 | 陷阱5 |
| snapshot 输出不完整 | 内容过长截断 | 陷阱6 |
| URL导航后页面空白 | Vue动态路由未注册 | 陷阱8 |
| 金额修改后未生效 | h-typefield绑定失效 | 陷阱9 |
| 提交复核报ID为空 | checkbox选中数据未同步 | 陷阱10 |
| 日期设置后未生效 | h-date-picker组件内部逻辑 | 陷阱11 |
| 登录失败密码错误 | tempPassword未触发加密 | 陷阱12 |
| 账号锁定无法解锁 | 数据库地址不一致 | 陷阱13 |
| 弹窗重叠无法关闭 | 弹窗状态管理缺陷 | 陷阱14 |
| MCP解锁无效 | 后端数据库与MCP不同 | 陷阱15 |