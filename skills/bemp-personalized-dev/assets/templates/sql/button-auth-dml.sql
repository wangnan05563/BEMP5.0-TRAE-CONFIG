-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：${TASK_NO}
-- 变更描述：${MODULE_NAME} - 按钮级显隐权限配置
-- 影响范围：TM_BUTTON_AUTH 新增 ${BUTTON_COUNT} 行，共 ${MENU_COUNT} 个菜单
-- 开发人员：${DEVELOPER}
-- 开发日期：${DATE}
-- 幂等策略：按 AUTH_ID + BTN_PATH（菜单+权限码键）先删后插，可重复执行
-- ID 规则  ：当前日期+序号（${ID_PREFIX}01 起），与生产/其他测试环境主键天然隔离
-- ==========================================================================

-- 一、${MENU_NAME_1}（AUTH_ID=${AUTH_ID_1}，${VUE_FILE_1}）
-- AUTH_ID 必须实库核对：SELECT ID FROM TM_AUTHORITY WHERE PATH = '${MENU_PATH_1}'
DELETE FROM TM_BUTTON_AUTH WHERE AUTH_ID = ${AUTH_ID_1} AND BTN_PATH IN (${BTN_PATH_LIST_1});
INSERT INTO TM_BUTTON_AUTH (ID, AUTH_ID, BTN_PATH, BTN_LEVEL, PARENT_AUTH_NO, BTN_SHOW_FLAG, CREATE_TIME, UPDATE_TIME, RESERVE1, RESERVE2, RESERVE3) VALUES (${ID_PREFIX}01, ${AUTH_ID_1}, '${BTN_PATH_1_1}', 1, null, '1', null, null, null, null, null);
INSERT INTO TM_BUTTON_AUTH (ID, AUTH_ID, BTN_PATH, BTN_LEVEL, PARENT_AUTH_NO, BTN_SHOW_FLAG, CREATE_TIME, UPDATE_TIME, RESERVE1, RESERVE2, RESERVE3) VALUES (${ID_PREFIX}02, ${AUTH_ID_1}, '${BTN_PATH_1_2}', 1, null, '1', null, null, null, null, null);

-- 二、${MENU_NAME_2}（AUTH_ID=${AUTH_ID_2}，${VUE_FILE_2}）
DELETE FROM TM_BUTTON_AUTH WHERE AUTH_ID = ${AUTH_ID_2} AND BTN_PATH IN (${BTN_PATH_LIST_2});
INSERT INTO TM_BUTTON_AUTH (ID, AUTH_ID, BTN_PATH, BTN_LEVEL, PARENT_AUTH_NO, BTN_SHOW_FLAG, CREATE_TIME, UPDATE_TIME, RESERVE1, RESERVE2, RESERVE3) VALUES (${ID_PREFIX}03, ${AUTH_ID_2}, '${BTN_PATH_2_1}', 1, null, '1', null, null, null, null, null);
INSERT INTO TM_BUTTON_AUTH (ID, AUTH_ID, BTN_PATH, BTN_LEVEL, PARENT_AUTH_NO, BTN_SHOW_FLAG, CREATE_TIME, UPDATE_TIME, RESERVE1, RESERVE2, RESERVE3) VALUES (${ID_PREFIX}04, ${AUTH_ID_2}, '${BTN_PATH_2_2}', 1, null, '1', null, null, null, null, null);

COMMIT;
