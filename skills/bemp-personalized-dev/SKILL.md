---
name: bemp-personalized-dev
description: BEMP 票据系统个性化开发技能。该技能专门用于在指定目录下进行增量功能开发与修改，严格遵循项目编码规范与目录结构要求
---

# 个性化开发 Skill

## Skill 职责

本 Skill 专门用于个性化功能开发，遵循 BEMP 项目规范和个性化开发要求，提供标准化的开发流程和质量控制。

## 触发场景

- 需要在个性化目录下开发新功能时
- 需要修复个性化功能 bug 时
- 需要进行个性化代码审查时
- 需要遵循个性化开发规范时

## 文档结构

```
bemp-personalized-dev/
├── SKILL.md                          # 本文件 - Skill 定义
├── assets/
│   ├── guides/                       # 开发指南（规范+模板合并）
│   │   ├── frontend-guide.md         # 前端开发指南（规范+模板）
│   │   ├── backend-guide.md          # 后端开发指南（规范+模板）
│   │   ├── database-guide.md         # 数据库开发指南（规范+模板+增量SQL规范）
│   │   └── adapter-guide.md          # Adapter接口开发指南（规范+模板）
│   └── templates/                    # 代码模板
│       ├── java/
│       │   ├── Controller.java       # Controller 模板
│       │   ├── Service.java          # Service 模板
│       │   └── Dto.java              # DTO 模板
│       ├── vue/
│       │   └── PageTemplate.vue      # 前端页面模板
│       └── sql/
│           ├── menu-dml.sql          # 菜单定制DML模板（先删除后新增）
│           ├── param-dml.sql         # 业务参数DML模板（先删除后新增）
│           ├── table-ddl.sql         # 建表DDL模板（含存在性判断）
│           ├── flow-dml.sql          # 流程编排DML模板（先删除后新增）
│           ├── pend-item-dml.sql     # 待办任务DML模板（先删除后新增）
│           └── configcenter.json     # 配置中心增量文件模板
└── references/                       # 参考文档
    ├── project-rules.md              # 项目规则（核心约束）
    └── faq.md                        # 常见问题与最佳实践
```

## 开发规范文档

本 Skill 遵循以下开发指南（每个指南整合了规范与模板）：

| 领域 | 文档 | 内容 |
|------|------|------|
| 前端 | [frontend-guide.md](assets/guides/frontend-guide.md) | 命名约定、代码风格、组件设计、页面模板、API调用模板 |
| 后端 | [backend-guide.md](assets/guides/backend-guide.md) | 命名约定、代码风格、Controller/Service/DTO模板、异常处理 |
| 数据库 | [database-guide.md](assets/guides/database-guide.md) | 表设计规范、字段命名、DDL/DML模板、MyBatis Mapper模板 |
| Adapter | [adapter-guide.md](assets/guides/adapter-guide.md) | Client/Server端规范、报文转换、签名服务模板 |
| 项目规则 | [project-rules.md](references/project-rules.md) | 版本约束、目录规范、核心约束 |
| HUI组件文档 | `hui_doc` MCP | H-UI 组件属性、方法、事件、使用示例及最佳实践 |
| FAQ | [faq.md](references/faq.md) | 常见问题解答、最佳实践 |

## 执行步骤

### 第一阶段：需求分析与规范确认

1. **需求理解**
   - 仔细阅读用户需求，明确功能目标
   - 确认需求是否符合河南农信个性化开发范围
   - 识别是否有可复用的已有个性化代码
   - 明确国际化范围 (按钮/标签需要国际化，提示信息等保持硬编码)

2. **规范检查**
   - 检查 banks/ext-hnnxbank 目录下是否有可复用的带 @CustomizedBean 注解的个性化类
   - 检查 frontend/src/views/bizViews/banks/hnnxbank 目录下是否有对应的个性化 Vue 文件
   - 检查是否有同类功能的实现可供参考

3. **参考分析**
   - 查看产品化代码的实现方式
   - 参考同目录下已有的个性化实现案例
   - 特别注意 UI 组件的风格一致性 (如超链接风格、输入框风格等)

