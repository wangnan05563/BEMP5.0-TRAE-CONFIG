---
name: "bemp-db-operator"
description: "BEMP数据库标准化操作技能。通过Oracle MCP和MySQL MCP实现一次性连接数据库，提供SQL执行、结果复核、异常回退的完整机制。支持Oracle和MySQL双数据库类型，接口设计保持一致性，便于无缝切换。MySQL支持安全执行模式（事务包裹）和连接保活。"
whenToUse: 
   - "需要操作/连接/变更/查询 数据库/oracle/mysql 时调用"
   - "验证/执行 SQL脚本时调用"
   - "数据 复核/回退/备份 时调用"
triggers:
   - "数据库/数据/oracle/mysql 查询/变更"
   - "执行 SQL/ddl/dml/"
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
- 完整约定见 [_shared/config-loading-guide.md](../_shared/config-loading-guide.md)

# BEMP 数据库标准化操作技能

## 文档信息

| 项目   | 内容               |
| ---- | ---------------- |
| 技能名称 | bemp-db-operator |
| 版本   | V2.4.0           |
| 更新日期 | 2026-05-24       |
| 维护团队 | BEMP 开发团队        |

***

## 1. 技能职责

### 1.1 核心功能

本技能负责 BEMP 系统数据库的标准化操作，提供从连接到执行到复核的完整闭环，同时支持 Oracle 和 MySQL 两种数据库类型：

| 功能           | 说明                                        |
| ------------ | ----------------------------------------- |
| 一次性数据库连接     | 通过 Oracle MCP / MySQL MCP 建立可靠连接，避免重复连接开销 |
| SQL 脚本执行     | 支持 DDL/DML/DQL 各类 SQL 的标准化执行              |
| MySQL 安全执行模式 | 事务包裹执行，验证后提交，失败自动回滚                       |
| 编码预处理        | 自动初始化会话编码，解决中文乱码问题                        |
| DML/DDL命令行执行 | Oracle通过sqlplus、MySQL通过CLI执行变更操作          |
| 执行结果复核       | 自动验证执行结果，比对预期与实际差异                        |
| 异常回退机制       | 执行失败时自动触发回退，保障数据安全                        |
| 连接健康检查       | 长时间操作时连接保活与自动重连                           |
| 数据库类型自动检测    | 自动探测MCP工具可用性，智能判断数据库类型                    |
| 版本兼容性检测      | 自动检测数据库版本，根据特性矩阵调整可用功能                    |
| 批量操作支持       | 多脚本顺序执行，进度跟踪，部分失败处理                       |
| 操作日志记录       | 全程记录操作轨迹，满足审计追溯要求                         |
| 数据导出为文件     | 查询数据并导出为MD/CSV/JSON格式文件，支持时间范围和条件筛选      |
| 智能体委托与多级降级   | MCP不可用时自动委托子智能体→命令行工具→报错终止                |
| 多数据库类型支持     | Oracle 和 MySQL 双引擎，统一操作范式                 |

### 1.2 适用范围

- BEMP 系统所有数据库操作（Oracle / MySQL）
- 个性化开发中的增量SQL脚本执行
- 数据变更的复核与验证
- 异常场景的数据回退
- 数据导出为文件（MD/CSV/JSON）

***

## 2. 触发场景

| 场景编号 | 触发条件                    | 典型用例                              |
| ---- | ----------------------- | --------------------------------- |
| S1   | 需要连接数据库执行查询操作           | 查询表结构、验证数据、统计记录数                  |
| S2   | 需要执行增量SQL脚本             | 个性化开发中的菜单/参数/表结构变更                |
| S3   | 需要对SQL执行结果进行复核          | 验证INSERT后数据是否正确写入                 |
| S4   | 需要回退已执行的数据库变更           | SQL执行异常或结果不符合预期                   |
| S5   | 需要验证SQL脚本语法和规范性         | 脚本执行前的预检查                         |
| S6   | 需要对比执行前后的数据差异           | 变更影响评估                            |
| S7   | 需要在MySQL数据库上执行操作        | MySQL环境的数据查询与变更                   |
| S8   | 需要安全执行MySQL变更（事务保护）     | 关键数据变更需事务保护                       |
| S9   | 需要批量执行多个SQL脚本           | 个性化开发中多脚本增量执行                     |
| S10  | 需要通过命令行执行Oracle DML/DDL | Oracle MCP不支持DML/DDL，需通过sqlplus执行 |
| S11  | 需要导出数据库数据为文件          | 按时间范围/条件查询数据并导出为MD/CSV/JSON文件       |

