# BEMP 常见错误分类和处理

## 快速定位索引（先查此表，只读命中章节，避免整读本文档）

| 症状/关键词 | 跳转章节 |
|:---|:---|
| TypeError/undefined/渲染报错 | 1. TypeError 系列 |
| 超时/连接拒绝/503 | 2. 网络错误系列 |
| 点击无反应/元素不可交互 | 3. 组件交互错误、5. 事件绑定错误 |
| 页面跳转回主页/URL不对 | 4. 个性化路径错误、12. Vue 动态路由导航失败 |
| 属性写了对但不生效 | 6. 组件属性拼写错误、7. 组件 name 属性冲突 |
| 接口报错/返回数据异常 | 8. 后端代码缺陷 |
| 上传失败/树组件报错 | 9. 文件上传与树组件交互错误 |
| mvn 编译失败/jar 删除不了 | 10. Maven构建与编译错误、15. Maven 编译文件锁定 |
| 查询出非本机构数据 | 11. 机构数据隔离相关错误 |
| 金额修改后列表未更新 | 13. h-typefield 值绑定失效 |
| 勾选后报"ID不能为空" | 14. checkbox 选择后数据未同步 |
| 导出提示"未配置导出模板" | 16. 导出模板未配置 |
| 提示文案与需求文档不符 | 17. 提示文本与需求文档不一致 |
| 按钮不可见/流程走不通 | 18. 按钮权限 isShow=false 不可见 |
| 时效类校验结果与预期不符 | 19. 业务日期基准与用例设计假设偏差 |
| MCP 改数后应用行为未变 | 20. 应用 schema 与 MCP 连接库不一致 |
| 索引管理脚本报错中断 | 21. 索引管理脚本自身异常 |

## 错误分级标准

| 级别 | 标识 | 定义 | 测试处理 |
|------|------|------|----------|
| P0-致命 | FATAL | 系统崩溃、数据丢失、安全漏洞 | 立即停止测试，报告问题 |
| P1-严重 | CRITICAL | 核心功能不可用、JS运行时错误 | 标记测试失败，记录详情 |
| P2-一般 | MAJOR | 非核心功能异常、UI显示错误 | 标记测试失败，可继续其他测试 |
| P3-轻微 | MINOR | 样式问题、文案错误 | 记录但不阻塞测试 |
| P4-提示 | INFO | 控制台警告、性能提示 | 仅记录 |

> 错误过滤规则可在 `config/test_config.json` 的 `error_filters` 节点配置

## 常见错误目录

### 1. TypeError 系列

#### 1.1 setCheckedNodes is not a function

**错误信息**：
```
TypeError: this.$refs.branchSearchTree.setCheckedNodes is not a function
```

**根因**：树组件不支持 `setCheckedNodes` 方法，或组件未正确渲染导致 ref 为空。

**影响范围**：机构查询弹窗的重置和关闭操作。

**修复方案**：
```javascript
if (this.$refs.branchSearchTree) {
  if (typeof this.$refs.branchSearchTree.setCheckedNodes === 'function') {
    this.$refs.branchSearchTree.setCheckedNodes([]);
  } else if (typeof this.$refs.branchSearchTree.setCheckedKeys === 'function') {
    this.$refs.branchSearchTree.setCheckedKeys([]);
  } else if (typeof this.$refs.branchSearchTree.clearChecked === 'function') {
    this.$refs.branchSearchTree.clearChecked();
  }
}
```

**测试验证**：
- 点击重置按钮后检查控制台无 TypeError
- 点击关闭按钮后检查弹窗正常关闭且无错误
- 点击X按钮后检查弹窗正常关闭且无错误

#### 1.2 resetFields is not a function / Cannot read properties of undefined

**错误信息**：
```
TypeError: Cannot read properties of undefined (reading 'resetFields')
```

**根因**：表单 ref 在弹窗关闭后不存在，或 ref 名称与模板不匹配。

