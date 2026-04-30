# 机构树弹出框增加查询条件 Spec

## Why
当前机构树弹出框（commonTree 组件）仅支持展开/收拢浏览选择机构，无法按条件快速定位目标机构。当机构数量较多时，用户需要逐级展开查找，效率低下。需要在机构树弹出框中增加查询条件（机构号、机构级别、机构名称模糊匹配），提升机构选择效率。

## What Changes
- 在 `frontend/src/components/bank/hnnxbank/` 目录下创建个性化 `commonTree.vue`，在机构树弹出框中增加查询条件区域
- 在 `frontend/src/components/bank/hnnxbank/` 目录下创建个性化 `showBranch.vue`，引用个性化 commonTree 并传递查询条件控制参数
- 利用 `components/bank/hnnxbank/index.js` 的全局组件覆盖机制（后注册覆盖先注册），使所有使用 `<show-branch>` 的页面自动获得增强功能
- 查询条件包括：机构号（精确匹配）、机构级别（下拉选择，数据来源 BranchLevel 字典）、机构名称（模糊匹配）
- 采用前端 computed 过滤方式实现树数据过滤（与 hnnxbank branch.vue 现有实现一致）
- 添加国际化文本

## Impact
- Affected specs: 机构选择组件（showBranch、commonTree）
- Affected code:
  - 新增: `frontend/src/components/bank/hnnxbank/commonTree.vue`
  - 新增: `frontend/src/components/bank/hnnxbank/showBranch.vue`
  - 修改: `frontend/src/views/bizViews/banks/hnnxbank/locale/lang/zh-CN.js`（国际化文本）
- 受益页面（自动生效，无需修改页面代码）:
  - 系统管理->机构管理员管理（branchAdmin.vue）
  - 系统管理->权属机构维护（ownshipConfig.vue）
  - 业务管理->票据准入管理（billAccessMain.vue）
  - 业务管理->机构内部账户维护（indexBrchInnerAcct.vue）
  - 业务管理->审批路线定义（auditRoute.vue）
  - 业务管理->审批机构产品管理（auditBrchProductMain.vue）
  - 业务管理->公共查询->业务发生查询（22个报表页面）
  - 业务管理->公共查询->余额管理（4个报表页面）
- 不受影响: 机构管理页面左侧机构树（hnnxbank branch.vue 已有搜索条件实现）

## ADDED Requirements

### Requirement: 机构树弹出框查询条件
系统 SHALL 在机构树弹出框（commonTree 组件）中增加查询条件区域，当 `showSearch` 属性为 true 时显示。

#### Scenario: 查询条件展示
- **WHEN** 用户打开机构树弹出框且 showSearch 为 true
- **THEN** 弹出框中树上方显示查询条件区域，包含：机构号输入框、机构级别下拉选择框、机构名称输入框、查询按钮、重置按钮

#### Scenario: 按机构号查询
- **WHEN** 用户在机构号输入框中输入机构号并点击查询
- **THEN** 机构树过滤显示匹配的机构节点（精确匹配节点 id）

#### Scenario: 按机构级别查询
- **WHEN** 用户在机构级别下拉框中选择一个级别并点击查询
- **THEN** 机构树过滤显示匹配该级别的机构节点（匹配节点 brchLevel 属性）

#### Scenario: 按机构名称模糊查询
- **WHEN** 用户在机构名称输入框中输入关键词并点击查询
- **THEN** 机构树过滤显示名称包含该关键词的机构节点（模糊匹配节点 title 属性）

#### Scenario: 组合查询
- **WHEN** 用户同时输入多个查询条件并点击查询
- **THEN** 机构树过滤显示同时满足所有条件的机构节点

#### Scenario: 重置查询
- **WHEN** 用户点击重置按钮
- **THEN** 查询条件清空，机构树恢复完整展示

#### Scenario: 查询条件不影响其他树组件
- **WHEN** 其他非机构树弹出框（如 ECDS 机构树、牌照机构树）打开
- **THEN** 不显示查询条件区域（showSearch 默认为 false）

### Requirement: 个性化 showBranch 组件传递查询参数
系统 SHALL 在个性化 showBranch 组件中向 commonTree 传递 `showSearch: true`，使机构树弹出框默认显示查询条件。

#### Scenario: showBranch 打开机构树
- **WHEN** 用户通过 show-branch 组件打开机构树弹出框
- **THEN** 机构树弹出框自动显示查询条件区域

### Requirement: 国际化支持
系统 SHALL 为新增的查询条件标签提供国际化文本。

#### Scenario: 中文环境显示
- **WHEN** 系统语言为中文
- **THEN** 查询条件标签显示中文：机构号、机构级别、机构名称、查询、重置

## MODIFIED Requirements
无

## REMOVED Requirements
无

## 技术方案

### 核心机制：全局组件覆盖
`frontend/src/main.js` 中的加载顺序：
1. 先加载 `components/bemp/index.js` → 注册产品组件（ShowBranch、CommonTree 等）
2. 后加载 `components/bank/hnnxbank/index.js` → 注册个性化组件，**同名组件覆盖产品版本**

因此在 `components/bank/hnnxbank/` 下创建同名 `showBranch.vue` 和 `commonTree.vue` 即可全局覆盖产品组件，所有使用 `<show-branch>` 的页面自动生效，无需逐一修改页面文件。

### commonTree.vue 增强方案
基于产品 `components/bemp/commonTree.vue`，增加以下功能：

1. **新增 props**:
   - `showSearch`: Boolean, default: false — 是否显示查询条件

2. **新增 data**:
   - `searchForm`: { brchNo: '', brchLevel: '', brchName: '' } — 查询表单
   - `brchLevelOptions`: [] — 机构级别下拉选项
   - `originalTreeDataList`: [] — 原始树数据（过滤前备份）

3. **新增 computed**:
   - `filteredTreeDataList` — 根据 searchForm 过滤 originalTreeDataList，递归过滤树节点

4. **模板变更**:
   - 在展开/收拢按钮区域下方、树内容区域上方插入查询条件表单
   - h-tree 绑定 filteredTreeDataList 替代 treeDataList

5. **过滤逻辑**:
   - 机构号：精确匹配节点 id 属性
   - 机构级别：精确匹配节点 brchLevel 属性
   - 机构名称：模糊匹配节点 title 属性（包含即匹配）
   - 父节点匹配时保留所有子节点；子节点匹配时保留到根节点的路径

### showBranch.vue 增强方案
基于产品 `components/bemp/searchinput/showBranch.vue`，修改：
- 向 `<common-tree>` 传递 `:showSearch="true"` 属性

### 机构级别数据获取
参考 hnnxbank branch.vue 现有实现，通过 `getDictListByGroups("BranchLevel")` 获取机构级别字典数据。
