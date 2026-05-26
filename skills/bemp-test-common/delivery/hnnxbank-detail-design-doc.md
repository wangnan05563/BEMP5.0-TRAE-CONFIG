# BEMP河南农信(hnnxbank)个性化小需求项目 - 详细设计文档

| 项目信息 | |
|---------|---------|
| 项目名称 | BEMP5.0 河南农信个性化小需求项目 |
| 银行标识 | hnnxbank |
| 文档版本 | V1.0 |
| 编写日期 | 2026-05-26 |
| 文档状态 | 已定稿 |

---

## 修订记录

| 版本 | 日期 | 修订内容 | 修订人 |
|------|------|---------|--------|
| V1.0 | 2026-05-26 | 初始版本，覆盖5个需求模块 | 文档交付工程师 |

---

## 一、系统架构概述

### 1.1 整体架构

本项目基于BEMP5.0票据业务管理平台，采用前后端分离架构，针对河南农信(hnnxbank)进行个性化定制开发。

```
+------------------+     +------------------+     +------------------+
|   前端(Vue.js)   | <-->|  后端(SpringBoot)| <-->|  数据库(Oracle)  |
|  Port: 8091      |     |  Port: 8010      |     |                  |
+------------------+     +------------------+     +------------------+
        |                        |
        v                        v
+------------------+     +------------------+
|  静态资源/CDN    |     |  Redis/ZooKeeper |
+------------------+     +------------------+
```

### 1.2 技术选型

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue.js 2.x + HUI组件库 | - |
| 后端框架 | SpringBoot | 2.x |
| 数据库 | Oracle | - |
| 缓存 | Redis | - |
| 服务协调 | ZooKeeper | - |
| 个性化路径前缀 | /hnnxbank/ | - |

### 1.3 部署拓扑

- 前端服务：独立部署，端口8091
- 后端服务：SpringBoot应用，端口8010，依赖Redis和ZooKeeper
- 个性化代码路径：`frontend/src/views/bizViews/banks/hnnxbank/`
- 个性化组件路径：`frontend/src/components/bank/hnnxbank/`
- 个性化国际化路径：`frontend/src/views/bizViews/banks/hnnxbank/locale/lang/`

---

## 二、模块设计

### 2.1 模块总览

本项目包含5个需求模块，涉及8个前端文件的修改：

| 序号 | 需求模块 | 涉及页面 | 修改文件数 |
|------|---------|---------|-----------|
| 1 | 机构管理和管理员管理功能优化 | 机构管理、管理员管理 | 3 |
| 2 | 批量复制角色 | 机构管理、管理员管理 | 2 |
| 3 | 企业客户管理优化 | 企业客户维护、企业账号管理 | 0(后端) |
| 4 | 分理处机构业务办理优化 | 机构管理、企业信息报备系列页面 | 1 |
| 5 | 承兑行额度管理 | 额度申请、批复明细、额度复核 | 2 |

### 2.2 模块一：机构管理和管理员管理功能优化

#### 2.2.1 模块职责

为机构管理和管理员管理页面增加批量导入功能，支持通过Excel文件批量导入机构数据和管理员数据。

#### 2.2.2 设计决策

| 决策点 | 方案 | 理由 |
|--------|------|------|
| API路径前缀 | 使用/hnnxbank/前缀 | 区分不同银行的个性化接口路由，避免与标准版接口冲突 |
| 批量导入校验 | 先校验后导入 | 在导入前进行数据合法性校验，校验通过再执行导入，减少脏数据 |
| 导入失败策略 | 整体回滚 | 任一行数据校验失败则全部不导入，保证数据一致性 |

#### 2.2.3 关键实现