4. **开发指南参考【强制】**
   - **前端开发**: 必须参考 [前端开发指南](assets/guides/frontend-guide.md)
   - **后端开发**: 必须参考 [后端开发指南](assets/guides/backend-guide.md)
   - **数据库开发**: 必须参考 [数据库开发指南](assets/guides/database-guide.md)
   - **Adapter 接口开发**: 必须参考 [Adapter接口开发指南](assets/guides/adapter-guide.md)
   - **项目规则**: 必须遵守 [项目规则](references/project-rules.md)
   - **HUI组件文档**: 前端开发中涉及 H-UI 组件使用时，必须调用 `hui_doc` MCP 查询组件详细信息
   - 根据开发内容类型，选择对应的开发指南文档，确保编码符合规范要求

5. **HUI 组件文档查询【强制】**
   - 前端开发过程中，凡涉及 H-UI 组件的使用（包括但不限于 `h-form`、`h-datagrid`、`h-button`、`h-msg-box`、`h-input`、`h-select`、`h-tree` 等），必须先通过 `hui_doc` MCP 查询该组件的完整文档
   - 查询内容包括：组件属性（props）、方法（methods）、事件（events）、插槽（slots）、使用示例及最佳实践
   - 使用 `mcp_hui_doc_get-components-list` 获取所有可用组件列表，使用 `mcp_hui_doc_get-base-component` 或 `mcp_hui_doc_get-extend-component` 查询特定组件的详细文档
   - 查询策略：
     - 不熟悉的组件：必须完整查阅文档，理解所有属性和事件后再使用
     - 熟悉的组件：至少确认关键属性的用法和默认值，避免因版本差异导致 API 不一致
     - 组件间交互场景：需同时查询多个相关组件的文档，确保组合使用的兼容性
   - 禁止凭记忆或猜测使用组件 API，必须以官方文档为准

### 第二阶段：开发实施

1. **后端开发 (必须在 banks/ext-hnnxbank 目录下)**
   - **指南参考**: 先参考 [后端开发指南](assets/guides/backend-guide.md) 中的代码模板章节
   - 创建个性化 Controller，应继承 BaseController，不应添加@CustomizedBean 注解
   - 命名规则:Hnnx[原类名]，与产品化 Controller 并存
   - 使用 BaseRequest 作为请求参数类
   - 增强参数获取逻辑，兼容多种参数格式 (extParam、requestDto、直接参数等)
   - 添加必要的业务逻辑

2. **前端开发 (必须在以下个性化目录下)**
   - **指南参考**: 先参考 [前端开发指南](assets/guides/frontend-guide.md) 中的代码模板章节
   - **HUI文档查询【前置步骤】**: 明确当前页面需要使用的 H-UI 组件列表，对每个组件调用 `hui_doc` MCP 获取详细文档，确认组件属性签名和使用约束
   - **个性化开发目录**:
     - 页面文件：`frontend/src/views/bizViews/banks/hnnxbank`
     - 组件文件：`frontend/src/components/bank/hnnxbank`
     - 资源文件：`frontend/src/assets/hnnxbank`
     - 工具文件：`frontend/src/utils/banks/hnnxbank`
     - 静态资源：`frontend/static/bank/hnnxbank`
   - **目录匹配规则**: 所有包含 `/banks/hnnxbank` 或 `/bank/hnnxbank` 路径的目录均为个性化开发目录
   - 检查是否有对应的个性化 Vue 文件，有则复用
   - 如无，则新增 Vue 文件，名称和目录结构与原产品化文件保持一致
   - 在 frontend/src/api/bank/hnnxbankIndex.js 中维护路径映射关系
   - UI 风格统一：参考现有组件的实现方式，保持风格一致
   - 参数传递：使用 requestDto 格式传递参数，而非 extParam
   - 国际化处理：先在 zh-CN.js 中添加国际化文本，再在 Vue 中使用 $t() 调用
     - 按钮和标签必须国际化
     - placeholder 和提示信息保持硬编码
     - 遵循现有国际化键值命名规范

