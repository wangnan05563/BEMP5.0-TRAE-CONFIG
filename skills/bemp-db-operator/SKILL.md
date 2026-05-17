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

# BEMP 数据库标准化操作技能

## 文档信息

| 项目   | 内容               |
| ---- | ---------------- |
| 技能名称 | bemp-db-operator |
| 版本   | V2.3.1           |
| 更新日期 | 2026-05-16       |
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
| 多数据库类型支持     | Oracle 和 MySQL 双引擎，统一操作范式                 |

### 1.2 适用范围

- BEMP 系统所有数据库操作（Oracle / MySQL）
- 个性化开发中的增量SQL脚本执行
- 数据变更的复核与验证
- 异常场景的数据回退

### 1.3 预期解决的问题

- 数据库连接不稳定导致操作中断
- SQL执行无复核导致数据错误
- 异常操作无法回退造成数据损失
- 操作无日志导致无法追溯
- Oracle 与 MySQL 操作方式不统一导致学习成本高
- MySQL DML 执行后无法安全回退
- SQL执行结果中文乱码（终端编码与数据库编码不匹配）
- Oracle DML/DDL 无法通过MCP直接执行

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

***

## 3. 文档结构

```
bemp-db-operator/
├── SKILL.md
├── config/
│   ├── db-config.json
│   ├── execution-policy.json
│   └── version-compat.json
├── scripts/
│   ├── db-connect-test.sql / db-connect-test-mysql.sql
│   ├── db-type-detect.sql / db-version-detect.sql
│   ├── db-encoding-setup.sql
│   ├── execute-oracle-sql.ps1 / execute-mysql-sql.ps1
│   ├── pre-check.sql / pre-check-mysql.sql
│   ├── post-verify.sql / post-verify-mysql.sql
│   ├── rollback-template.sql / rollback-template-mysql.sql
│   └── sql-compat-check-mysql.sql
├── assets/templates/
│   ├── execution-report.md / rollback-report.md
│   └── execution-result-schema.json
└── references/
    ├── connection-guide.md
    ├── sql-standards.md
    └── safety-guide.md
```

***

## 4. 数据库类型识别与切换

### 4.1 数据库类型配置

通过 `config/db-config.json` 中的 `defaultDbType` 字段确定当前操作的数据库类型（`oracle`/`mysql`/`auto`）。

| 配置值      | 说明          | MCP 工具集            |
| -------- | ----------- | ------------------ |
| `oracle` | Oracle 数据库  | `mcp_oracle-mcp_*` |
| `mysql`  | MySQL 数据库   | `mcp_MySQL_*`      |
| `auto`   | 自动检测（见4.5节） | 按检测结果选择            |

### 4.2 MCP 工具对照表

| 操作           | Oracle MCP                      | MySQL MCP                                   | 说明                            |
| ------------ | ------------------------------- | ------------------------------------------- | ----------------------------- |
| 列出Schema/数据库 | `mcp_oracle-mcp_list_schemas`   | `mcp_MySQL_execute_sql("SHOW DATABASES")`   | MySQL无专用工具，通过SQL实现            |
| 列出表          | `mcp_oracle-mcp_list_tables`    | `mcp_MySQL_execute_sql("SHOW TABLES")`      | MySQL无专用工具，通过SQL实现            |
| 查看表结构        | `mcp_oracle-mcp_describe_table` | `mcp_MySQL_execute_sql("DESCRIBE {table}")` | MySQL无专用工具，通过SQL实现            |
| 执行查询         | `mcp_oracle-mcp_execute_query`  | `mcp_MySQL_execute_sql`                     | MySQL MCP支持所有SQL类型+事务控制       |
| 执行DML/DDL    | 不支持（需SQL\*Plus）                 | `mcp_MySQL_execute_sql`                     | MySQL MCP可直接执行，支持安全执行模式（事务包裹） |

### 4.3 配置与MCP服务端的关系

> **重要**：`config/db-config.json` 中的连接参数**仅为记录用途**，实际连接由MCP服务端管理。修改实际连接参数请编辑MCP配置文件（路径见 `db-config.json` → `mcpConfigRef`）。`bankName` 和 `sqlScriptDirs` 由本技能直接使用。

**连接验证时获取实际连接信息**：