**机构管理批量导入**（[branch.vue](file:///d:/code/QJ/BEMP5.0DEV/frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/branch.vue)）：

- 导入验证接口：`/hnnxbank/sm/auth/branch/branch/func_batchImportValidate`
- 导入执行接口：`/hnnxbank/sm/auth/branch/branch/func_batchImport`
- 模版下载接口：`/hnnxbank/sm/auth/branch/branch/func_downloadModel`
- 使用`common-file-upload`组件实现文件上传，参数`paramKey`为`branchDtoList`
- 导入预览列包含：序号、机构名称、机构号、上级机构号、票交所机构代码、大额行号、组织机构代码、核算机构号、机构地址、虚拟柜员号、交易场所分类(reserve1)、是否简单机构(reserve2)

**管理员管理批量导入**（[branchAdmin.vue](file:///d:/code/QJ/BEMP5.0DEV/frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/branchAdmin.vue)）：

- 列表查询接口：`/hnnxbank/sm/auth/branch/branchAdmin/func_queryBranchAdminList`
- 导入验证接口：`/hnnxbank/sm/auth/branch/branchAdmin/func_batchImportValidate`
- 导入执行接口：`/hnnxbank/sm/auth/branch/branchAdmin/func_batchImportBranchAdmin`
- 模版下载接口：`/hnnxbank/sm/auth/branch/branchAdmin/func_downloadModel`

### 2.3 模块二：批量复制角色

#### 2.3.1 模块职责

在机构管理和管理员管理中，支持将源机构/源管理员的角色批量复制到目标机构/目标管理员，复制模式为覆盖（非追加）。

#### 2.3.2 设计决策

| 决策点 | 方案 | 理由 |
|--------|------|------|
| 源机构确定方式 | 当前选中行对应机构 | 减少用户操作步骤，源机构无需手动选择 |
| 目标机构选择方式 | 弹出机构树多选 | 支持批量复制到多个目标机构 |
| 复制模式 | 覆盖旧角色 | 业务需求明确，复制后目标机构角色与源机构完全一致 |
| 机构树查询 | 增加机构号/级别/名称条件 | 机构数量多时方便快速定位 |

#### 2.3.3 关键实现

**机构管理批量复制角色**（[branch.vue:1253-1403](file:///d:/code/QJ/BEMP5.0DEV/frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/branch.vue#L1253-L1403)）：

- 提交接口：`/hnnxbank/sm/auth/branch/roleDistribute/func_copyAssignBranchRole`
- `copyRoleForm`表单包含：sourceBrchNo（源机构号）、sourceBrchName（源机构名称）、targetBrchNo（目标机构号）、targetBrchName（目标机构名称）
- 源机构号和源机构名称在打开弹窗时自动填充（来自当前选中行）
- 目标机构通过机构选择弹窗（branchSearchWin）选择，支持多选
- 机构选择弹窗包含：机构号、机构级别、机构名称查询条件，支持树展开/收拢
- `branchSearchFormSubmit()`方法中同时调用`getCheckedNodes()`和`getSelectedNodes()`，兼容checkbox选中与节点选中两种场景

**管理员管理批量复制角色**（[branchAdmin.vue](file:///d:/code/QJ/BEMP5.0DEV/frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/branchAdmin.vue)）：

- 提交接口：`/hnnxbank/sm/auth/branch/branchAdmin/func_batchCopyRole`
- 使用`HnnxbankSelectBranchManager`组件选择目标管理员

### 2.4 模块三：企业客户管理优化

#### 2.4.1 模块职责

优化企业客户维护和企业账号管理的查询范围，默认查询本机构及下级机构创建的数据，创建机构名称字段调整为多选。

#### 2.4.2 设计决策

| 决策点 | 方案 | 理由 |
|--------|------|------|
| 查询范围 | 本机构及下级 | 数据隔离安全要求，防止跨机构数据泄露 |
| 法人管理员限制 | 同样受本机构及下级限制 | 测试假设：法人管理员也遵循数据隔离规则 |
| 创建机构名称 | 多选 | 支持同时查询多个机构的数据 |

#### 2.4.3 关键实现

本模块优化主要在后端实现，前端无文件修改。后端需在查询接口中增加机构范围过滤逻辑。

### 2.5 模块四：分理处机构业务办理优化

#### 2.5.1 模块职责

1. 机构管理新增"是否简单机构"字段（复用reserve2字段），默认值为"否"
2. 简单机构（分理处）在同步账号时，签约机构递归向上查找非简单机构
3. 企业信息报备系列页面查询范围限制为本机构及下级

#### 2.5.2 设计决策

| 决策点 | 方案 | 理由 |
|--------|------|------|
| 是否简单机构字段 | 复用reserve2字段 | 避免数据库表结构变更，"1"=是，"0"=否 |
| 字段默认值 | "0"（否） | 历史数据兼容，新增机构默认非简单机构 |
| 签约机构递归查找 | 递归向上查找第一个非简单机构 | 分理处（简单机构）不具备签约能力，需归属到上级非简单机构 |
| 字段显示位置 | 新增/修改/同步界面均展示 | 三种操作模式均需维护该字段 |

#### 2.5.3 关键实现

**是否简单机构字段**（[branch.vue:179-205](file:///d:/code/QJ/BEMP5.0DEV/frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/branch.vue#L179-L205)）：

- 新增界面：当`parentBrchLevel === '3'`时显示交易场所分类(reserve1)，所有模式均显示是否简单机构(reserve2)
- 修改界面：当`brchLevel === '4'`时显示交易场所分类
- 同步界面：当`parentBrchLevel === '3'`时显示交易场所分类
- 数据表格列：增加"是否简单机构"列，render函数将"1"渲染为"是"，"0"渲染为"否"，空值默认"否"
- 导入预览列：增加"是否简单机构"列
- 修改回填：`reserve2`空值默认为"0"

**国际化配置**（[zh-CN.js](file:///d:/code/QJ/BEMP5.0DEV/frontend/src/views/bizViews/banks/hnnxbank/locale/lang/zh-CN.js)）：

- `hnnxbank.m.i.auth.isSimpleBranch`：是否简单机构
- `hnnxbank.m.i.auth.batchCopyRole`：批量复制角色
- `hnnxbank.m.i.auth.queryBranchWin`：查询机构窗口

### 2.6 模块五：承兑行额度管理

#### 2.6.1 模块职责

实现承兑行额度的全生命周期管理，包括额度申请（批复）、批复明细管理、额度复核、额度使用（占用/释放）。

#### 2.6.2 设计决策

| 决策点 | 方案 | 理由 |
|--------|------|------|
| 额度状态流转 | 未提交 -> 待复核 -> 已复核 | 标准复核流程，确保额度变更经过审批 |
| 复制模式 | 覆盖 | 复制角色后目标机构角色与源机构完全一致 |
| 复核确认提示 | 区分普通复核和结转复核 | 结转历史额度流水耗时较长，需特别提示用户 |
| 提示文字精确化 | 区分未选择和多选两种提示 | 优化用户体验，明确告知操作问题 |

#### 2.6.3 关键实现

**批复明细管理**（[acceptBankCreditGrantInfo.vue](file:///d:/code/QJ/BEMP5.0DEV/frontend/src/views/bizViews/banks/hnnxbank/pc/credit/acceptBankCreditGrantInfo.vue)）：

- 列表查询接口：`/banks/hnnxbank/pc/credit/acceptBankCreditGrantInfo/func_pagingQueryCreditInfoList`
- 修改提示精确化：区分`chooseOneData`（未选择数据）和`onlyChooseOneData`（只能选择一条数据）两种提示
- 复核确认框文字统一：`confirmReCheck`、`confirmCancelReCheck`、`confirmReCheckWithTransfer`从"确定"统一为"确认"
- 结转复核特殊提示：`confirmReCheckWithTransfer`包含"本次复核需要结转历史额度流水，时间较长，建议在业务低谷期再执行此操作"

---

## 三、数据设计

### 3.1 数据结构

#### 3.1.1 机构表（branch）扩展字段

| 字段名 | 含义 | 存储值 | 显示值 |
|--------|------|--------|--------|
| reserve1 | 交易场所分类 | JG01/JG02 | 县域/城区 |
| reserve2 | 是否简单机构 | 1/0 | 是/否 |

**设计说明**：复用reserve1/reserve2字段而非新增数据库列，避免表结构变更带来的迁移风险。reserve1仅在上级机构级别为3（支行级）时必填，reserve2在所有模式下均展示。

#### 3.1.2 批量复制角色表单数据结构

```javascript
copyRoleForm: {
  sourceBrchNo: "",     // 源机构号（自动填充，只读）
  sourceBrchName: "",   // 源机构名称（自动填充，只读）
  targetBrchNo: "",     // 目标机构号（多选，逗号分隔）
  targetBrchName: ""    // 目标机构名称（多选，逗号分隔，只读）
}
```

#### 3.1.3 批量导入参数结构

```javascript
fileParams: {
  loadExcelUrl: "...func_batchImportValidate",  // 校验接口
  fileUploadUrl: "...func_batchImport",          // 导入接口
  paramKey: "branchDtoList",                     // 参数键名
  columns: importColumns                         // 预览列定义
}
```

### 3.2 算法说明

#### 3.2.1 简单机构签约机构递归查找算法

```
function findSignBranch(branch):
    if branch.isSimpleBranch == false:
        return branch  // 非简单机构，签约机构为自身
    else:
        parentBranch = getParentBranch(branch.parentBrchNo)
        if parentBranch == null:
            return branch  // 已到顶层，返回自身
        return findSignBranch(parentBranch)  // 递归向上查找
```

**设计理由**：分理处（简单机构）不具备独立签约能力，其客户账号的签约机构应归属到上级第一个非简单机构（如县行营业部），支持多层简单机构嵌套场景。

---

## 四、接口设计

### 4.1 机构管理接口

| 接口名称 | 请求路径 | 请求方式 | 说明 |
|---------|---------|---------|------|
| 查询下级及本机构 | /hnnxbank/sm/auth/branch/branch/func_querySubBranchAndSelf | POST | 机构列表查询 |
| 批量导入校验 | /hnnxbank/sm/auth/branch/branch/func_batchImportValidate | POST | Excel数据校验 |
| 批量导入执行 | /hnnxbank/sm/auth/branch/branch/func_batchImport | POST | 执行导入 |
| 模版下载 | /hnnxbank/sm/auth/branch/branch/func_downloadModel | POST | 下载导入模版 |
| 批量复制角色 | /hnnxbank/sm/auth/branch/roleDistribute/func_copyAssignBranchRole | POST | 复制角色到目标机构 |

### 4.2 管理员管理接口

| 接口名称 | 请求路径 | 请求方式 | 说明 |
|---------|---------|---------|------|
| 查询管理员列表 | /hnnxbank/sm/auth/branch/branchAdmin/func_queryBranchAdminList | POST | 管理员列表查询 |
| 批量导入校验 | /hnnxbank/sm/auth/branch/branchAdmin/func_batchImportValidate | POST | Excel数据校验 |
| 批量导入执行 | /hnnxbank/sm/auth/branch/branchAdmin/func_batchImportBranchAdmin | POST | 执行导入 |
| 模版下载 | /hnnxbank/sm/auth/branch/branchAdmin/func_downloadModel | POST | 下载导入模版 |
| 批量复制角色 | /hnnxbank/sm/auth/branch/branchAdmin/func_batchCopyRole | POST | 复制角色到目标用户 |

### 4.3 角色管理接口

| 接口名称 | 请求路径 | 请求方式 | 说明 |
|---------|---------|---------|------|
| 新增角色 | /hnnxbank/sm/auth/role/role/func_addBranchRole | POST | 新增机构角色 |
| 修改角色 | /hnnxbank/sm/auth/role/role/func_updateBranchRole | POST | 修改机构角色 |
| 校验分配角色 | /hnnxbank/sm/auth/branch/roleDistribute/func_checkDistributeBranchRole | POST | 校验角色分配合法性 |

### 4.4 承兑行额度管理接口

| 接口名称 | 请求路径 | 请求方式 | 说明 |
|---------|---------|---------|------|
| 额度明细查询 | /banks/hnnxbank/pc/credit/acceptBankCreditGrantInfo/func_pagingQueryCreditInfoList | POST | 分页查询额度明细 |

### 4.5 风险白名单接口

| 接口名称 | 请求路径 | 请求方式 | 说明 |
|---------|---------|---------|------|
| 导出Excel | /hnnxbank/pc/risk/white/exportExcel | POST | 白名单导出 |

### 4.6 接口调用规范

- 所有个性化接口使用`/hnnxbank/`前缀，区别于标准版`/sm/`或`/banks/`前缀
- 请求方式统一为POST
- 返回格式：`{ retCode: "000000", retData: ..., retMsg: "..." }`
- 成功码：`000000`
- 前端通过`window.LOCAL_CONFIG.API_HOME`拼接完整URL

---

## 五、交互流程

### 5.1 批量复制角色流程

```
用户选中源机构 -> 点击"批量复制角色"按钮
    |
    v
弹出复制角色弹窗（源机构自动填充）
    |
    v
点击目标机构号超链接 -> 弹出机构选择窗口
    |
    v
输入查询条件（机构号/级别/名称） -> 查询机构树
    |
    v
勾选目标机构（支持多选） -> 点击确定
    |
    v
目标机构号和名称回显 -> 点击确定提交
    |
    v
后端执行角色复制（覆盖模式）
    |
    +-- 成功 --> 提示成功，刷新列表
    +-- 失败 --> 提示错误信息（如角色被使用不可去除）
```

### 5.2 批量导入机构流程

```
用户点击"批量导入"按钮
    |
    v
弹出文件上传窗口
    |
    v
选择Excel文件 -> 上传至校验接口
    |
    v
校验通过 -> 预览数据 -> 点击确定
    |
    v
提交至导入接口
    |
    +-- 成功 --> 提示导入成功，刷新列表
    +-- 失败 --> 提示错误信息，整体回滚
```

### 5.3 额度复核流程

```
用户选中待复核记录 -> 点击"提交复核"/"复核"按钮
    |
    v
弹出确认框
    |
    +-- 普通复核 --> "确认复核？"
    +-- 结转复核 --> "确认复核？本次复核需要结转历史额度流水..."
    |
    v
确认 -> 后端执行复核操作
    |
    +-- 成功 --> 状态变更为"已复核"
    +-- 失败 --> 提示错误信息
```

---

## 六、偏差记录

| 序号 | 需求描述 | 实际实现 | 偏差原因 | 影响评估 |
|------|---------|---------|---------|---------|
| 1 | 批量复制角色错误提示应显示角色名称 | 当前显示角色ID | 后端HnnxRoleServiceImpl中日志和异常消息使用角色ID而非名称 | 低影响，功能正确但提示不够友好，记录为DEF-003 |
| 2 | 额度复核页面待复核记录状态应显示"待复核"文本 | 当前显示"1" | 字典数据配置问题，前端已有getDictValueFromMap翻译逻辑 | 低影响，需后端配置字典数据，记录为BUG-002 |
| 3 | 额度相关API路径需确认后端路由映射 | 前端使用/banks/hnnxbank/前缀 | 需后端确认路由配置是否与前端一致 | 中影响，需后端配合确认，记录为BUG-003 |

---

## 七、需求确认闭环

### 7.1 待确认事项最终结论

| 序号 | 待确认事项 | 最终结论 | 确认方式 |
|------|-----------|---------|---------|
| 1 | 批量复制角色-源机构确定方式 | 源机构=当前选中行对应机构 | 需求确认 |
| 2 | 批量复制角色-管理员源用户确定方式 | 源用户=当前选中行对应管理员 | 需求确认 |
| 3 | 法人管理员是否受本机构及下级限制 | 是，法人管理员同样受限制 | 测试假设验证 |
| 4 | 批量导入失败策略 | 整体回滚，任一行失败则全部不导入 | 测试假设验证 |
| 5 | 历史机构数据是否简单机构默认值 | 默认"否"，需手工维护现有分理处为"是" | 测试假设验证 |

### 7.2 测试假设验证结果

| 序号 | 测试假设 | 验证结果 | 验证用例 |
|------|---------|---------|---------|
| 1 | 法人管理员查询企业客户受本机构及下级限制 | 通过 | TC-CUSTCORP-012, TC-CUSTACCT-012 |
| 2 | 批量导入失败整体回滚 | 通过 | TC-BRANCH-012~015, TC-ADMIN-015 |
| 3 | 历史数据是否简单机构默认"否" | 通过 | TC-BRANCH-026 |

---

## 八、修改文件清单

| 序号 | 文件路径 | 修改内容 | 关联需求 |
|------|---------|---------|---------|
| 1 | frontend/src/components/bank/hnnxbank/showBranch.vue | dropChange()方法中当status为true时设置isNeedQuery=true | 需求1 |
| 2 | frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/branch.vue | 添加sourceBrchNo/sourceBrchName到copyRoleForm；branchSearchFormSubmit添加getSelectedNodes()作为fallback；1处路径前缀修复 | 需求1,2,4 |
| 3 | frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/branchAdmin.vue | 5处路径前缀修复（列表查询、批量导入验证、批量导入上传、模板下载、批量复制角色） | 需求1,2 |
| 4 | frontend/src/views/bizViews/banks/hnnxbank/sm/auth/role/role.vue | 2处路径前缀修复（新增角色、修改角色） | 需求2 |
| 5 | frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/roleDistribute.vue | 1处路径前缀修复（校验分配角色） | 需求2 |
| 6 | frontend/src/views/bizViews/banks/hnnxbank/pc/risk/white/riskWhiteRollView.vue | 2处路径前缀修复（导出Excel两处） | 需求5 |
| 7 | frontend/src/views/bizViews/banks/hnnxbank/pc/credit/acceptBankCreditGrantInfo.vue | 提示文字精确化（区分未选择和多选两种提示） | 需求5 |
| 8 | frontend/src/views/bizViews/banks/hnnxbank/locale/lang/zh-CN.js | 复核确认框文字统一（"确定"改为"确认"） | 需求5 |
| 9 | banks/ext-hnnxbank/.../HnnxbankBranchAdminController.java | @RequestMapping从"/hnnx/"改为"/hnnxbank/"（5个接口：列表查询、批量导入验证/上传、模板下载、批量复制角色） | 需求1,2 |
| 10 | banks/ext-hnnxbank/.../HnnxBankBranchRoleController.java | @RequestMapping从"/hnnx/"改为"/hnnxbank/"（4个接口：新增角色、修改角色、校验分配角色、复制分配角色） | 需求2 |
| 11 | banks/ext-hnnxbank/.../HnnxRiskWhiteRollInfoController.java | @RequestMapping从"hnnx/"改为"/hnnxbank/"（6个接口：白名单查询、导出、删除、提交、回滚等） | 需求5 |
| 12 | banks/ext-hnnxbank/.../HnnxBillLabelOperLogController.java | @RequestMapping从"/banks/hnnx"改为"/banks/hnnxbank" | 需求5 |
