---
name: "bemp-personalized-dev"
description: "BEMP 票据系统个性化开发技能。该技能专门用于在指定目录下进行增量功能开发与修改，严格遵循项目编码规范与目录结构要求"
whenToUse: "用户需要开发/实现新功能、修复功能 bug、进行代码审查、遵循开发规范时调用"
triggers: 
   - "需求/功能 开发/编码/实现"
   - "修复/修改 bug、问题、缺陷"
   - "个性化 编码/开发/实现功能/需求"
---

# 个性化开发 Skill

## Skill 职责

本 Skill 专门用于个性化功能开发，遵循 BEMP 项目规范和个性化开发要求，提供标准化的开发流程。

## 银行配置变量

以下变量定义了当前个性化开发的银行信息，开发过程中所有路径、命名均引用这些变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `{BANK_CODE}` | 银行编码，用于目录路径和包名 | `${ENV:BANK_CODE}` |
| `{BANK_CLASS_PREFIX}` | 个性化类名前缀（PascalCase） | `${ENV:BANK_CLASS_PREFIX}` |
| `{BANK_NAME}` | 银行中文名称，用于部署目录 | `${ENV:BANK_NAME}` |

**使用规则**：
- 本文档中所有路径、命名均使用 `{BANK_CODE}`、`{BANK_CLASS_PREFIX}`、`{BANK_NAME}` 占位
- 切换银行时仅需修改上表默认值，所有引用自动生效
- 目录匹配规则：所有包含 `/banks/{BANK_CODE}` 或 `/bank/{BANK_CODE}` 路径的目录均为个性化开发目录

## 占位符约定

本文档体系使用三类占位符，语义和作用域不同：

| 占位符风格 | 语义 | 使用场景 | 示例 |
|-----------|------|---------|------|
| `{VARIABLE}` | 配置变量，运行时替换为银行实际值 | 文档路径、包名引用 | `{BANK_CODE}`, `{BANK_CLASS_PREFIX}` |
| `[占位名]` | 代码占位符，开发者按需填充 | Java/Vue/MD 代码模板 | `[模块名]`, `[方法名]`, `[字段名]` |
| `${VARIABLE}` | SQL 模板变量，遵循 SQL 模板规范 | .sql 脚本模板 | `${TABLE_NAME}`, `${TASK_NO}`, `${DATE}` |

## 文档结构

