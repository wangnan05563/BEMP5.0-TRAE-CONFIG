-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：${TASK_NO}
-- 变更描述：${MODULE_NAME} - 流程编排
-- 影响范围：TB_FLOW_ROUTE, TB_FLOW_STATUS
-- 开发人员：${DEVELOPER}
-- 开发日期：${DATE}
-- ==========================================================================

-- 【先删除】删除本需求新增的流程状态（子表先删）
DELETE FROM TB_FLOW_STATUS WHERE ROUTE_ID IN (
    SELECT ID FROM TB_FLOW_ROUTE WHERE FLOW_NO = '${FLOW_NO}'
);

-- 【先删除】删除本需求新增的流程路线（主表后删）
DELETE FROM TB_FLOW_ROUTE WHERE FLOW_NO = '${FLOW_NO}';

-- 【后新增】插入流程路线
INSERT INTO TB_FLOW_ROUTE (ID, FLOW_NO, FLOW_NAME, FLOW_DESC, LEGAL_NO, CREATE_TIME, UPDATE_TIME)
VALUES (${ROUTE_ID}, '${FLOW_NO}', '${FLOW_NAME}', '${FLOW_DESC}', '000000', ${TIMESTAMP}, ${TIMESTAMP});

-- 【后新增】插入流程状态
INSERT INTO TB_FLOW_STATUS (ID, ROUTE_ID, STATUS_NO, STATUS_NAME, NEXT_STATUS, OPER_TYPE, LEGAL_NO, CREATE_TIME, UPDATE_TIME)
VALUES (${STATUS_ID}, ${ROUTE_ID}, '${STATUS_NO}', '${STATUS_NAME}', '${NEXT_STATUS}', '${OPER_TYPE}', '000000', ${TIMESTAMP}, ${TIMESTAMP});

COMMIT;
