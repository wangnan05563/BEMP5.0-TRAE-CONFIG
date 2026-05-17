# Playwright MCP 自动化测试实战指南

## 概述

本文档基于 BEMP 承兑行额度管理功能的 Playwright MCP 自动化测试实战经验，系统化提炼有效工作流程。Playwright MCP 通过 MCP 协议将浏览器操作暴露为工具调用，适用于 AI Agent 驱动的自动化测试场景。

> **与 Playwright 脚本的区别**：Playwright MCP 是工具调用模式（每次调用一个浏览器操作），而非 Python 脚本模式（顺序执行代码）。本文档所有工作流均基于 MCP 工具调用方式描述。

## 1. Playwright MCP 工具概述

### 1.1 页面导航与控制

| 工具 | 用途 | 典型场景 |
|------|------|----------|
| playwright_navigate | 页面导航 | 打开登录页、跳转功能页 |
| playwright_go_back | 浏览器后退 | 返回上一页 |
| playwright_go_forward | 浏览器前进 | 前进到下一页 |
| playwright_close | 关闭页面 | 测试结束清理 |
| playwright_resize | 调整视口大小 | 设置全屏避免响应式布局问题 |

### 1.2 元素交互

| 工具 | 用途 | 典型场景 |
|------|------|----------|
| playwright_click | 点击元素 | 点击按钮、菜单、行选择 |
| playwright_fill | 填写输入框 | 输入用户名、密码、查询条件 |
| playwright_select | 选择下拉框 | 选择机构类型、状态筛选 |
| playwright_hover | 悬停元素 | 触发悬浮菜单、Tooltip |
| playwright_press_key | 按键操作 | Enter提交、Escape关闭弹窗 |
| playwright_drag | 拖拽元素 | 拖拽排序、文件拖放 |

### 1.3 内容获取与验证

| 工具 | 用途 | 典型场景 |
|------|------|----------|
| playwright_screenshot | 截图 | 记录操作前后状态、问题取证 |
| playwright_get_visible_text | 获取可见文本 | 验证页面内容、提取状态文本 |
| playwright_get_visible_html | 获取可见HTML | 分析DOM结构、定位元素 |
| playwright_evaluate | 执行JavaScript | 提取DataGrid行数、修改Vue数据、注入拦截器 |

### 1.4 网络与API

| 工具 | 用途 | 典型场景 |
|------|------|----------|
| playwright_expect_response | 期待API响应 | 监听特定API请求 |
| playwright_assert_response | 断言API响应 | 验证状态码和响应体 |
| playwright_post | 发送POST请求 | 通过API创建测试数据 |
| playwright_put | 发送PUT请求 | 通过API修改数据 |
| playwright_patch | 发送PATCH请求 | 通过API部分更新数据 |
| playwright_delete | 发送DELETE请求 | 通过API删除测试数据 |

### 1.5 高级操作

| 工具 | 用途 | 典型场景 |
|------|------|----------|
| playwright_console_logs | 获取控制台日志 | 检测JS运行时错误 |
| playwright_click_and_switch_tab | 点击并切换标签页 | 打开新窗口查看详情 |
| playwright_upload_file | 上传文件 | 批量导入、模板上传 |
| playwright_iframe_click | iframe内点击 | 操作嵌入页面的按钮 |
| playwright_iframe_fill | iframe内填写 | 操作嵌入页面的输入框 |
| playwright_save_as_pdf | 保存PDF | 导出报表验证 |
| playwright_custom_user_agent | 自定义UA | 模拟移动端访问 |

## 2. BEMP 登录工作流（Playwright MCP版）

### 2.1 标准登录流程

```
1. playwright_navigate → http://127.0.0.1:8091/
2. playwright_fill → input[placeholder*="用户名"], 值: wangnan01
3. playwright_fill → input[placeholder*="密码"], 值: abc@123
4. playwright_click → button:has-text("登录")
5. playwright_click → .h-msg-box-confirm button:has-text("是")  （处理强制登录弹窗）
6. playwright_screenshot → 确认登录成功
```