```
bemp-personalized-dev/
├── SKILL.md                          # 本文件 - Skill 定义
├── config/
│   ├── config.json                   # 技能主配置（环境变量引用、编码规范、增量原则）
│   ├── compile-deploy.json           # 编译→部署→重启路径配置
│   ├── function-id-rules.json        # @CloudFunction功能号冲突检查规则
│   ├── file-integrity-rules.json     # 文件写入完整性校验规则
│   └── spec-consistency-checklist.json # spec一致性检查清单
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
│       └── sql/
│           ├── menu-dml.sql          # 菜单定制DML模板（先删除后新增）
│           ├── param-dml.sql         # 业务参数DML模板（先删除后新增）
│           ├── table-ddl.sql         # 建表DDL模板（含存在性判断）
│           ├── flow-dml.sql          # 流程编排DML模板（先删除后新增）
│           ├── pend-item-dml.sql     # 待办任务DML模板（先删除后新增）
│           └── configcenter.json     # 配置中心增量文件模板
└── references/                       # 参考文档
    ├── project-rules.md              # 项目规则（核心约束）
    ├── override-patterns.md          # 子类Override模式知识库
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
| Override模式 | [override-patterns.md](references/override-patterns.md) | 响应DTO字段传递、Bean注入方式、编译部署重启闭环 |
| HUI组件文档 | `hui_doc` MCP | H-UI 组件属性、方法、事件、使用示例及最佳实践 |
| FAQ | [faq.md](references/faq.md) | 常见问题解答、最佳实践 |

## 配置文件

所有配置文件位于 `config/` 目录下，支持三级配置继承：技能级（默认）→ 项目级（覆盖）→ 银行级（覆盖）。

| 配置文件 | 用途 | 继承支持 |
|---------|------|---------|
| [config.json](config/config.json) | 技能主配置：环境变量引用、编码规范、增量原则 | 是 |
| [compile-deploy.json](config/compile-deploy.json) | 编译→部署→重启路径配置 | 是 |
| [function-id-rules.json](config/function-id-rules.json) | @CloudFunction 功能号冲突检查规则：前缀、序号范围、排除列表 | 是 |
| [file-integrity-rules.json](config/file-integrity-rules.json) | 文件写入完整性校验规则：大括号匹配、标签匹配、修复策略 | 是 |
| [spec-consistency-checklist.json](config/spec-consistency-checklist.json) | Spec 一致性检查清单：日志级别、异常处理、任务隔离、错误文案 | 是 |

**配置继承机制**：
- 技能级配置（`.trae/skills/bemp-personalized-dev/config/`）：默认配置，适用于所有银行
- 项目级配置（项目根目录 `config/`）：覆盖技能级配置
- 银行级配置（`banks/ext-{BANK_CODE}/config/`）：优先级最高，覆盖前两级
- 合并策略：对象类型深度合并（deepMerge），数组类型整体替换（replace）

## 执行步骤

### 第一阶段：需求分析与规范确认

1. **需求理解**
   - 仔细阅读用户需求，明确功能目标
   - 确认需求是否符合{BANK_NAME}个性化开发范围
   - 识别是否有可复用的已有个性化代码
   - 明确国际化范围 (按钮/标签需要国际化，提示信息等保持硬编码)

2. **规范检查**
   - 检查 banks/ext-{BANK_CODE} 目录下是否有可复用的带 @CustomizedBean 注解的个性化类
   - 检查 frontend/src/views/bizViews/banks/{BANK_CODE} 目录下是否有对应的个性化 Vue 文件
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
   - **Override模式**: 后端开发涉及子类重写父类方法时，必须参考 [Override模式知识库](references/override-patterns.md)
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

**前置检查：@CloudFunction 功能号冲突检查【强制】**
- **触发条件**：新增或修改 @CloudFunction 注解的 Job 服务时
- **配置文件**：[function-id-rules.json](config/function-id-rules.json)，禁止硬编码功能号
- **检查步骤**：
  1. 从代码中提取 @CloudFunction 注解的 funcNo 值（正则：`@CloudFunction\s*\(.*funcNo\s*=\s*"([^"]+)"`）
  2. 读取 [function-id-rules.json](config/function-id-rules.json) 获取检查目标表名和字段名
  3. 执行查询：`SELECT COUNT(1) AS CNT FROM TT_TASK WHERE TASK_FUNCNO = '{提取的功能号}'`
  4. 若 COUNT > 0：功能号已被占用，按配置的 `conflictHandling.strategies` 处理（默认 block）
  5. 若功能号在 `excludeList` 中：提示排除命中，要求更换
  6. 若配置为 `autoReassign` 策略：从 `seqRange` 中自动分配下一个可用功能号
- **常见遗漏**：
  - 仅凭记忆认为功能号未占用 → 必须查询数据库验证
  - 复制其他银行代码未改功能号 → 必须检查功能号唯一性
  - 功能号格式不规范 → 按 `generationRules.format` 规则生成

1. **后端开发 (必须在 banks/ext-{BANK_CODE} 目录下)**
   - **指南参考**: 先参考 [后端开发指南](assets/guides/backend-guide.md) 中的代码模板章节
   - 创建个性化 Controller，应继承 BaseController，不应添加@CustomizedBean 注解
   - 命名规则:{BANK_CLASS_PREFIX}[原类名]，与产品化 Controller 并存
   - 使用 BaseRequest 作为请求参数类
   - 增强参数获取逻辑，兼容多种参数格式 (extParam、requestDto、直接参数等)
   - 添加必要的业务逻辑

