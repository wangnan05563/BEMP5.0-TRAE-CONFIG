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