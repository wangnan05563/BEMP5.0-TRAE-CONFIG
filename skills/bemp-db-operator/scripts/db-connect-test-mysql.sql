-- ==========================================================================
-- MySQL 数据库连接测试脚本
-- 用途：验证MySQL数据库连接是否可用，确认数据库和关键表可访问
-- 使用方式：通过 MySQL MCP 的 execute_sql 工具逐步执行
-- ==========================================================================

-- 步骤1：验证连接
-- 调用：mcp_MySQL_execute_sql(query="SELECT 1 AS connection_test")
-- 预期：返回 connection_test = 1

-- 步骤2：验证当前数据库
-- 调用：mcp_MySQL_execute_sql(query="SELECT DATABASE() AS current_database")
-- 预期：返回当前数据库名

-- 步骤3：列出所有表
-- 调用：mcp_MySQL_execute_sql(query="SHOW TABLES")
-- 预期：返回表列表

-- 步骤4：验证核心表存在
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'TM_AUTHORITY',
    'TM_BUSINESS_PARAMETER',
    'TM_PEND_ITEM',
    'TB_FLOW_ROUTE',
    'TB_FLOW_STATUS',
    'TM_DICT'
)
ORDER BY TABLE_NAME;

-- 步骤5：验证数据库时间（确认时区正确）
SELECT NOW() AS DB_TIME;

-- 步骤6：验证当前用户权限
SELECT USER() AS CURRENT_USER, CURRENT_USER() AS AUTH_USER;

-- 步骤7：验证数据库版本
SELECT VERSION() AS DB_VERSION;

-- 步骤8：验证字符集
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME = DATABASE();

-- ==========================================================================
-- 连接测试结果判定标准：
-- 1. 步骤1-2：MCP调用成功 → 连接可用
-- 2. 步骤3-4：至少返回5个核心表 → 数据库正确
-- 3. 步骤5：时间与预期偏差<5分钟 → 时区正确
-- 4. 步骤6：返回有效用户 → 用户可用
-- 5. 步骤7-8：版本和字符集符合预期 → 环境正确
-- 全部通过 → 连接就绪
-- ==========================================================================
