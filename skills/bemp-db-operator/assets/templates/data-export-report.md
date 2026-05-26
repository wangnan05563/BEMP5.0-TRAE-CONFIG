# {SCHEMA}.{TABLE_NAME} 数据导出报告

## 文档信息

| 项目 | 内容 |
|------|------|
| 导出时间 | {EXPORT_DATE} |
| 数据库类型 | {DB_TYPE} |
| Schema | {SCHEMA} |
| 表名 | {TABLE_NAME} |
| 查询条件 | {QUERY_CONDITION} |
| 导出格式 | {EXPORT_FORMAT} |
| 查询结果 | {RESULT_SUMMARY} |

---

## 表结构说明

| 列名 | 数据类型 | 长度 | 可为空 | 说明 |
|------|----------|------|--------|------|
{TABLE_STRUCTURE}

---

## 查询结果

### 数据统计

| 统计项 | 结果 |
|--------|------|
| 查询时间范围 | {TIME_RANGE} |
| 匹配记录数 | {RECORD_COUNT} 条 |
| 导出记录数 | {EXPORT_COUNT} 条 |

---

### 数据内容

{DATA_CONTENT}

---

### 数据说明

{DATA_NOTES}

---

## 执行日志

```
{EXECUTION_LOG}
```

---

*报告生成时间: {EXPORT_DATE}*
*执行方式: {EXECUTION_METHOD}*