```
# Oracle - 通过MCP获取实际连接信息
mcp_oracle-mcp_execute_query(query="SELECT USER FROM DUAL")

# MySQL - 通过MCP获取实际连接信息
mcp_MySQL_execute_sql(query="SELECT USER() AS current_user, DATABASE() AS current_db")
```

### 4.4 数据库类型自动检测

当 `defaultDbType` 设置为 `auto` 时，技能将自动探测可用MCP工具，智能判断数据库类型。

> 完整配置详见 `config/db-config.json` → `autoDetection`。关键字段：triggerValue="auto", detectionPriority=\["oracle","mysql"], fallbackDbType="mysql", cacheResult=true

**自动检测流程**：

```
1. 读取 defaultDbType 配置
2. 如 defaultDbType != "auto" → 使用配置值，跳过检测
3. 如 defaultDbType == "auto" → 进入自动检测：
   a. 按 detectionPriority 顺序探测MCP工具
   b. 探测Oracle MCP：调用 mcp_oracle-mcp_list_schemas
      - 成功 → dbType = oracle，结束检测
      - 失败 → 继续探测MySQL
   c. 探测MySQL MCP：调用 mcp_MySQL_execute_sql("SELECT 1 AS db_type_probe")
      - 成功 → dbType = mysql，结束检测
      - 失败 → 使用 fallbackDbType
4. 缓存检测结果（cacheResult=true时）
5. 后续操作使用检测到的数据库类型
```

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

```
1. 连接建立成功后，执行版本检测查询：
   - Oracle: SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1
   - MySQL: SELECT VERSION(); SELECT @@sql_mode;
2. 解析版本号，确定主版本和次版本
3. 加载 config/version-compat.json 兼容性矩阵
4. 根据版本号确定支持的特性列表（featureFlags）
5. 如检测到不支持的版本：
   - warnOnUnsupportedVersion=true → 发出警告
6. SQL执行前检查特性兼容性：
   - 如SQL使用了当前版本不支持的特性
   - blockOnIncompatibleFeature=true → 阻止执行并提示
   - blockOnIncompatibleFeature=false → 发出警告但允许执行
```

**关键特性兼容性速查**：

| 特性                  | Oracle最低版本 | MySQL最低版本 | 说明                           |
| ------------------- | ---------- | --------- | ---------------------------- |
| 窗口函数                | 11g        | 8.0       | ROW\_NUMBER, RANK, LAG, LEAD |
| CTE递归               | 11g        | 8.0       | WITH RECURSIVE               |
| JSON函数              | 12c        | 5.7       | JSON\_VALID, JSON\_EXTRACT   |
| INSERT ON DUPLICATE | N/A        | 5.7       | MySQL特有，Oracle用MERGE INTO    |
| 生成列                 | N/A        | 5.7       | MySQL特有GENERATED COLUMN      |
| LATERAL JOIN        | 12c        | 8.0       | LATERAL派生表                   |

***

## 5. 执行步骤

### 第一阶段：环境准备与配置

#### 步骤1：读取数据库配置

从 `config/db-config.json` 读取连接参数，根据 `defaultDbType` 确定使用哪套配置。

**数据库类型确定逻辑**：

```
1. 读取 defaultDbType 值
2. 如 defaultDbType 为 "oracle" 或 "mysql" → 直接使用配置值
3. 如 defaultDbType 为 "auto" → 执行自动检测（见4.5节）
4. 确定数据库类型后，加载对应的连接配置
```

> 注意：连接参数仅为记录用途，实际连接由 MCP 服务端管理。连接验证时可获取实际连接信息。

#### 步骤2：建立数据库连接与版本检测

根据数据库类型，通过对应的 MCP 工具建立连接：

**Oracle 连接验证**：

```
连接验证流程：
mcp_oracle-mcp_list_schemas → 成功 → mcp_oracle-mcp_list_tables(schema=BEMP_HNNX) → 成功 → 连接就绪
                           → 失败 → 检查配置 → 重试(最多3次) → 仍失败 → 报错终止
```

**MySQL 连接验证**：

```
连接验证流程：
mcp_MySQL_execute_sql("SELECT 1") → 成功 → mcp_MySQL_execute_sql("SHOW TABLES") → 成功 → 连接就绪
                                 → 失败 → 检查配置 → 重试(最多3次) → 仍失败 → 报错终止
```