**修复方案**：
```javascript
if (this.$refs.formItem && typeof this.$refs.formItem.resetFields === 'function') {
  this.$refs.formItem.resetFields();
}
```

### 2. 网络错误系列

#### 2.1 ERR_CONNECTION_REFUSED

**错误信息**：
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

**根因**：后端服务未启动或端口不正确。

**测试处理**：终止测试，提示启动后端服务。

#### 2.2 ChunkLoadError

**错误信息**：
```
ChunkLoadError: Loading chunk banks/{bank_id}/xxx failed
```

**根因**：
1. 个性化组件文件不存在或路径错误
2. 前端编译未包含个性化文件
3. 网络问题导致懒加载失败

**排查步骤**：
1. 确认个性化 vue 文件存在于正确目录（`views/bizViews/banks/{bank_id}/`）
2. 确认 `{bank_id}Index.js` 中路径映射正确
3. 清除浏览器缓存后重试
4. 检查前端编译输出是否包含该 chunk

#### 2.3 会话已失效

**错误信息**：
```
会话已失效,请重新登录
invalid auth
网络通信失败,服务器异常
```

**根因**：
1. 后端服务重启导致会话失效
2. WebSocket 连接断开
3. 登录凭据过期

**测试处理**：重新登录系统，处理强制登录弹窗。

### 3. 组件交互错误

#### 3.1 弹窗关闭无反应

**现象**：点击关闭按钮后弹窗不关闭。

**根因**：`@on-close` 事件绑定的方法没有设置弹窗显隐变量为 `false`。

**修复方案**：
```vue
<h-msg-box v-model="dialogVisible" @on-close="closeDialog">

<script>
closeDialog() {
  this.dialogVisible = false;
  this.resetForm();
}
</script>
```

#### 3.2 弹窗打开后内容为空

**现象**：弹窗打开后表单字段不显示。

**根因**：
1. 弹窗内容依赖异步数据，未等待数据加载完成
2. 弹窗 `v-if` 条件不满足
3. 组件懒加载失败

**测试处理**：
```python
page.wait_for_selector('.h-msg-box:visible .h-form-item', timeout=5000)
page.wait_for_timeout(500)
```

### 4. 个性化路径错误

#### 4.1 请求未走个性化路径

**现象**：API 请求使用产品化路径而非当前银行的个性化前缀。

**根因**：
1. 前端页面未使用个性化 vue 文件
2. 个性化 vue 文件中 URL 未修改
3. 全局组件覆盖未生效

**排查步骤**：
1. 确认个性化 vue 文件存在于 `views/bizViews/banks/{bank_id}/` 目录
2. 确认文件名和目录结构与产品化一致
3. 确认 `{bank_id}Index.js` 中有对应路径映射
4. 检查浏览器 Network 面板确认加载的组件来源

#### 4.2 路径映射缺少 `/` 符号（高频缺陷）

**现象**：页面白屏或 ChunkLoadError，浏览器控制台报 `Loading chunk banks/{bank_id}/xxx failed`。

**根因**：`{bank_id}Index.js` 中 import 路径使用 `@views/` 而非 `@/views/`，缺少 `@` 后的 `/`，导致 webpack 无法解析路径。

**错误示例**：
```javascript
'/bm/sign/cpes/custCorpSign': () => import(/* webpackChunkName: "banks/{bank_id}/bm/sign/cpes/custCorpSign" */`@views/bizViews/banks/{bank_id}/bm/sign/cpes/custCorpSign.vue`)
```

**正确示例**：
```javascript
'/bm/sign/cpes/custCorpSign': () => import(/* webpackChunkName: "banks/{bank_id}/bm/sign/cpes/custCorpSign" */`@/views/bizViews/banks/{bank_id}/bm/sign/cpes/custCorpSign.vue`)
```

**预防措施**：每次新增或修改 `{bank_id}Index.js` 路径映射时，必须确认路径以 `@/views/` 开头。

