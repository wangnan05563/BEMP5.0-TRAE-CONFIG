# BEMP 组件交互参考

## 概述

BEMP 前端基于 Vue 2 + 恒生 UI 组件库（h- 前缀组件），本文档记录自动化测试中常见组件的交互方式和注意事项。

> **选择器配置化**：所有组件选择器均可在 `config/test_config.json` 的 `selectors` 节点中配置，代码中通过 `selectors.{key}` 引用，便于不同项目适配。

## 核心组件列表

### h-button（按钮）

**用途**：操作按钮，如新增、修改、删除、查询、导入、导出等。

**事件绑定规则**（重要）：
- h_ui 的 `h-button` 使用 `@click` 而非 `@on-click`
- `@on-click` 是 iView/View Design 的旧写法，在 h_ui 中不生效
- 所有 h_ui 组件的事件绑定均不使用 `@on-` 前缀

```vue
<!-- 正确 -->
<h-button type="primary" @click="handleSubmit()">提交</h-button>
<h-button type="primary" @click="downloadModel()">导入模板下载</h-button>
<h-button type="primary" @click="batchImport()">批量导入</h-button>

<!-- 错误：@on-click 不会触发事件 -->
<h-button type="primary" @on-click="handleSubmit()">提交</h-button>
```

**测试验证**：
```python
page.click('button:has-text("导入模板下载")')
page.wait_for_timeout(1000)
# 验证：如果按钮使用@on-click，点击后无任何反应（无弹窗、无下载、无网络请求）
# 如果按钮使用@click，点击后正常触发对应功能
```

### h-msg-box（弹窗对话框）

**用途**：BEMP 中最常用的弹窗组件，用于新增、编辑、查询等操作。

**DOM 结构**：
```html
<div class="h-msg-box">
  <div class="h-msg-box-header">
    <span class="h-msg-box-title">标题</span>
    <a class="h-msg-box-close">X</a>
  </div>
  <div class="h-msg-box-body">内容</div>
  <div class="h-msg-box-footer">
    <button>关闭</button>
    <button>确定</button>
  </div>
</div>
```

**交互方式**（选择器对应 `selectors` 配置）：
```python
selectors = config.get('selectors', {})

# 打开弹窗
page.click(selectors.get('add_button', 'button:has-text("新增")'))
page.wait_for_selector(selectors.get('msg_box_visible', '.h-msg-box:visible'), timeout=5000)
page.wait_for_timeout(500)

# 关闭弹窗 - X按钮
page.click(selectors.get('msg_box_close', '.h-msg-box-close:visible'))

# 关闭弹窗 - 底部关闭按钮
page.click(selectors.get('msg_box_cancel', '.h-msg-box button:has-text("关闭")'))

# 确认弹窗 - 底部确认按钮
page.click(selectors.get('msg_box_confirm', '.h-msg-box button:has-text("确定")'))

# 最大化弹窗
page.click('.h-msg-box-maximize')
```

**注意事项**：
- 弹窗打开后必须等待 500ms 动画完成
- 多个弹窗同时存在时，使用 `:visible` 选择器定位当前可见弹窗
- `@on-close` 事件绑定方法必须包含 `visible=false` 逻辑，否则弹窗无法关闭
- 弹窗支持 `maximize` 属性，最大化后布局可能变化

### h-datagrid（数据表格）

**用途**：数据列表展示和查询。

**交互方式**：
```python
selectors = config.get('selectors', {})

# 等待数据加载
page.wait_for_selector(selectors.get('datagrid', '.h-datagrid'), timeout=10000)
page.wait_for_load_state('networkidle')

# 点击行选择
page.click(selectors.get('datagrid_first_row', '.h-datagrid tbody tr:first-child'))

# 双击行
page.dblclick(selectors.get('datagrid_first_row', '.h-datagrid tbody tr:first-child'))

# 翻页
page.click(selectors.get('page_next', '.h-page-next'))
page.click(selectors.get('page_prev', '.h-page-prev'))
```

