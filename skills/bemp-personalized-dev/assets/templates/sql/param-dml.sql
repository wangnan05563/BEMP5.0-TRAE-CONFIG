-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：${TASK_NO}
-- 变更描述：${MODULE_NAME} - 业务参数
-- 影响范围：TM_BUSINESS_PARAMETER
-- 开发人员：${DEVELOPER}
-- 开发日期：${DATE}
-- ==========================================================================

-- 【先删除】删除本需求新增的业务参数
DELETE FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY IN (
    '${PARAM_KEY_1}',
    '${PARAM_KEY_2}'
);

-- 【后新增】插入业务参数
INSERT INTO TM_BUSINESS_PARAMETER (ID, LEGAL_NO, PARAM_TITLE, PARAM_KEY, PARAM_NAME, PARAM_VALUE, PARAM_TYPE, PARAM_REMARK, PARAM_GROUP_CODE, BUSI_TYPE, IS_ROW_SHOW)
VALUES (${ID}, '000000', '${PARAM_TITLE}', '${PARAM_KEY}', '${PARAM_NAME}', '${PARAM_VALUE}', '${PARAM_TYPE}', '${PARAM_REMARK}', '${PARAM_GROUP_CODE}', '${BUSI_TYPE}', '${IS_ROW_SHOW}');

COMMIT;