**连接成功后版本检测**（versionDetection.enabled=true时）：

```
1. Oracle: mcp_oracle-mcp_execute_query(query="SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1")
2. MySQL: mcp_MySQL_execute_sql(query="SELECT VERSION() AS version")
3. MySQL额外: mcp_MySQL_execute_sql(query="SELECT @@sql_mode AS sql_mode")
4. 解析版本号，与version-compat.json比对，确定featureFlags
5. 记录版本信息到执行结果header.dbVersion和header.featureFlags
```

#### 步骤2.5：编码初始化（解决中文乱码）

连接建立后、执行业务SQL前，**必须**先初始化会话编码，确保中文正确显示和存储。

> **中文乱码根因**：Windows终端默认使用GBK(代码页936)，而数据库使用UTF-8编码，导致查询结果中的中文显示为乱码。

**终端编码设置**（每次操作前执行）：

```powershell
chcp 65001 > $null 2>&1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

**MySQL 会话编码初始化**：

```
mcp_MySQL_execute_sql(query="SET NAMES utf8mb4")
mcp_MySQL_execute_sql(query="SET CHARACTER_SET_CLIENT = utf8mb4")
mcp_MySQL_execute_sql(query="SET CHARACTER_SET_CONNECTION = utf8mb4")
mcp_MySQL_execute_sql(query="SET CHARACTER_SET_RESULTS = utf8mb4")
```

**Oracle 会话编码初始化**：

```
mcp_oracle-mcp_execute_query(query="ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS'", schema="BEMP_HNNX")
mcp_oracle-mcp_execute_query(query="ALTER SESSION SET NLS_DATE_LANGUAGE = 'AMERICAN'", schema="BEMP_HNNX")
mcp_oracle-mcp_execute_query(query="ALTER SESSION SET NLS_LANGUAGE = 'AMERICAN'", schema="BEMP_HNNX")
```

> **注意**：Oracle的字符集由 `NLS_LANG` 环境变量控制，需在MCP服务端启动前设置 `NLS_LANG=AMERICAN_AMERICA.AL32UTF8`。ALTER SESSION仅能修改日期格式和语言，无法修改字符集。

> 编码验证SQL和排查清单详见 `scripts/db-encoding-setup.sql`

**连接失败处理**：

| 失败类型         | Oracle 处理    | MySQL 处理    |
| ------------ | ------------ | ----------- |
| 网络超时         | 检查网络连通性      | 检查网络连通性     |
| 认证失败         | 检查用户名密码      | 检查用户名密码     |
| 服务不可用        | 检查Oracle服务状态 | 检查MySQL服务状态 |
| Schema/DB不存在 | 检查Schema名称   | 检查数据库名称     |
| 连接断开         | 重连后重试        | 自动重连（见5.6节） |

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

**Oracle 预检查执行方式**：

```
1. 对DDL脚本：调用 mcp_oracle-mcp_describe_table 检查目标表是否存在
2. 对DML脚本：
   a. 提取DELETE/UPDATE的WHERE条件，转为SELECT COUNT(*)查询
   b. 调用 mcp_oracle-mcp_execute_query 执行预估查询
   c. 确认影响行数在合理范围内
3. 对INSERT脚本：检查目标表结构是否匹配
```

**MySQL 预检查执行方式**：

```
1. 对DDL脚本：调用 mcp_MySQL_execute_sql("DESCRIBE {table}") 检查目标表是否存在
2. 对DML脚本：
   a. 提取DELETE/UPDATE的WHERE条件，转为SELECT COUNT(*)查询
   b. 调用 mcp_MySQL_execute_sql 执行预估查询
   c. 确认影响行数在合理范围内