### 2.2 注意事项

- **密码字段兼容**：BEMP Chrome模式下密码字段可能是 `tempPassword` 而非 `password`，如果 `playwright_fill` 密码框失败，尝试使用 `input[type="password"]` 或 `input[name="tempPassword"]` 选择器
- **强制登录弹窗**：确认按钮文本可能是"是"而非"确定"，选择器使用 `.h-msg-box-confirm button:has-text("是")`
- **登录等待**：点击登录后需等待页面加载完成，建议 `playwright_evaluate` 检查 `document.querySelector('.h-sidebar')` 存在

### 2.3 登录验证

```javascript
// playwright_evaluate: 验证登录成功
!!document.querySelector('.h-sidebar')
```

## 3. Vue 动态路由导航工作流（Playwright MCP版）

### 3.1 问题背景

BEMP 使用 Vue 懒加载路由，直接通过 `playwright_navigate` 导航到功能页面 URL 会导致 404 或页面空白，因为路由尚未注册。必须通过菜单点击触发路由注册。

### 3.2 菜单点击导航流程

**步骤一：点击子系统选项卡**

```javascript
// playwright_evaluate: 点击业务管理子系统选项卡
const menuItems = document.querySelectorAll('.h-sidebar-leftfixed .h-menu-item');
for (const item of menuItems) {
  const span = item.querySelector('span');
  if (span && span.textContent.includes('业务管理子系统')) {
    item.click();
    break;
  }
}
```

**步骤二：点击子菜单项**

```javascript
// playwright_evaluate: 点击额度管理子菜单
const subItems = document.querySelectorAll('.h-sidebar .h-menu-item');
for (const item of subItems) {
  const span = item.querySelector('span');
  if (span && span.textContent.includes('额度申请')) {
    item.click();
    break;
  }
}
```

**步骤三：验证页面加载**

```javascript
// playwright_evaluate: 验证页面已加载
!!document.querySelector('.h-datagrid') || !!document.querySelector('button:has-text("查询")')
```

### 3.3 回退方案

如果菜单点击导航失败（菜单结构变化或文本不匹配），可尝试直接 URL 导航：

```
playwright_navigate → http://127.0.0.1:8091/#/pc/credit/acceptBankCreditGrantBatch
```

> 直接 URL 导航仅在路由已被其他方式注册过时才有效，首次访问必须通过菜单点击。

## 4. HUI 组件交互工作流（Playwright MCP版）

### 4.1 h-datagrid（数据表格）

**等待加载**：

```javascript
// playwright_evaluate: 检查DataGrid已渲染
!!document.querySelector('.h-datagrid')
```

**获取行数**：

```javascript
// playwright_evaluate: 获取DataGrid当前行数
document.querySelectorAll('.h-datagrid tbody tr').length
```

**获取单元格文本**：

```javascript
// playwright_evaluate: 获取第N行第M列文本
document.querySelectorAll('.h-datagrid tbody tr')[N-1].querySelectorAll('td')[M-1].textContent.trim()
```

**行选择**：

```
playwright_click → .h-datagrid tbody tr:nth-child(N) .h-checkbox
```

> 选择后等待 500ms 让 Vue 的 currentSelectList 同步完成。

### 4.2 h-msg-box（弹窗对话框）

**打开弹窗**：

```
1. playwright_click → button:has-text("新增")
2. playwright_evaluate → !!document.querySelector('.h-msg-box:visible')  （等待弹窗可见）
```

**关闭弹窗**：

```
playwright_click → .h-msg-box-close:visible
```

**嵌套弹窗定位**：当多个弹窗叠加时，使用 `.h-msg-box:visible` 的最后一个定位最内层弹窗：

```javascript
// playwright_evaluate: 获取最内层弹窗标题
const boxes = document.querySelectorAll('.h-msg-box:visible');
boxes[boxes.length - 1].querySelector('.h-msg-box-title').textContent
```

### 4.3 h-select（下拉选择）

