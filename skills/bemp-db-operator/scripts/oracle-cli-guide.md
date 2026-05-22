# Oracle DML/DDL 命令行执行指南

## 适用场景

S10：Oracle MCP不支持DML/DDL，需通过SQL*Plus命令行执行。

## Oracle SQL*Plus 执行

使用封装脚本 `execute-oracle-sql.ps1`：

```powershell
.\execute-oracle-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" `
    -DbHost "10.20.18.177" -Port 1521 -ServiceName "orcl" `
    -Username "bemp_hnnx" -Password "123456" -Schema "BEMP_HNNX"
```

或使用ConfigFile自动读取参数：

```powershell
.\execute-oracle-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" `
    -ConfigFile "D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-db-operator\config\db-config.json"
```

脚本功能：自动NLS_LANG设置、编码初始化（ALTER SESSION）、Schema切换、ORA-/SP2-/TNS-错误检测、超时控制（默认300s）、日志保存。

## Oracle DML/DDL 执行流程

```
1. 预检查（通过Oracle MCP）：
   a. mcp_oracle-mcp_describe_table → 确认目标表存在
   b. mcp_oracle-mcp_execute_query → 执行前数据快照
2. 执行SQL脚本（通过execute-oracle-sql.ps1）：
   a. 设置NLS_LANG环境变量
   b. 调用sqlplus执行SQL脚本
   c. 检测执行结果中的ORA-/SP2-/TNS-错误
3. 执行后验证（通过Oracle MCP）：
   a. mcp_oracle-mcp_execute_query → 验证数据变更
   b. 比对执行前快照与执行后数据
4. 异常回退：
   a. 生成回退SQL脚本
   b. 通过execute-oracle-sql.ps1执行回退脚本
```

## MySQL CLI 备选执行

大数据量或MCP不可用时：

```powershell
.\execute-mysql-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" `
    -DbHost "127.0.0.1" -Database "bemp_hnnx" `
    -Username "root" -Password "123456" -Charset "utf8mb4"
```

或使用ConfigFile：

```powershell
.\execute-mysql-sql.ps1 -SqlFile "D:\scripts\menu.dml.sql" `
    -ConfigFile "D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-db-operator\config\db-config.json"
```

## DML/DDL执行方式选择矩阵

| 数据库 | 操作类型 | 首选方式 | 备选方式 | 说明 |
|--------|---------|---------|---------|------|
| Oracle | SELECT | Oracle MCP | SQL*Plus | MCP只读查询更安全 |
| Oracle | DML/DDL | SQL*Plus | 无 | MCP不支持，必须用命令行 |
| MySQL | SELECT | MySQL MCP | MySQL CLI | MCP更便捷 |
| MySQL | DML | MySQL MCP(安全模式) | MySQL CLI | 安全模式事务保护 |
| MySQL | DDL | MySQL MCP | MySQL CLI | MCP直接执行 |