3. 对INSERT脚本：调用 mcp_MySQL_execute_sql("DESCRIBE {table}") 检查目标表结构是否匹配
4. 对Oracle迁移脚本：调用 sql-compat-check-mysql.sql 检查兼容性
```

#### 步骤4：执行前数据快照

对变更涉及的数据进行执行前快照，用于复核和回退：

```
快照策略：
- DML变更：SELECT目标数据，记录变更前状态
- DDL变更：记录表结构信息（describe/DESCRIBE结果）
- 快照结果作为复核基准
```

***

### 第三阶段：SQL执行

#### 步骤5：执行SQL脚本

根据脚本类型和数据库类型选择执行策略：

**Oracle 执行策略**：

| 脚本类型           | 执行方式                            | 超时设置   | 自动提交       |
| -------------- | ------------------------------- | ------ | ---------- |
| DDL (.ddl.sql) | 逐语句执行（需SQL\*Plus）               | 60秒/语句 | 否，手动COMMIT |
| DML (.dml.sql) | 逐语句执行（需SQL\*Plus）               | 30秒/语句 | 否，手动COMMIT |
| 查询 (.sql)      | mcp\_oracle-mcp\_execute\_query | 120秒   | N/A        |

**MySQL 执行策略**：

| 脚本类型           | 执行方式                           | 超时设置   | 安全执行模式       |
| -------------- | ------------------------------ | ------ | ------------ |
| DDL (.ddl.sql) | mcp\_MySQL\_execute\_sql 逐语句执行 | 60秒/语句 | 不适用（DDL隐式提交） |
| DML (.dml.sql) | mcp\_MySQL\_execute\_sql 逐语句执行 | 30秒/语句 | 推荐（事务包裹）     |
| 查询 (.sql)      | mcp\_MySQL\_execute\_sql 整体执行  | 120秒   | 不适用          |

**MySQL 普通执行流程**（autoCommit=true）：

```
1. 读取SQL脚本文件内容
2. 按分号拆分为独立SQL语句
3. 逐语句执行：
   a. 调用 mcp_MySQL_execute_sql 执行当前语句
   b. 记录执行结果（成功/失败/影响行数）
   c. 如失败：
      - 记录失败语句和错误信息
      - 根据策略决定是否继续
      - 如需回退，进入第五阶段
4. 全部成功后进入第四阶段复核
```

**MySQL 安全执行模式**（safeExecutionMode=true，**推荐**）：

```
1. 读取SQL脚本文件内容
2. 调用 mcp_MySQL_execute_sql("START TRANSACTION") 开启事务
3. 按分号拆分为独立SQL语句
4. 逐语句执行：
   a. 调用 mcp_MySQL_execute_sql 执行当前语句
   b. 记录执行结果（成功/失败/影响行数）
   c. 如失败：
      - 调用 mcp_MySQL_execute_sql("ROLLBACK") 回滚整个事务
      - 记录回滚操作
      - 进入异常处理阶段
5. 全部成功后进入第四阶段复核
6. 复核通过 → 调用 mcp_MySQL_execute_sql("COMMIT") 提交事务
7. 复核不通过 → 调用 mcp_MySQL_execute_sql("ROLLBACK") 回滚事务
```

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

```
1. 读取批量脚本清单，按文件名或目录结构确定脚本类型（DDL/DML/CONFIG）
2. 按 executionOrder 排序脚本：DDL组 → DML组 → CONFIG组
3. 逐组执行：
   a. DDL组：逐脚本执行，每个脚本内逐语句执行
      - DDL语句隐式提交，无法回退
   b. DML组（safeModeForBatch=true）：
      - 开启事务：mcp_MySQL_execute_sql("START TRANSACTION")
      - 逐脚本执行DML
      - 全部成功 → 验证 → COMMIT
      - 任一失败 → 根据batchRollbackStrategy处理
   c. CONFIG组：逐脚本执行
4. 记录每个脚本的执行结果
5. 全部完成后生成批量执行报告
```

**批量回退策略**：

| 策略               | 说明                   | 适用场景         |
| ---------------- | -------------------- | ------------ |
| `all_or_nothing` | 任一脚本失败则ROLLBACK所有DML | 关键数据变更，要求原子性 |
| `best_effort`    | 仅回退失败脚本的DML，成功脚本保留   | 非关键变更，允许部分成功 |

#### 步骤5C：Oracle DML/DDL 命令行执行（S10场景）

Oracle MCP 仅支持 SELECT 查询，DML/DDL 操作必须通过 SQL\*Plus 命令行执行。

**执行方式**：使用封装脚本 `scripts/execute-oracle-sql.ps1`

```powershell
.\execute-oracle-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" `
    -Host "10.20.18.177" -Port 1521 -ServiceName "orcl" `
    -Username "bemp_hnnx" -Password "123456" -Schema "BEMP_HNNX"
```

