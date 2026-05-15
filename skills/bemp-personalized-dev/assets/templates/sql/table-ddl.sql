-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：${TASK_NO}
-- 变更描述：${MODULE_NAME} - 新建表
-- 影响范围：${TABLE_NAME}
-- 开发人员：${DEVELOPER}
-- 开发日期：${DATE}
-- ==========================================================================

-- 【先删除】删除已存在的表（含存在性判断）
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM USER_TABLES WHERE TABLE_NAME = UPPER('${TABLE_NAME}');
    IF v_count > 0 THEN
        EXECUTE IMMEDIATE 'DROP TABLE ${TABLE_NAME} CASCADE CONSTRAINTS';
    END IF;
END;
/

-- 【后新增】创建表
CREATE TABLE ${TABLE_NAME} (
    ID              number(16,0) NOT NULL,
    LEGAL_NO        varchar2(6),
    ${BUSINESS_FIELDS}
    CREATE_TIME     number(17,0),
    UPDATE_TIME     number(17,0),
    RESERVE1        varchar2(255),
    RESERVE2        varchar2(255),
    RESERVE3        varchar2(255),
    CONSTRAINT pk_${TABLE_NAME} PRIMARY KEY (ID)
);

COMMENT ON TABLE ${TABLE_NAME} IS '${TABLE_COMMENT}';
COMMENT ON COLUMN ${TABLE_NAME}.ID IS '主键 ID';
COMMENT ON COLUMN ${TABLE_NAME}.LEGAL_NO IS '法人编号';
${BUSINESS_FIELD_COMMENTS}
COMMENT ON COLUMN ${TABLE_NAME}.CREATE_TIME IS '创建时间';
COMMENT ON COLUMN ${TABLE_NAME}.UPDATE_TIME IS '更新时间';
COMMENT ON COLUMN ${TABLE_NAME}.RESERVE1 IS '预留字段 1';
COMMENT ON COLUMN ${TABLE_NAME}.RESERVE2 IS '预留字段 2';
COMMENT ON COLUMN ${TABLE_NAME}.RESERVE3 IS '预留字段 3';

-- 【后新增】创建序列
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM USER_SEQUENCES WHERE SEQUENCE_NAME = UPPER('SEQ_${TABLE_NAME}');
    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE SEQUENCE SEQ_${TABLE_NAME} START WITH 1 INCREMENT BY 1 MINVALUE 1 NOMAXVALUE NOCACHE NOCYCLE';
    END IF;
END;
/

-- 【后新增】创建索引
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM USER_INDEXES WHERE INDEX_NAME = UPPER('IDX_${TABLE_NAME}_1');
    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE INDEX IDX_${TABLE_NAME}_1 ON ${TABLE_NAME} (LEGAL_NO)';
    END IF;
END;
/

COMMIT;