**批量检查命令**：
```powershell
Select-String -Path "frontend\src\api\bank\*Index.js" -Pattern "@views/" | Select-Object -Property LineNumber, Line
```

### 5. 事件绑定错误（高频缺陷）

#### 5.1 h-button 使用 @on-click 而非 @click

**现象**：按钮点击无任何响应，无报错信息。

**根因**：`@on-click` 是 iView/View Design 的旧写法，h_ui 组件库使用 `@click`。在 h_ui 的 `h-button` 组件上使用 `@on-click` 不会触发事件。

**错误示例**：
```vue
<h-button type="primary" @on-click="downloadModel()">导入模板下载</h-button>
<h-button type="primary" @on-click="batchImport()">批量导入</h-button>
```

**正确示例**：
```vue
<h-button type="primary" @click="downloadModel()">导入模板下载</h-button>
<h-button type="primary" @click="batchImport()">批量导入</h-button>
```

**预防措施**：h_ui 组件的事件绑定统一使用 `@click`、`@change`、`@input` 等标准写法，不使用 `@on-` 前缀。

**批量检查命令**：
```powershell
Select-String -Path "frontend\src\views\bizViews\banks\{bank_id}\**\*.vue" -Pattern "@on-click" -Recurse | Select-Object -Property Filename, LineNumber, Line
```

### 6. 组件属性拼写错误

#### 6.1 列属性 Col 应为 hiddenCol

**现象**：列隐藏逻辑不生效，应该隐藏的列仍然显示。

**根因**：DataGrid 列配置中使用了不存在的 `Col` 属性，正确的属性名为 `hiddenCol`。

**错误示例**：
```javascript
{ title: '操作', key: 'action', Col: false }
```

**正确示例**：
```javascript
{ title: '操作', key: 'action', hiddenCol: false }
```

**预防措施**：DataGrid 列属性参考 h_ui 文档，常用属性包括 `title`、`key`、`width`、`hiddenCol`、`sortable`、`render` 等。

### 7. 组件 name 属性冲突

#### 7.1 个性化vue文件name与文件名不一致

**现象**：页面加载时出现 ChunkLoadError 或组件渲染异常。

**根因**：Vue 组件的 `name` 属性与文件名不一致，或与其他组件重名，导致 webpack chunk 解析混乱。

**错误示例**：
```javascript
// 文件名: custCorpSignRecord.vue
export default {
    name: "custCorpSign",  // 与 custCorpSign.vue 重名
    ...
}
```

**正确示例**：
```javascript
// 文件名: custCorpSignRecord.vue
export default {
    name: "custCorpSignRecord",  // 与文件名一致
    ...
}
```

**预防措施**：每个个性化vue文件的 `name` 属性必须与文件名（不含扩展名）完全一致。

### 8. 后端代码缺陷

#### 8.1 冗余 @Component 注解

**现象**：Service 类同时使用 `@CloudComponent` 和 `@Component`，可能导致 Bean 注册冲突。

**根因**：`@CloudComponent` 注解已包含 Spring 组件注册功能，`@Component` 是冗余的。

**修复方案**：移除 `@Component` 注解，仅保留 `@CloudComponent`。

**预防措施**：个性化 Service/Atom 实现类只需 `@CloudComponent` + `@CustomizedBean` 两个注解。

#### 8.2 空 catch 块

**现象**：异常被静默吞掉，排查问题时无法追踪错误原因。

**根因**：catch 块为空，没有任何日志记录。

**修复方案**：
```java
} catch (Exception e) {
    logger.warn("查询下级机构失败，机构号[{}]，错误：{}", brchNo, e.getMessage());
}
```

**预防措施**：catch 块至少添加 `logger.warn` 级别日志，禁止空 catch 块。

## 错误报告模板