***

## 3. 文档结构

```
bemp-db-operator/
├── SKILL.md
├── config/        # db-config.json / execution-policy.json / query-templates.json / version-compat.json
├── scripts/       # 连接测试、类型/版本检测、编码设置、预检查、验证、回退、兼容性检查 SQL 脚本
│                  # execute-oracle-sql.ps1 / execute-mysql-sql.ps1 / export-db-data.ps1
├── assets/templates/   # execution-report.md / rollback-report.md / data-export-report.md / execution-result-schema.json
└── references/    # connection-guide.md / sql-standards.md / safety-guide.md
```

***

## 4. 数据库类型识别与切换

### 4.1 数据库类型配置

通过 `config/db-config.json` 中的 `defaultDbType` 字段确定当前操作的数据库类型（`oracle`/`mysql`/`auto`）。

| 配置值      | 说明          | MCP 工具集            |
| -------- | ----------- | ------------------ |
| `oracle` | Oracle 数据库  | `mcp_oracle-mcp_*` |
| `mysql`  | MySQL 数据库   | `mcp_MySQL_*`      |
| `auto`   | 自动检测（见4.4节） | 按检测结果选择            |

### 4.2 MCP 工具对照表

| 操作           | Oracle MCP                      | MySQL MCP                                   | 说明                            |
| ------------ | ------------------------------- | ------------------------------------------- | ----------------------------- |
| 列出Schema/数据库 | `mcp_oracle-mcp_list_schemas`   | `mcp_MySQL_execute_sql("SHOW DATABASES")`   | MySQL无专用工具，通过SQL实现            |
| 列出表          | `mcp_oracle-mcp_list_tables`    | `mcp_MySQL_execute_sql("SHOW TABLES")`      | MySQL无专用工具，通过SQL实现            |
| 查看表结构        | `mcp_oracle-mcp_describe_table` | `mcp_MySQL_execute_sql("DESCRIBE {table}")` | MySQL无专用工具，通过SQL实现            |
| 执行查询         | `mcp_oracle-mcp_execute_query`  | `mcp_MySQL_execute_sql`                     | MySQL MCP支持所有SQL类型+事务控制       |
| 执行DML/DDL    | 不支持（需SQL\*Plus）                 | `mcp_MySQL_execute_sql`                     | MySQL MCP可直接执行，支持安全执行模式（事务包裹） |

### 4.2.1 MCP工具可用性与智能体委托策略

> **关键发现**：不同智能体拥有的MCP工具集不同。主智能体可能缺少Oracle MCP工具，需委托给拥有该工具的子智能体执行。

**智能体-工具可用性矩阵**：

> 详见 config/db-config.json → agentToolMapping

**多级降级策略**（MCP工具不可用时）：

> 详见 config/db-config.json → agentToolMapping.degradationStrategy

**委托判断决策树**：需要Oracle操作 → 主智能体有mcp_oracle-mcp_*工具？→ 是则直接调用；否则委托bemp-implementation-engineer子智能体 → 成功则返回；失败则降级到sqlplus命令行 → 成功则返回；失败则报错终止。MySQL操作由主智能体直接调用mcp_MySQL_execute_sql。

> **重要**：当主智能体调用MCP工具返回"Tool's name is not available in given tool list"时，**不要反复尝试不同命名变体**，应立即进入降级策略Level 1（委托子智能体）。

### 4.3 配置与MCP服务端的关系

> **重要**：`config/db-config.json` 中的连接参数**仅为记录用途**，实际连接由MCP服务端管理。修改实际连接参数请编辑MCP配置文件（路径见 `db-config.json` → `mcpConfigRef`）。`bankName` 和 `sqlScriptDirs` 由本技能直接使用。

