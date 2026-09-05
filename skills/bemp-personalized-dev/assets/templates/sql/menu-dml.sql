-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：${TASK_NO}
-- 变更描述：${MODULE_NAME} - 菜单定制
-- 影响范围：TM_AUTHORITY
-- 开发人员：${DEVELOPER}
-- 开发日期：${DATE}
-- ==========================================================================

-- 【先删除】删除本需求新增的菜单数据（按业务键 URL 定位，子级先删父级后删；禁止仅按主键 ID——跨环境同一菜单 ID 不一致会删错/删不到）
DELETE FROM TM_AUTHORITY WHERE URL IN (
    ${CHILD_MENU_URL_LIST}
);

DELETE FROM TM_AUTHORITY WHERE URL IN (
    ${PARENT_MENU_URL_LIST}
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
