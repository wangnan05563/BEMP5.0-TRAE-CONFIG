# 批量操作执行指南

## 适用场景

S9：需要批量执行多个SQL脚本（个性化开发中多脚本增量执行）。

## 配置

详见 `config/execution-policy.json` → `batchOperation`。

关键字段：maxBatchSize=20, stopOnFailure=true, executionOrder=["ddl","dml","config"], safeModeForBatch=true, batchRollbackStrategy="all_or_nothing"

## 执行流程

```
1. 读取批量脚本清单，按文件名或目录结构确定脚本类型（DDL/DML/CONFIG）
2. 按 executionOrder 排序脚本：DDL组 → DML组 → CONFIG组
3. 逐组执行：
   a. DDL组：逐脚本执行，每个脚本内逐语句执行
      - DDL语句隐式提交，无法回退
   b. DML组（safeModeForBatch=true）：
      - 开启事务：mcp_MySQL_execute_sql("START TRANSACTION")
      - 逐脚本执行DML
      - 全部成功 → 验证 → COMMIT
      - 任一失败 → 根据batchRollbackStrategy处理
   c. CONFIG组：逐脚本执行
4. 记录每个脚本的执行结果
5. 全部完成后生成批量执行报告
```

## 批量回退策略

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| `all_or_nothing` | 任一脚本失败则ROLLBACK所有DML | 关键数据变更，要求原子性 |
| `best_effort` | 仅回退失败脚本的DML，成功脚本保留 | 非关键变更，允许部分成功 |

## 结构化输出

批量执行结果使用 `assets/templates/execution-result-schema.json` 中的 `batch` 对象：

```json
{
    "batch": {
        "totalScripts": 5,
        "completedScripts": 4,
        "failedScripts": 1,
        "scripts": [
            {"name": "01_create_table.ddl.sql", "status": "success", "statements": 3, "duration": 500},
            {"name": "02_insert_menu.dml.sql", "status": "failed", "error": "ORA-00001: unique constraint violated"}
        ]
    }
}
```
