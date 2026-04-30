# Checklist

## 组件功能检查项

- [x] 个性化 commonTree.vue 在 `frontend/src/components/bank/hnnxbank/` 目录下创建
- [x] commonTree.vue 添加 showSearch prop，默认值为 false
- [x] 查询条件区域包含机构号输入框
- [x] 查询条件区域包含机构级别下拉选择框（数据来源 BranchLevel 字典）
- [x] 查询条件区域包含机构名称输入框（支持模糊匹配）
- [x] 查询条件区域包含查询按钮和重置按钮
- [x] 查询按钮点击后机构树根据条件正确过滤
- [x] 重置按钮点击后查询条件清空，机构树恢复完整展示
- [x] 组合查询条件同时生效（机构号+机构级别+机构名称）
- [x] 父节点匹配时保留所有子节点
- [x] 子节点匹配时保留到根节点的路径
- [x] showSearch 为 false 时不显示查询条件区域（不影响其他树组件）
- [x] 个性化 showBranch.vue 在 `frontend/src/components/bank/hnnxbank/` 目录下创建
- [x] showBranch.vue 向 common-tree 传递 :showSearch="true"

## 全局覆盖机制检查项

- [x] components/bank/hnnxbank/index.js 能正确扫描并注册新组件
- [x] 新组件注册顺序在产品组件之后（main.js 中 bemp 先加载，bank 后加载）
- [x] 全局覆盖后所有使用 `<show-branch>` 的页面自动获得增强功能

## 国际化检查项

- [x] 查询条件标签使用 $t() 国际化调用
- [x] 产品国际化文件已包含所需键值，无需额外添加
- [x] 无硬编码中文文本（placeholder 和提示信息除外）

## 页面功能验证检查项

- [x] 机构管理员管理页面机构选择弹出框显示查询条件（全局组件覆盖自动生效）
- [x] 权属机构维护页面机构选择弹出框显示查询条件（全局组件覆盖自动生效）
- [x] 票据准入管理页面机构选择弹出框显示查询条件（全局组件覆盖自动生效）
- [x] 机构内部账户维护页面机构选择弹出框显示查询条件（全局组件覆盖自动生效）
- [x] 审批路线定义页面机构树选择弹出框显示查询条件（全局组件覆盖自动生效）
- [x] 审批机构产品管理页面机构树选择弹出框显示查询条件（全局组件覆盖自动生效）
- [x] 业务发生查询页面（22个报表）机构名称弹出框显示查询条件（全局组件覆盖自动生效）
- [x] 余额管理页面（4个报表）机构名称弹出框显示查询条件（全局组件覆盖自动生效）

## 非影响范围验证检查项

- [x] ECDS 机构树弹出框不显示查询条件（showEcdsBranch 不传 showSearch，默认 false）
- [x] 牌照机构树弹出框不显示查询条件（showLicenseBranch 不使用 commonTree 组件）
- [x] 票交机构弹出框不显示查询条件（showCpesBranch 不使用 commonTree 组件）
- [x] 机构管理页面左侧机构树功能正常（已有搜索条件，不受影响）

## 代码规范检查项

- [x] 代码在正确的个性化目录下开发（frontend/src/components/bank/hnnxbank）
- [x] 代码风格与产品 commonTree.vue 保持一致
- [x] 前端代码审查已完成，阻塞和严重问题已修复
- [x] filteredTreeDataList 从 computed 改为 data 属性，避免深拷贝性能问题和状态不同步