**连接验证时获取实际连接信息**：Oracle用 `mcp_oracle-mcp_execute_query(query="SELECT USER FROM DUAL")`；MySQL用 `mcp_MySQL_execute_sql(query="SELECT USER() AS current_user, DATABASE() AS current_db")`。

### 4.4 数据库类型自动检测

当 `defaultDbType` 设置为 `auto` 时，技能将自动探测可用MCP工具，智能判断数据库类型。

> 完整配置详见 `config/db-config.json` → `autoDetection`。关键字段：triggerValue="auto", detectionPriority=\["oracle","mysql"], fallbackDbType="mysql", cacheResult=true

**自动检测流程**（配置详见 config/db-config.json → autoDetection 和 config/execution-policy.json → autoDetection）：

1. 读取 defaultDbType 配置；如非"auto"则使用配置值，跳过检测
2. 如为"auto"则按 detectionPriority 顺序探测MCP工具：
   - 探测Oracle MCP（mcp_oracle-mcp_list_schemas）：成功则dbType=oracle；失败继续探测MySQL
   - 探测MySQL MCP（mcp_MySQL_execute_sql("SELECT 1 AS db_type_probe")）：成功则dbType=mysql；失败使用fallbackDbType
3. 缓存检测结果（cacheResult=true时），后续操作使用检测到的数据库类型

**检测失败处理**：

| 场景           | 处理策略                  |
| ------------ | --------------------- |
| 两种MCP均不可用    | 使用fallbackDbType，发出警告 |
| 检测超时（10秒/探测） | 标记该MCP不可用，继续探测下一个     |
| 缓存结果已过期      | 重新执行检测流程              |
| 检测结果与预期不符    | 以检测结果为准，发出提示          |

### 4.5 数据库版本兼容性检测

连接建立后，自动检测数据库版本，与 `config/version-compat.json` 中的兼容性矩阵比对，确定当前版本支持的特性。

> 完整配置详见 `config/execution-policy.json` → `versionDetection`。关键字段：enabled=true, warnOnUnsupportedVersion=true, blockOnIncompatibleFeature=true

**版本检测流程**：

1. 连接建立后执行版本检测查询：Oracle用 `SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1`；MySQL用 `SELECT VERSION(); SELECT @@sql_mode;`
2. 解析版本号，加载 config/version-compat.json 兼容性矩阵，确定支持的特性列表（featureFlags）
3. 如检测到不支持的版本：warnOnUnsupportedVersion=true → 发出警告
4. SQL执行前检查特性兼容性：blockOnIncompatibleFeature=true → 阻止执行；false → 发出警告但允许执行

**关键特性兼容性速查**：

> 特性兼容性矩阵详见 config/version-compat.json

***

## 5. 执行步骤

### 第一阶段：环境准备与配置

#### 步骤1：读取数据库配置

从 `config/db-config.json` 读取连接参数，根据 `defaultDbType` 确定使用哪套配置。数据库类型识别与自动检测逻辑详见第4章（4.1/4.4节）。

> 注意：连接参数仅为记录用途，实际连接由 MCP 服务端管理。

#### 步骤2：建立数据库连接

根据数据库类型，通过对应的 MCP 工具建立连接（探测SQL详见 config/execution-policy.json → autoDetection 和 versionDetection）。

**连接验证流程**（Oracle/MySQL统一）：执行连接探测 → 成功则执行表列表确认 → 失败则检查配置 → 重试(最多3次) → 仍失败则报错终止。具体探测SQL见4.4节自动检测流程。

**连接失败处理**：详见 config/execution-policy.json → connectionFailure

#### 步骤2.5：编码初始化（解决中文乱码）

连接建立后、执行业务SQL前，**必须**先初始化会话编码，确保中文正确显示和存储。

> **中文乱码根因**：Windows终端默认使用GBK(代码页936)，而数据库使用UTF-8编码，导致查询结果中的中文显示为乱码。

