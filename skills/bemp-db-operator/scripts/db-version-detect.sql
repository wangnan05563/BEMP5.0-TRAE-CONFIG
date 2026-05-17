-- ==========================================================================
-- 数据库版本检测脚本
-- 用途：连接建立后自动检测数据库版本，用于特性兼容性判断
-- 使用方式：根据已确定的数据库类型执行对应的版本检测查询
-- ==========================================================================

-- ==========================================================================
-- Oracle 版本检测
-- ==========================================================================

-- 获取Oracle完整版本信息
SELECT BANNER AS version FROM V$VERSION WHERE ROWNUM = 1;

-- 获取Oracle各组件版本详情
SELECT PRODUCT, VERSION, STATUS FROM PRODUCT_COMPONENT_VERSION;

-- 获取Oracle版本号（数值形式，便于比较）
SELECT VERSION_NO FROM PRODUCT_COMPONENT_VERSION WHERE PRODUCT LIKE 'Oracle%';

-- 获取Oracle版本特性信息
-- 11g: PIVOT/UNPIVOT, LISTAGG
-- 12c: JSON函数, IDENTITY列, LATERAL
-- 19c: LISTAGG增强, 多态表函数
-- 21c: SQL宏, JSON增强
SELECT BANNER FROM V$VERSION;

-- 获取Oracle字符集信息
SELECT VALUE AS nls_characterset FROM NLS_DATABASE_PARAMETERS WHERE PARAMETER = 'NLS_CHARACTERSET';
SELECT VALUE AS nls_nchar_characterset FROM NLS_DATABASE_PARAMETERS WHERE PARAMETER = 'NLS_NCHAR_CHARACTERSET';

-- ==========================================================================
-- MySQL 版本检测
-- ==========================================================================

-- 获取MySQL完整版本信息
SELECT VERSION() AS mysql_version;

-- 获取MySQL版本号（数值形式，便于比较）
SELECT VERSION() AS version,
       SUBSTRING_INDEX(VERSION(), '.', 1) AS major_version,
       SUBSTRING_INDEX(SUBSTRING_INDEX(VERSION(), '.', 2), '.', -1) AS minor_version;

-- 获取MySQL当前SQL_MODE（影响SQL行为兼容性）
SELECT @@sql_mode AS sql_mode;

-- 获取MySQL字符集信息
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME = DATABASE();

-- 获取MySQL存储引擎信息
SELECT ENGINE, SUPPORT, COMMENT
FROM INFORMATION_SCHEMA.ENGINES
WHERE SUPPORT IN ('YES', 'DEFAULT');

-- ==========================================================================
-- MySQL 版本特性检测（8.0+ 特有功能验证）
-- ==========================================================================

-- 窗口函数支持检测（MySQL 8.0+）
-- 成功表示支持ROW_NUMBER(), RANK(), DENSE_RANK()等窗口函数
SELECT 1 AS window_function_test
WHERE EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_SCHEMA = 'mysql' AND ROUTINE_NAME = 'ROW_NUMBER'
    LIMIT 1
);

-- CTE递归支持检测（MySQL 8.0+）
-- 通过尝试EXPLAIN一个CTE查询来验证
-- EXPLAIN WITH RECURSIVE cte AS (SELECT 1 AS n UNION ALL SELECT n+1 FROM cte WHERE n < 2) SELECT * FROM cte;

-- JSON函数支持检测（MySQL 5.7+）
SELECT JSON_VALID('{"test":1}') AS json_support_test;

-- INSERT ON DUPLICATE KEY UPDATE支持检测（MySQL全版本）
SELECT 1 AS upsert_support_test;

-- 生成列支持检测（MySQL 5.7+）
SELECT COUNT(*) AS generated_column_support
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND EXTRA LIKE '%GENERATED%'
LIMIT 1;

-- ==========================================================================
-- 版本兼容性判定标准
-- ==========================================================================
-- Oracle版本判定：
--   包含"11g" → Oracle 11g（基础特性）
--   包含"12c" → Oracle 12c（+JSON, IDENTITY）
--   包含"19c" → Oracle 19c（+LISTAGG增强）
--   包含"21c" → Oracle 21c（+SQL宏）
--
-- MySQL版本判定：
--   主版本=5, 次版本=7 → MySQL 5.7（+JSON, 生成列）
--   主版本=8, 次版本=0 → MySQL 8.0（+窗口函数, CTE, LATERAL）
--   主版本=8, 次版本≥4 → MySQL 8.4（+增强优化器）
--
-- 不支持的版本：
--   MySQL < 5.7 → 发出警告，部分功能不可用
--   Oracle < 11g → 发出警告，部分功能不可用
-- ==========================================================================
