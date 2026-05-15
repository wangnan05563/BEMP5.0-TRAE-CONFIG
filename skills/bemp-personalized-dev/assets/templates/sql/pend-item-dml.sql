-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：${TASK_NO}
-- 变更描述：${MODULE_NAME} - 待办任务
-- 影响范围：TM_PEND_ITEM
-- 开发人员：${DEVELOPER}
-- 开发日期：${DATE}
-- ==========================================================================

-- 【先删除】删除本需求新增的待办配置
DELETE FROM TM_PEND_ITEM WHERE ID IN (
    ${PEND_ID_LIST}
);

-- 【后新增】插入待办配置
INSERT INTO TM_PEND_ITEM (ID, PEND_NAME, PEND_URL, PEND_TYPE, AUTH_ID, STATUS, LEGAL_NO, CREATE_TIME, UPDATE_TIME)
VALUES (${PEND_ID}, '${PEND_NAME}', '${PEND_URL}', ${PEND_TYPE}, ${AUTH_ID}, '1', '000000', ${TIMESTAMP}, ${TIMESTAMP});

COMMIT;