> 终端/MySQL/Oracle编码初始化命令详见 config/execution-policy.json → encodingCheck；编码验证SQL详见 `scripts/db-encoding-setup.sql`

> **注意**：Oracle的字符集由 `NLS_LANG` 环境变量控制，需在MCP服务端启动前设置。ALTER SESSION仅能修改日期格式和语言，无法修改字符集。

#### 步骤2.6：版本检测

编码初始化完成后，检测数据库版本用于特性兼容性判断（versionDetection.enabled=true时）。版本检测流程与特性兼容性速查详见4.5节。

***

### 第二阶段：SQL执行前预检查

#### 步骤3：SQL脚本规范性检查

在执行任何SQL前，必须进行以下预检查：

| 检查项     | 检查方法                    | 通过标准               |
| ------- | ----------------------- | ------------------ |
| 语法正确性   | 目视审查 + 试执行EXPLAIN       | 无语法错误              |
| WHERE条件 | 检查DELETE/UPDATE语句       | 必须有WHERE条件         |
| 幂等性     | 检查是否包含"先删除后新增"          | DELETE + INSERT 模式 |
| 事务完整性   | 检查是否有COMMIT             | DML末尾有COMMIT       |
| 表/字段存在性 | 调用 describe/DESCRIBE 确认 | 目标对象存在             |
| 数据影响范围  | 执行SELECT COUNT预估        | 影响行数在预期范围内         |
| 数据库兼容性  | 检查SQL语法是否兼容当前数据库        | 无不兼容语法             |
| 版本特性兼容  | 检查SQL是否使用了当前版本不支持的特性    | 特性在当前版本可用          |

**预检查执行方式**（Oracle/MySQL统一）：

```
1. 对DDL脚本：检查目标表是否存在
   Oracle: mcp_oracle-mcp_describe_table
   MySQL:  mcp_MySQL_execute_sql("DESCRIBE {table}")
2. 对DML脚本：
   a. 提取DELETE/UPDATE的WHERE条件，转为SELECT COUNT(*)查询
   b. 执行预估查询，确认影响行数在合理范围内
3. 对INSERT脚本：检查目标表结构是否匹配
4. MySQL对Oracle迁移脚本：调用 sql-compat-check-mysql.sql 检查兼容性
```

#### 步骤4：执行前数据快照

对变更涉及的数据进行执行前快照，用于复核和回退：

- DML变更：SELECT目标数据，记录变更前状态
- DDL变更：记录表结构信息（describe/DESCRIBE结果）
- 快照结果作为复核基准

***

### 第三阶段：SQL执行

#### 步骤5：执行SQL脚本

根据脚本类型和数据库类型选择执行策略：

**Oracle 执行策略**：

> 执行策略（超时/自动提交等）详见 config/execution-policy.json → execution.oracle

**MySQL 执行策略**：

> 执行策略（超时/安全执行模式等）详见 config/execution-policy.json → execution.mysql

**MySQL 执行流程**（autoCommit=true）：

1. 读取SQL脚本文件内容
2. [安全模式] 检测DDL语句并拆分：DDL单独执行（隐式提交），DML进入事务流程
3. [安全模式] 调用 `mcp_MySQL_execute_sql("START TRANSACTION")` 开启事务
4. 按分号拆分为独立SQL语句，逐语句执行：
   - 调用 mcp_MySQL_execute_sql 执行，记录结果（成功/失败/影响行数）
   - 失败时：[安全模式] ROLLBACK回滚事务；[普通模式] 根据策略决定继续或回退
5. 全部成功后进入第四阶段复核（COMMIT/ROLLBACK决策由步骤6负责）

**安全执行模式的优势**：

| 对比项   | 普通模式          | 安全执行模式             |
| ----- | ------------- | ------------------ |
| 回退方式  | 执行回退SQL（可能失败） | ROLLBACK（数据库原生，可靠） |
| 数据一致性 | 可能出现部分执行      | 要么全部成功，要么全部回滚      |
| 回退速度  | 需逐条执行回退SQL    | 一条ROLLBACK即可       |
| 适用场景  | 简单查询、单条DML    | 关键数据变更、多条关联DML     |