> 脚本功能详情（自动NLS\_LANG设置、编码初始化、错误检测、日志保存）见 `scripts/execute-oracle-sql.ps1`

**Oracle DML/DDL 执行流程**：

```
1. 预检查（通过Oracle MCP）：
   a. mcp_oracle-mcp_describe_table → 确认目标表存在
   b. mcp_oracle-mcp_execute_query → 执行前数据快照
2. 执行SQL脚本（通过execute-oracle-sql.ps1）：
   a. 设置NLS_LANG环境变量
   b. 调用sqlplus执行SQL脚本
   c. 检测执行结果中的ORA-/SP2-错误
3. 执行后验证（通过Oracle MCP）：
   a. mcp_oracle-mcp_execute_query → 验证数据变更
   b. 比对执行前快照与执行后数据
4. 异常回退：
   a. 生成回退SQL脚本
   b. 通过execute-oracle-sql.ps1执行回退脚本
```

**MySQL CLI 备选执行**（大数据量或MCP不可用时）：

```powershell
.\execute-mysql-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" `
    -Host "127.0.0.1" -Database "bemp_hnnx" `
    -Username "root" -Password "123456" -Charset "utf8mb4"
```

**DML/DDL执行方式选择**：

| 数据库    | 操作类型    | 首选方式            | 备选方式      | 说明            |
| ------ | ------- | --------------- | --------- | ------------- |
| Oracle | SELECT  | Oracle MCP      | SQL\*Plus | MCP只读查询更安全    |
| Oracle | DML/DDL | SQL\*Plus       | 无         | MCP不支持，必须用命令行 |
| MySQL  | SELECT  | MySQL MCP       | MySQL CLI | MCP更便捷        |
| MySQL  | DML     | MySQL MCP(安全模式) | MySQL CLI | 安全模式事务保护      |
| MySQL  | DDL     | MySQL MCP       | MySQL CLI | MCP直接执行       |

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

**复核流程**：

```
1. 根据脚本类型选择验证方式
2. 执行验证查询
3. 比对执行前快照与执行后数据
4. 生成复核报告（使用 assets/templates/execution-report.md 模板）
5. MySQL安全执行模式：
   - 复核通过 → COMMIT 提交事务
   - 复核不通过 → ROLLBACK 回滚事务
6. 普通模式如复核不通过，进入回退流程
```

#### 步骤7：生成执行报告

使用执行报告模板记录完整操作过程，报告需标注数据库类型。同时可生成结构化 JSON 结果（使用 `assets/templates/execution-result-schema.json`）。

***

### 第五阶段：异常处理与回退

#### 步骤8：异常处理

| 异常类型               | 处理策略               | 后续操作                                     |
| ------------------ | ------------------ | ---------------------------------------- |
| 连接失败               | 重试3次，间隔5秒          | 仍失败则终止并报告                                |
| SQL语法错误            | 停止执行，记录错误          | 修正后重新执行                                  |
| 执行超时               | 终止当前语句             | 评估是否需要回退                                 |
| 约束冲突               | 停止执行，记录冲突          | 检查数据后决定回退或修正                             |
| 影响行数超限             | 停止执行，发出警告          | 确认后继续或回退                                 |
| 连接断开               | 自动重连               | 重连后重试或回退                                 |
| 编码异常-中文乱码          | 终端/会话编码与数据库不匹配     | 执行编码初始化 → SET NAMES utf8mb4 → chcp 65001 |
| 编码异常-Oracle NLS    | NLS\_LANG未正确设置     | 设置NLS\_LANG环境变量 → ALTER SESSION          |
| Oracle DML/DDL执行失败 | sqlplus未安装或SQL语法错误 | 检查sqlplus路径 → 检查ORA-错误码 → 执行回退           |

**MySQL 特有异常处理**：

| 异常类型  | MySQL 错误码                           | 处理策略                    |
| ----- | ----------------------------------- | ----------------------- |
| 主键冲突  | 1062 (ER\_DUP\_ENTRY)               | 安全模式→ROLLBACK；普通模式→停止执行 |
| 外键约束  | 1451/1452 (ER\_ROW\_IS\_REFERENCED) | 安全模式→ROLLBACK；普通模式→停止执行 |
| 字段不存在 | 1054 (ER\_BAD\_FIELD\_ERROR)        | 安全模式→ROLLBACK；普通模式→停止执行 |
| 表不存在  | 1146 (ER\_NO\_SUCH\_TABLE)          | 安全模式→ROLLBACK；普通模式→停止执行 |
| 连接断开  | 2006 (CR\_SERVER\_GONE\_ERROR)      | 自动重连后重试（见5.6节）          |
| 查询中断  | 2013 (CR\_SERVER\_LOST)             | 自动重连后重试                 |

