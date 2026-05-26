# bemp-db-operator 反向构建提示词

## 核心功能
BEMP数据库标准化操作技能，通过Oracle MCP和MySQL MCP实现一次性连接数据库，提供SQL执行、结果复核、异常回退完整闭环。支持Oracle/MySQL双数据库，接口设计保持一致性。MySQL支持安全执行模式(事务包裹)和连接保活。含数据库类型自动检测、版本兼容性检测、智能体委托策略、多级降级策略、数据导出为文件。

## 关键实现逻辑
- 数据库类型：config/db-config.json的defaultDbType(oracle/mysql/auto)，auto模式自动探测MCP工具可用性
- 智能体委托：主智能体可能缺Oracle MCP工具→委托bemp-implementation-engineer子智能体→降级到sqlplus命令行→报错终止
- MySQL安全执行模式：START TRANSACTION→逐语句执行→验证→COMMIT/ROLLBACK，DDL隐式提交无法回滚
- Oracle DML/DDL：MCP仅支持SELECT，DML/DDL通过execute-oracle-sql.ps1调用sqlplus执行
- 编码预处理：Windows终端GBK vs 数据库UTF-8，自动初始化会话编码(chcp 65001/SET NAMES utf8mb4)
- 连接保活：超wait_timeout自动重连，保活SQL=SELECT 1，最多3次重连

## 输入输出参数
- 输入：db-config.json(连接参数)、SQL脚本文件、执行策略(execution-policy.json)
- 输出：执行报告(assets/templates/execution-report.md)、回退报告(rollback-report.md)、数据导出报告(data-export-report.md)、结构化JSON(execution-result-schema.json)

## 主要业务流程
1. 读配置→确定数据库类型(auto则自动检测)→MCP连接→编码初始化→版本检测
2. SQL预检查：语法/WHERE条件/幂等性/事务完整性/表字段存在性/影响范围/兼容性
3. 执行前数据快照(SELECT/DESCRIBE)
4. 执行SQL：Oracle SELECT用MCP/DML用sqlplus；MySQL安全模式用事务包裹
5. 执行后复核：比对快照与执行后数据，MySQL安全模式复核通过COMMIT/不通过ROLLBACK
6. 异常回退：MySQL ROLLBACK(安全模式)或回退SQL(普通模式)/Oracle回退SQL通过sqlplus

## 技术特性
- 批量操作：按DDL→DML→CONFIG顺序执行，all_or_nothing/best_effort回退策略
- 数据导出：MD/CSV/JSON格式，时间范围查询，大数据量分页，export-db-data.ps1命令行备选
- 版本兼容：version-compat.json特性矩阵，不兼容特性阻止/警告执行