> **注意**：DDL 语句（CREATE/ALTER/DROP）在 MySQL 中会隐式提交，无法被 ROLLBACK。安全执行模式仅对 DML 语句有效。

#### 步骤5B：批量操作执行（S9场景）

当需要批量执行多个SQL脚本时，使用批量操作模式。

> 完整配置详见 `config/execution-policy.json` → `batchOperation`。关键字段：maxBatchSize=20, stopOnFailure=true, executionOrder=\["ddl","dml","config"], safeModeForBatch=true, batchRollbackStrategy="all\_or\_nothing"

**批量操作执行流程**：

1. 读取批量脚本清单，按文件名或目录结构确定脚本类型（DDL/DML/CONFIG）
2. 按 executionOrder 排序脚本：DDL组 → DML组 → CONFIG组
3. 逐组执行：
   - DDL组：逐脚本逐语句执行（DDL隐式提交，无法回退）
   - DML组（safeModeForBatch=true）：START TRANSACTION → 逐脚本执行 → 全部成功则验证后COMMIT，任一失败则按batchRollbackStrategy处理
   - CONFIG组：逐脚本执行
4. 记录每个脚本执行结果，全部完成后生成批量执行报告

**批量回退策略**：

| 策略               | 说明                   | 适用场景         |
| ---------------- | -------------------- | ------------ |
| `all_or_nothing` | 任一脚本失败则ROLLBACK所有DML | 关键数据变更，要求原子性 |
| `best_effort`    | 仅回退失败脚本的DML，成功脚本保留   | 非关键变更，允许部分成功 |

#### 步骤5C：Oracle DML/DDL 命令行执行（S10场景）

Oracle MCP 仅支持 SELECT 查询，DML/DDL 操作必须通过 SQL\*Plus 命令行执行（CLI执行配置详见 config/execution-policy.json → cliExecution）。

**执行方式**：使用封装脚本 `scripts/execute-oracle-sql.ps1`（脚本功能详情见该脚本，包含自动NLS_LANG设置、编码初始化、错误检测、日志保存）。

```powershell
# 示例（参数实际从db-config.json读取），MySQL CLI 备选执行用 execute-mysql-sql.ps1
.\execute-oracle-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" -ConfigFile "config\db-config.json"
```

**Oracle DML/DDL 执行流程**：

1. 预检查（通过Oracle MCP）：describe_table确认目标表存在 + execute_query执行前数据快照
2. 执行SQL脚本（通过execute-oracle-sql.ps1）：设置NLS_LANG → 调用sqlplus执行 → 检测ORA-/SP2-/TNS-错误
3. 执行后验证（通过Oracle MCP）：execute_query验证数据变更，比对执行前快照
4. 异常回退：生成回退SQL脚本 → 通过execute-oracle-sql.ps1执行

**DML/DDL执行方式选择**：

| 数据库    | 操作类型    | 首选方式            | 备选方式      | 说明            |
| ------ | ------- | --------------- | --------- | ------------- |
| Oracle | SELECT  | Oracle MCP      | SQL\*Plus | MCP只读查询更安全    |
| Oracle | DML/DDL | SQL\*Plus       | 无         | MCP不支持，必须用命令行 |
| MySQL  | SELECT  | MySQL MCP       | MySQL CLI | MCP更便捷        |
| MySQL  | DML     | MySQL MCP(安全模式) | MySQL CLI | 安全模式事务保护      |
| MySQL  | DDL     | MySQL MCP       | MySQL CLI | MCP直接执行       |

#### 步骤5D：数据导出执行（S11场景）

将数据库查询结果导出为文件（MD/CSV/JSON），支持时间范围和条件筛选。

**导出格式选择**：

> 导出格式和分页配置详见 config/execution-policy.json → dataExport

**数据导出执行流程**：

