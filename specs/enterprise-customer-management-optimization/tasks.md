# Tasks

## 第一阶段：需求调研与分析

- [x] Task 1: 调研企业客户维护功能
  - [x] SubTask 1.1: 查看前端企业客户维护页面 `customerEnterprise/enterprise.vue`
  - [x] SubTask 1.2: 查看后端企业客户相关Atom实现类
  - [x] SubTask 1.3: 确定现有机构查询字段及数据结构

- [x] Task 2: 调研企业账号管理功能
  - [x] SubTask 2.1: 查看前端企业账号管理页面
  - [x] SubTask 2.2: 查看后端企业账号相关Atom实现类
  - [x] SubTask 2.3: 确定现有机构查询字段及数据结构

## 第二阶段：前端开发

- [x] Task 3: 修改企业客户维护页面
  - [x] SubTask 3.1: 创建机构多选组件或复用现有组件
  - [x] SubTask 3.2: 修改企业客户维护页面，默认加载本机构及下级机构数据
  - [x] SubTask 3.3: 将"创建机构名称"查询条件改为多选
  - [x] SubTask 3.4: 国际化资源检查与新增

- [x] Task 4: 修改企业账号管理页面
  - [x] SubTask 4.1: 复用企业客户维护的机构多选组件
  - [x] SubTask 4.2: 修改企业账号管理页面，默认加载本机构及下级机构数据
  - [x] SubTask 4.3: 将"创建机构名称"查询条件改为多选
  - [x] SubTask 4.4: 国际化资源检查与新增

## 第三阶段：后端开发

- [x] Task 5: 修改企业客户后端查询逻辑
  - [x] SubTask 5.1: 创建个性化Service类 `HnnxbankCustCorpServiceImpl`
  - [x] SubTask 5.2: 修改默认查询逻辑为本机构及下级机构
  - [x] SubTask 5.3: 支持创建机构多选查询

- [x] Task 6: 修改企业账号后端查询逻辑
  - [x] SubTask 6.1: 创建个性化Service类 `HnnxbankCustAcctServiceImpl`
  - [x] SubTask 6.2: 修改默认查询逻辑为本机构及下级机构
  - [x] SubTask 6.3: 支持创建机构多选查询

## 第四阶段：代码审查与测试

- [x] Task 7: 前端代码走查
  - [x] SubTask 7.1: 调用 frontend-code-review Skill 审查前端代码
  - [x] SubTask 7.2: 调用 bemp-frontend-code-review Skill 审查前端代码

- [x] Task 8: 后端代码走查
  - [x] SubTask 8.1: 调用 backend-code-review Skill 审查后端代码
  - [x] SubTask 8.2: 调用 bemp-backend-code-review Skill 审查后端代码

- [x] Task 9: Maven打包验证
  - [x] SubTask 9.1: 执行maven编译确保无编译错误

# Task Dependencies
- Task 3 depends on Task 1
- Task 4 depends on Task 2
- Task 5 depends on Task 1
- Task 6 depends on Task 2
- Task 7 depends on Task 3, Task 4
- Task 8 depends on Task 5, Task 6
- Task 9 depends on Task 8
