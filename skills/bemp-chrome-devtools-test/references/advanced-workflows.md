# Chrome DevTools MCP 高级工作流

基于 BEMP 承兑行额度管理功能二轮测试实战经验提炼的关键发现与工作流模式。**代码实现见 [tool-mapping.md §片段库](tool-mapping.md#evaluate_script-常用代码片段库)**。

---

## 1. Vue 动态路由导航

### 问题背景

BEMP 使用 Vue 懒加载路由，银行个性化路由不在初始路由表中。直接 `navigate_page` 会空白/404，需通过菜单点击触发 `mergeMenus()` 注册。

### 标准流程

```
evaluate_script(定位菜单并点击) → wait_for(networkidle) → take_snapshot → take_screenshot
```

> 菜单点击代码见 [tool-mapping.md §片段库-菜单导航](tool-mapping.md#菜单导航)。菜单树文本配置见 [config](../config/bemptest-config.json) `selectors_by_bank.{bank_profile}.menu_tree`。

### 关键发现

- 不同子菜单需**分别点击注册**路由，点击"额度申请"不会自动注册"额度复核"
- 菜单点击后必须 `wait_for(networkidle)`，等待路由注册 + 组件加载
- 每次菜单点击后 `take_snapshot` 确认目标页面已渲染
- 已注册路由在当前会话中有效，后续可直接 `navigate_page` 访问

---

## 2. HUI 组件交互

> 以下各组件的问题背景与关键发现。**正确做法代码见 [tool-mapping.md §片段库-HUI组件表单](tool-mapping.md#hui-组件表单)**。

### 2.1 h-date-picker

**问题**：复合组件，设 `input.value` 不触发内部日期解析逻辑。
**解决**：通过 `__vue__` 实例直接设 `vueInstance.value` + `$emit('input')`。

### 2.2 h-typefield

**问题**：`document.execCommand('insertText')` 或设 `input.value` 不触发 Vue v-model，提交时金额未更新。
**解决**：通过 `__vue__` 实例设 `currentValue` + `$emit('input')`；降级：`value` + `dispatchEvent`。

### 2.3 h-select

两步模式：click(触发器) → wait_for(列表) → click(选项)。选择器见 [config](../config/bemptest-config.json) `selectors.select_dropdown`。

### 2.4 h-datagrid 行选择

**关键**：checkbox 点击后 `currentSelectList` 异步同步有延迟，必须 `wait_for_timeout(500ms)` 后再 `evaluate_script` 验证 `grid.__vue__.currentSelectList.length > 0`。见 [pitfalls](common-pitfalls.md) 陷阱10。

---

## 3. 状态流转端到端验证

### 状态机

```
草稿(0) ──提交复核──→ 待复核(1) ──复核──→ 已复核(5)
   ↑                    │                    │
   └──撤销提交──────────┘                    │
                        ↑                    │
                        └──撤销复核──────────┘
```

### 验证模式

```
操作前截图 → click(操作) → click(确认) → wait_for(networkidle) → 操作后截图 → 提取状态文本对比
```

### 跨页面验证

```
页面A操作 → 截图 → 提取状态 → 菜单导航到页面B → wait_for(networkidle) → 查询 → 验证状态 → 截图
```

> 状态文本提取代码见 [tool-mapping.md §片段库-数据表操作](tool-mapping.md#数据表操作)。

### 关键注意

- checkbox 选中后等 500ms，否则提交复核报"ID 不能为空"
- 状态变更后**必须验证**，Service 层可能静默拒绝不符合前置条件的操作
- 跨页面验证时两页使用不同路由，需分别通过菜单点击注册

---

## 4. 删除功能验证

### 验证步骤

```
选中草稿行(checkbox) → wait 500ms → click(删除) → 确认弹窗 → wait_for(networkidle) → 检查行数变化
```

### 边界验证

非草稿状态（待复核/已复核）的记录删除应被拒绝。

> 行数检查、状态筛选代码见 [tool-mapping.md §片段库](tool-mapping.md#evaluate_script-常用代码片段库)。

---

## 5. 弹窗嵌套操作

### 嵌套结构

```
批次页面 → 批复明细弹窗 → 新增/修改明细弹窗
```

### 操作模式

```
外层: click(按钮) → wait_for(标题) → 截图
内层: click(新增/修改) → wait_for(标题) → 截图 → evaluate_script(填表) → click(确定)
关闭: 先内后外，使用 .h-msg-box:visible 定位当前可见弹窗
```

> 弹窗操作代码见 [tool-mapping.md §片段库-弹窗操作](tool-mapping.md#弹窗操作)。遮罩残留处理见 [pitfalls](common-pitfalls.md) 陷阱2。

---

## 6. 控制台错误检测

### 错误分类

| 级别 | 类型 | 处理 |
|------|------|------|
| 致命 | TypeError / ReferenceError | 阻塞 PASS，必须修复 |
| 严重 | ChunkLoadError | 组件加载失败，需检查路由 |
| 可忽略 | WebSocket / favicon / extension | 记录，不影响判定 |

### 检测时机

登录后 → 导航后 → CRUD 后 → 状态流转后 → 测试结束汇总。

> 错误过滤配置见 [config](../config/bemptest-config.json) `error_filters`。自动检测见 [pitfalls §自动检测](common-pitfalls.md#陷阱自动检测脚本)。

---

## 7. 双账号数据隔离验证

### 问题背景

BEMP 系统基于机构号(brchNo)实现数据隔离，不同用户类型的可见数据范围不同。需要通过双账号对比验证数据隔离是否生效。

### 用户类型与数据范围

| userType | 角色 | 数据范围 | 示例账号 |
|----------|------|---------|---------|
| 4 | 法人管理员 | 全部机构数据 | mllzs01(brchNo=233) |
| 3 | 分行柜员 | 本机构及下级机构数据 | sjl03(brchNo=233301) |

### 验证流程

```
1. 账号A(法人管理员)登录 → navigate_page(目标页面) → evaluate_script(提取数据列表) → 截图
2. new_page → 账号B(分行柜员)登录 → navigate_page(目标页面) → evaluate_script(提取数据列表) → 截图
3. 对比两个账号的数据范围差异
```

### 数据提取脚本

```javascript
// evaluate_script: 提取企业客户数据列表
(() => {
    const rows = document.querySelectorAll('.h-datagrid tbody tr');
    const results = [];
    rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            results.push({
                row: index + 1,
                custNo: cells[0]?.textContent?.trim(),
                custName: cells[1]?.textContent?.trim(),
                brchNo: cells[cells.length - 1]?.textContent?.trim()
            });
        }
    });
    return JSON.stringify({ total: results.length, data: results });
})()
```

### 权限验证

```javascript
// evaluate_script: 检查当前用户权限信息
(() => {
    const vue = document.querySelector('#app').__vue__;
    const store = vue.$store;
    const user = store.state.user;
    return JSON.stringify({
        userNo: user.userNo,
        userType: user.userType,
        brchNo: user.brchNo,
        legalNo: user.legalNo,
        optAuths: user.optAuths?.length || 0
    });
})()
```

### 关键发现

- 数据隔离前后端双重保障：前端隐藏菜单 + 后端API返回"权限不足"(retCode=000005)
- 分行柜员可能完全没有某些模块的菜单权限，无法通过前端访问
- 可通过 evaluate_script 调用后端 API 验证权限隔离（即使前端无菜单）

---

## 8. 通过前端 Vue 实例调用后端 API

### 问题背景

当需要执行后端操作（如解锁用户、查询数据）但前端界面无对应菜单时，可通过已登录用户的 Vue 实例直接调用后端 API。

### 标准流程

```javascript
// evaluate_script: 通过 Vue 实例调用后端 API
(async () => {
    const vue = document.querySelector('#app').__vue__;
    const http = vue.$http || vue.$store._vm.$http;
    const token = vue.$store.state.user?.fwToken || '';
    
    const res = await http.post('{api_path}', {
        // 请求参数
        fwToken: token
    });
    return { retCode: res.data?.retCode, retMsg: res.data?.retMsg, data: res.data?.retData };
})()
```

### 常用 API 路径

| API 路径 | 用途 | 请求参数 |
|----------|------|---------|
| `/sm/auth/branch/branchAdmin/func_unLockLegalPersonManager` | 解锁管理员 | `{userNo, fwToken}` |
| `/sm/auth/branchUser/userManager/func_getBranchUserList` | 查询柜员列表 | `{userNo, page, rows}` |
| `/sm/auth/branch/branchAdmin/func_queryBranchAdminList` | 查询管理员列表 | `{page, rows}` |

### 注意事项

- API 路径可能因银行个性化而不同
- 需要当前登录用户有对应 API 的权限
- `fwToken` 从 Vuex store 的 `user` 模块获取
- 返回值 `retCode="000000"` 表示成功，`"000005"` 表示权限不足

---

## 9. 批量导入弹窗验证

### 验证流程

```
1. click(批量导入按钮) → wait_for(弹窗) → take_screenshot
2. evaluate_script(检查弹窗内表格列头) → 验证"是否简单机构"等预期列
3. click(关闭弹窗) → take_screenshot(确认关闭)
```

### 弹窗列头验证脚本

```javascript
// evaluate_script: 检查批量导入弹窗内的表格列头
(() => {
    const dialog = document.querySelector('.h-msg-box:visible') || document.querySelector('.h-modal:visible');
    if (!dialog) return '未找到可见弹窗';
    const headers = dialog.querySelectorAll('th');
    const columns = [];
    headers.forEach(th => {
        columns.push(th.textContent?.trim());
    });
    return JSON.stringify({ columns, hasSimpleBranch: columns.some(c => c.includes('是否简单机构')) });
})()
```

### 必输校验验证

```
1. click(批量复制角色) → wait_for(弹窗)
2. click(确定) → wait_for(500ms)
3. evaluate_script(检查校验提示) → 验证必输校验
4. take_screenshot(记录校验结果)
```