#### 步骤9：回退操作

当执行失败或复核不通过时，执行回退：

**Oracle 回退**：通过 SQL\*Plus 执行回退脚本

**MySQL 安全执行模式回退**：调用 `mcp_MySQL_execute_sql("ROLLBACK")` 回滚事务

**MySQL 普通模式回退**：通过 `mcp_MySQL_execute_sql` 执行回退SQL

| 回退方式             | 适用场景     | 可靠性 | 说明             |
| ---------------- | -------- | --- | -------------- |
| MySQL ROLLBACK   | 安全执行模式   | 高   | 数据库原生操作，不会失败   |
| MySQL 批量ROLLBACK | 批量安全执行模式 | 高   | 回滚整个批次的DML事务   |
| MySQL 回退SQL      | 普通模式     | 中   | 可能因数据依赖导致回退失败  |
| Oracle 回退SQL     | Oracle   | 中   | 需通过SQL\*Plus执行 |

**MySQL 普通模式回退流程**：

```
1. 确定回退级别
2. 生成回退SQL（基于执行前快照）
3. 调用 mcp_MySQL_execute_sql 逐语句执行回退SQL
4. 验证回退结果
5. 生成回退报告
```

***

### 第六阶段：连接健康检查

#### 步骤10：连接保活与自动重连

长时间操作（超过MySQL `wait_timeout`）可能导致连接断开，需要连接保活和自动重连机制。

> 完整配置详见 `config/execution-policy.json` → `connectionKeepAlive`。关键字段：enabled=true, intervalSeconds=300, checkSql="SELECT 1", maxReconnectAttempts=3

**保活执行流程**：

```
1. 操作开始时记录最后活动时间
2. 每次MCP调用前检查距上次活动的时间间隔
3. 如间隔 > intervalSeconds：
   a. 执行保活检查SQL
   b. 成功 → 更新活动时间，继续操作
   c. 失败 → 进入重连流程
4. 重连流程：
   a. 等待 reconnectIntervalSeconds 秒
   b. 重新执行连接验证
   c. 成功 → 更新活动时间，继续操作
   d. 失败 → 重试，最多 maxReconnectAttempts 次
   e. 仍失败 → 报错终止
```

**MySQL 连接断开自动恢复**：

| 错误码  | 说明                      | 恢复策略         |
| ---- | ----------------------- | ------------ |
| 2006 | CR\_SERVER\_GONE\_ERROR | 自动重连后重试当前SQL |
| 2013 | CR\_SERVER\_LOST        | 自动重连后重试当前SQL |
| 1040 | ER\_CON\_COUNT\_ERROR   | 等待后重连        |

***

## 6. 输出标准

### 6.1 执行成功标准

| 指标    | 标准               |
| ----- | ---------------- |
| 连接状态  | 一次性连接成功，无重试      |
| 执行状态  | 所有SQL语句执行成功      |
| 复核状态  | 数据一致性验证通过        |
| 日志完整性 | 操作全程有日志记录        |
| 报告生成  | 执行报告已生成（标注数据库类型） |

### 6.2 日志记录要求

每次操作必须记录以下日志：

```
[时间戳] [数据库类型:Oracle/MySQL] [操作类型] [脚本文件] [执行状态] [影响行数] [耗时]
[时间戳] [数据库类型:Oracle/MySQL] [复核] [验证SQL] [预期结果] [实际结果] [是否一致]
[时间戳] [数据库类型:Oracle/MySQL] [回退] [回退方式:ROLLBACK/回退SQL] [回退状态] [回退行数]
[时间戳] [数据库类型:MySQL] [保活] [检查SQL] [连接状态]
```

### 6.3 结果验证标准

