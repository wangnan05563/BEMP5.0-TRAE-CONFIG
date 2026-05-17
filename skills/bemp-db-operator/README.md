# bemp-db-operator

BEMP 数据库标准化操作技能 — 通过 Oracle MCP / MySQL MCP 实现数据库连接、SQL执行、结果复核、异常回退的完整闭环。

## 版本

V2.3.1 | 2026-05-16

## 核心能力

| 能力 | 说明 |
|------|------|
| 双引擎支持 | Oracle + MySQL 统一操作范式，支持自动检测切换 |
| SQL全类型执行 | SELECT/DML/DDL，MySQL通过MCP，Oracle DML/DDL通过sqlplus |
| 安全执行模式 | MySQL事务包裹（START TRANSACTION → 执行 → 验证 → COMMIT/ROLLBACK） |
| 编码预处理 | 自动初始化会话编码，解决中文乱码（终端/MySQL/Oracle三层） |
| 版本兼容检测 | 自动检测数据库版本，与兼容性矩阵比对调整可用特性 |
| 批量操作 | 多脚本顺序执行（DDL→DML→CONFIG），进度跟踪，部分失败处理 |
| 异常回退 | MySQL ROLLBACK / 回退SQL脚本，保障数据安全 |
| 连接保活 | 定期SELECT 1保活，断线自动重连 |

## 触发场景

| 编号 | 场景 |
|------|------|
| S1 | 连接数据库执行查询 |
| S2 | 执行增量SQL脚本 |
| S3 | SQL执行结果复核 |
| S4 | 回退已执行的数据库变更 |
| S5 | SQL脚本语法预检查 |
| S6 | 执行前后数据差异对比 |
| S7 | MySQL数据库操作 |
| S8 | MySQL安全执行（事务保护） |
| S9 | 批量执行多个SQL脚本 |
| S10 | Oracle DML/DDL命令行执行 |

## 目录结构

```
bemp-db-operator/
├── SKILL.md                              # 技能主定义
├── config/
│   ├── db-config.json                    # 连接配置 + 自动检测 + 编码 + CLI
│   ├── execution-policy.json             # 执行策略 + 安全模式 + 编码检查 + 批量操作
│   └── version-compat.json               # Oracle/MySQL版本兼容性矩阵
├── scripts/
│   ├── db-connect-test.sql               # Oracle连接测试
│   ├── db-connect-test-mysql.sql         # MySQL连接测试
│   ├── db-type-detect.sql                # 数据库类型自动检测
│   ├── db-version-detect.sql             # 数据库版本检测
│   ├── db-encoding-setup.sql             # 编码初始化（解决中文乱码）
│   ├── execute-oracle-sql.ps1            # Oracle SQL*Plus执行封装
│   ├── execute-mysql-sql.ps1             # MySQL CLI执行封装
│   ├── pre-check.sql                     # Oracle执行前预检查
│   ├── pre-check-mysql.sql               # MySQL执行前预检查
│   ├── post-verify.sql                   # Oracle执行后验证
│   ├── post-verify-mysql.sql             # MySQL执行后验证
│   ├── rollback-template.sql             # Oracle回退脚本模板
│   ├── rollback-template-mysql.sql       # MySQL回退脚本模板
│   └── sql-compat-check-mysql.sql        # Oracle→MySQL SQL兼容性检查
├── assets/templates/
│   ├── execution-report.md               # 执行报告模板
│   ├── rollback-report.md                # 回退报告模板
│   └── execution-result-schema.json      # 结构化执行结果JSON Schema
└── references/
    ├── connection-guide.md               # 连接规范 + 编码配置 + CLI执行说明
    ├── sql-standards.md                  # SQL编写标准 + Oracle/MySQL差异对照
    └── safety-guide.md                   # 安全操作规范 + MySQL权限控制
```

## MCP工具对照

| 操作 | Oracle MCP | MySQL MCP |
|------|-----------|-----------|
| 列出Schema | `mcp_oracle-mcp_list_schemas` | `mcp_MySQL_execute_sql("SHOW DATABASES")` |
| 列出表 | `mcp_oracle-mcp_list_tables` | `mcp_MySQL_execute_sql("SHOW TABLES")` |
| 查看表结构 | `mcp_oracle-mcp_describe_table` | `mcp_MySQL_execute_sql("DESCRIBE {table}")` |
| 执行查询 | `mcp_oracle-mcp_execute_query` | `mcp_MySQL_execute_sql` |
| 执行DML/DDL | 不支持（需SQL*Plus） | `mcp_MySQL_execute_sql` |

## 执行流程速览

| 模式 | 流程 |
|------|------|
| Oracle | 读配置→MCP连接→编码初始化→预检查→快照→[SELECT用MCP/DML用sqlplus]→验证→报告 |
| MySQL(安全) | 读配置→MCP连接→编码初始化→预检查→快照→START TRANSACTION→执行→验证→COMMIT/ROLLBACK→报告 |
| MySQL(普通) | 读配置→MCP连接→编码初始化→预检查→快照→执行→验证→报告 |
| 批量 | 读配置→连接→DDL组→DML组(事务)→CONFIG组→批量报告 |

## 版本演进

| 版本 | 主要变更 |
|------|---------|
| V1.0.0 | 纯Oracle支持 |
| V2.0.0 | Oracle+MySQL双引擎基础框架 |
| V2.1.0 | 安全执行模式 + MCP配置脱节修复 + 权限控制 + 连接保活 + 结构化输出 |
| V2.2.0 | 自动检测 + 版本兼容性矩阵 + 批量操作 |
| V2.3.0 | 中文乱码解决 + DML/DDL命令行执行 |
| V2.3.1 | Token优化（文档精简51.6%，功能不变） |
