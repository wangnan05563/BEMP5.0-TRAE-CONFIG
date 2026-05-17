# 数据库连接规范

## 1. 连接方式

### 1.1 Oracle MCP 连接

通过 Oracle MCP 工具进行数据库操作，提供标准化的连接管理：

| 工具 | 用途 | 权限 |
|------|------|------|
| `mcp_oracle-mcp_list_schemas` | 列出Schema | 只读 |
| `mcp_oracle-mcp_list_tables` | 列出表 | 只读 |
| `mcp_oracle-mcp_describe_table` | 查看表结构 | 只读 |
| `mcp_oracle-mcp_execute_query` | 执行查询 | 只读 |

> **重要**：Oracle MCP 仅支持 SELECT 查询。DML/DDL 操作需通过 `scripts/execute-oracle-sql.ps1` 调用 SQL*Plus 执行。

**Oracle 连接参数**：

| 参数 | 开发环境 | 测试环境 | 生产环境 |
|------|----------|----------|----------|
| 主机 | 10.20.18.177 | 待配置 | 待配置 |
| 端口 | 1521 | 1521 | 1521 |
| 服务名 | orcl | 待配置 | 待配置 |
| 用户名 | bemp_hnnx | 待配置 | 待配置 |
| Schema | BEMP_HNNX | 待配置 | 待配置 |
| NLS_LANG | AMERICAN_AMERICA.AL32UTF8 | 同开发 | 同开发 |

### 1.2 MySQL MCP 连接

通过 MySQL MCP 工具进行数据库操作，提供全类型SQL支持：

| 工具 | 用途 | 权限 |
|------|------|------|
| `mcp_MySQL_execute_sql` | 执行任意SQL（SELECT/DDL/DML） | 读写 |

**MySQL 连接参数**：

| 参数 | 开发环境 | 测试环境 | 生产环境 |
|------|----------|----------|----------|
| 主机 | 127.0.0.1 | 待配置 | 待配置 |
| 端口 | 3306 | 3306 | 3306 |
| 数据库名 | bemp_hnnx | 待配置 | 待配置 |
| 用户名 | root | 待配置 | 待配置 |
| 字符集 | utf8mb4 | utf8mb4 | utf8mb4 |

### 1.3 Oracle/MySQL MCP 接口对照

| 操作 | Oracle MCP | MySQL MCP |
|------|-----------|-----------|
| 验证连接 | `list_schemas()` | `execute_sql("SELECT 1")` |
| 列出数据库 | `list_schemas()` | `execute_sql("SHOW DATABASES")` |
| 列出表 | `list_tables(schema)` | `execute_sql("SHOW TABLES")` |
| 查看表结构 | `describe_table(table, schema)` | `execute_sql("DESCRIBE {table}")` |
| 执行查询 | `execute_query(query, schema)` | `execute_sql(query)` |
| 执行DML | 不支持 | `execute_sql(query)` |
| 执行DDL | 不支持 | `execute_sql(query)` |

### 1.4 SQL*Plus 连接（Oracle 备用）

```bash
sqlplus bemp_hnnx/123456@10.20.18.177:1521/orcl
```

### 1.5 MySQL CLI 连接（MySQL 备用）

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p123456 bemp_hnnx
```

### 1.6 JDBC 连接字符串

```
# Oracle
jdbc:oracle:thin:@10.20.18.177:1521:orcl