| 验证维度 | Oracle 验证方法       | MySQL 验证方法                          | 通过标准       |
| ---- | ----------------- | ----------------------------------- | ---------- |
| 结构验证 | `describe_table`  | `mcp_MySQL_execute_sql("DESCRIBE")` | 表结构符合预期    |
| 数据验证 | `execute_query`   | `mcp_MySQL_execute_sql`             | 数据内容与预期一致  |
| 行数验证 | `SELECT COUNT(*)` | `SELECT COUNT(*)`                   | 影响行数在预期范围内 |
| 关联验证 | 关联表查询             | 关联表查询                               | 关联数据无异常    |

### 6.4 结构化输出

除 Markdown 报告外，可生成结构化 JSON 结果，格式参照 `assets/templates/execution-result-schema.json`，便于与其他技能/智能体集成。

***

## 7. 快速操作参考

### 7.1 流程速览

| 模式        | 核心流程                                                              |
| --------- | ----------------------------------------------------------------- |
| Oracle    | 读配置→MCP连接→编码初始化→预检查→快照→\[SELECT用MCP/DML用sqlplus]→验证→报告            |
| MySQL(安全) | 读配置→MCP连接→编码初始化→预检查→快照→START TRANSACTION→执行→验证→COMMIT/ROLLBACK→报告 |
| MySQL(普通) | 读配置→MCP连接→编码初始化→预检查→快照→执行→验证→报告                                   |
| 批量        | 读配置→连接→DDL组→DML组(事务)→CONFIG组→批量报告                                 |
| 自动检测      | defaultDbType=auto→探测Oracle MCP→探测MySQL MCP→缓存结果                  |

> 详细步骤见第5章各阶段说明。

### 7.2 常用查询模板

**Oracle 查询模板**：

```sql
SELECT COUNT(*) FROM {TABLE_NAME};
DESCRIBE {TABLE_NAME};
SELECT ID, AUTH_NAME, AUTH_TYPE, PARENT_ID, URL FROM TM_AUTHORITY WHERE ID IN ({ID_LIST}) ORDER BY ID;
SELECT PARAM_KEY, PARAM_NAME, PARAM_VALUE FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY LIKE '{PREFIX}%';
SELECT COUNT(*) FROM {TABLE_NAME} WHERE {CONDITION};
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = UPPER('{TABLE_NAME}') ORDER BY COLUMN_ID;
```

**MySQL 查询模板**：

```sql
SELECT COUNT(*) FROM {TABLE_NAME};
DESCRIBE {TABLE_NAME};
SELECT ID, AUTH_NAME, AUTH_TYPE, PARENT_ID, URL FROM TM_AUTHORITY WHERE ID IN ({ID_LIST}) ORDER BY ID;
SELECT PARAM_KEY, PARAM_NAME, PARAM_VALUE FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY LIKE '{PREFIX}%';
SELECT COUNT(*) FROM {TABLE_NAME} WHERE {CONDITION};
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '{DATABASE}' AND TABLE_NAME = '{TABLE_NAME}' ORDER BY ORDINAL_POSITION;
```

### 7.3 Oracle/MySQL SQL 差异速查

| 功能     | Oracle                      | MySQL                        |
| ------ | --------------------------- | ---------------------------- |
| 获取当前时间 | `SYSDATE`                   | `NOW()`                      |
| 字符串拼接  | `\|\|` 或 `CONCAT()`         | `CONCAT()`                   |
| 空值处理   | `NVL()`                     | `IFNULL()` 或 `COALESCE()`    |
| 分页     | `ROWNUM`                    | `LIMIT offset, count`        |
| 序列     | `SEQUENCE.NEXTVAL`          | `AUTO_INCREMENT`             |
| 日期格式化  | `TO_CHAR(date, 'fmt')`      | `DATE_FORMAT(date, 'fmt')`   |
| 类型转换   | `TO_CHAR()` / `TO_NUMBER()` | `CAST()` / `CONVERT()`       |
| 查看表结构  | `USER_TAB_COLUMNS`          | `INFORMATION_SCHEMA.COLUMNS` |
| 查看索引   | `USER_IND_COLUMNS`          | `SHOW INDEX FROM {table}`    |
| 查看数据库  | `list_schemas`              | `SHOW DATABASES`             |
| 查看表列表  | `list_tables`               | `SHOW TABLES`                |
| DUAL表  | `SELECT ... FROM DUAL`      | `SELECT ...`（无需DUAL）         |