2. **前端开发 (必须在以下个性化目录下)**
   - **指南参考**: 先参考 [前端开发指南](assets/guides/frontend-guide.md) 中的代码模板章节
   - **HUI文档查询【前置步骤】**: 明确当前页面需要使用的 H-UI 组件列表，对每个组件调用 `hui_doc` MCP 获取详细文档，确认组件属性签名和使用约束
   - **个性化开发目录**:
     - 页面文件：`frontend/src/views/bizViews/banks/{BANK_CODE}`
     - 组件文件：`frontend/src/components/bank/{BANK_CODE}`
     - 资源文件：`frontend/src/assets/{BANK_CODE}`
     - 工具文件：`frontend/src/utils/banks/{BANK_CODE}`
     - 静态资源：`frontend/static/bank/{BANK_CODE}`
   - **目录匹配规则**: 所有包含 `/banks/{BANK_CODE}` 或 `/bank/{BANK_CODE}` 路径的目录均为个性化开发目录
   - 检查是否有对应的个性化 Vue 文件，有则复用
   - 如无，则新增 Vue 文件，名称和目录结构与原产品化文件保持一致
   - 在 frontend/src/api/bank/{BANK_CODE}Index.js 中维护路径映射关系
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

7. **前端 API 路径核实【强制】**
   - **触发条件**：当发现前端 API 路径前缀与项目规范不一致时（如规范要求 `/{BANK_CODE}/` 但代码使用了其他前缀）
   - **核实流程**：
     1. 在后端代码中搜索对应 Controller 的 `@RequestMapping` 注解，确认后端实际路径
     2. **若前后端路径不一致**：按后端实际路径修改前端代码，确保前后端路径一致可调用
     3. **若前后端路径一致（但与规范不符）**：仅提醒用户"前端路径 {当前路径} 与规范 {规范路径} 不一致，但与后端一致，建议后续统一修改"，不直接修改
   - **禁止行为**：禁止仅凭规范要求直接修改前端 API 路径而不核实后端，否则会导致前后端路径不一致引发 404

8. **注释项检查【强制】**
   - 完成代码修改后，必须检查并补充必要的注释项：
     - 类注释：说明类的职责、所属银行个性化模块、作者与日期
     - 方法注释：说明方法用途、关键参数含义、返回值说明
     - 字段注释：说明字段的业务含义，尤其是新增的个性化字段
   - 注释应解释"为什么"而非"做什么"，避免无意义的重复描述
   - 参考代码模板中的注释示例（Controller.java、Service.java、Dto.java）

9. **安全调用检查【强制】**
   - 检查所有外部接口调用是否已做空值/边界判断
   - 检查是否存在未处理的异常分支
   - 确认敏感数据未在日志中明文输出
   - 验证权限校验逻辑是否完整

**检查项：文件写入完整性校验【强制】**
- **触发条件**：使用 Edit/Write 工具修改文件后（onEdit / onWrite / onCreate 均触发）
- **配置文件**：[file-integrity-rules.json](config/file-integrity-rules.json)，所有检查规则通过配置管理
- **检查步骤**：
  1. 读取 [file-integrity-rules.json](config/file-integrity-rules.json) 获取文件类型对应的检查规则
  2. 根据文件扩展名匹配 `fileTypes.rules`（如 `.java` → braceMatch + parenMatch + semicolonTail）
  3. 读取修改后的文件内容，按检查规则统计开闭字符数量
  4. 若 `ignoreInString` 为 true：跳过字符串字面量内的字符
  5. 若 `ignoreInComment` 为 true：跳过注释内的字符
  6. 比较开闭字符数量，差值超过 `tolerance` 则判定为不匹配
  7. 不匹配时按 `repairStrategy.defaultStrategy` 处理：
     - `warn`：输出警告，列出差异详情（开=N 闭=M 差值=X）
     - `autoFix`：在文件末尾追加缺失的闭合字符（最多 `maxAutoFixCount` 个），追加后重新校验
     - `block`：阻止后续操作，要求人工修复
- **常见遗漏**：
  - Edit 工具修改大文件时截断 → 大括号不匹配是典型症状，必须检查
  - 只检查了 Java 文件 → Vue/JS/XML 文件同样需要检查（按配置的 fileTypes）
  - 自动修复后未重新校验 → autoFix 后必须重新执行检查确认修复有效
  - 忽略了字符串/注释内的括号 → 必须按配置的 ignoreInString/ignoreInComment 规则排除