```
1. playwright_click → .h-select-selection  （触发下拉）
2. playwright_evaluate → !!document.querySelector('.h-select-dropdown:visible')  （等待下拉列表）
3. playwright_click → .h-select-dropdown li:has-text("选项文本")
```

### 4.4 h-date-picker（日期选择器）

h-date-picker 不能通过 `playwright_fill` 直接输入日期，需要通过 `playwright_evaluate` 设置 Vue 组件数据：

```javascript
// playwright_evaluate: 设置日期选择器值
const picker = document.querySelector('.h-date-picker input');
const vueInstance = picker.__vue__;
if (vueInstance) {
  vueInstance.$emit('input', '2025-05-15');
  vueInstance.$emit('change', '2025-05-15');
}
```

### 4.5 h-typefield（金额输入框）

h-typefield 是特殊的格式化输入组件，`playwright_fill` 可能不触发 Vue 双向绑定。推荐使用 `playwright_evaluate` 直接修改 Vue 实例 data：

```javascript
// playwright_evaluate: 设置金额输入框值
const input = document.querySelector('.h-typefield input');
const vueInstance = input.__vue__ || input.closest('[class*="h-typefield"]').__vue__;
if (vueInstance) {
  vueInstance.currentValue = '1000000.00';
  vueInstance.$emit('input', '1000000.00');
  vueInstance.$emit('change', '1000000.00');
}
```

> 直接修改 Vue data 是因为 document.execCommand('insertText') 不触发 Vue v-model 绑定，导致提交时值仍为空。

## 5. 状态流转验证工作流（Playwright MCP版）

### 5.1 完整状态机

```
草稿(0) → 待复核(1) → 已复核(5)
   ↑          ↓
   └──撤销提交──┘    ←──撤销复核──→ 已复核(5)回退到待复核(1)
```

### 5.2 验证模式

**单页面状态流转**：

```
1. playwright_screenshot → 记录操作前状态
2. playwright_click → 操作按钮（如"提交复核"）
3. playwright_click → .h-msg-box button:has-text("确定")  （处理确认弹窗）
4. playwright_evaluate → 提取状态列文本
5. 断言状态变更
```

**提取状态列文本**：

```javascript
// playwright_evaluate: 获取选中行的状态文本
const rows = document.querySelectorAll('.h-datagrid tbody tr');
for (const row of rows) {
  const cells = row.querySelectorAll('td');
  // 假设状态列为第N列
  const statusText = cells[N-1].textContent.trim();
  if (row.querySelector('.h-checkbox-checked')) {
    return statusText;
  }
}
return null;
```

### 5.3 跨页面验证

额度申请页面提交后，需导航到额度复核页面验证状态：

```
1. 在额度申请页面执行"提交复核"
2. 通过菜单点击导航到额度复核页面
3. playwright_evaluate → 在复核页面DataGrid中查找对应记录
4. 验证状态为"待复核"
```

## 6. API 请求监控工作流

### 6.1 使用 playwright_expect_response 监听

在执行操作前设置 API 监听，操作后验证请求路径：

```
1. playwright_expect_response → 设置监听URL模式
2. 执行UI操作（如点击查询）
3. playwright_assert_response → 验证响应状态码和路径
```

### 6.2 使用 playwright_evaluate 注入拦截器

```javascript
// playwright_evaluate: 注入fetch拦截器记录API请求
window.__capturedRequests = window.__capturedRequests || [];
const originalFetch = window.fetch;
window.fetch = function(...args) {
  window.__capturedRequests.push(args[0]);
  return originalFetch.apply(this, args);
};

// 后续通过 playwright_evaluate 获取捕获的请求
// JSON.stringify(window.__capturedRequests)
```

### 6.3 验证个性化路径前缀

```javascript
// playwright_evaluate: 检查捕获的请求是否包含个性化前缀
const requests = window.__capturedRequests || [];
const personalizedRequests = requests.filter(r => r.includes('/hnnxbank/'));
personalizedRequests.length > 0
```

