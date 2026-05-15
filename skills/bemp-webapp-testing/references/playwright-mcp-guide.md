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