**URL 验证**（使用配置中的个性化前缀）：
```python
from scripts.health_check import load_config, get_bank_config

config = load_config('../config/test_config.json')
bank_config, bank_id = get_bank_config(config)
url_prefix = bank_config.get('url_prefix', '/')

api_urls = []
def on_request(request):
    if 'func_query' in request.url or 'pageQuery' in request.url:
        api_urls.append(request.url)
page.on("request", on_request)

page.click(selectors.get('query_button', 'button:has-text("查询")'))
page.wait_for_load_state('networkidle')

personalized_urls = [u for u in api_urls if url_prefix in u]
```

### h-select（下拉选择）

**交互方式**：
```python
selectors = config.get('selectors', {})

# 打开下拉
page.click(selectors.get('select', '.h-select-selection'))
page.wait_for_selector(selectors.get('select_dropdown', '.h-select-dropdown:visible'), timeout=3000)

# 选择选项
page.click('.h-select-dropdown li:has-text("选项")')
```

### h-date-picker（日期选择器）

**用途**：日期选择，常见于查询条件、有效期设置等场景。

**交互方式**：

h-date-picker 不能通过 `playwright_fill` 直接输入日期，因为日期组件内部使用弹窗选择机制而非标准 input 输入。需要通过 `playwright_evaluate` 设置 Vue 组件数据：

```javascript
// playwright_evaluate: 设置日期选择器值
const picker = document.querySelector('.h-date-picker input');
const vueInstance = picker.__vue__;
if (vueInstance) {
  vueInstance.$emit('input', '2025-05-15');
  vueInstance.$emit('change', '2025-05-15');
}
```

```python
# Playwright脚本模式：点击触发弹窗后选择日期
page.click('.h-date-picker')
page.wait_for_selector('.h-date-picker-transfer:visible', timeout=3000)
page.click('.h-date-picker-cells-cell:has-text("15")')
```

**注意事项**：
- 直接 fill 输入日期字符串不会触发 Vue 响应式更新
- 日期格式需与组件配置一致（通常为 YYYY-MM-DD）
- 日期弹窗是 Transfer 定位，DOM 挂载在 body 下而非组件内部

### h-typefield（金额输入框）

**用途**：格式化金额输入，自动添加千分位分隔符和小数位。

**交互方式**：

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

```python
# Playwright脚本模式：先focus再type（部分场景可用）
page.locator('.h-typefield input').focus()
page.locator('.h-typefield input').fill('')
page.locator('.h-typefield input').type('1000000.00')
page.wait_for_timeout(500)
```

**注意事项**：
- document.execCommand('insertText') 不触发 Vue v-model，导致提交时值仍为空
- 格式化显示值和实际绑定值可能不同（显示1,000,000.00，绑定1000000.00）
- 修改后需触发 input 和 change 事件确保 Vue 数据同步

### h-input（输入框）

**交互方式**：
```python
# 清空并输入
page.fill('input[placeholder*="机构"]', '测试机构')

# 只读输入框点击搜索图标
page.click('.h-input icon.android-search')
```

### show-branch（机构选择弹窗）

**特殊组件**，用于选择机构，包含左侧树和右侧列表。

**已知问题**：
- 树组件 `setCheckedNodes` 方法不可用，应使用 `setCheckedKeys([])` 或 `clearChecked()`
- 关闭弹窗时必须同时重置表单和树选中状态
- `@on-close` 事件不能仅绑定重置方法，必须包含关闭逻辑

**交互方式**：
```python
# 打开机构选择弹窗
page.click('input[placeholder*="机构"] ~ .android-search')
page.wait_for_selector('.h-msg-box:visible', timeout=5000)

# 选择树节点
page.click('.h-tree-node__content:has-text("目标机构")')
page.wait_for_timeout(500)

# 确认选择
page.click('.h-msg-box button:has-text("确定")')
```

### select-cust-corp（客户号选择组件）

**个性化覆盖组件**，产品化版本和个性化版本共存。

**验证要点**：
- 个性化版本使用 `{url_prefix}bm/cust/corp/pageQueryCustCorpList` 路径
- 产品化版本使用 `/bm/cust/corp/pageQueryCustCorpList` 路径
- 通过全局组件覆盖机制自动生效

**交互方式**：
```python
# 打开客户号选择弹窗
page.click('.select-cust-corp .android-search')
page.wait_for_selector('.h-msg-box:visible', timeout=5000)

# 验证请求路径
cust_urls = [u for u in api_urls if 'pageQueryCustCorpList' in u]
assert any(url_prefix in u for u in cust_urls), "客户号查询未使用个性化路径"
```

