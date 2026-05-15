-- ==========================================================================
-- 数据库连接测试脚本
-- 用途：验证数据库连接是否可用，确认Schema和关键表可访问
-- 使用方式：通过 Oracle MCP 的 execute_query 工具逐步执行
-- ==========================================================================

-- 步骤1：验证连接 - 列出当前用户可访问的Schema
-- 调用：mcp_oracle-mcp_list_schemas()
-- 预期：返回Schema列表，包含 BEMP_HNNX

-- 步骤2：验证Schema可访问 - 列出目标Schema下的表
-- 调用：mcp_oracle-mcp_list_tables(schema="BEMP_HNNX")
-- 预期：返回表列表

-- 步骤3：验证核心表存在
SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME IN (
    'TM_AUTHORITY',
    'TM_BUSINESS_PARAMETER',
    'TM_PEND_ITEM',
    'TB_FLOW_ROUTE',
    'TB_FLOW_STATUS',
    'TM_DICT'
) ORDER BY TABLE_NAME;

-- 步骤4：验证数据库时间（确认时区正确）
SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS DB_TIME FROM DUAL;

-- 步骤5：验证当前用户权限
SELECT USERNAME, ACCOUNT_STATUS, EXPIRY_DATE FROM USER_USERS;

-- ==========================================================================
-- 连接测试结果判定标准：
-- 1. 步骤1-2：MCP调用成功 → 连接可用
-- 2. 步骤3：至少返回5个核心表 → Schema正确
-- 3. 步骤4：时间与预期偏差<5分钟 → 时区正确
-- 4. 步骤5：ACCOUNT_STATUS = OPEN → 用户可用
-- 全部通过 → 连接就绪
-- ==========================================================================