10. **代码修改后的编译→部署→重启流程【强制】**
    - **触发条件**：修改Java源代码后，必须执行以下3步才能使修改生效
    - **配置文件**：路径和参数统一管理在 [compile-deploy.json](config/compile-deploy.json) 中，禁止硬编码
    - **编译检查**：比较源文件(.java)和class文件的修改时间
      - 源文件更新 → 需要编译
      - 编译命令：`javac -encoding UTF-8 -cp "{classpath}" -d "{outputDir}" "{sourceFile}"`
    - **部署检查**：比较target/classes和WAR/WEB-INF/classes中class文件的修改时间
      - target/classes更新 → 需要复制
      - 复制命令：`Copy-Item "{srcClass}" "{dstClass}" -Force`
    - **重启检查**：比较class文件更新时间和SpringBoot启动时间
      - class文件更新于启动之后 → 需要重启
      - 重启命令：`.\start-bemp-env.ps1 -Service springboot -QuickStart -ForceRestart`
    - **常见遗漏**：
      - 只编译未复制class → 旧代码仍在运行
      - 只复制class未重启 → JVM仍加载旧class
      - 只重启未编译 → 运行的还是旧代码
    - **Override模式参考**：子类重写父类方法时的字段传递陷阱，详见 [Override模式知识库](references/override-patterns.md)

11. **数据库查询顺序不确定性提醒**
    - **问题描述**：MyBatis查询无ORDER BY时，Oracle返回的记录顺序不确定，可能导致：
      - 测试用例预期值与实际返回不一致
      - 遍历List时先命中的记录与预期不同
    - **解决方案**：
      - 业务代码：如果需要确定顺序，必须显式指定ORDER BY
      - 测试用例：预期值使用"包含"断言而非"等于"断言
      - 异常信息：如果遍历到第一个匹配记录就抛异常，异常信息中的具体值可能不确定
    - **判断逻辑**：
      - 代码中遍历List并取第一个匹配项 → 提示顺序不确定性
      - 测试预期值指定了具体账号/名称 → 建议改为"包含"断言

### 第三阶段：Spec 一致性检查【强制】

开发实施完成后，必须执行 Spec 一致性检查，验证代码实现与需求规格说明（spec）的一致性。

- **配置文件**：[spec-consistency-checklist.json](config/spec-consistency-checklist.json)，所有检查项通过配置管理
- **触发时机**：
  - 开发实施完成后（`onDevComplete`）
  - 代码评审阶段（`onCodeReview`）
  - 缺陷修复后验证（`onFixVerify`）

**检查步骤**：
1. **定位 Spec 文档**：按 `specSource.searchPaths` 和 `filePatterns` 搜索需求规格文档
2. **加载检查清单**：读取 [spec-consistency-checklist.json](config/spec-consistency-checklist.json) 的 `checklist.items`
3. **逐项执行检查**：
   - **LOG-001 日志级别一致性**（major）：Spec 中出现的日志级别关键词必须与代码中实际使用的日志方法一致。例：Spec 要求 error，代码使用 warn → 不一致
   - **EXC-001 异常处理一致性**（critical）：Spec 要求抛异常时代码不得使用 return，反之亦然。例：Spec 要求 throw，代码使用 return → 不一致
   - **TASK-001 任务隔离一致性**（critical）：Spec 要求任务隔离时，代码不得出现静默跳过（continue/return）或吞异常（空 catch 块）
   - **MSG-001 错误文案一致性**（major）：Spec 中的错误文案核心关键词必须在代码的异常/返回消息中出现。采用关键词匹配，允许参数化差异
   - **FLOW-001 流程顺序一致性**（major）：Spec 中描述的步骤顺序必须与代码中方法调用顺序一致
   - **VALID-001 参数校验一致性**（major）：Spec 中提及的校验要求必须在代码中找到对应的校验逻辑
4. **生成检查报告**：按 `reportFormat.template` 输出检查结果
   - 汇总：共检查 N 项，通过 M 项，失败 K 项
   - 明细：每项检查的严重度、检查ID、检查名称、差异描述
5. **按严重度处理**：
   - `critical`（严重）：阻止后续流程，必须修复后继续
   - `major`（主要）：输出警告，允许继续但需在交付文档中列出
   - `minor`（次要）：仅提示信息

**常见遗漏**：
  - 开发完成后跳过 spec 一致性检查 → 必须执行，不可跳过
  - 仅检查了部分检查项 → 必须执行配置中的所有检查项
  - 错误文案要求精确匹配 → 应按 `tolerance: keyword` 进行关键词匹配
  - critical 级别问题未修复就继续 → 必须修复后才能进入后续流程