## 页面路由映射

页面路由配置在 `config/test_config.json` 的 `banks.{bank_id}.pages` 节点中，按银行环境独立维护。

**配置示例**：
```json
{
  "banks": {
    "{bank_id}": {
      "pages": {
        "branch": {
          "name": "机构管理",
          "path": "/#/sm/auth/branch/branch",
          "require_personalized": true
        }
      }
    },
    "{bank_id_2}": {
      "pages": {
        "branch": {
          "name": "机构管理",
          "path": "/#/sm/auth/branch/branch",
          "require_personalized": true
        }
      }
    }
  }
}
```

## 个性化 URL 前缀规则

个性化前缀由 `banks.{bank_id}.url_prefix` 配置决定：

| 类型 | 产品化路径 | 个性化路径（以{bank_id}为例） |
|------|-----------|-----------|
| 机构管理 | /sm/auth/branch/... | {url_prefix}sm/auth/branch/... |
| 企业信息报备 | /bm/cpes/custsign/... | {url_prefix}bm/cpes/custsign/... |
| 企业客户查询 | /bm/cust/corp/... | {url_prefix}bm/cust/corp/... |
| 企业账号同步 | /bm/cust/acct/... | {url_prefix}bm/cust/acct/... |
| 企业信息在线查询 | /bm/sign/cpes/... | {url_prefix}bm/sign/cpes/... |
| 承兑行额度申请 | /pc/credit/acceptBankCreditGrantBatch | /#/pc/credit/acceptBankCreditGrantBatch |
| 承兑行额度明细 | /pc/credit/acceptBankCreditGrantInfo | /#/pc/credit/acceptBankCreditGrantInfo |
| 承兑行额度复核 | /pc/credit/acceptBankCreditGrantInfoReCheck | /#/pc/credit/acceptBankCreditGrantInfoReCheck |

## h-upload（文件上传）

**用途**：文件上传，常用于批量导入、模板下载等场景。

**交互方式**：
```python
# 点击上传按钮打开弹窗
page.click('button:has-text("批量导入")')
page.wait_for_selector('.h-msg-box:visible', timeout=5000)
page.wait_for_timeout(500)

# 上传文件（需要定位input[type=file]）
page.locator('.h-upload input[type="file"]').set_input_files('test_data.xlsx')
page.wait_for_timeout(2000)

# 验证上传结果
page.screenshot(path="upload_result.png")
```

**注意事项**：
- h-upload 的 `action` 属性必须指向正确的个性化路径
- 上传前检查文件格式和大小是否符合要求
- 批量导入通常先下载模板，再按模板格式填写后上传
- 上传完成后需验证导入结果（成功条数、失败条数）

**关联操作**：
```python
# 模板下载
page.click('button:has-text("导入模板下载")')
page.wait_for_timeout(3000)

# 验证下载是否触发（检查网络请求或下载事件）
download_urls = [r for r in api_requests if 'download' in r['url'].lower()]
```

## h-tree（树组件）

**用途**：机构树、菜单树等层级数据展示和选择。

**交互方式**：
```python
# 展开树节点
page.click('.h-tree-node__content:has-text("总行") .h-tree-node__expand-icon')
page.wait_for_timeout(500)

# 选中树节点（勾选复选框）
page.click('.h-tree-node__content:has-text("目标机构") .h-checkbox')
page.wait_for_timeout(300)

# 点击树节点（选中高亮）
page.click('.h-tree-node__content:has-text("目标机构")')
page.wait_for_timeout(300)
```

**已知问题与注意事项**：
- `setCheckedNodes` 方法不可用，应使用 `setCheckedKeys([])` 或 `clearChecked()`
- 操作树组件前必须判断 ref 是否存在（弹窗未打开时 ref 为 undefined）
- 树节点展开后需等待子节点加载完成（异步加载场景）
- 清空选中状态时使用 `setCheckedKeys([])` 而非 `setCheckedNodes([])`

**代码模式**（Vue中安全操作树组件）：
```javascript
if (this.$refs.treeRef) {
  if (typeof this.$refs.treeRef.setCheckedKeys === 'function') {
    this.$refs.treeRef.setCheckedKeys([]);
  } else if (typeof this.$refs.treeRef.clearChecked === 'function') {
    this.$refs.treeRef.clearChecked();
  }
}
```