### 6.4 关键 API 端点列表

| 端点 | 用途 | 个性化路径示例 |
|------|------|---------------|
| func_pagingQueryCreditBatchList | 额度批次分页查询 | /hnnxbank/bm/credit/func_pagingQueryCreditBatchList |
| func_pagingQueryCreditInfoList | 额度明细分页查询 | /hnnxbank/bm/credit/func_pagingQueryCreditInfoList |
| func_addCreditBatch | 新增额度批次 | /hnnxbank/bm/credit/func_addCreditBatch |
| func_delCreditBatch | 删除额度批次 | /hnnxbank/bm/credit/func_delCreditBatch |
| func_addCreditInfo | 新增额度明细 | /hnnxbank/bm/credit/func_addCreditInfo |
| func_delCreditInfo | 删除额度明细 | /hnnxbank/bm/credit/func_delCreditInfo |
| func_modCreditInfo | 修改额度明细 | /hnnxbank/bm/credit/func_modCreditInfo |
| func_submitReCheckGrantInfo | 提交复核 | /hnnxbank/bm/credit/func_submitReCheckGrantInfo |
| func_cancelSubmitReCheckGrantInfo | 撤销提交 | /hnnxbank/bm/credit/func_cancelSubmitReCheckGrantInfo |
| func_reCheckGrantInfo | 复核 | /hnnxbank/bm/credit/func_reCheckGrantInfo |
| func_cancelReCheckGrantInfo | 撤销复核 | /hnnxbank/bm/credit/func_cancelReCheckGrantInfo |

## 7. 测试数据管理策略

### 7.1 测试数据创建

- **通过API直接创建**：使用 `playwright_post` 发送请求，适合批量数据准备
- **通过UI操作创建**：模拟用户操作流程，适合验证完整业务链路

### 7.2 测试数据清理

- **通过API删除**：使用 `playwright_delete` 发送请求，适合测试后清理
- **数据库直接清理**：通过 Oracle MCP 工具执行 SQL，适合大量数据清理

### 7.3 数据库表

| 表名 | Schema | 用途 |
|------|--------|------|
| HNNX_ACCBANK_CREDIT_BATCH | BBEP | 额度批次表 |
| HNNX_ACCBANK_CREDIT_INFO | BBEP | 额度明细表 |

### 7.4 测试账号

| 账号 | 密码 | 说明 |
|------|------|------|
| wangnan01 | abc@123 | 默认测试账号（非123456） |

## 8. 断言策略

### 8.1 文本断言

```javascript
// playwright_evaluate: 提取文本并与预期值比较
const text = document.querySelector('.status-column').textContent.trim();
text === '待复核'
```

### 8.2 元素存在断言

```javascript
// playwright_evaluate: 检查元素是否存在
!!document.querySelector('.h-datagrid')
```

### 8.3 行数断言

```javascript
// playwright_evaluate: 获取DataGrid行数并与预期值比较
document.querySelectorAll('.h-datagrid tbody tr').length > 0
```

### 8.4 状态断言

```javascript
// playwright_evaluate: 提取状态列文本与状态枚举值比较
const statusMap = {'0': '草稿', '1': '待复核', '5': '已复核'};
const statusText = document.querySelectorAll('.h-datagrid tbody tr')[0].querySelectorAll('td')[statusColIndex].textContent.trim();
Object.values(statusMap).includes(statusText)
```

### 8.5 API 响应断言

使用 `playwright_assert_response` 验证：
- 状态码为 200
- 响应体包含预期字段
- 响应路径包含个性化前缀

## 9. 完整测试流程示例

以"额度批次新增→查询→删除"为例：

