# Tasks

- [x] 任务1: 创建个性化 commonTree.vue 组件
  - [x] 子任务1.1: 复制产品 commonTree.vue 到 `frontend/src/components/bank/hnnxbank/commonTree.vue`
  - [x] 子任务1.2: 添加 showSearch prop（Boolean, default: false）
  - [x] 子任务1.3: 添加查询表单数据（searchForm、brchLevelOptions、originalTreeDataList）
  - [x] 子任务1.4: 在模板中添加查询条件区域（机构号、机构级别、机构名称、查询/重置按钮）
  - [x] 子任务1.5: 实现 filteredTreeDataList data 属性 + 手动更新，递归过滤树节点
  - [x] 子任务1.6: 实现 handleSearch 和 handleReset 方法
  - [x] 子任务1.7: 修改 getTreeDataList 方法，将原始数据备份到 originalTreeDataList
  - [x] 子任务1.8: 修改 h-tree 绑定为 filteredTreeDataList
  - [x] 子任务1.9: 添加机构级别字典获取逻辑（getDictListByGroups）
  - [x] 子任务1.10: 调整树内容区域高度计算，兼容查询条件区域占用空间

- [x] 任务2: 创建个性化 showBranch.vue 组件
  - [x] 子任务2.1: 复制产品 showBranch.vue（searchinput 版）到 `frontend/src/components/bank/hnnxbank/showBranch.vue`
  - [x] 子任务2.2: 修改 common-tree 标签，添加 :showSearch="true" 属性

- [x] 任务3: 添加国际化文本
  - [x] 子任务3.1: 确认产品国际化文件已包含所需键值（m.i.common.brchNo、m.i.auth.brchLevel、m.i.common.brchName、m.i.common.search、m.i.common.reset），无需额外添加

- [x] 任务4: 验证全局组件覆盖机制生效
  - [x] 子任务4.1: 确认 components/bank/hnnxbank/index.js 能正确注册新组件（require.context 扫描 .vue 文件）
  - [x] 子任务4.2: 确认新组件注册顺序在产品组件之后（main.js 第94行 bemp 先加载，第96行 bank 后加载）

- [x] 任务5: 验证各菜单页面机构树弹出框功能
  - [x] 子任务5.1: 验证机构管理员管理页面（branchAdmin.vue）使用全局 show-branch 组件，自动生效
  - [x] 子任务5.2: 验证权属机构维护页面（ownshipConfig.vue）使用全局 show-branch 组件，自动生效
  - [x] 子任务5.3: 验证票据准入管理页面（billAccessMain.vue）使用全局 show-branch 组件，自动生效
  - [x] 子任务5.4: 验证机构内部账户维护页面（indexBrchInnerAcct.vue）使用全局 show-branch 组件，自动生效
  - [x] 子任务5.5: 验证审批路线定义页面（auditRoute.vue）使用全局 show-branch 组件，自动生效
  - [x] 子任务5.6: 验证审批机构产品管理页面（auditBrchProductMain.vue）使用全局 show-branch 组件，自动生效
  - [x] 子任务5.7: 验证业务发生查询页面（22个报表）使用全局 show-branch 组件，自动生效
  - [x] 子任务5.8: 验证余额管理页面（4个报表）使用全局 show-branch 组件，自动生效

- [x] 任务6: 验证非机构树组件不受影响
  - [x] 子任务6.1: 验证 ECDS 机构树弹出框（showEcdsBranch）不传 showSearch，默认 false，不显示查询条件
  - [x] 子任务6.2: 验证牌照机构树弹出框（showLicenseBranch）不使用 commonTree 组件，不受影响
  - [x] 子任务6.3: 验证票交机构弹出框（showCpesBranch）不使用 commonTree 组件，不受影响

- [x] 任务7: 代码审查与编译验证
  - [x] 子任务7.1: 执行前端代码审查，已修复所有阻塞和严重问题
  - [x] 子任务7.2: 代码审查问题已修复（computed→data、filterTreeData逻辑、空值防护）

# Task Dependencies
- 任务2 依赖于 任务1（showBranch 需要引用 commonTree 的 showSearch prop）
- 任务3 依赖于 任务1（国际化文本需与查询条件字段对应）
- 任务4 依赖于 任务1 和 任务2
- 任务5 依赖于 任务4
- 任务6 依赖于 任务4
- 任务7 依赖于 任务5 和 任务6