```markdown
### 错误报告

**错误级别**：P1-严重
**错误类型**：TypeError
**错误信息**：`this.$refs.branchSearchTree.setCheckedNodes is not a function`
**触发页面**：[页面名称]
**触发操作**：点击重置按钮
**影响范围**：弹窗重置和关闭功能不可用
**银行环境**：[bank_id]
**复现步骤**：
1. 进入[页面名称]
2. 点击"查询机构"按钮
3. 点击"重置"按钮
4. 控制台报错

**修复建议**：增加 ref 存在性和方法可用性判断
**修复优先级**：高
```

## 错误快速索引

> 按错误现象快速定位对应的错误类型和修复方案。

| 错误现象 | 错误类型 | 索引 |
|---------|---------|------|
| 按钮点击无反应 | 事件绑定错误 | 5.1 |
| 页面白屏 | 路径映射/ChunkLoadError | 4.2 / 2.2 |
| 弹窗关闭报错 | ref空指针 | 1.1 / 1.2 |
| 列隐藏不生效 | 属性拼写错误 | 6.1 |
| 组件加载失败 | name冲突/路径错误 | 7.1 / 4.2 |
| API返回404 | 服务未启动 | 2.1 |
| 会话失效 | 后端重启 | 2.3 |
| 弹窗内容为空 | 异步加载 | 3.2 |
| 个性化路径未生效 | 路由覆盖问题 | 4.1 |
| 文件上传失败 | 组件交互 | 9.1 |
| 树节点操作报错 | 树组件API | 1.1 / 9.2 |
| 后端日志无异常信息 | 空catch块 | 8.2 |
| 直接URL导航页面空白 | Vue动态路由未注册 | 12 |
| 金额修改后提交未更新 | h-typefield值绑定失效 | 13 |
| 选中行后操作报ID为空 | checkbox数据同步延迟 | 14 |
| mvn clean报Failed to delete | Maven文件锁定 | 15 |
| 清单导出提示模板未配置 | 导出模板缺失 | 16 |
| 提示文本与需求文档不一致 | 文案差异 | 17 |
| 按钮不可见流程走不通 | 按钮权限 isShow=false | 18 |
| 时效类数据校验结果不符 | 业务日期基准偏差 | 19 |
| MCP改数据应用无反应 | 应用schema与MCP连接库不一致 | 20 |
| 索引管理脚本报错中断 | 脚本自身解析异常 | 21 |

## 9. 文件上传与树组件交互错误

### 9.1 文件上传组件交互失败

**现象**：点击"批量导入"按钮后，文件选择对话框不弹出或上传无响应。

**根因**：
1. h-upload 组件的 `action` 属性未正确配置后端接口地址
2. 上传前钩子 `before-upload` 返回 false 阻止了上传
3. 文件格式校验不通过

**排查步骤**：
1. 检查 h-upload 的 `action` 属性是否指向正确的个性化路径
2. 检查 `before-upload` 钩子逻辑
3. 检查浏览器 Network 面板确认上传请求是否发出

**测试验证**：
```python
page.click('button:has-text("批量导入")')
page.wait_for_selector('.h-msg-box:visible', timeout=5000)
page.wait_for_timeout(500)
page.screenshot(path="upload_dialog.png")
```

### 9.2 树组件操作报错

**现象**：操作树节点（选中、取消选中、展开）时控制台报 TypeError。

**根因**：
1. 树组件 ref 在弹窗未打开时为 undefined
2. 使用了树组件不支持的方法（如 setCheckedNodes）
3. 异步加载子节点时数据未返回

**修复方案**：
```javascript
if (this.$refs.treeRef) {
  if (typeof this.$refs.treeRef.setCheckedKeys === 'function') {
    this.$refs.treeRef.setCheckedKeys([]);
  } else if (typeof this.$refs.treeRef.clearChecked === 'function') {
    this.$refs.treeRef.clearChecked();
  }
}
```

**预防措施**：所有树组件操作前必须判断 ref 存在性和方法可用性。

## 10. Maven构建与编译错误

### 10.1 Maven编译失败

**现象**：后端代码修改后 Maven 编译报错。