```
1. playwright_navigate → 登录页
2. playwright_fill → 用户名、密码
3. playwright_click → 登录按钮
4. playwright_click → 强制登录确认
5. playwright_evaluate → 点击业务管理子系统菜单
6. playwright_evaluate → 点击额度申请子菜单
7. playwright_evaluate → 验证页面加载
8. playwright_click → 新增按钮
9. playwright_fill → 填写批次信息
10. playwright_click → 确定按钮
11. playwright_screenshot → 记录新增结果
12. playwright_evaluate → 获取DataGrid行数，验证新增成功
13. playwright_click → 选择新增的行
14. playwright_click → 删除按钮
15. playwright_click → 确认删除弹窗
16. playwright_evaluate → 获取DataGrid行数，验证删除成功
17. playwright_console_logs → 检查控制台无错误
```

## 10. 批量导入与文件上传工作流（Playwright MCP版）

### 10.1 h-upload 组件的 MCP 限制

**核心问题**：Playwright MCP 的 `playwright_upload_file` 工具严格要求 `input[type="file"]` 元素可见，但 BEMP 的 `h-upload` 组件将 file input 设为不可见状态（`display: none`），导致 MCP 工具无法完成文件上传操作。

**影响范围**：
- 机构信息批量导入
- 管理员批量导入
- 所有使用 h-upload 组件的文件上传场景

**MCP 模式解决方案**（有限）：
- 可打开批量导入弹窗并验证弹窗内容
- 可验证模板下载功能
- 可验证导入预览表格列头
- **无法**完成实际文件上传

**完整 Playwright 脚本解决方案**：
```python
# 使用 fileChooser 事件处理文件上传
async with page.expect_file_chooser() as fc_info:
    upload_trigger = page.locator('.h-upload').first
    await upload_trigger.click(timeout=5000)

file_chooser = await fc_info.value
await file_chooser.set_files(file_path)
```

### 10.2 批量导入弹窗验证流程

```
1. playwright_click → button:has-text("批量导入")
2. playwright_evaluate → !!document.querySelector('.h-msg-box:visible')  （等待弹窗）
3. playwright_screenshot → 记录弹窗内容
4. playwright_evaluate → 检查弹窗内表格列头是否包含"是否简单机构"等预期列
5. playwright_click → .h-msg-box-close:visible  （关闭弹窗）
```

### 10.3 模板下载验证流程

```
1. playwright_click → button:has-text("导入模板下载")
2. playwright_evaluate → 检查是否触发下载（监听网络请求或 download 事件）
3. 验证下载文件名和内容
```

### 10.4 批量复制角色验证流程

```
1. playwright_click → button:has-text("批量复制角色")
2. playwright_evaluate → !!document.querySelector('.h-msg-box:visible')
3. playwright_evaluate → 检查弹窗是否包含"目标机构号"字段
4. playwright_click → .h-msg-box button:has-text("确定")  （不选目标直接确定）
5. playwright_evaluate → 检查是否出现必输校验提示
6. playwright_screenshot → 记录校验结果
```

## 11. BEMP 登录深度解析（Playwright 脚本版）

### 11.1 密码加密机制

BEMP 登录使用 SM4 加密（非 DES），加密在 `login()` API 函数内部自动完成：

```
1. 前端调用 getKeys('SM4') 获取密钥 key1
2. 用 SM4DecryptLogin(key1) 解密得到实际 key
3. 用 SM4Encrypt(password, key) 加密密码
4. 发送加密后的 userNo 和 password 到后端
```

**关键发现**：
- `loginForm.password` 应设为**明文密码**，加密在 API 层自动完成
- `tempPassword` 是用户可见的密码输入框，`password` 是隐藏的加密后字段
- `pwdBlur()` 方法使用旧的 DES 加密，仅用于前端预校验（`/checkUserNameOrPwd.json`），不影响实际登录

### 11.2 正确的登录表单填写方式

```python
# Playwright Python 脚本 - 正确的登录方式
# 方式1：直接填写表单字段
await page.fill('input[name="username"]', username)
await page.fill('input[name="tempPassword"]', password)
await page.wait_for_timeout(1000)  # 等待前端处理
await page.click('button.h-btn-primary')

# 方式2：通过 Vue 实例设置（更可靠）
await page.evaluate("""() => {
    const vue = document.querySelector('#app').__vue__;
    const loginComp = vue.$children.find(c => c.loginForm);
    if (loginComp) {
        loginComp.loginForm.userNo = '%s';
        loginComp.loginForm.username = '%s';
        loginComp.loginForm.tempPassword = '%s';
        loginComp.loginForm.password = '%s';
        loginComp.loginForm.forceLogin = '1';
        loginComp.handleLogin();
    }
}""" % (username, username, password, password))
```