3. **数据库开发 (如需新建或修改表结构)**
   - **指南参考**: 先参考 [数据库开发指南](assets/guides/database-guide.md) 中的代码模板章节
   - 按照规范设计表结构和字段
   - 创建或修改表结构、索引、序列等
   - 生成对应的 Entity、DAO、Mapper 文件
   - 尽量复用已有的数据库表结构，避免重复创建
   - 若无可复用字段，使用当前表中未使用的reserve预留字段

4. **增量SQL脚本生成【强制】**
   - **触发条件**: 当需求涉及新增菜单、数据模型、业务参数、流程编排或其他数据库相关内容时，**必须**自动生成符合规范的增量SQL脚本
   - **指南参考**: 必须参考 [数据库开发指南 - 增量SQL脚本生成规范](assets/guides/database-guide.md) 第三章节
   - **脚本存放目录**: `deploy/bemp-script/src/main/resources/banks/{BANK_NAME}/`，其中 `BANK_NAME` 默认为"河南农信"，可根据部署环境动态调整
   - **配置中心增量文件目录**: `deploy/bemp-home/src/main/resources/configcenter/banks/{BANK_NAME}/`
   - **命名规范**: 严格遵循 `V{产品版本号}_{日期时间}_{任务编号}_{中文描述}.{脚本类型}.sql` 格式，参考 [数据库开发指南 - 命名规范](assets/guides/database-guide.md) 第2章节
   - **增量策略**: 必须采用"先删除后新增"策略，确保脚本幂等可重复执行
   - **脚本拆分**: 按变更类型拆分为独立文件（DDL/DML分离，菜单/参数/流程分文件）
   - **脚本检查**: 生成后必须按 [SQL脚本生成检查清单](assets/guides/database-guide.md) 第6章节逐项检查
   - **生成步骤**:
     1. 分析需求涉及的数据库变更类型（菜单/参数/表结构/流程/待办等）
     2. 查询现有数据库中相关表结构和数据，确定变更范围
     3. 按命名规范生成SQL脚本文件，存放于对应银行目录下
     4. 每个脚本文件遵循"先删除后新增"模板
     5. 如涉及配置变更，同步生成配置中心JSON增量文件
     6. 按检查清单逐项验证脚本质量

5. **Adapter 接口开发 (如需与外部系统交互)**
   - **指南参考**: 先参考 [Adapter接口开发指南](assets/guides/adapter-guide.md) 中的代码模板章节
   - 根据交互方向选择正确的基类 (Client 端或 Server 端)
   - 按照规范实现报文转换逻辑
   - 使用工具类 (XmlUtil、HeadUtils、CommonReq) 进行报文处理

6. **功能实现**
   - 编码需遵守 [项目规则](references/project-rules.md)
   - 参考现有实现进行开发
   - 确保 API 路径正确
   - 添加必要的校验逻辑
   - 保持 UI 风格与现有组件一致

### 第三阶段：质量控制

1. **SonarQube 代码扫描**
   - 使用 SonarQube MCP 扫描新开发的代码
   - 扫描范围:banks/ext-hnnxbank 目录下的所有新增和修改的代码
   - 修复扫描发现的所有问题:
     - 阻断性问题 (Blocker):必须立即修复
     - 严重问题 (Critical):必须修复
     - 重要问题 (Major):建议修复
     - 次要问题 (Minor):可选修复
   - 重新扫描确认问题已修复
2. **代码审查**
   - 后端调用 bemp-backend-code-review Skill
   - 前端调用 bemp-frontend-code-review Skill
   - 参考开发指南文档做代码审查
3. **编译验证**
   - 执行 Maven 打包确保编译通过
   - 检查是否有编译错误或警告
   - 确认修改的 class 文件已生成

4. **功能验证**
   - 验证功能是否按需求实现
   - 检查异常提示是否准确
   - 验证国际化是否生效 (按钮和标签已国际化)
   - 验证 UI 风格与现有组件一致