**常见原因**：
1. Java 语法错误（缺少导入、类型不匹配）
2. 依赖未下载完成
3. 本地仓库缓存损坏

**排查步骤**：
```powershell
# 清理并重新编译
mvn clean compile -pl banks/ext-{bank_id}/{bank_id}-biz-as -am

# 跳过测试编译
mvn clean compile -DskipTests -pl banks/ext-{bank_id}/{bank_id}-biz-as -am
```

### 10.2 前端webpack编译错误

**现象**：前端开发服务器启动后显示编译错误。

**常见原因**：
1. Vue 文件语法错误（模板、脚本、样式）
2. import 路径错误（如 `@views/` 应为 `@/views/`）
3. 组件 name 重复导致 chunk 冲突

**排查步骤**：
1. 查看终端编译错误信息，定位出错的文件和行号
2. 修复语法或路径错误
3. webpack 热更新会自动重新编译

## 11. 机构数据隔离相关错误

### 11.1 查询结果包含非本机构数据

**现象**：使用非管理员账号查询时，结果中包含其他机构的数据。

**根因**：
1. 后端查询未添加机构过滤条件
2. ThreadLocal 中机构信息未正确设置
3. 个性化 Service 未正确覆盖产品化查询逻辑

**排查步骤**：
1. 检查后端 Controller 是否正确获取当前用户机构号
2. 检查 Service 查询方法是否包含机构过滤条件
3. 检查 ThreadLocal 是否在 finally 块中清理

**预防措施**：
- 所有涉及机构数据的查询必须添加机构过滤
- ThreadLocal 使用后必须在 finally 块中 remove
- 个性化 Service 使用 `@CustomizedBean` 注解确保覆盖生效

## 12. Vue 动态路由导航失败

### 12.1 直接URL导航后页面空白

**现象**：通过 `playwright_navigate` 直接导航到功能页面 URL 后，页面显示空白或 404。

**根因**：BEMP 使用 Vue 懒加载路由，路由配置在菜单点击时动态注册。直接 URL 导航时路由尚未注册，Vue Router 无法匹配对应组件。

**解决方案**：通过菜单点击触发路由注册：

```javascript
// playwright_evaluate: 点击子系统选项卡触发路由注册
const menuItems = document.querySelectorAll('.h-sidebar-leftfixed .h-menu-item');
for (const item of menuItems) {
  const span = item.querySelector('span');
  if (span && span.textContent.includes('业务管理子系统')) {
    item.click();
    break;
  }
}
```

**回退方案**：如果菜单点击失败，尝试 `playwright_navigate` 直接 URL（仅在路由已被注册过时有效）。

**预防措施**：所有功能页面导航优先使用菜单点击方式，直接 URL 导航仅作为回退方案。

## 13. h-typefield 值绑定失效

### 13.1 金额修改后提交，列表未更新

**现象**：在弹窗中修改 h-typefield 金额输入框的值后点击确定，提交成功但列表中金额未变更。

**根因**：`document.execCommand('insertText')` 或 `playwright_fill` 不触发 Vue v-model 双向绑定，Vue 实例 data 中的值仍为初始值。

**解决方案**：使用 `playwright_evaluate` 直接修改 Vue 实例 data 并触发事件：

```javascript
// playwright_evaluate: 直接修改Vue实例数据
const input = document.querySelector('.h-typefield input');
const vueInstance = input.__vue__ || input.closest('[class*="h-typefield"]').__vue__;
if (vueInstance) {
  vueInstance.currentValue = '1000000.00';
  vueInstance.$emit('input', '1000000.00');
  vueInstance.$emit('change', '1000000.00');
}
```

**预防措施**：所有 HUI 格式化输入组件（h-typefield、h-date-picker）优先使用 `playwright_evaluate` 修改 Vue 数据，而非 `playwright_fill`。

## 14. checkbox 选择后数据未同步

### 14.1 选中行后操作报"ID不能为空"

