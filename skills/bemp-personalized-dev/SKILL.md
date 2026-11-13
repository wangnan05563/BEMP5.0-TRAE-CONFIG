---
name: "bemp-personalized-dev"
description: "BEMP 票据系统个性化开发技能。该技能专门用于在指定目录下进行增量功能开发与修改，严格遵循项目编码规范与目录结构要求"
whenToUse: "用户需要开发/实现新功能、修复功能 bug、进行代码审查、遵循开发规范时调用"
triggers: 
   - "需求/功能 开发/编码/实现"
   - "修复/修改 bug、问题、缺陷"
   - "个性化 编码/开发/实现功能/需求"
---

## 配置加载铁律（取参前必读）

本技能 config 下 JSON 中的 `${ENV:VAR}` 是占位符，直接读文件得到的是字面量，不是参数值。取参数值必须先解析：

```powershell
# 解析整个配置 / 取单键（以解析结果为参数值，禁止拿 ${ENV:XXX} 字面量当值用）
python  "..\_shared\load_config.py"  --file "<本技能配置路径>"  --get <a.b.c>
node    "..\_shared\load-config.js"  --file "<本技能配置路径>"  --get <a.b.c>
```

- 解析链：环境变量 > `_shared/env-config.json` environmentDefaults（唯一配置入口）> `${ENV:VAR:默认值}` 内联默认值
- 解析报错 → 跑 `powershell -File "<skills根>\_shared\doctor-config.ps1"`，按 FAIL 清单修复（改 _shared 或设环境变量，禁止把真值回写技能 config）
- 会话内缓存：同一会话只需解析一次，解析结果（`{BANK_CODE}`/`{BANK_CLASS_PREFIX}`/`{BANK_NAME}` 等变量值）直接复用，禁止各阶段重复执行解析命令
- 完整约定见 [_shared/config-loading-guide.md](../_shared/config-loading-guide.md)

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
│   ├── spec-consistency-checklist.json # spec一致性检查清单（技能侧；SC 明细见 _shared）
│   ├── field-sync-checklist.json     # 字段链路同步检查清单（加字段逐环节同步，配置驱动）
│   ├── batch-execution-policy.json   # 批量执行形态与容错策略（双形态/事务边界/观测要求，配置驱动）
│   ├── reference-alignment-checklist.json # 参考实现深度对齐清单（分层矩阵/差异分类/写入侧覆盖，配置驱动）
│   ├── workspace-baseline-policy.json # 工作区基线核查与提交甄别策略
│   ├── guard-interception-policy.json # 旁路管控实现策略（拦截点选择/判定口径/失败策略/双重校验/验证等级）
│   ├── customization-uniqueness-policy.json # 个性化定制唯一性策略（同被定制父类只允许一个实现/合并协议/字段遮蔽）
│   └── data-permission-policy.json   # 数据权限维度与管控生效策略（维度矩阵/入口枚举/失败策略/开关注册）
├── assets/
│   ├── guides/                       # 开发指南（规范+模板合并）
│   │   ├── frontend-guide.md         # 前端开发指南（规范+模板）
│   │   ├── backend-guide.md          # 后端开发指南（规范+模板）
│   │   ├── database-guide.md         # 数据库开发指南（规范+模板+增量SQL规范）
│   │   ├── adapter-guide.md          # Adapter接口开发指南（规范+模板）
│   │   └── offboarding-guide.md      # 功能下线/废弃改造指南（含回归检测，S1-S7流程+D1-D4判断逻辑）
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
    ├── faq.md                        # 常见问题与最佳实践
    ├── hook-diagnosis-patterns.md    # 钩子诊断模式库（静默跳过类缺陷排查/SQL判别集/修复三件套）
    ├── semantic-change-patterns.md   # 语义变更模式库（需求交互缺陷定性/共享行为影响面矩阵/验证等级决策树）
    ├── field-sync-patterns.md        # 字段链路同步模式库（加字段链路矩阵/搬运丢值定性/双向映射对称铁律）
    ├── batch-fault-tolerance-patterns.md # 批量执行形态与容错模式库（双形态定性/事务边界/失败策略/观测要求）
    ├── reference-alignment-patterns.md   # 参考实现深度对齐模式库（**触发场景：需求含"参照/对齐/同款/与XX一致"或目标侧有同类型成熟参考实现时加载**。R1-R7 流程、F1-F6 失败模式、表层vs深层判定、适用/不适用场景）
    └── guard-interception-patterns.md    # 旁路管控实现模式库（**触发场景：需求语义为"对既有链路施加管控（拦截/禁止/校验/限流/开关）"且不改产品代码，或"管控应生效却未生效"缺陷排查、业务语义存在多套码集（码值同义异构）时加载**。G1-G8 流程、拦截点矩阵、机制否定、码值同义判定、等同粒度、fail-open/fail-close、前后端双重校验、未生效分流、验证等级、适用/不适用场景）
    ├── customization-uniqueness-patterns.md # 个性化定制唯一性模式库（**触发场景：新增/修改/重命名/合并带定制注解的类；或"个性化逻辑改了却没生效"且代码静态正确时加载**。CU 双覆盖机制、检测决策树、合并协议三要点、F1-F5 失败模式、验证等级、反模式）
    └── data-permission-dimension-patterns.md # 数据权限维度与管控生效模式库（**触发场景：需求涉及可见性/归属判定/权限校验，或出现"某机构看到不该看的""合法请求被拦""某入口有校验别处没有"时加载**。DP 维度错配、语义同源、管控生效三子形态（入口覆盖/入参形态/参数开关）、条件片段语义方向、验证等级、反模式）
