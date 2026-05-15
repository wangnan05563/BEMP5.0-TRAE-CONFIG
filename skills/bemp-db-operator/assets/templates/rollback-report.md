# 数据库操作回退报告

## 基本信息

| 项目 | 内容 |
|------|------|
| 报告编号 | RB-RPT-${DATE}-${SEQ} |
| 原执行报告编号 | RPT-${ORIG_DATE}-${ORIG_SEQ} |
| 回退时间 | ${ROLLBACK_TIME} |
| 回退操作人员 | ${OPERATOR} |
| 回退原因 | ${ROLLBACK_REASON} |
| 数据库环境 | ${DB_ENV} |

---

## 回退原因

### 触发条件

- [ ] SQL执行失败
- [ ] 复核结果不通过
- [ ] 数据不一致
- [ ] 业务需求变更
- [ ] 其他：${OTHER_REASON}

### 详细说明

${ROLLBACK_DETAIL}

---

## 回退内容

### 回退脚本

| 序号 | 回退脚本文件 | 回退类型 | 目标表 |
|------|-------------|----------|--------|
| 1 | ${ROLLBACK_SCRIPT_1} | DDL/DML | ${TABLE_NAME_1} |
| 2 | ${ROLLBACK_SCRIPT_2} | DDL/DML | ${TABLE_NAME_2} |

### 回退级别

- 回退级别：statement / script / full
- 说明：${LEVEL_DESCRIPTION}

---

## 回退执行过程

### 执行日志

| 序号 | SQL语句 | 执行状态 | 影响行数 | 耗时(ms) | 错误信息 |
|------|---------|----------|----------|----------|----------|
| 1 | ${SQL_1} | 成功/失败 | ${ROWS} | ${TIME} | |
| 2 | ${SQL_2} | 成功/失败 | ${ROWS} | ${TIME} | |

### 执行汇总

| 指标 | 值 |
|------|-----|
| 总语句数 | ${TOTAL_STATEMENTS} |
| 成功语句数 | ${SUCCESS_COUNT} |
| 失败语句数 | ${FAIL_COUNT} |
| 总影响行数 | ${TOTAL_AFFECT_ROWS} |

---

## 回退验证

### 数据恢复验证

| 验证项 | 验证方法 | 执行前状态 | 回退后状态 | 是否恢复 |
|--------|----------|------------|------------|----------|
| ${VERIFY_ITEM_1} | ${VERIFY_METHOD_1} | ${BEFORE_1} | ${AFTER_1} | 是/否 |
| ${VERIFY_ITEM_2} | ${VERIFY_METHOD_2} | ${BEFORE_2} | ${AFTER_2} | 是/否 |

### 一致性验证

- 回退验证状态：通过/不通过
- 数据是否恢复到执行前状态：是/否
- 差异说明：${DIFF_DESCRIPTION}

---

## 影响评估

### 回退影响范围

${IMPACT_ASSESSMENT}

### 后续处理

${FOLLOW_UP_ACTIONS}

---

## 审批签字

| 角色 | 姓名 | 日期 | 签字 |
|------|------|------|------|
| 回退操作人员 | | | |
| 复核人员 | | | |
| DBA | | | |