**现象**：在 DataGrid 中选中行后点击操作按钮（如删除、提交复核），后端返回"ID不能为空"错误。

**根因**：DataGrid 的 `currentSelectList` 数据同步存在延迟，选中 checkbox 后 Vue 数据尚未更新完成就触发了操作。

**解决方案**：选择行后等待 500ms 让 Vue 数据同步：

```
1. playwright_click → .h-datagrid tbody tr:nth-child(N) .h-checkbox
2. 等待 500ms
3. playwright_click → 操作按钮
```

**预防措施**：所有 DataGrid 行选择操作后，统一等待 500ms 再执行后续操作。

## 15. Maven 编译文件锁定

### 15.1 mvn clean install 报 Failed to delete jar

**现象**：执行 `mvn clean install` 时报错 `Failed to delete ...jar`，无法删除编译产物。

**根因**：SpringBoot 进程仍在运行，占用了 jar 文件导致无法删除。

**解决方案**：先停止 Java 进程再编译：

```powershell
Get-Process -Name java -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*BEMP*" } | Stop-Process -Force
```

**预防措施**：编译前检查是否有 Java 进程占用文件，使用启动脚本的停止功能而非直接 kill 进程。

## 16. 导出模板未配置

### 16.1 清单导出提示"未配置名称为xxx的导出模板"

**现象**：点击"清单导出"按钮后，系统提示"未配置名称为xxx的导出模板"，导出功能不可用。

**根因**：数据库导出模板配置表中缺少对应的模板记录。BEMP的清单导出功能依赖预配置的导出模板，模板定义了导出的字段、格式、样式等。

**已发现的缺失模板**：

| 模板名称 | 所属页面 | 状态 |
|---------|---------|------|
| `acceptBankCreditGrantReCheckExport` | 承兑行额度复核-清单导出 | 未配置 |

**修复方案**：在导出模板配置表中添加对应模板记录，字段与查询列表栏位一致。

**排查步骤**：
1. 确认提示中的模板名称
2. 查询数据库确认模板是否存在：`SELECT * FROM TM_EXPORT_TEMPLATE WHERE TEMPLATE_NAME = '{模板名}'`
3. 若不存在，参考其他已配置的导出模板INSERT新记录
4. 验证导出功能正常

**测试验证**：
```python
export_btn = page.locator("button:has-text('清单导出')").first
export_btn.click()
time.sleep(1)
# 检查是否提示模板未配置
error_msg = page.locator("text=未配置").first
if error_msg.is_visible(timeout=3000):
    record_result("清单导出", "BLOCKED", "导出模板未配置")
```

## 17. 提示文本与需求文档不一致

### 17.1 "请选择"与"请选中"措辞差异

**现象**：系统实际提示文本与需求文档描述存在细微措辞差异，功能逻辑正确但文本不一致。

**已发现的差异**：

| 需求文档 | 实际系统 | 影响页面 | 严重程度 |
|---------|---------|---------|---------|
| 请**选中**一条数据 | 请**选择**一条数据 | 额度申请删除、批复明细操作、额度复核操作 | P3 |

**根因**：前端代码中硬编码的提示文本与需求文档措辞不一致。

**修复方案**：
1. 方案A：修改前端代码中的提示文本，使其与需求文档一致
2. 方案B：更新需求文档，使其与实际系统一致
3. 建议：统一为"请选中一条数据"，更符合业务操作语境

**预防措施**：开发前确认提示文本与需求文档一致，建议使用国际化配置（`$t()`）统一管理提示文本。

## 18. 按钮权限 isShow=false 不可见

### 18.1 按钮权限隐藏导致流程无法走通

**现象**：用例步骤依赖的按钮在页面上找不到（snapshot 中不存在该元素），流程卡在第一步无法继续。

**根因**：按钮绑定了权限控制（`isShow` 属性由当前账号权限决定），测试账号无该操作权限时 `isShow=false`，按钮未渲染。