# MySQL
jdbc:mysql://127.0.0.1:3306/bemp_hnnx?useUnicode=true&characterEncoding=utf8mb4
```

---

## 2. 连接管理规范

### 2.1 连接生命周期

```
建立连接 → 连接测试 → 执行操作 → 结果验证 → 释放连接
```

### 2.2 连接池配置

| 参数 | Oracle 推荐值 | MySQL 推荐值 | 说明 |
|------|-------------|-------------|------|
| 初始连接数 | 1 | 1 | MCP单次操作 |
| 最大连接数 | 3 | 3 | 并发操作上限 |
| 连接超时 | 30秒 | 30秒 | 建立连接超时 |
| 空闲超时 | 300秒 | 300秒 | 连接空闲回收 |
| 最大生命周期 | 1800秒 | 1800秒 | 连接最大存活时间 |

### 2.3 连接失败处理

| 失败类型 | Oracle 处理方式 | MySQL 处理方式 | 重试策略 |
|----------|----------------|---------------|----------|
| 网络超时 | 检查网络连通性 | 检查网络连通性 | 最多3次，间隔5秒 |
| 认证失败 | 检查用户名密码 | 检查用户名密码 | 不重试，修正配置 |
| 服务不可用 | 检查Oracle服务状态 | 检查MySQL服务状态 | 最多3次，间隔10秒 |
| Schema/DB不存在 | 检查Schema名称 | 检查数据库名称 | 不重试，修正配置 |
| 连接数超限 | 等待后重试 | 等待后重试 | 最多3次，间隔15秒 |

---

## 3. 安全规范

### 3.1 密码管理

- 开发环境密码可明文存储于 `config/db-config.json`
- 测试/生产环境密码必须加密存储
- 密码不得出现在日志、报告等输出文件中
- 定期更换数据库密码

### 3.2 权限控制

- Oracle MCP 连接使用只读权限，仅支持 SELECT 语句
- MySQL MCP 连接默认具有读写权限，可执行 DDL/DML/SELECT
- MySQL DDL/DML 操作需通过预检查后方可执行
- 生产环境操作需双人复核

### 3.3 操作审计

- 所有数据库操作必须记录日志
- 操作日志包含：时间、数据库类型、操作人、SQL语句、影响行数
- 日志保留期限不少于6个月

---

## 4. 环境切换

### 4.1 切换流程

1. 修改 `config/db-config.json` 中的 `defaultEnvironment` 值
2. 确认目标环境的连接参数已正确配置
3. 执行连接测试验证新环境可用
4. 记录环境切换操作日志

### 4.2 数据库类型切换

1. 修改 `config/db-config.json` 中的 `defaultDbType` 值（`oracle`、`mysql` 或 `auto`）
2. 如设置为 `auto`，将自动探测可用MCP工具确定数据库类型
3. 确认目标数据库类型的连接参数已正确配置
4. 执行连接测试验证新数据库类型可用
5. 注意SQL语法差异，参照 sql-standards.md 中的差异对照表

### 4.3 数据库类型自动检测

当 `defaultDbType` 设置为 `auto` 时，技能将自动探测MCP工具可用性：

**检测优先级**：按 `autoDetection.detectionPriority` 配置的顺序探测（默认 oracle → mysql）

**检测步骤**：
1. 尝试调用 `mcp_oracle-mcp_list_schemas` 探测Oracle MCP
2. Oracle MCP可用 → 数据库类型确定为oracle
3. Oracle MCP不可用 → 尝试调用 `mcp_MySQL_execute_sql("SELECT 1 AS db_type_probe")` 探测MySQL MCP
4. MySQL MCP可用 → 数据库类型确定为mysql
5. 均不可用 → 使用 `autoDetection.fallbackDbType` 配置的回退类型

**检测结果缓存**：
- 缓存时长：`cacheDurationSeconds`（默认3600秒）
- 缓存失效：超时、MCP调用失败、手动清除

### 4.4 数据库版本检测

连接建立后，自动检测数据库版本用于特性兼容性判断：

**Oracle 版本检测**：
```sql
SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1;
```

**MySQL 版本检测**：
```sql
SELECT VERSION() AS version;
SELECT @@sql_mode AS sql_mode;
```

**版本兼容性矩阵**：参照 `config/version-compat.json`

| 数据库 | 最低支持版本 | 推荐版本 | 关键限制 |
|--------|------------|---------|---------|
| Oracle | 11g | 19c | JSON函数需12c+ |
| MySQL | 5.7 | 8.0 | 窗口函数/CTE需8.0+ |

### 4.5 注意事项

- 切换到生产环境前必须获得审批
- 生产环境默认启用 dryRun 模式
- 生产环境回退策略必须为 script 级别以上
- 切换数据库类型时需注意SQL语法兼容性

### 4.6 编码配置（解决中文乱码）

**中文乱码根因**：Windows终端默认使用GBK(代码页936)，数据库使用UTF-8编码，两者不匹配导致中文显示乱码。

**三层编码配置**：

| 层面 | 配置项 | Oracle | MySQL |
|------|--------|--------|-------|
| 终端 | 代码页 | chcp 65001 | chcp 65001 |
| 会话 | 字符集 | NLS_LANG=AMERICAN_AMERICA.AL32UTF8 | SET NAMES utf8mb4 |
| 连接 | 字符集 | MCP服务端配置 | MCP服务端charset=utf8mb4 |

**终端编码初始化**（每次操作前执行）：

```powershell
chcp 65001 > $null 2>&1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

**MySQL会话编码初始化**：

```sql
SET NAMES utf8mb4;
SET CHARACTER_SET_CLIENT = utf8mb4;
SET CHARACTER_SET_CONNECTION = utf8mb4;
SET CHARACTER_SET_RESULTS = utf8mb4;
```

**Oracle会话编码初始化**：

```sql
ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS';
ALTER SESSION SET NLS_DATE_LANGUAGE = 'AMERICAN';
ALTER SESSION SET NLS_LANGUAGE = 'AMERICAN';
```

> Oracle的字符集由NLS_LANG环境变量控制，需在MCP服务端启动前设置。ALTER SESSION仅影响日期格式和语言。

**编码验证**：

```sql
-- MySQL
SELECT @@character_set_results;  -- 预期: utf8mb4
SELECT '中文测试' AS test;        -- 验证中文显示

-- Oracle
SELECT USERENV('LANGUAGE') FROM DUAL;  -- 验证NLS_LANG
SELECT VALUE FROM NLS_SESSION_PARAMETERS WHERE PARAMETER = 'NLS_DATE_FORMAT';
```

### 4.7 命令行执行工具（DML/DDL）

**Oracle SQL*Plus 执行**（DML/DDL必须通过命令行）：

```powershell
# 使用封装脚本执行
.\scripts\execute-oracle-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" `
    -Host "10.20.18.177" -ServiceName "orcl" `
    -Username "bemp_hnnx" -Password "123456" -Schema "BEMP_HNNX"
```

**MySQL CLI 执行**（MCP的备选方案）：

```powershell
# 使用封装脚本执行（大数据量或MCP不可用时）
.\scripts\execute-mysql-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" `
    -Host "127.0.0.1" -Database "bemp_hnnx" `
    -Username "root" -Password "123456" -Charset "utf8mb4"
```

**DML/DDL执行方式选择**：

| 场景 | Oracle | MySQL |
|------|--------|-------|
| SELECT查询 | Oracle MCP | MySQL MCP |
| DML操作 | SQL*Plus（execute-oracle-sql.ps1） | MySQL MCP（安全模式） |
| DDL操作 | SQL*Plus（execute-oracle-sql.ps1） | MySQL MCP |
| 大数据量脚本 | SQL*Plus | MySQL CLI（execute-mysql-sql.ps1） |
