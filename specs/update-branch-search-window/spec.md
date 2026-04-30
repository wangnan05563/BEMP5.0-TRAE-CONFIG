# 机构查询窗口优化 Spec

## Why
当前批量复制角色功能中的【查询机构窗口】使用表格形式展示机构，用户体验不够直观。需要改为机构树展示，并增加查询条件，参考【机构名称】弹出框的实现方式。

## What Changes
- 修改批量复制角色中的【查询机构窗口】从表格展示改为机构树展示
- 增加查询条件：机构号、机构级别、机构名称（模糊匹配）
- 参考【机构名称】弹出框的实现方式
- 保持机构多选功能不变

## Impact
- Affected specs: 批量复制角色功能
- Affected code: `frontend/src/views/bizViews/banks/hnnxbank/sm/auth/branch/branch.vue`

## ADDED Requirements

### Requirement: 机构树展示
系统 SHALL 将【查询机构窗口】从表格展示改为机构树展示。

#### Scenario: 展示机构树
- **WHEN** 用户点击批量复制角色弹出框中的目标机构输入框
- **THEN** 弹出查询机构窗口，以机构树形式展示机构列表

### Requirement: 查询条件
系统 SHALL 在机构树上方增加查询条件区域。

#### Scenario: 查询条件展示
- **WHEN** 查询机构窗口打开
- **THEN** 显示查询条件：机构号、机构级别、机构名称（模糊匹配）

#### Scenario: 查询条件使用
- **WHEN** 用户输入查询条件并点击查询按钮
- **THEN** 机构树根据条件过滤展示匹配的机构节点

## MODIFIED Requirements

### Requirement: 机构多选功能
系统 SHALL 保持机构多选功能不变。

#### Scenario: 机构多选
- **WHEN** 用户在机构树中选择多个机构
- **THEN** 点击确定后，选中的机构号和机构名称正确回填到批量复制角色表单中

## REMOVED Requirements
无