**处置方案**：经 Vue 实例触发弹窗——通过 `this.$parent` / `this.$children` 链定位目标组件（或按 ref 直调方法）调用弹窗打开方法；**提交仍走真实 UI 通道**（在弹窗内点击真实提交按钮），保留留证效力。处理器配置见 `config/dialog-handlers.json` → `action_handlers.vue-instance-trigger`。

```javascript
// evaluate_script: Vue 实例定位并直调弹窗方法（方法名运行时探测，占位符解析）
(() => {
    const app = document.querySelector('#app').__vue__;
    const target = app.$children.find(c => typeof c['{component_method}'] === 'function')
        || app.$children.flatMap(c => c.$children).find(c => typeof c['{component_method}'] === 'function');
    if (target) {
        target['{component_method}']();
        return '已通过 Vue 实例触发';
    }
    return '未定位到目标组件方法';
})()
```

**验证要点**：触发弹窗走 Vue 实例通道，弹窗内提交动作必须回到真实按钮点击，禁止直接伪造提交请求。

## 19. 业务日期基准与用例设计假设偏差

### 19.1 时效类数据校验结果与用例预期不符

**现象**：时效类测试数据（如"生效期内/已过期/未生效"场景）落库后，系统校验结果与用例预期相反或不确定。

**根因**：用例设计按自然日期假设数据时效，而系统按**业务日期**做时效校验；业务日期与自然日期存在偏差（跨日/时点/初始化差异），导致同样的数据在不同基准下判定结果不同。

**处置方案**：写 SQL 前先查询系统业务日期（获取方式按模块配置解析，禁止硬编码表名），时效类测试数据以系统业务日期为基准做偏移生成；断言前重新读取业务日期校准预期。预检配置见 `config/data-readiness-check.json` → `biz-date-baseline-check`。

**预防措施**：凡用例步骤/前置条件中含日期时效语义的，用例文档标注"以系统业务日期为基准"，数据准备文档写明业务日期获取方法。

## 20. 应用 schema 与 MCP 连接库不一致

### 20.1 MCP 修改数据后应用行为未变化

**现象**：通过数据库 MCP 执行 INSERT/UPDATE 成功后，应用查询不到新数据或行为未变化；或 MCP 查询的统计数与应用页面显示数对不上。

**根因**：应用后端连接的是真实业务 schema，而 MCP 连接的是演示库/另一 schema，两个连接目标不一致，写操作落在应用不读取的库上。

**处置方案**：执行前核实目标 schema 与连接串一致（预检配置见 `config/data-readiness-check.json` → `db-connection-schema-check`）；不一致时走 JDBC 通道执行：

```powershell
# JDBC 通道：连接参数从配置解析（schema/host/port 均为占位符，禁止硬编码真值）
powershell -File "..\bemp-db-operator\scripts\run-oracle-jdbc.ps1" -Schema "{target_schema}" -SqlFile "{sql_file}"
```

**预防措施**：所有写库操作前先跑 schema 一致性预检；schema 值一律从应用连接配置解析链获取，禁止在脚本或 prompt 中写死。

## 21. 索引管理脚本自身异常

### 21.1 manage-index 类脚本解析错误中断

**现象**：执行索引管理类脚本（如用例索引/测试数据索引维护脚本）时，脚本自身报解析错误（格式假设不符、字段数不一致、编码问题）异常中断，索引未产出或产出不完整。

**根因**：脚本对输入格式/环境做了刚性假设（分隔符、编码、字段排列），实际输入与假设不符时脚本在自身解析层崩溃，未进入业务逻辑。

**处置方案**：**降级直编**——改为人工/直编方式维护索引内容，保证索引交付不中断；同时在报告中记录"脚本异常 → 已降级直编"事实及脚本异常信息（错误消息、出错输入特征），供后续修复脚本。禁止静默跳过索引维护。

**预防措施**：索引脚本应输出可解释错误（指出哪一行/哪个字段解析失败）；报告模板预留"降级记录"栏位，降级事实必须留痕可追溯。
