-- ============================================================
-- 插入/更新 branch_admin_init_pwd 系统参数
-- 用途：机构管理员批量导入功能的初始密码参数
-- 默认值：888888
-- 法人编号：100001（河南农信）
-- ============================================================

-- 1. 查询当前状态
SET SERVEROUTPUT ON
PROMPT '=== 查询当前 branch_admin_init_pwd 参数状态 ==='
SELECT ID, LEGAL_NO, PARAM_KEY, PARAM_NAME, PARAM_VALUE, PARAM_TYPE, OPERATOR, 
       TO_CHAR(TO_DATE(CREATE_TIME, 'YYYYMMDDHH24MISS'), 'YYYY-MM-DD HH24:MI:SS') AS CREATE_TIME,
       TO_CHAR(TO_DATE(UPDATE_TIME, 'YYYYMMDDHH24MISS'), 'YYYY-MM-DD HH24:MI:SS') AS UPDATE_TIME
FROM TM_BUSINESS_PARAMETER 
WHERE PARAM_KEY = 'branch_admin_init_pwd';

-- 2. 执行MERGE插入/更新
PROMPT '=== 执行MERGE插入/更新 branch_admin_init_pwd 参数 ==='
MERGE INTO TM_BUSINESS_PARAMETER t
USING (SELECT '100001' AS legal_no FROM DUAL) src
ON (t.LEGAL_NO = src.legal_no AND t.PARAM_KEY = 'branch_admin_init_pwd')
WHEN MATCHED THEN
  UPDATE SET
    PARAM_VALUE = '888888',
    PARAM_NAME  = '机构管理员初始密码',
    UPDATE_TIME = (SELECT TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS')) FROM DUAL),
    OPERATOR    = 'SYS'
WHEN NOT MATCHED THEN
  INSERT (ID, LEGAL_NO, PARAM_TITLE, PARAM_KEY, PARAM_NAME, PARAM_VALUE, PARAM_TYPE, PARAM_REMARK,
          PARAM_GROUP_CODE, OPERATOR, CREATE_TIME, UPDATE_TIME, IS_ROW_SHOW, BUSI_TYPE)
  VALUES ((SELECT NVL(MAX(ID), 0) + 1 FROM TM_BUSINESS_PARAMETER),
          '100001',
          '机构管理员',
          'branch_admin_init_pwd',
          '机构管理员初始密码',
          '888888',
          'text',
          '批量导入机构管理员时的初始登录密码，默认值888888',
          'BRANCH_ADMIN',
          'SYS',
          (SELECT TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS')) FROM DUAL),
          (SELECT TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS')) FROM DUAL),
          '0',
          'sm');
COMMIT;

-- 3. 验证结果
PROMPT '=== 验证 branch_admin_init_pwd 参数已成功插入/更新 ==='
SELECT ID, LEGAL_NO, PARAM_KEY, PARAM_NAME, PARAM_VALUE, PARAM_TYPE, PARAM_REMARK,
       PARAM_GROUP_CODE, OPERATOR, IS_ROW_SHOW, BUSI_TYPE,
       TO_CHAR(TO_DATE(CREATE_TIME, 'YYYYMMDDHH24MISS'), 'YYYY-MM-DD HH24:MI:SS') AS CREATE_TIME,
       TO_CHAR(TO_DATE(UPDATE_TIME, 'YYYYMMDDHH24MISS'), 'YYYY-MM-DD HH24:MI:SS') AS UPDATE_TIME
FROM TM_BUSINESS_PARAMETER 
WHERE PARAM_KEY = 'branch_admin_init_pwd';