-- ==========================================================================
-- 【强制前置】查重（规则详见 database-guide.md 3.2.6，禁止跳过直接套用本模板）
-- 生成前先 Grep 本银行增量脚本目录及产品化基线脚本中同 PARAM_KEY 的既有配置：
--   1. 既有配置取值满足需求 → 不新增脚本，复用存量
--   2. 取值不一致 → 仅允许同 ID 的 UPDATE（或 DELETE by ID + INSERT 同 ID），禁止异 ID 重复插入
--   3. 确无既有配置 → 才按下述"先删除后新增"生成
-- ==========================================================================

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