```

## 开发规范文档

本 Skill 遵循以下开发指南（每个指南整合了规范与模板）：

| 领域 | 文档 | 内容 |
|------|------|------|
| 前端 | [frontend-guide.md](assets/guides/frontend-guide.md) | 命名约定、代码风格、组件设计、页面模板、API调用模板 |
| 后端 | [backend-guide.md](assets/guides/backend-guide.md) | 命名约定、代码风格、Controller/Service/DTO模板、异常处理 |
| 数据库 | [database-guide.md](assets/guides/database-guide.md) | 表设计规范、字段命名、DDL/DML模板、MyBatis Mapper模板 |
| Adapter | [adapter-guide.md](assets/guides/adapter-guide.md) | Client/Server端规范、报文转换、签名服务模板 |
| 功能下线/废弃 | [offboarding-guide.md](assets/guides/offboarding-guide.md) | **触发场景：功能下线/废弃/按钮移除/接口下线/"功能还在"归因时加载**。S1-S7 流程、D1-D4 判断逻辑、防回归铁律、删除链清单 |
| 项目规则 | [project-rules.md](references/project-rules.md) | 版本约束、目录规范、核心约束 |
| Override模式 | [override-patterns.md](references/override-patterns.md) | 响应DTO字段传递、Bean注入方式、编译部署重启闭环 |
| HUI组件文档 | `hui_doc` MCP | H-UI 组件属性、方法、事件、使用示例及最佳实践 |
| FAQ | [faq.md](references/faq.md) | 常见问题解答、最佳实践 |
| 扫描器Sanitizer形态库 | [sanitizer-patterns.md](references/sanitizer-patterns.md) | **触发场景：修复路径遍历/文件上传/注入类扫描缺陷，或防御代码被扫描器复报时加载**。认可/不认可形态映射表、修复决策树、白名单三维度模板（P22） |
| 页面组装模式 | [page-assembly-patterns.md](references/page-assembly-patterns.md) | **触发场景：菜单挂载/路由注册变更、弹窗组件复用为独立菜单页、菜单/路由/白屏类缺陷修复定性、界面文案显示 key 原文（国际化子段缺失）时加载**。F1-F4 三源事实核验决策树（实库菜单表/增量脚本/路由注册表，实库为最高基准）、standalone 页面化双分支定稿方案（⚠ 浮层外壳退化补丁已废弃——受控实测通过但业务验收失败，浮层与页面是两种渲染范式）、差异化国际化子段补充与覆盖度校验、验证等级匹配表 |
| 钩子诊断模式 | [hook-diagnosis-patterns.md](references/hook-diagnosis-patterns.md) | **触发场景：钩子/切面/拦截器/开关类功能"业务成功但效果未生效"缺陷排查定性、需产出远程环境核实 SQL 判别集、钩子跳过分支补日志或等同判断粒度改造时加载**。D1 定性分流、D2 关卡清单法、D3 同源分叉判别、D4 SQL 判别集模板（含归属确认）、D5 截图取证规则、D6 修复模式三件套（fail-open/fail-close 决策树）、D7 环境隔离、验证等级匹配 |
| 语义变更模式 | [semantic-change-patterns.md](references/semantic-change-patterns.md) | **触发场景：新需求上线后旧功能异常（功能代码未被本次改动的需求交互缺陷）、修复需改变共享行为语义（逻辑删除↔物理删除/查询默认过滤/状态枚举含义/提示形态/导入解析口径）、修复后运行环境不可用需定验证等级时加载**。C1 定性分流、C2 共享行为语义变更影响面矩阵【强制】、C3 后端契约前置核实、C4 框架能力优先、C5 非法输入拦截前移、C6 修复即注释扩散同步、C7 验证等级决策树、C8 执行环境适配 |
| 字段链路同步模式 | [field-sync-patterns.md](references/field-sync-patterns.md) | **触发场景：给既有表/实体新增字段（扩列/字段扩展）且需在列表/弹窗/导出/日志展示或落库、"某字段落库/展示为空/修改之后没有记录/改了查不到"类缺陷、维护实体↔DTO/VO 映射（转换）工具时加载**。E1 现象分流（现象→环节）、E2 字段链路完整性矩阵【强制】（单一数据源为 config/field-sync-checklist.json）、E3 映射工具双向对称铁律【强制】、E4 验证失败反馈优先+截图取证、E5 无运行环境时 JVM 级断言复现、E6 收口口径（诚实标注验证缺口）、E7 执行环境适配、验证等级匹配表 |
| 批量执行形态与容错模式 | [batch-fault-tolerance-patterns.md](references/batch-fault-tolerance-patterns.md) | **触发场景：编写/改造定时任务或日终批量、页面批量导入/批量提交、批处理服务、批量补全或批量同步（多条数据逐条/整批处理），或需判断"单条失败该跳过还是整批回滚"时加载**。B1 形态定性（业务语义→形态，默认机制）、B2 双形态对照矩阵、B3 批量容错骨架（无整批事务+单条 catch 跳过）、B4 整批原子骨架（整批一个事务+带定位抛出回滚）、B5 观测要求（三态结果+失败明细+error 留痕+批次日期）、B6 边界风险（后置动作失败部分状态/幂等/全量无分页）、B7 验证注入（按形态选断言）。单一数据源为 config/batch-execution-policy.json |
| 参考实现深度对齐模式 | [reference-alignment-patterns.md](references/reference-alignment-patterns.md) | **触发场景：需求含"参照/参考/对齐/同款/与XX一致/移植/适配"措辞，或目标侧存在同类型成熟参考实现（产品化→个性化、A项目→B项目、老版本→新版本）且功能含写入侧时加载**。R1 触发识别、R2 三源事实核验【强制】、R3 分层拆解（L1-L7）、R4 差异台账【强制闸门：台账未产出禁止编码】、R5 差异四分类处置、R6 落地实现、R7 逐层回归验证；F1-F6 失败模式（表层对齐/隐式语义/写入侧漏项/口径漂移/无罪删除/差异无台账）；表层 vs 深层判定；适用/不适用场景。单一数据源为 config/reference-alignment-checklist.json |
| 旁路管控实现模式 | [guard-interception-patterns.md](references/guard-interception-patterns.md) | **触发场景：需求语义为"对既有链路施加管控（拦截/禁止/校验/限流/开关）"且不改产品代码，或"管控应生效却未生效"缺陷排查、业务语义存在多套码集时加载**。G1 需求定性、G2 机制核验（先否定再换落点）、G3 拦截点选择、G4 判定口径（码值同义异构+等同粒度，最高发根因）、G5 fail-open/fail-close、G6 双重校验与留痕、G7 未生效分流、G8 验证等级；适用/不适用场景。单一数据源为 config/guard-interception-policy.json |
| 定制唯一性模式 | [customization-uniqueness-patterns.md](references/customization-uniqueness-patterns.md) | **触发场景：新增/修改/重命名/合并带定制注解的类；或"个性化逻辑改了却没生效"且代码静态正确、无编译错误时加载**。CU-001 同一被定制父类唯一实现（双重覆盖静默失效）、CU-002 合并后字段遮蔽与注入等价；检测决策树、合并协议三要点（方法三分类/字段遮蔽/迁移不是重构）、F1-F5 失败模式、验证等级、反模式。单一数据源为 config/customization-uniqueness-policy.json |
| 数据权限维度与管控生效模式 | [data-permission-dimension-patterns.md](references/data-permission-dimension-patterns.md) | **触发场景：需求涉及数据可见性/归属判定/权限校验；或出现"某机构看到不该看的""合法请求被拦住""某入口有校验另一入口没有"时加载**。DP-001 维度与字段归属匹配（客户级字段不得做账号级判定）、DP-002 管控入口覆盖与入参形态（取不到就放行=等效无校验）、DP-003 业务参数开关生效观测（开关放开使过滤架空）、DP-004 条件片段语义方向；验证等级、反模式。单一数据源为 config/data-permission-policy.json |

## 配置文件

所有配置文件位于 `config/` 目录下，支持三级配置继承：技能级（默认）→ 项目级（覆盖）→ 银行级（覆盖）。

| 配置文件 | 用途 | 继承支持 |
|---------|------|---------|
| [config.json](config/config.json) | 技能主配置：环境变量引用、编码规范、增量原则 | 是 |
| [compile-deploy.json](config/compile-deploy.json) | 编译→部署→重启路径配置 | 是 |
| [function-id-rules.json](config/function-id-rules.json) | @CloudFunction 功能号冲突检查规则：前缀、序号范围、排除列表 | 是 |
| [file-integrity-rules.json](config/file-integrity-rules.json) | 文件写入完整性校验规则：大括号匹配、标签匹配、修复策略 | 是 |
| [spec-consistency-checklist.json](config/spec-consistency-checklist.json) | Spec 一致性检查清单技能侧配置（**SC-001~006 明细以 `_shared/spec-consistency-checklist.json` 唯一权威源为准**） | 是 |
| [field-sync-checklist.json](config/field-sync-checklist.json) | 字段链路同步检查清单：加字段逐环节同步的 chain（环节/判据/缺失症状）、双向对称硬规则、空值现象分流、验证断言模式 | 是 |
| [batch-execution-policy.json](config/batch-execution-policy.json) | 批量执行形态与容错策略：形态枚举（批量容错/整批原子）、业务语义→形态判定规则、事务边界、失败策略、观测要求（三态/明细/留痕/批次日期）、反模式、风险清单、验证注入 | 是 |
| [reference-alignment-checklist.json](config/reference-alignment-checklist.json) | 参考实现深度对齐清单：触发词与适用判定、三源核验、分层矩阵（L1-L7：入口权限/数据契约/数据源/写入侧场景/口径函数/粒度语义/差异台账）、差异四分类（可移植/需适配/不适用/需新建）与未知升级策略、写入侧枚举与覆盖闸门、口径一致性、差异台账字段与前置闸门、按层验证等级、不适用场景 | 是 |
| [workspace-baseline-policy.json](config/workspace-baseline-policy.json) | 工作区基线核查与提交甄别策略：回退判定阈值、diff 三分类处置、备份与恢复规则 | 是 |
| [guard-interception-policy.json](config/guard-interception-policy.json) | 旁路管控实现策略：拦截点矩阵、机制核验、码值同义判定规则、等同粒度、fail-open/fail-close 决策树、前后端双重校验分工、留痕要求、未生效分流、环境降级与验证等级 | 是 |
| [customization-uniqueness-policy.json](config/customization-uniqueness-policy.json) | 个性化定制唯一性策略：扫描参数（扫描根/注解/正则/分组键）、检测命令模板、合并协议（方法三分类/字段遮蔽/行为等价/合并后校验）、CU-001~CU-002 检查项、验证等级 | 是 |
| [data-permission-policy.json](config/data-permission-policy.json) | 数据权限维度与管控生效策略：维度矩阵（法人/机构/客户/账号及候选载荷字段）、跨维度规则、入口枚举与入参形态核查、失败策略、业务参数开关注册表、条件复用语义规则、DP-001~DP-004 检查项、验证等级 | 是 |

**配置继承机制**：
- 技能级配置（`bemp-personalized-dev/config/`）：默认配置，适用于所有银行
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
   - **需求五要素检查**：进入开发前核对——①功能类型（前端/后端/数据库/Adapter 组合）②变更性质（新增/修改/复用）③涉及页面或接口名 ④是否需要增量 SQL ⑤是否需要编译部署闭环；要素缺失时通过 AskUserQuestion **一次性**收齐，禁止开发过程中逐点追问（每轮返工需重读指南，token 成本高）

2. **规范检查**
   - 检查 banks/ext-{BANK_CODE} 目录下是否有可复用的带 @CustomizedBean 注解的个性化类
   - 检查 frontend/src/views/bizViews/banks/{BANK_CODE} 目录下是否有对应的个性化 Vue 文件
   - 检查是否有同类功能的实现可供参考

3. **参考分析**
   - 查看产品化代码的实现方式
   - 参考同目录下已有的个性化实现案例
   - 特别注意 UI 组件的风格一致性 (如超链接风格、输入框风格等)

3.1 **参考实现深度对齐【条件强制：存在成熟参考实现时】**
   - **配置文件**：[reference-alignment-checklist.json](config/reference-alignment-checklist.json)，层清单/差异分类/判据/验证等级全部配置驱动，禁止在流程中硬编码
   - **模式参考**：[参考实现深度对齐模式库](references/reference-alignment-patterns.md)（R1-R7 / F1-F6）
   - **触发条件**：需求命中 `trigger.markers`（参照/参考/对齐/同款/与XX一致/移植/适配），或目标侧存在同类型成熟参考实现且功能含**写入侧**（落库/状态流转/金额变动）
   - **执行步骤**：
     1. **三源事实核验**（`preconditions.mustVerifyThreeSources`）：**参考实现须读三处**——前端页面 **+ 后端接口 + 写入侧（落库/状态变更）**；另核目标侧现状与真实数据。**只读前端页面即开始仿写 = 典型失败起点**
     2. **分层拆解**：按 `layers`（L1 入口与权限 / L2 数据契约 / L3 数据源 / L4 写入侧与场景矩阵 / L5 口径函数 / L6 粒度与语义 / L7 差异台账）逐层比对，产出「参考行为 → 目标行为 → 差异」
     3. **差异台账产出【强制闸门】**：按 `diffLedger.requiredFields`（层id/参考行为/目标行为/分类/依据/验证方式）逐项落表；`gate=pre-coding` —— **台账产出前禁止进入编码**，这是防止「表层对齐」的核心卡点
     4. **差异四分类处置**（`diffClassification`）：`可移植/需适配/不适用/需新建`，各按 `action` 处置；无法归类时按 `onUnknown=stop-and-escalate` **暂停并升级用户裁决**，禁止静默选边
     5. **写入侧覆盖闸门**（`writeSideEnumeration`）：枚举**全部写入点**，并以**场景码字典/枚举的全量取值**为覆盖基准逐值说明「是否需要写」，存在「未说明」取值即不通过（高发漏项：只覆盖交易类场景，遗漏维护类生命周期事件）
     6. **口径一致性核对**（`caliberConsistency`）：同语义字段的格式化/转码/单位必须显式比对，任何变更须写依据或还原参考口径
     7. **逐层回归验证**（`verification.levels` + 各层 `minVerifyLevel`）：L4/L6 必须**造业务数据实测落库结果**（粒度/关联/快照正确），仅编译通过不构成闭环
   - **禁止行为**：不得凭直觉精简（删除参考侧列/接口/辅助链路的，必须在台账记录依据与替代评估）
   - **不适用场景**（`exclusions`）：无参考的新功能、参考实现本身有已知缺陷、纯样式/文案调整、参考与目标业务规则根本不同（此时应对齐机制、差异记 `not-applicable`/`adapt`）

4. **开发指南参考【强制】（分层加载，控制 token 消耗）**
   - **加载顺序**：先 Read 对应指南的头部规范章节（命名约定、代码风格、硬性红线），用 Read 的 offset/limit 限取头部约 150 行，**禁止一次性全文加载指南**
   - **模板正文按需定位**：仅在新建文件时，先 Grep 定位目标章节标题，再用 Read offset 读取该章节，避免顺序读全文
   - **前端开发**: [前端开发指南](assets/guides/frontend-guide.md)
   - **后端开发**: [后端开发指南](assets/guides/backend-guide.md)
   - **数据库开发**: [数据库开发指南](assets/guides/database-guide.md)
   - **Adapter 接口开发**: [Adapter接口开发指南](assets/guides/adapter-guide.md)
   - **项目规则**: 必须遵守 [项目规则](references/project-rules.md)
   - **Override模式**: 后端开发涉及子类重写父类方法时，必须参考 [Override模式知识库](references/override-patterns.md)
   - **HUI组件文档**: 前端开发中涉及 H-UI 组件使用时，必须调用 `hui_doc` MCP 查询组件详细信息
   - **上下文不常驻**：指南模板内容使用后无需在后续回复中复述，后续阶段只引用章节锚点（如"按 frontend-guide 页面模板章节"）
   - **复用跳过**：修改/复用场景（已命中可复用实现时）只需读头部规范章节，跳过模板正文加载
   - 根据开发内容类型，选择对应的开发指南文档，确保编码符合规范要求

5. **HUI 组件文档查询【强制】**
   - 前端开发过程中，凡涉及 H-UI 组件的使用（包括但不限于 `h-form`、`h-datagrid`、`h-button`、`h-msg-box`、`h-input`、`h-select`、`h-tree` 等），必须先通过 `hui_doc` MCP 查询该组件文档
   - 查询范围以本次使用所需为准：属性签名、关键事件与使用约束（方法/插槽/示例按需查询）
   - 使用 `mcp_hui_doc_get-components-list` 获取所有可用组件列表，使用 `mcp_hui_doc_get-base-component` 或 `mcp_hui_doc_get-extend-component` 查询特定组件的详细文档
   - 查询策略（降采样，控制 token 消耗）：
     - 不熟悉的组件：必须查阅文档确认属性签名、关键事件与使用约束后再使用，回复中引用结论即可，禁止全文复述文档内容
     - 熟悉的组件：只确认关键属性的用法和默认值，避免因版本差异导致 API 不一致
     - 组件间交互场景：需同时查询多个相关组件的文档，确保组合使用的兼容性
     - **会话内缓存**：同一组件每次会话只查询一次，结论缓存后直接复用，禁止重复查询相同组件
   - 禁止凭记忆或猜测使用组件 API，必须以官方文档为准

6. **环境真实性核验【强制】**
   - **配置文件**：[config.json](config/config.json) 的 `developmentWorkflow.preDevVerification`
   - 对 `{BANK_PROJECT_DIR}` 源码目录及本次将读写的每个关键文件执行存在性核验命令（按 `existenceCommandTemplate` 生成），**Glob/Grep/Read 的索引命中不作为存在依据**
   - 每次编辑落盘后按 `postEditRereadRequired` 回读验证内容真实写入磁盘
   - 同一路径出现多个近似名称候选时按 `nearNameManualArbitration` 要求人工裁决，禁止自动猜测（真实案例：一字之差的兄弟目录导致全部改动写入假路径）
   - 接受子智能体/他人交付结论前，必须复核其"文件存在/缺失"断言的真实性证据

### 第二阶段：开发实施

**前置检查：工作区基线核查【强制】**
- **触发条件**：[workspace-baseline-policy.json](config/workspace-baseline-policy.json) 的 `triggers` —— ①Edit/Write 目标文件在 git status 中已是 modified 态；②任何 git commit 前；③子智能体/外部会话交付代码改动后（trust-but-verify，不以汇报文字为验收标准）
- **配置文件**：[workspace-baseline-policy.json](config/workspace-baseline-policy.json)，回退判定阈值（删除行/预期改动量倍数、纯删除 hunk 占比、近期提交扫描深度）与处置命令模板全部由配置管理，禁止硬编码
- **检查步骤**：
  1. 拟改动文件先 `git diff --stat` 核对变更量：被删除行数/纯删除 hunk 占比超过配置阈值（`regressionSignals.diffVolumeAnomaly`），或与本任务预期改动点清单明显不符 → 进入回退甄别
  2. 回退确认：按 `regressionSignals.historicalFixMissing` 扫描该文件近期提交（深度取 `recentCommitScanDepth`），提取标志性标识符 grep 工作区文件，缺失已提交修复的标志性代码即确认回退
  3. 回退处置按 `handling.order` 执行：备份工作区态（`backup.destinationRule`）→ 仅对回退文件 `git checkout HEAD --`（禁止对其他会话 WIP 文件执行，禁止目录级批量 checkout）→ 以最小 diff 重放本任务改动 → 重新编译/语法校验
  4. 提交前逐文件 diff 三分类（`diffClassification`）：taskChange（提交）/ otherWip（留置不提交不回滚）/ regression（按上步处置）；同一文件混含本任务改动与回退特征时按 regression 处置，禁止整文件直接提交
  5. 归属不明（既非本任务改动也无法确认回退）时按 `handling.escalation` 暂停并交用户裁决，禁止静默选边
- **常见遗漏**：
  - diff 变更量远超本任务预期仍直接叠加改动 → 子智能体可能在被回退的旧基线上开发，提交将永久丢失历史修复
  - 提交时整目录 `git add` / `commit -a` → 裹挟其他会话 WIP
  - 处置完以"流程执行完毕"为验收 → 必须按 `verification.signatureCodeCheck` grep 标志性代码确认在位、`emptyDiffConfirmation` 确认 diff 纯净

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
- **增量 SQL 主键 ID 分配（全局）**：所有 INSERT 显式指定主键 ID 的 DML 统一用当前日期+序号（YYYYMMDD+2位连续序号，如 2026090201），不依赖实库 MAX(ID) 续号、禁止凭记忆取号，防跨环境主键冲突，规则见 [database-guide.md 3.1](assets/guides/database-guide.md)
- **幂等删除按业务键（全局）**：『先删后插』DELETE 优先按业务唯一键（PARAM_KEY/URL/PEND_URL/TASK_NO 等）作 WHERE 条件，禁止仅按主键 ID——跨环境同一业务记录 ID 不一致会删错记录/删不到后重插主键冲突；表无业务键才退用同 ID 删插，规则见 [database-guide.md 3.1](assets/guides/database-guide.md)
- **任务注册脚本**：批量定时任务注册 SQL 默认写 TT_TASK（非 TT_TIMER_TASK），主键 ID 遵循上述全局 ID 分配规则，模板见 [database-guide.md 3.2.5](assets/guides/database-guide.md)
- **业务参数/字典配置脚本**：生成前必须先 Grep 本银行历史脚本同 PARAM_KEY（或同业务键）查重——取值一致复用不新增、不一致仅同 ID UPDATE、确无才新增，规则见 [database-guide.md 3.2.6](assets/guides/database-guide.md)
- **按钮权限配置脚本**：需求涉及页面新增按钮时必须同步生成 TM_BUTTON_AUTH 显隐权限 SQL（键=AUTH_ID+BTN_PATH，AUTH_ID 实库核对菜单；主键 ID 用当前日期+序号如 2026090201 防跨环境冲突），规则见 [database-guide.md 3.2.7](assets/guides/database-guide.md)
- **业务参数字典组补值**：参数头表 `PARAM_TYPE IN ('1','2')` 且用自定义 `PARAM_GROUP_CODE` 时必须同步补 `TM_BUSI_PARAM_DICT` 字典值行，否则下拉空白；复用已有组（如是否类 `Yon`）不新增，规则见 [database-guide.md 3.2.8](assets/guides/database-guide.md)
- **常见遗漏**：
  - 仅凭记忆认为功能号未占用 → 必须查询数据库验证
  - 复制其他银行代码未改功能号 → 必须检查功能号唯一性
  - 功能号格式不规范 → 按 `generationRules.format` 规则生成

**前置检查：取数前置调研【条件强制】**
- **配置文件**：[config.json](config/config.json) 的 `developmentWorkflow.dataAvailabilityResearch`
- **触发条件**：需求命中 `triggers` 中任一关键词（如"新增取数/查库补全/新增DAO查询"）时
- **调研要求**：编写代码前产出"来源表 × 字段名 × 数据分布"核对清单，并逐项佐证：
  1. 表/字段真实性：经存量 mapper XML 或实体类 grep 佐证，禁止按命名惯例猜测
  2. 数据可用性：候选表/查询条件是否有真实数据支撑（空表即触发 `emptyTablePolicy: blockAndEscalate`——阻止方案落地并升级业务方确认替代口径，禁止静默选边强行实现）
  3. 批量模式：批量补全场景必须遵守 `batchFillPattern`（循环体内禁止逐条查库；收集缺失项→按 `maxInClauseSize` 分片一次 in 查询→内存回填且仅覆盖空缺项；单条入口委托批量实现）
- **常见遗漏**：
  - 凭 DTO 命名惯例断言字段存在 → 必须打开实体/接口源码核实 getter
  - 候选来源表为空表仍坚持该方案 → 会引入"查空即跳过"的静默失效
  - 循环内 singletonList 单查补全 → 违反批量化模式（N+1）

**前置检查：字段链路同步检查【条件强制】**
- **配置文件**：[field-sync-checklist.json](config/field-sync-checklist.json)，链路环节/触发词/判据/缺失症状/验证断言全部由配置管理，禁止在流程中硬编码清单
- **模式参考**：[字段链路同步模式库](references/field-sync-patterns.md)（E1-E7）
- **触发条件**：需求命中 `trigger.markers`（如"新增字段/加字段/字段扩展/新增列/扩列/字段同步"）且涉及**既有表/实体**；字段"为空/未记录/改了查不到"类返工默认命中
- **检查步骤**：
  1. 先枚举该字段需流经的**全部既有链路**（`hardRules.existingChainFirst`）：查询/展示/日志/导出/校验/导入，产出链路清单后再动手，禁止只改最直观的一处
  2. 按 `chain` 逐环节同步（数据库列定义 → 实体 → DTO/VO（api+as 双工程）→ Dao.xml 四段（BaseResultMap/Base_Column_List/insert/insertSelective）→ **映射工具两个方向** → 业务快照（原值/新值）→ 前端列+字典组），`mandatory=true` 环节漏补即阻断交付
  3. **双向对称核对【强制】**（`hardRules.converterSymmetry`）：X↔Y 映射工具加字段必须同时补**读取+写入两个方向**；grep 字段名列出全部搬运方法逐一核对，缺一方向即漏
  4. 返工场景先按 `emptyValueDiagnosis.branches` 按现象分流再定位环节（行不存在→写动作链路；记录在而列空→搬运方向），禁止直接猜代码
- **常见遗漏**：
  - 只补映射工具的读取方向（entity→Dto）漏写入方向（Dto→entity）→ 编译/查询/前端列均正常，唯独值为空（**静默丢值高发点**）
  - Dao.xml 只补 BaseResultMap 漏 insert/insertSelective → 查询有值、写入仍空
  - DTO 只改 as 工程漏 api 工程（或反之）→ 跨工程取不到值
  - DDL 未实际执行或漏列 → 写入报未知列；无库环境须把"实库列存在性"标为验证缺口

**前置检查：批量执行形态与容错【条件强制】**
- **配置文件**：[batch-execution-policy.json](config/batch-execution-policy.json)，形态名/判据/观测字段/反模式/风险清单/验证注入全部由配置管理，禁止在流程中硬编码
- **模式参考**：[批量执行形态与容错模式库](references/batch-fault-tolerance-patterns.md)（B1-B7）
- **触发条件**：需求/任务涉及多条数据的批量处理（命中 `trigger.markers`，如"批量/逐条/定时任务/日终/日间配套/批处理/批量导入/批量补全/跑批"）
- **检查步骤**：
  1. **定性形态【强制】**（`modeSelection.rules`）：批内条目互不依赖且允许部分成功 → `batch-tolerant`（单条失败隔离）；同一业务动作不可分割、要求全有或全无 → `atomic`（整批同生共死）；两类判据冲突或都不满足 → 按 `onAmbiguous=escalate` 升级裁决，禁止静默选边
  2. **按形态落地事务边界与失败策略**（`modes.{形态}`）：容错形态**无外层整批事务**、单条 `catch` 后计数+明细+error 留痕且不中断（单条脏数据不阻断整批）；原子形态**整批一个事务**、单条异常带定位信息（行号/业务键）抛出触发整批回滚，禁止循环内吞异常
  3. **观测要求**（`observability`）：结果三态（成功/部分成功/失败，由成功数与失败数推导）+ 失败明细含业务键与原因 + 每条失败 error 留痕 + 统计报告带批次日期；零条数据同样输出报告
  4. **风险自检**（`riskChecklist`）：主数据写入后的动作（日志/快照/下游）失败会产生"数据已落库但计失败"的部分状态，必须留痕可补做；容错形态的新增路径必须**幂等**（重跑整批不得产生重复）
  5. **业务逻辑共用**（`sharedLogicForSingleEntry`）：同一业务同时有批量入口与单条入口时，单条入口作为批量的退化形态委托同一实现，禁止各写一份
- **常见遗漏**：
  - 容错形态却把整个循环包进一个事务 → 单条失败连坐已成功条目，与"允许部分成功"矛盾
  - 原子形态却在循环内 `catch` 后 `continue` → 脏数据静默放行，用户误以为已全部入库
  - 只报失败条数不报成功数 → 无法推导三态结果；失败明细缺业务键/原因 → 人工无法定位与补做

**前置检查：旁路管控类实现【条件强制】**
- **配置文件**：[guard-interception-policy.json](config/guard-interception-policy.json)，触发词/拦截点矩阵/机制核验/码值同义规则/等同粒度/失败策略/双重校验/留痕要求/未生效分流/环境降级/验证等级全部由配置管理，禁止在流程中硬编码
- **模式参考**：[旁路管控实现模式库](references/guard-interception-patterns.md)（G1-G8）
- **触发条件**：需求语义为"对既有链路施加管控"且约束不改产品代码（命中 `trigger.markers`：拦截/禁止/不允许/卡控/限流/开关）；"管控应生效却未生效"类返工默认命中
- **检查步骤**：
  1. **需求定性**（`trigger`）：判定管控语义与落点层级（接口层/服务层/组件层）；非管控类需求退出本流程（允许直接改产品代码的不适用）
  2. **机制核验【强制】**（`mechanismPrecheck`）：一旦怀疑"某层 AOP/切面不生效"，先按 m1→m3 做**机制否定**（框架全局切点定义 + 产品自带同类切面先例 + 目标 Bean 调用路径）；m1 与 m2 均成立即机制可用，**禁止未做否定就直接换落点**（否则引入无必要改动并掩盖真根因）
  3. **落点选择**（`interceptionPoints`）：按候选的 `when/verify/risk/fallback` 选点；需求表述为"接口层校验"时优先控制器落点；无法确认切点可生效时必须显式降级到更外层落点，并在注释与交付声明记录依据与风险
  4. **判定口径【最高发根因】**（`valueAliasRules`/`granularityRules`）：判定业务语义前**先 grep 四处码值来源**（产品常量类/字典组/SQL 样本/前端字面量）穷举同义码值，优先复用产品同源口径函数；**禁止单值字面量 equals**（其他同义码值会全部落入放行分支而致条件恒不成立）；等同判定按业务口径选粒度（行号级/机构级/法人级），注释写明"为什么选该粒度"
  5. **失败策略与双重校验**（`failurePolicy`/`dualValidation`/`logging`）：旁路自身依赖异常时按决策树论证 fail-open/fail-close 并 error 留痕、注释写明兜底点；前端"尽力拦截"+后端"权威兜底"，**漏拦边界显式声明**（只做一端不算闭环）；提示文案前后端逐字一致且集中为常量；**放行与拦截均须留痕**（业务唯一键+判定要素值+判定结论）
  6. **未生效分流**（`ineffectiveDiagnosis`）：上线反馈"未生效"先分流——无留痕=发布新鲜度/落点未调用；有留痕走放行=判定口径不成立；有留痕命中未阻断=异常被上层吞并；需要远程逐条核实时按 [hook-diagnosis-patterns.md](references/hook-diagnosis-patterns.md) D4 产出 SQL 判别集；**远程事实优先于本机推断**
  7. **验证等级**（`verification`/`environmentPrecheck`）：按变更类型取最低等级；本机工具链缺失（如 `JAVA_HOME`）或前端构建不可用或无目标环境时按 `failAction` 降级，并在交付声明显式标注缺口；**无目标环境实测禁止标 verified**
- **常见遗漏**：
  - 只判某一侧码值 → 其他同义码值全部落入放行分支，管控恒不生效（本类**最高发根因**）
  - 怀疑 AOP 不生效就直接换落点而未做机制否定 → 无必要改动且掩盖真根因，下一轮仍不生效
  - 只做前端或只做后端一端就宣称闭环 → 前端漏拦边界无人兜底
  - 放行分支不留痕 → 后续"未生效"反馈无定位入口，被迫全流程排查

**前置检查：个性化定制唯一性【强制】**
- **配置文件**：[customization-uniqueness-policy.json](config/customization-uniqueness-policy.json)，扫描根/注解标记/类声明正则/分组键/合并协议/验证等级全部由配置管理，禁止在流程中硬编码具体类名或父类名
- **模式参考**：[定制唯一性模式库](references/customization-uniqueness-patterns.md)（CU-001~CU-002 / F1-F5）
- **触发条件**：新增、修改、重命名、合并任何带定制注解（默认 `@CustomizedBean`）的类；或缺陷现象为「个性化逻辑改了却没生效」而代码静态检查正确
- **检查步骤**：
  1. 确认本次类的 `extends` 父类全名，按 `commands.listCustomizedClasses` 扫描全工程带定制注解的类并按 `groupKey` 分组
  2. 若目标父类分组内实现数 `> parameters.maxCandidatesPerGroup` → **判定冲突，禁止新建第二个继承类**；应直接在既有实现上追加/修改方法（追加优先于新建再合并）
  3. 确需合并时按 `mergeProtocol.order` 执行：方法三分类 → 迁移 → 删除被合并类 → 等价性验证
  4. **字段遮蔽专项**（`mergeProtocol.fieldShadowChecks`）：迁移方法依赖的字段若与父类 `protected/public` 字段同名，必须连同声明与注入注解一并迁移，并在类注释论证注入等价性
  5. 合并后执行 `postMergeVerify`：重新扫描 count=1、被删类代码引用=0、字段注入逐项核对、编译通过
- **常见遗漏**：
  - 两个类都能编译、启动不报错，就认为「框架会用对的那个」→ 实际按注册顺序择一，落选类**全部覆盖方法静默失效**（机构过滤/校验不执行），是「改了没用」类缺陷的高发根因
  - 认为「父类已有同名字段」而省略字段迁移 → 合并后方法改读父类字段，注入来源/时机不同导致运行期空值或口径漂移
  - 合并时「顺手优化」判定条件/文案/排序 → 失去与合并前的对照基准，回归无法验证
  - 删除类后仅编译通过，不 Grep 残留引用

**前置检查：数据权限维度与管控生效【强制】**
- **配置文件**：[data-permission-policy.json](config/data-permission-policy.json)，维度矩阵/跨维度规则/入口枚举/失败策略/开关注册表/条件复用规则全部由配置管理，禁止在流程中硬编码具体业务字段名或参数键
- **模式参考**：[数据权限维度与管控生效模式库](references/data-permission-dimension-patterns.md)（DP-001~DP-004）
- **触发条件**：需求涉及数据可见性、归属判定、权限校验、按机构/法人/客户/账号收窄或放开；或缺陷现象为「某机构看到不该看的」「合法请求被拦住」「某入口有校验另一入口没有」
- **检查步骤**：
  1. **维度匹配（DP-001）**：先在 `dimensionMatrix` 定位本次判定的**主体维度**（法人/机构/客户/账号），再选该维度承载实体上的字段；按 `crossDimensionRules` 校验字段归属——**客户级字段不得用于账号级或单据级判定**；同一业务概念在全部入口须映射同一语义字段，无对应字段时登记近似映射与偏差
  2. **入口覆盖（DP-002）**：按 `guardEnforcement.entryPointEnumeration` 枚举全部写入/查询入口（含内部复用方：定时任务/渠道自动流程），产出入口清单；逐入口核对判定依赖字段的实际入参形态，缺失者按 `inputShapeCheck.decisionRule` 处置（**反查补齐 > fail-close > fail-open+留痕**）
  3. **失败策略与留痕（DP-002）**：按 `failurePolicy` 论证 fail-open/fail-close 并写明兜底点；「无法判定」必须是显式分支（有日志有结论），禁止与「正常放行」共用路径
  4. **开关观测（DP-003）**：过滤/管控若依赖产品参数开关，按 `switchRegistry` 与 `parameters.switchLookupOrder` 确认实际取值与语义；放开态必须在交付声明与评审报告中**显式告警**；个性化侧优先构造**不依赖该开关的强制收窄**
  5. **条件语义方向（DP-004）**：复用既有条件片段前按 `conditionReuse.rules` 核实语义方向（排除型≠保留型）与标志字段真实业务态；新增过滤后须用真实数据验证结果集非空
  6. **验证等级**：按 `verificationLevels` 取最低等级，权限边界类改动**禁止以编译通过结案**
- **常见遗漏**：
  - 只看「代码里有没有过滤条件」，不证明它在全部入口、全部参数取值下真正生效 → 管控名义存在、实际被绕过
  - 判定依据取不到就 `return` 放行且不记日志 → 等效无校验且无迹可查，事后只能靠排除法排查
  - 依赖产品化参数开关做收窄 → 开关为放开态时过滤条件被架空，排查方向被误导到代码侧
  - 照搬既有条件片段而方向相反（排除型用成保留型）或用直觉假设标志字段业务态 → 查询恒为空/过滤恒不生效，编译无错

1. **后端开发 (必须在 banks/ext-{BANK_CODE} 目录下)**
   - **指南参考**: 先参考 [后端开发指南](assets/guides/backend-guide.md) 中的代码模板章节
   - **接口/DTO 工程归属【强制】**: 新增或迁移对外服务接口时，先看 backend-guide [§9.4.1 api/as 工程分层契约](assets/guides/backend-guide.md)——接口放 `{BANK_CODE}-biz-api` 工程 `{域}/service` 包（@CloudService）、DTO 同域 `dto` 包；从 as 迁移保持包名不变（引用方零改动）；完成后 api/as 两工程 clean 编译验证
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
   - **脚本存放目录**: `deploy/bemp-script/src/main/resources/banks/{BANK_NAME}/`，`{BANK_NAME}` 取值来自唯一配置入口（`_shared/env-config.json` 的 environmentDefaults.BANK_NAME，或同名环境变量），禁止在本文档或脚本中硬编码银行名
   - **配置中心增量文件目录**: `deploy/bemp-home/src/main/resources/configcenter/banks/{BANK_NAME}/`
   - **命名规范**: 严格遵循 `V{产品版本号}_{日期时间}_{执行序号}_{任务编号}_{中文描述}.{脚本类型}.sql` 格式；执行序号 2 位、从 01 起按执行顺序连续编号，**DDL 序号必须全部小于 DML**、同批脚本共用同一日期时间戳（保证按文件名排序即执行顺序），参考 [数据库开发指南 - 命名规范](assets/guides/database-guide.md) 第2章节
   - **增量策略**: 必须采用"先删除后新增"策略，确保脚本幂等可重复执行；**幂等 DELETE 优先按业务键删除**（禁止仅按主键 ID，规则见 [database-guide.md 3.1](assets/guides/database-guide.md)）
   - **脚本拆分**: 按变更类型拆分为独立文件（DDL/DML分离，菜单/参数/流程分文件）；拆分后先排定执行顺序再分配序号，同批脚本复用同一日期时间戳
   - **脚本检查**: 生成后必须按 [SQL脚本生成检查清单](assets/guides/database-guide.md) 第6章节逐项检查
   - **生成步骤**:
     1. 分析需求涉及的数据库变更类型（菜单/参数/表结构/流程/待办等）
     2. 查询现有数据库中相关表结构和数据，确定变更范围
     3. 先按执行顺序（DDL 先于 DML、菜单先于按钮权限/待办）排出本批脚本清单，从 01 起分配执行序号，再按命名规范生成脚本文件存放于对应银行目录下
     4. 每个脚本文件遵循"先删除后新增"模板
     5. 如涉及配置变更，同步生成配置中心JSON增量文件
     6. 按检查清单逐项验证脚本质量（含"按文件名排序即执行顺序"自检）

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
    - **JDK 版本错配特征（F2，编译命令说明）**：默认 JDK 版本高于工程编译目标版本时，部分依赖库反射调用在运行期抛异常（典型如 IllegalAccessError / IncompatibleClassChangeError），表现为"编译通过但启动/运行异常"。因此编译与启动必须使用 [compile-deploy.json](config/compile-deploy.json) `jdk.jdk_home` 指定的 JDK（经配置解析链取值），禁止直接调用系统默认 java/javac；遇到上述特征先核对实际使用的 JDK 是否为配置指定版本，再排查代码
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

- **配置文件**：[spec-consistency-checklist.json](config/spec-consistency-checklist.json)（技能侧）；检查项明细以 `_shared/spec-consistency-checklist.json` 唯一权威源为准
- **触发时机**：
  - 开发实施完成后（`onDevComplete`）
  - 代码评审阶段（`onCodeReview`）
  - 缺陷修复后验证（`onFixVerify`）

**检查步骤**：
1. **定位 Spec 文档**：按 `specSource.searchPaths` 和 `filePatterns` 搜索需求规格文档
2. **加载检查清单**：读取 `_shared/spec-consistency-checklist.json` 的 `items`（本技能 `config/spec-consistency-checklist.json` 的 `checklist.ref/path` 指向它）
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
   - **结论化输出**：报告只含汇总行+失败项明细，通过项一行带过；禁止复述检查规则定义与检查步骤原文
5. **按严重度处理**：
   - `critical`（严重）：阻止后续流程，必须修复后继续
   - `major`（主要）：输出警告，允许继续但需在交付文档中列出
   - `minor`（次要）：仅提示信息

**常见遗漏**：
  - 开发完成后跳过 spec 一致性检查 → 必须执行，不可跳过
  - 仅检查了部分检查项 → 必须执行配置中的所有检查项
  - 错误文案要求精确匹配 → 应按 `tolerance: keyword` 进行关键词匹配
  - critical 级别问题未修复就继续 → 必须修复后才能进入后续流程

### 第四阶段：变更闭环与交付证据【强制】

**配置文件**：[config.json](config/config.json) 的 `developmentWorkflow.changeClosureSteps` 与 `developmentWorkflow.deliveryEvidence`

1. **变更闭环节奏（allowSkip=false）**：口径变更（业务方澄清/需求更正产生的结论）必须按 `steps` 顺序完整执行——
   - `docSync`：同步 PRD 小版本号与正文口径（遗留旧口径在历史修订记录中溯源），并更新项目记忆
   - `codeChange`：代码按新口径实现；注释中引用的字段名/表名/取数路径必须与实现同步更新（注释即凭证，防凭证失真）
   - `compile`：编译验证通过
   - `unitTest`：单测全绿；模块无单测能力时按 `unitTestFallback` 降级并在交付声明标注缺口
2. **常量集中管理**：本次新增的产品码/错误码/状态码等业务常量统一入 `{constantManagement.classNamePattern}` 常量类，`forbidInlineBusinessConstants` 禁止在逻辑或 SQL 中散落字面量
3. **交付证据化（deliveryEvidence.required）**：交付报告的断言必须附证据，证据取关键行而非全文——
   - `existenceProof`：关键文件核验结果，用"路径→PASS/FAIL"单行表，禁止贴全文目录清单
   - `compileOutput`：编译结果关键行（BUILD SUCCESS 或错误明细，最多 5 行），禁止贴全文日志
   - `testSummary`：单测统计行（Tests run/Failures/Errors）或 fallback 说明
4. **常见遗漏**：
   - 口径已定案但只改代码不回写文档 → 文档-实现漂移，下轮评审必返工
   - 交付称"已完成"但未附编译/测试证据 → 视为未闭环
   - 新增业务字面量散落在 if 判断或 mapper 里 → 违反 constantManagement
5. **提交纯净性甄别【强制】**：按 [workspace-baseline-policy.json](config/workspace-baseline-policy.json) 的 `commitPolicy` 执行——每任务独立 commit、仅 add 甄别为 taskChange 的文件；提交后按 `postCommitVerify` 用 `git show --stat HEAD` 核对文件清单与甄别结果完全一致（提交说明风格从 `git log` 最近提交提取，不硬编码）；工作区保留其他任务未提交改动属常态（`allowUntrackedInWorkspace`），不得为"干净"而回滚他人工作

### 修复闭环检查单【条件强制：缺陷修复类任务】

**配置文件**：[config.json](config/config.json) 的 `developmentWorkflow.fixClosure`（P10）；编译/部署/重启参数复用 [compile-deploy.json](config/compile-deploy.json)，禁止硬编码命令与路径

按以下六步顺序完整执行，缺一步不算修复闭环：

| 步骤 | 要求 | 交付证据 |
|------|------|---------|
| 1 定位（locate） | 给出缺陷证据（日志/截图/复现路径）+ 具体文件与行号，禁止凭经验直接猜改 | 证据原文关键行 |
| 2 最小修复（minFix） | 只改缺陷直接原因代码，不顺手重构/优化无关代码；注释写"为什么这么改"（原因与依据），不写做了什么 | 最小 diff |
| 3 编译/语法自检（buildCheck） | 后端按 `fixClosure.build_cmd`（组装自 compile-deploy.json compile 节）编译通过；前端按配置构建/语法检查无错 | 编译输出关键行 |
| 4 提交（commit） | 提交说明按 `fixClosure.commit_template` 生成；提交前按 workspace-baseline-policy 甄别纯净性 | commit 记录 |
| 5 生效核验（effectiveCheck） | 后端：`jar_mtime >= source_mtime` 且 `process_start >= jar_mtime`（三点读取与比较见 `fixClosure.effectiveCheck.backend`）；前端：确认热更新生效或重建产物完成（`effectiveCheck.frontend` 两条件满足其一） | 时间点核对结果 / 构建产物时间 |
| 6 回归复验（regressionReverify） | 修复 ≠ 验证：回归复验由测试侧执行，修复者不得自验关闭；P0/P1 修复后必须回归验证 | 复验用例结果 |

**常见遗漏**：
- 只编译未部署/只部署未重启 → 生效核验第 5 步的两个时间点比较会直接暴露，禁止跳过核验直接宣称已生效
- 修复时顺手调整无关代码 → 违反最小修复，回归范围失控
- 修复者自己点一遍页面就关闭缺陷 → 角色不分离，必须由验证侧复验

### 口径冲突定性流程【条件强制：UI 行为与需求口径冲突】

**配置文件**：[config.json](config/config.json) 的 `developmentWorkflow.caliberConflictDiagnosis`（P11）

**触发条件**：页面/UI 实际行为与需求（PRD/口头澄清）描述冲突，且无法立即判定归属。

1. **溯源规则来源**（blame_source）：按 `blame_cmd_template` 对冲突规则代码执行 git blame，判定规则来自产品化基线还是本期新增（`sourceLocations` 两分类）；禁止跳过溯源直接按需求改代码
2. **开发库数据佐证**（db_evidence）：查询开发库业务表中该口径的实际取值分布，佐证当前规则的真实表现
3. **定性分流**（classifyRules）：
   - `code_defect`：本期实现与需求不符 → 产出最小修复方案，走"修复闭环检查单"六步
   - `product_baseline_rule`：产品化既有规则与需求口径冲突 → **不改代码**，登记已知限制，并建议业务方修订 PRD
4. **结论三要素**（conclusionRequiredFields）：任何定性结论必须同时包含——规则来源（产品化基线/本期新增）+ 定性（代码缺陷/产品化既有规则）+ 下一步（修复/登记限制/修订 PRD）；三要素缺一即为无效结论，禁止输出

**常见遗漏**：
- 需求方说"应该是这样"就直接改 → 若是产品化既有规则，改动将影响其他复用方，必须先溯源
- 结论只写"已修复"不写规则来源与定性 → 下轮复盘无法追溯决策依据

## 适用与不适用场景

**适用**（满足任一即进入本技能）：
- 任务要求在个性化目录内新增功能、修改既有行为或修复缺陷
- 需求涉及前端页面/后端服务/数据库脚本/外部接口适配的增量改造
- 缺陷需要"定位→修复→编译部署→生效核验→回归复验"的完整闭环
- UI 行为与需求口径冲突，需要溯源定性后再决定改不改代码

**不适用**（命中任一则改用其他方式）：
- 任务是纯代码审查（无编码动作） → 转代码评审通道
- 任务是批量测试执行与用例管理 → 转测试执行通道
- 变更目标不属于个性化范围（产品化代码改造需另行评估影响面与授权）
- 需求仅为答疑或数据查询，无代码与脚本产出 → 直接答复，不进入开发流程