1. 确定导出参数：数据库类型、目标表名、查询条件（时间范围/WHERE）、导出格式（MD/CSV/JSON）、输出文件路径
2. 查询表结构：Oracle用describe_table/USER_TAB_COLUMNS，MySQL用DESCRIBE/INFORMATION_SCHEMA.COLUMNS
3. 构建查询SQL：根据条件构建WHERE子句；时间字段注意Oracle/MySQL语法差异；大数据量加分页（Oracle用ROWNUM，MySQL用LIMIT）
4. 执行查询（按降级策略）：主智能体MCP → 委托bemp-implementation-engineer子智能体 → export-db-data.ps1命令行脚本
5. 格式化结果：MD（表结构+数据+说明+日志）/ CSV（表头+数据行）/ JSON（结构化对象）
6. 写入文件并验证，生成导出报告（使用 assets/templates/data-export-report.md 模板）

**时间范围查询SQL模板**：

> 时间范围查询SQL模板详见 config/execution-policy.json → dataExport.timeRangeQueries

> **重要**：BEMP系统中时间字段可能存储为NUMBER类型（格式YYYYMMDDHH24MISSFF），需先确认字段类型再选择正确的查询模板。可通过 `USER_TAB_COLUMNS` 查看字段数据类型。

**大数据量导出分页策略**：

> 分页阈值详见 config/execution-policy.json → dataExport.pagination

**使用export-db-data.ps1命令行导出**：

```powershell
# 示例（参数实际从db-config.json读取）
.\export-db-data.ps1 -TableName "TB_BILL_INFO" -ConfigFile "config\db-config.json" `
    -TimeField "CREATE_TIME" -Days 7 -Format "md" -OutputDir "D:\exports"