## h-tabs（标签页）

**用途**：页面内多标签切换，如机构管理中的"机构列表"和"简单机构"标签。

**交互方式**：
```python
# 切换标签页
page.click('.h-tabs-tab:has-text("简单机构")')
page.wait_for_timeout(500)
page.wait_for_load_state('networkidle')

# 验证当前激活标签
active_tab = page.locator('.h-tabs-tab-active')
assert active_tab.inner_text() == '简单机构'
```

**注意事项**：
- 标签切换后需等待内容加载完成
- 不同标签可能有不同的DataGrid，需重新定位
- 标签切换可能触发新的API请求，需验证个性化路径

## h-form（表单）

**用途**：数据录入和编辑，弹窗内常见。

**交互方式**：
```python
# 填写文本输入框
page.fill('.h-msg-box:visible input[placeholder*="机构名"]', '测试机构')

# 选择下拉框
page.click('.h-msg-box:visible .h-select-selection')
page.wait_for_selector('.h-select-dropdown:visible', timeout=3000)
page.click('.h-select-dropdown li:has-text("选项")')

# 勾选复选框
page.click('.h-msg-box:visible .h-checkbox')

# 提交表单
page.click('.h-msg-box button:has-text("确定")')
page.wait_for_timeout(1000)
```

**表单验证模式**：
```python
# 验证必填项提示
page.click('.h-msg-box button:has-text("确定")')
page.wait_for_timeout(500)
required_tips = page.locator('.h-form-item-error')
assert required_tips.count() > 0, "未显示必填项校验提示"
```

**注意事项**：
- resetFields 前必须判断 ref 是否存在，否则报 TypeError
- 表单校验失败时提交按钮不会触发后端请求
- 弹窗关闭时需同时重置表单（resetFields）和清除选中状态

## 复杂交互场景模式

### 批量导入完整流程

```python
# 1. 点击批量导入按钮
page.click('button:has-text("批量导入")')
page.wait_for_selector('.h-msg-box:visible', timeout=5000)
page.wait_for_timeout(500)

# 2. 上传文件
page.locator('.h-upload input[type="file"]').set_input_files('test_data.xlsx')
page.wait_for_timeout(2000)

# 3. 确认导入
page.click('.h-msg-box button:has-text("确定")')
page.wait_for_timeout(2000)

# 4. 验证导入结果
page.screenshot(path="import_result.png")
```

### 批量复制角色完整流程

```python
# 1. 点击批量复制角色按钮
page.click('button:has-text("批量复制角色")')
page.wait_for_selector('.h-msg-box:visible', timeout=5000)
page.wait_for_timeout(500)

# 2. 选择源机构
page.click('.h-msg-box input[placeholder*="源机构"] ~ .android-search')
page.wait_for_selector('.h-msg-box:visible .h-tree', timeout=5000)
page.click('.h-tree-node__content:has-text("源机构名")')
page.wait_for_timeout(300)
page.click('.h-msg-box button:has-text("确定")')

# 3. 选择目标机构
page.click('.h-msg-box input[placeholder*="目标机构"] ~ .android-search')
page.wait_for_selector('.h-msg-box:visible .h-tree', timeout=5000)
page.click('.h-tree-node__content:has-text("目标机构名")')
page.wait_for_timeout(300)
page.click('.h-msg-box button:has-text("确定")')

# 4. 确认复制
page.click('.h-msg-box button:has-text("确定")')
page.wait_for_timeout(2000)
```

### 机构选择弹窗完整流程

```python
# 1. 打开机构选择弹窗
page.click('input[placeholder*="机构"] ~ .android-search')
page.wait_for_selector('.h-msg-box:visible', timeout=5000)
page.wait_for_timeout(500)

# 2. 搜索机构
page.fill('.h-msg-box input[placeholder*="搜索"]', '目标机构')
page.wait_for_timeout(500)

# 3. 选中机构
page.click('.h-tree-node__content:has-text("目标机构")')
page.wait_for_timeout(300)

# 4. 确认选择
page.click('.h-msg-box button:has-text("确定")')
page.wait_for_timeout(500)

# 5. 验证选中结果
selected_value = page.locator('input[placeholder*="机构"]').input_value()
assert '目标机构' in selected_value
```
