-- ==========================================================================
-- 数据库编码初始化脚本
-- 用途：在执行SQL前初始化会话编码，确保中文正确显示和存储
-- 使用方式：连接建立后、执行业务SQL前，先执行本脚本中的对应语句
-- ==========================================================================

-- ==========================================================================
-- MySQL 编码初始化
-- 通过 MySQL MCP 执行以下语句，确保当前会话使用utf8mb4编码
-- ==========================================================================

-- 设置客户端、连接、结果三层编码为utf8mb4
SET NAMES utf8mb4;

-- 显式设置各层编码（与SET NAMES等价，但更明确）
SET CHARACTER_SET_CLIENT = utf8mb4;
SET CHARACTER_SET_CONNECTION = utf8mb4;
SET CHARACTER_SET_RESULTS = utf8mb4;
SET COLLATION_CONNECTION = utf8mb4_general_ci;

-- 验证编码设置是否生效
SELECT
    @@character_set_client AS client_charset,
    @@character_set_connection AS connection_charset,
    @@character_set_results AS results_charset,
    @@character_set_database AS database_charset,
    @@character_set_server AS server_charset,
    @@collation_database AS database_collation;

-- 验证中文显示是否正常
SELECT '中文编码测试-如果显示正常则编码配置正确' AS encoding_test;

-- ==========================================================================
-- Oracle 编码初始化
-- 通过 Oracle MCP 执行以下语句，确保日期格式和语言设置正确
-- 注意：Oracle的字符集由NLS_LANG环境变量控制，无法通过SQL修改
--       需要在MCP服务端启动前设置NLS_LANG环境变量
-- ==========================================================================

-- 设置日期格式（避免中文日期格式导致的解析问题）
ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS';
ALTER SESSION SET NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF';
ALTER SESSION SET NLS_TIMESTAMP_TZ_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF TZR';

-- 设置语言为英文（避免中文月份/星期名称导致的兼容性问题）
ALTER SESSION SET NLS_DATE_LANGUAGE = 'AMERICAN';
ALTER SESSION SET NLS_LANGUAGE = 'AMERICAN';

-- 设置排序规则
ALTER SESSION SET NLS_SORT = 'BINARY';

-- 验证NLS参数设置
SELECT
    PARAMETER,
    VALUE
FROM NLS_SESSION_PARAMETERS
WHERE PARAMETER IN (
    'NLS_DATE_FORMAT',
    'NLS_TIMESTAMP_FORMAT',
    'NLS_DATE_LANGUAGE',
    'NLS_LANGUAGE',
    'NLS_CHARACTERSET',
    'NLS_NCHAR_CHARACTERSET'
)
ORDER BY PARAMETER;

-- 验证中文显示是否正常
SELECT '中文编码测试-如果显示正常则编码配置正确' AS encoding_test FROM DUAL;

-- ==========================================================================
-- Oracle NLS_LANG 环境变量配置说明
-- ==========================================================================
-- NLS_LANG 格式：LANGUAGE_TERRITORY.CHARACTERSET
-- 推荐配置：AMERICAN_AMERICA.AL32UTF8
--
-- Windows PowerShell 设置方式：
--   $env:NLS_LANG = "AMERICAN_AMERICA.AL32UTF8"
--
-- Windows CMD 设置方式：
--   set NLS_LANG=AMERICAN_AMERICA.AL32UTF8
--
-- Linux/Mac 设置方式：
--   export NLS_LANG="AMERICAN_AMERICA.AL32UTF8"
--
-- 设置时机：在启动Oracle MCP服务端之前设置
-- 验证方式：通过Oracle MCP执行 SELECT USERENV('LANGUAGE') FROM DUAL
-- ==========================================================================

-- ==========================================================================
-- 编码问题排查清单
-- ==========================================================================
-- 1. 终端编码：确保PowerShell使用UTF-8（chcp 65001）
-- 2. MySQL会话编码：执行SET NAMES utf8mb4
-- 3. Oracle NLS_LANG：确保MCP服务端启动前设置AMERICAN_AMERICA.AL32UTF8
-- 4. 数据库字符集：
--    MySQL: 检查character_set_server和character_set_database
--    Oracle: 检查NLS_CHARACTERSET（SELECT * FROM NLS_DATABASE_PARAMETERS）
-- 5. 表/列字符集：
--    MySQL: 检查TABLE_COLLATION和COLUMN_TYPE
--    Oracle: 检查CHAR_USED（C=CHAR, B=BYTE）
-- 6. 客户端工具编码：
--    SQL*Plus: 需设置NLS_LANG
--    mysql CLI: 需指定--default-character-set=utf8mb4
-- ==========================================================================