### 11.3 登录字段映射

| 字段名 | 类型 | 用途 | 说明 |
|--------|------|------|------|
| `input[name="username"]` | 可见 | 用户名输入 | placeholder="用户名" |
| `input[name="tempPassword"]` | 可见 | 密码输入 | placeholder="密码"，用户可见 |
| `input[name="password"]` | 隐藏 | 加密后密码 | 由前端JS自动填充 |
| `button.h-btn-primary` | 按钮 | 登录按钮 | type="button", text="登录" |

### 11.4 账号锁定机制

- 密码错误次数达到配置值（默认10次，网商银行配置3次）时自动锁定
- 锁定后 `IS_ENABLE` 被设为 `0`，需管理员解锁
- 解锁API：`/sm/auth/branch/branchAdmin/func_unLockLegalPersonManager`
- 数据库字段映射：`USER_NO`(非USER_CODE)、`IS_ENABLE`(非STATUS)、`LOGIN_STATUS`(非LOCK_FLAG)、`PWD_ERR_TIMES`(非LOGIN_FAIL_COUNT)

## 12. 数据隔离验证工作流

### 12.1 双账号对比测试模式

```
1. 账号A（法人管理员）登录 → 导航到目标页面 → 记录数据列表
2. 账号B（分行柜员）登录 → 导航到同一页面 → 记录数据列表
3. 对比两个账号的数据范围差异
```

### 12.2 权限验证要点

- 法人管理员(userType=4)：可见全部菜单和按钮（含批量导入）
- 分行柜员(userType=3)：仅可见授权菜单，无系统管理权限
- 权限校验前后端双重保障：前端隐藏菜单 + 后端API返回"权限不足"

### 12.3 多选组件验证

```javascript
// playwright_evaluate: 检查选择组件是否为多选
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

## 13. 弹窗重叠BUG处理

### 13.1 问题描述

在机构管理页面中，点击"批量导入"按钮弹出导入弹窗后，关闭弹窗再点击"批量复制角色"会导致两个弹窗同时存在且重叠，批量导入弹窗的关闭按钮无法正常关闭。

### 13.2 临时解决方案

```javascript
// playwright_evaluate: 强制移除残留弹窗
document.querySelectorAll('.h-modal-mask, .h-modal, .h-msg-box-wrapper').forEach(el => el.remove());
```

### 13.3 预防措施

- 每次弹窗操作后，立即截图确认弹窗已完全关闭
- 打开新弹窗前，先检查是否有残留弹窗
- 使用 `playwright_evaluate` 检查可见弹窗数量

## 14. Playwright MCP vs 完整脚本能力对比

| 操作 | Playwright MCP | Playwright Python 脚本 |
|------|---------------|----------------------|
| 页面导航 | ✅ playwright_navigate | ✅ page.goto() |
| 元素点击 | ✅ playwright_click | ✅ page.click() |
| 表单填写 | ⚠️ 有限（HUI组件问题） | ✅ page.fill() + evaluate |
| 文件上传 | ❌ h-upload不可见input | ✅ fileChooser API |
| 截图 | ✅ playwright_screenshot | ✅ page.screenshot() |
| JS执行 | ⚠️ 返回值可能undefined | ✅ page.evaluate() |
| 多标签页 | ⚠️ 有限 | ✅ browser.new_context() |
| 下载验证 | ⚠️ 有限 | ✅ expect_download |
| 网络监听 | ⚠️ 有限 | ✅ page.on('request') |

**建议**：对于文件上传等复杂交互，优先使用 Playwright Python 脚本而非 MCP 工具调用。
