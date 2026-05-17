# BEMP 个性化开发技能

## 概述

`bemp-personalized-dev` 是 BEMP 票据系统个性化开发的完整技能，涵盖前端（Vue）、后端（Java/Spring Boot）、数据库（MySQL）和 Adapter（消息通道）四大开发领域的编码规范、代码模板、参考文档和最佳实践。

## 文档结构

```
bemp-personalized-dev/
├── SKILL.md                         # Skill 定义文件（触发词、执行步骤、输出格式）
├── README.md                        # 使用说明
├── assets/
│   ├── guides/                      # 分领域开发指南
│   │   ├── frontend-guide.md        # 前端开发规范与模板
│   │   ├── backend-guide.md         # 后端开发规范与模板
│   │   ├── database-guide.md        # 数据库开发规范与模板
│   │   └── adapter-guide.md         # Adapter 消息通道开发规范与模板
│   └── templates/                   # 标准化代码模板
│       ├── java/                    # Java 模板
│       │   ├── Controller.java
│       │   ├── Service.java
│       │   └── Dto.java
│       └── sql/                     # SQL 脚本模板
│           ├── table-ddl.sql        # 建表 DDL
│           ├── menu-dml.sql         # 菜单 DML
│           ├── param-dml.sql        # 参数 DML
│           ├── flow-dml.sql         # 流程 DML
│           ├── pend-item-dml.sql    # 待办事项 DML
│           └── configcenter.json    # 配置中心 JSON
└── references/                      # 参考文档
    ├── faq.md                       # 常见问题与最佳实践
    └── project-rules.md             # 项目强制约束与规则
```

## 文档内容

### 1. 前端开发指南

**文件位置**：`assets/guides/frontend-guide.md`

**包含内容**：
- 命名约定（文件、变量、方法、组件、CSS 命名规范）
- Vue 2.6 开发规范（文件结构、代码格式、组件设计原则）
- 组件设计（单一职责、复用原则、Props/事件设计、commonTree 树形弹框布局规范）
- 状态管理（Vuex Store 模块化、状态命名）
- H-UI 组件文档查询规范（13 章，强制使用 `hui_doc` MCP 查询）
- 国际化使用规范
- 错误处理（表单校验、API 错误处理、全局错误处理）
- 性能优化（懒加载、防抖节流、列表优化）
- 代码模板（7 个标准模板）

### 2. 后端开发指南

**文件位置**：`assets/guides/backend-guide.md`

**包含内容**：
- 工程规约（个性化开发目录 `banks/ext-hnnxbank`）
- 命名约定（包、类、方法、变量命名规范）
- 应用分层规范（Controller → Service → Atom → DAO）
- Service/DAO 分层职责与规范
- `@CustomizedBean` 注解使用规则（Service/Atom 层需要，Controller 不需要）
- 日志规约（级别选择、内容规范）
- 无效引用控制规范
- 事务管理规范
- 异常处理（异常类型、异常码、处理原则）
- 性能优化（批量查询、集合优化、连接池）
- 代码模板（8 个标准模板）

### 3. 数据库开发指南

**文件位置**：`assets/guides/database-guide.md`

**包含内容**：
- 表设计规范（字段类型、长度、默认值）
- 字段命名规范
- MyBatis 3.5 使用规范
- 增量 SQL 脚本生成规范（命名格式：`V{版本}_{日期}_{任务号}_{描述}.{类型}.sql`）
- SQL 脚本"先删除后新增"策略
- 脚本拆分规范（按类型独立文件）
- SQL 检查清单
- 代码模板（8 个标准模板，含 DDL/DML/配置中心）

### 4. Adapter 开发指南

**文件位置**：`assets/guides/adapter-guide.md`

**包含内容**：
- 消息通道开发概述（TCP/HTTP/MQ 协议）
- Client 端开发规范（继承 `AbstractGenericMessageRequestReplyConverter`）
- Server 端开发规范（继承 `AbstractMessageApplyResponseConverter`）
- 工具类使用规范
- 接口协议定义规范
- 代码模板（7 个标准模板）

### 5. 参考文档

**文件位置**：`references/`

| 文件 | 说明 |
|------|------|
| `faq.md` | 11 个常见问题（Q&A）+ 后端/前端/Adapter 最佳实践 |
| `project-rules.md` | 版本约束、个性化开发目录、SQL 脚本目录、命名规范等强制规则 |

## 使用指南

### 1. 开发前准备

1. 阅读 [project-rules.md](references/project-rules.md) 了解项目强制约束
2. 根据开发领域查阅对应的指南文档：
   - 前端：`assets/guides/frontend-guide.md`
   - 后端：`assets/guides/backend-guide.md`
   - 数据库：`assets/guides/database-guide.md`
   - Adapter：`assets/guides/adapter-guide.md`
3. 参考 `assets/templates/` 目录下的对应模板进行代码编写

### 2. 开发流程

#### 前端开发

1. 检查 `frontend/src/views/bizViews/banks/hnnxbank` 目录下是否有可复用的个性化 Vue 文件
2. 如有则复用，如无则新增 Vue 文件
3. 在 `frontend/src/api/bank/hnnxbankIndex.js` 中维护路径映射关系
4. 参考 [frontend-guide.md](assets/guides/frontend-guide.md) 进行编码

#### 后端开发

1. 检查 `banks/ext-hnnxbank` 目录下是否有可复用的带 `@CustomizedBean` 注解的个性化类
2. 如有则复用，如无则新增个性化类
3. 参考 [backend-guide.md](assets/guides/backend-guide.md) 进行编码

#### 数据库开发

1. 按增量 SQL 脚本命名规范（`V{版本}_{日期}_{任务号}_{描述}.{类型}.sql`）创建脚本
2. 参考 [database-guide.md](assets/guides/database-guide.md) 的 SQL 检查清单
3. DDL 和各类 DML 按类型拆分独立文件

#### Adapter 开发

1. Client 端继承 `AbstractGenericMessageRequestReplyConverter`
2. Server 端继承 `AbstractMessageApplyResponseConverter`
3. 参考 [adapter-guide.md](assets/guides/adapter-guide.md) 进行通道开发

### 3. 代码审查

- 前端代码审查：调用 `bemp-frontend-code-review` Skill
- 后端代码审查：调用 `bemp-backend-code-review` Skill

### 4. 常见问题

遇到问题先查阅 [faq.md](references/faq.md)，已覆盖路径问题、国际化问题、组件问题、性能问题、后端问题等常见场景。

## 技术栈

### 前端

- Vue 2.6.12
- Vue Router 3.0.1
- Vuex 3.0.1
- H-UI（启金前端组件库）
- Axios 0.21.1

### 后端

- Java 1.8
- Spring Boot 2.7.11
- MyBatis 3.5.10
- Maven 3.8.6
- Lombok 1.18.24

### 数据库

- MySQL 5.7+