```

***

### 第四阶段：执行后复核

#### 步骤6：结果验证

执行后必须进行结果验证：

| 验证类型     | Oracle 验证方法                     | MySQL 验证方法                                  | 预期结果       |
| -------- | ------------------------------- | ------------------------------------------- | ---------- |
| DDL验证    | `mcp_oracle-mcp_describe_table` | `mcp_MySQL_execute_sql("DESCRIBE {table}")` | 表/字段/索引已创建 |
| INSERT验证 | `mcp_oracle-mcp_execute_query`  | `mcp_MySQL_execute_sql`                     | 数据已写入且内容正确 |
| UPDATE验证 | `mcp_oracle-mcp_execute_query`  | `mcp_MySQL_execute_sql`                     | 数据已更新且值正确  |
| DELETE验证 | `mcp_oracle-mcp_execute_query`  | `mcp_MySQL_execute_sql`                     | 数据已删除      |

**复核流程**：根据脚本类型选择验证方式 → 执行验证查询 → 比对执行前快照与执行后数据 → 生成复核报告（使用 assets/templates/execution-report.md 模板）。

- MySQL安全执行模式：复核通过 → COMMIT；复核不通过 → ROLLBACK
- 普通模式：复核不通过则进入回退流程

#### 步骤7：生成执行报告

使用执行报告模板记录完整操作过程，报告需标注数据库类型。同时可生成结构化 JSON 结果（使用 `assets/templates/execution-result-schema.json`）。

***

### 第五阶段：异常处理与回退

#### 步骤8：异常处理

| 异常类型               | 处理策略与后续操作                                     |
| ------------------ | ---------------------------------------- |
| 连接失败               | 重试3次（间隔5秒），仍失败则终止并报告                                |
| SQL语法错误            | 停止执行并记录错误，修正后重新执行                                  |
| 执行超时               | 终止当前语句，评估是否需要回退                                 |
| 约束冲突               | 停止执行并记录冲突，检查数据后决定回退或修正                             |
| 影响行数超限             | 停止执行并发出警告，确认后继续或回退                                 |
| 连接断开               | 自动重连，重连后重试或回退                                 |
| 编码异常-中文乱码/Oracle NLS | 执行编码初始化/SET NAMES utf8mb4/chcp 65001；Oracle设置NLS_LANG环境变量 |
| Oracle DML/DDL执行失败 | 检查sqlplus路径 → 检查ORA-错误码 → 执行回退           |

**MySQL 特有异常处理**：MySQL错误码映射详见 config/execution-policy.json → mysqlErrorCodes

#### 步骤9：回退操作

当执行失败或复核不通过时，根据执行模式选择回退方式：

| 回退方式             | 适用场景     | 可靠性 | 说明             |
| ---------------- | -------- | --- | -------------- |
| MySQL ROLLBACK   | 安全执行模式   | 高   | 数据库原生操作，不会失败   |
| MySQL 批量ROLLBACK | 批量安全执行模式 | 高   | 回滚整个批次的DML事务   |
| MySQL 回退SQL      | 普通模式     | 中   | 可能因数据依赖导致回退失败  |
| Oracle 回退SQL     | Oracle   | 中   | 需通过SQL\*Plus执行 |

**MySQL 普通模式回退流程**：确定回退级别 → 基于执行前快照生成回退SQL → 调用mcp_MySQL_execute_sql逐语句执行 → 验证回退结果 → 生成回退报告。

***

### 第六阶段：连接健康检查

#### 步骤10：连接保活与自动重连

长时间操作（超过MySQL `wait_timeout`）可能导致连接断开，需要连接保活和自动重连机制。

> 完整配置详见 `config/execution-policy.json` → `connectionKeepAlive`。关键字段：enabled=true, intervalSeconds=300, checkSql="SELECT 1", maxReconnectAttempts=3

**保活执行流程**：

1. 操作开始时记录最后活动时间，每次MCP调用前检查距上次活动的时间间隔
2. 如间隔 > intervalSeconds：执行保活检查SQL → 成功则更新活动时间继续；失败则进入重连流程
3. 重连流程：等待reconnectIntervalSeconds秒 → 重新执行连接验证 → 成功则继续；失败则重试最多maxReconnectAttempts次 → 仍失败则报错终止

**MySQL 连接断开自动恢复**：

> MySQL连接错误码映射详见 config/execution-policy.json → mysqlErrorCodes.connectionErrors 和 connectionKeepAlive.reconnectableErrorCodes

***

## 6. 输出标准

### 6.1 执行成功标准

- 连接状态：一次性连接成功，无重试
- 执行状态：所有SQL语句执行成功
- 复核状态：数据一致性验证通过
- 日志完整性：操作全程有日志记录
- 报告生成：执行报告已生成（标注数据库类型）

### 6.2 日志记录要求

每次操作必须记录全程日志，格式模板详见 config/execution-policy.json → logging.logFormat

### 6.3 结果验证标准

验证方式见步骤6。通过标准：结构验证（表结构符合预期）、数据验证（数据内容与预期一致）、行数验证（影响行数在预期范围内）、关联验证（关联数据无异常）。

### 6.4 结构化输出

除 Markdown 报告外，可生成结构化 JSON 结果，格式参照 `assets/templates/execution-result-schema.json`，便于与其他技能/智能体集成。

***

## 7. 快速操作参考

### 7.1 流程速览

| 模式        | 核心流程                                                              |
| --------- | ----------------------------------------------------------------- |
| Oracle    | 读配置→MCP连接→编码初始化→版本检测→预检查→快照→\[SELECT用MCP/DML用sqlplus]→验证→报告            |
| MySQL(安全) | 读配置→MCP连接→编码初始化→版本检测→预检查→快照→START TRANSACTION→执行→验证→COMMIT/ROLLBACK→报告 |
| MySQL(普通) | 同安全模式，但无事务包裹，直接执行→验证→报告                                  |
| 批量        | 读配置→连接→DDL组→DML组(事务)→CONFIG组→批量报告                                 |
| 自动检测      | defaultDbType=auto→探测Oracle MCP→探测MySQL MCP→缓存结果                  |
| 数据导出(S11) | 确定参数→查表结构→构建SQL→执行查询(含降级策略)→格式化结果→写文件→验证→导出报告                     |
| 降级策略      | 主智能体MCP→子智能体委托→命令行工具→报错终止                                         |

### 7.2 常用查询模板与SQL差异速查

- 查询模板详见 config/query-templates.json
- Oracle/MySQL SQL 差异速查详见 references/sql-standards.md 第3章

