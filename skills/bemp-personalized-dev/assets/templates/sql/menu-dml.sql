-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：${TASK_NO}
-- 变更描述：${MODULE_NAME} - 菜单定制
-- 影响范围：TM_AUTHORITY
-- 开发人员：${DEVELOPER}
-- 开发日期：${DATE}
-- ==========================================================================

-- 【先删除】删除本需求新增的菜单数据
DELETE FROM TM_AUTHORITY WHERE ID IN (
    ${MENU_ID_LIST}
);

-- 【后新增】插入菜单数据
-- 一级菜单
INSERT INTO TM_AUTHORITY (ID, AUTH_NAME, AUTH_TYPE, PARENT_ID, URL, SORT_NO, ICON, IS_LEAF, STATUS, LEGAL_NO, CREATE_TIME, UPDATE_TIME)
VALUES (${MENU_ID}, '${MENU_NAME}', ${AUTH_TYPE}, ${PARENT_ID}, '${URL}', ${SORT_NO}, '${ICON}', ${IS_LEAF}, '1', '000000', ${TIMESTAMP}, ${TIMESTAMP});

-- 二级菜单
INSERT INTO TM_AUTHORITY (ID, AUTH_NAME, AUTH_TYPE, PARENT_ID, URL, SORT_NO, ICON, IS_LEAF, STATUS, LEGAL_NO, CREATE_TIME, UPDATE_TIME)
VALUES (${MENU_ID}, '${MENU_NAME}', ${AUTH_TYPE}, ${PARENT_ID}, '${URL}', ${SORT_NO}, '${ICON}', ${IS_LEAF}, '1', '000000', ${TIMESTAMP}, ${TIMESTAMP});

-- 三级菜单（叶子节点）
INSERT INTO TM_AUTHORITY (ID, AUTH_NAME, AUTH_TYPE, PARENT_ID, URL, SORT_NO, ICON, IS_LEAF, STATUS, LEGAL_NO, CREATE_TIME, UPDATE_TIME)
VALUES (${MENU_ID}, '${MENU_NAME}', ${AUTH_TYPE}, ${PARENT_ID}, '${URL}', ${SORT_NO}, '${ICON}', ${IS_LEAF}, '1', '000000', ${TIMESTAMP}, ${TIMESTAMP});

COMMIT;
