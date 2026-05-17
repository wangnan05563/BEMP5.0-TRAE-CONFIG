-- ==========================================================================
-- Oracle→MySQL SQL兼容性检查脚本
-- 用途：检测SQL脚本中包含的Oracle特有语法，提示需要转换为MySQL语法
-- 使用方式：将待检查的SQL脚本内容与此检查项逐条对照
--           或通过MySQL MCP执行检测查询验证兼容性
-- ==========================================================================

-- ==========================================================================
-- 检查1：Oracle特有函数检测
-- 以下函数在MySQL中不存在或语法不同，需要转换
-- ==========================================================================
-- NVL() → IFNULL() 或 COALESCE()
-- SYSDATE → NOW()
-- TO_CHAR() → DATE_FORMAT() 或 CAST()
-- TO_DATE() → STR_TO_DATE()
-- TO_NUMBER() → CAST() 或 CONVERT()
-- DECODE() → CASE WHEN ... THEN ... ELSE ... END
-- SUBSTR() → SUBSTRING()（MySQL也支持SUBSTR但建议统一）
-- ROW_NUMBER() OVER() → 需确认MySQL版本支持窗口函数（8.0+）
-- ROWNUM → LIMIT 或 ROW_NUMBER() OVER()
-- SEQUENCE.NEXTVAL → AUTO_INCREMENT 或 LAST_INSERT_ID()
-- USER_TAB_COLUMNS → INFORMATION_SCHEMA.COLUMNS
-- USER_TABLES → INFORMATION_SCHEMA.TABLES
-- USER_SEQUENCES → 无对应（MySQL无序列概念）
-- USER_IND_COLUMNS → INFORMATION_SCHEMA.STATISTICS
-- USER_CONSTRAINTS → INFORMATION_SCHEMA.TABLE_CONSTRAINTS

-- ==========================================================================
-- 检查2：Oracle特有语法检测
-- 以下语法在MySQL中不支持，需要转换
-- ==========================================================================
-- SELECT ... FROM DUAL → SELECT ...（去掉FROM DUAL）
-- CONNECT BY ... START WITH → WITH RECURSIVE ...（CTE递归）
-- MERGE INTO → INSERT ... ON DUPLICATE KEY UPDATE 或 REPLACE INTO
-- (+) 外连接语法 → LEFT JOIN / RIGHT JOIN
-- "双引号标识符" → `反引号标识符`
-- || 字符串拼接 → CONCAT()函数
-- NUMBER(p,s) → DECIMAL(p,s) 或 INT/BIGINT
-- VARCHAR2(n) → VARCHAR(n)
-- CLOB → TEXT 或 LONGTEXT
-- BLOB → BLOB 或 LONGBLOB

-- ==========================================================================
-- 检查3：通过MySQL MCP执行兼容性验证
-- 以下SQL可在MySQL上执行，验证关键兼容性点
-- ==========================================================================

-- 验证MySQL版本（8.0+支持窗口函数、CTE等）
SELECT VERSION() AS mysql_version;

-- 验证INFORMATION_SCHEMA可用性
SELECT COUNT(*) AS tables_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE();

-- 验证IFNULL函数可用
SELECT IFNULL(NULL, 'default') AS ifnull_test;

-- 验证NOW函数可用
SELECT NOW() AS now_test;

-- 验证LIMIT语法可用
SELECT 1 AS limit_test LIMIT 1;

-- 验证AUTO_INCREMENT支持
SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND AUTO_INCREMENT IS NOT NULL LIMIT 1;

-- 验证事务支持
SELECT @@autocommit AS autocommit_mode;

-- 验证字符集支持
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = DATABASE();

-- ==========================================================================
-- 检查4：常见Oracle→MySQL转换模板
-- ==========================================================================
-- Oracle: SELECT NVL(col, 0) FROM table
-- MySQL:  SELECT IFNULL(col, 0) FROM table

-- Oracle: SELECT TO_CHAR(date_col, 'YYYY-MM-DD') FROM table
-- MySQL:  SELECT DATE_FORMAT(date_col, '%Y-%m-%d') FROM table

-- Oracle: SELECT * FROM (SELECT ... WHERE ROWNUM <= 10)
-- MySQL:  SELECT ... LIMIT 10

-- Oracle: SELECT col1 || col2 FROM table
-- MySQL:  SELECT CONCAT(col1, col2) FROM table

-- Oracle: SELECT SYSDATE FROM DUAL
-- MySQL:  SELECT NOW()

-- Oracle: MERGE INTO target USING source ON (cond) WHEN MATCHED THEN UPDATE ... WHEN NOT MATCHED THEN INSERT ...
-- MySQL:  INSERT INTO target ... ON DUPLICATE KEY UPDATE ...

-- Oracle: DELETE FROM table WHERE cond; INSERT INTO table VALUES (...); COMMIT;
-- MySQL:  DELETE FROM table WHERE cond; INSERT INTO table VALUES (...);
--         （MySQL MCP默认自动提交，无需显式COMMIT）

-- ==========================================================================
-- 兼容性检查结果判定标准：
-- 检查1-2：无Oracle特有语法 → 兼容 / 有Oracle特有语法 → 需转换
-- 检查3：所有验证查询执行成功 → MySQL环境兼容
-- 检查4：参照转换模板逐条修改
-- ==========================================================================
