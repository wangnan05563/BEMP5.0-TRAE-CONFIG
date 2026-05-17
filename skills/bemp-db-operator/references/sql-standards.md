# SQL编写与执行标准

## 1. SQL编写规范

### 1.1 通用规范

| 规则 | 说明 | Oracle 示例 | MySQL 示例 |
|------|------|------------|-----------|
| 关键字大写 | SELECT, INSERT, UPDATE, DELETE | `SELECT * FROM` | `SELECT * FROM` |
| 表名字大写 | 表名使用大写 | `TM_AUTHORITY` | `TM_AUTHORITY` |
| 字段名大写 | 字段名使用大写 | `LEGAL_NO` | `LEGAL_NO` |
| 缩进2空格 | 代码块缩进 | | |
| 语句末分号 | 每条语句以分号结束 | `;` | `;` |

### 1.2 增量SQL规范

所有增量SQL必须遵循**"先删除后新增"**策略：

**Oracle**：

```sql
DELETE FROM TM_AUTHORITY WHERE ID IN (${ID_LIST});
INSERT INTO TM_AUTHORITY (...) VALUES (...);
COMMIT;
```

**MySQL**：

```sql
DELETE FROM TM_AUTHORITY WHERE ID IN (${ID_LIST});
INSERT INTO TM_AUTHORITY (...) VALUES (...);
```

> MySQL MCP 默认自动提交，无需显式 COMMIT。如需事务控制，使用 `START TRANSACTION` / `COMMIT` / `ROLLBACK`。

### 1.3 DDL规范

**通用规则**：
- 建表前必须判断表是否存在
- 新增字段前必须判断字段是否存在
- 创建索引前必须判断索引是否存在
- 创建序列前必须判断序列是否存在

**Oracle DDL 判断模板**：

```sql
-- 判断表是否存在
SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = UPPER('{TABLE_NAME}');

-- 判断字段是否存在
SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME = UPPER('{TABLE_NAME}') AND COLUMN_NAME = UPPER('{COLUMN_NAME}');
```

**MySQL DDL 判断模板**：

```sql
-- 判断表是否存在
SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '{DATABASE}' AND TABLE_NAME = '{TABLE_NAME}';

-- 判断字段是否存在
SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '{DATABASE}' AND TABLE_NAME = '{TABLE_NAME}' AND COLUMN_NAME = '{COLUMN_NAME}';

-- 建表时直接判断（推荐）
CREATE TABLE IF NOT EXISTS {TABLE_NAME} (...);

-- 新增字段时直接判断（推荐）
ALTER TABLE {TABLE_NAME} ADD COLUMN IF NOT EXISTS {COLUMN_NAME} {DATA_TYPE};
```

### 1.4 DML规范

- DELETE/UPDATE 必须有 WHERE 条件
- INSERT 必须明确列出字段名
- Oracle 脚本末尾必须有 COMMIT
- MySQL 脚本无需显式 COMMIT（自动提交）
- 批量操作需预估影响行数

---

## 2. Oracle/MySQL SQL 差异对照

### 2.1 数据类型差异

| 用途 | Oracle | MySQL |
|------|--------|-------|
| 字符串 | VARCHAR2(n) | VARCHAR(n) |
| 大文本 | CLOB | TEXT / LONGTEXT |
| 整数 | NUMBER(n) | INT / BIGINT |
| 浮点数 | NUMBER(p,s) | DECIMAL(p,s) / DOUBLE |
| 日期时间 | DATE | DATETIME |
| 时间戳 | TIMESTAMP | TIMESTAMP |
| 二进制 | BLOB | BLOB / LONGBLOB |
| 布尔值 | NUMBER(1) | TINYINT(1) |

### 2.2 函数差异

| 功能 | Oracle | MySQL |
|------|--------|-------|
| 获取当前时间 | `SYSDATE` | `NOW()` |
| 获取当前日期 | `TRUNC(SYSDATE)` | `CURDATE()` |
| 字符串拼接 | `'a' \|\| 'b'` 或 `CONCAT('a','b')` | `CONCAT('a','b')` |
| 空值处理 | `NVL(expr, default)` | `IFNULL(expr, default)` 或 `COALESCE()` |
| 条件表达式 | `DECODE(col, val1, res1, default)` | `CASE WHEN col=val1 THEN res1 ELSE default END` 或 `IF()` |
| 日期格式化 | `TO_CHAR(date, 'YYYY-MM-DD')` | `DATE_FORMAT(date, '%Y-%m-%d')` |
| 字符串转日期 | `TO_DATE(str, 'YYYY-MM-DD')` | `STR_TO_DATE(str, '%Y-%m-%d')` |
| 类型转换 | `TO_CHAR()` / `TO_NUMBER()` | `CAST()` / `CONVERT()` |
| 截取字符串 | `SUBSTR(str, start, len)` | `SUBSTRING(str, start, len)` |
| 字符串长度 | `LENGTH(str)` | `LENGTH(str)` 或 `CHAR_LENGTH(str)` |
| 查找字符串 | `INSTR(str, substr)` | `LOCATE(substr, str)` 或 `INSTR(str, substr)` |
| 替换字符串 | `REPLACE(str, old, new)` | `REPLACE(str, old, new)` |

### 2.3 语法差异

| 功能 | Oracle | MySQL |
|------|--------|-------|
| 分页 | `WHERE ROWNUM <= n` | `LIMIT n` 或 `LIMIT offset, n` |
| 序列 | `SEQUENCE_NAME.NEXTVAL` | `AUTO_INCREMENT` 或 `LAST_INSERT_ID()` |
| DUAL表 | `SELECT ... FROM DUAL` | `SELECT ...`（无需DUAL） |
| 字符串引号 | 仅单引号 | 单引号或双引号 |
| 标识符引用 | `"IDENTIFIER"` | `` `IDENTIFIER` `` |
| 外连接 | `(+)` 语法或 `LEFT JOIN` | `LEFT JOIN` |
| 合并操作 | `MERGE INTO` | `INSERT ... ON DUPLICATE KEY UPDATE` 或 `REPLACE INTO` |
| 递归查询 | `CONNECT BY` | `WITH RECURSIVE` (CTE) |
| 事务开始 | 隐式开始 | `START TRANSACTION` 或 `BEGIN` |
| 提交 | `COMMIT` | `COMMIT`（自动提交模式下可省略） |

### 2.4 系统视图差异

| 功能 | Oracle | MySQL |
|------|--------|-------|
| 查看表列表 | `USER_TABLES` | `SHOW TABLES` 或 `INFORMATION_SCHEMA.TABLES` |
| 查看表结构 | `USER_TAB_COLUMNS` | `DESCRIBE {table}` 或 `INFORMATION_SCHEMA.COLUMNS` |
| 查看索引 | `USER_IND_COLUMNS` | `SHOW INDEX FROM {table}` 或 `INFORMATION_SCHEMA.STATISTICS` |
| 查看序列 | `USER_SEQUENCES` | 无（MySQL无序列概念） |
| 查看视图 | `USER_VIEWS` | `SHOW FULL TABLES WHERE Table_type='VIEW'` |
| 查看约束 | `USER_CONSTRAINTS` | `INFORMATION_SCHEMA.TABLE_CONSTRAINTS` |
| 查看当前用户 | `USER_USERS` | `SELECT USER()` 或 `SELECT CURRENT_USER()` |

---

## 3. SQL执行标准

### 3.1 执行前检查清单

| 序号 | 检查项 | 要求 |
|------|--------|------|
| 1 | 语法正确 | 无语法错误 |
| 2 | WHERE条件 | DELETE/UPDATE必须有 |
| 3 | 幂等性 | 可重复执行不报错 |
| 4 | 事务完整性 | Oracle末尾有COMMIT，MySQL自动提交 |
| 5 | 表/字段存在 | 目标对象存在 |
| 6 | 影响范围 | 行数在预期内 |
| 7 | ID/KEY冲突 | 无冲突 |
| 8 | 数据库兼容性 | SQL语法符合当前数据库类型 |

### 3.2 执行顺序

```
1. DDL脚本（表结构）
2. DDL脚本（索引）
3. DML脚本（菜单）
4. DML脚本（业务参数）
5. DML脚本（字典）
6. DML脚本（流程编排）
7. DML脚本（待办任务）
```

### 3.3 执行超时设置

| 操作类型 | Oracle 超时 | MySQL 超时 | 说明 |
|----------|------------|------------|------|
| DDL | 60秒/语句 | 60秒/语句 | 建表、加字段等 |
| DML | 30秒/语句 | 30秒/语句 | 增删改数据 |
| 查询 | 120秒 | 120秒 | SELECT查询 |
| 连接 | 30秒 | 30秒 | 建立连接 |

### 3.4 MySQL 大数据量操作规范

```sql
-- 分批DELETE，避免长时间锁表
DELETE FROM {TABLE_NAME} WHERE {CONDITION} LIMIT 1000;
-- 重复执行直到影响行数为0

-- 分批UPDATE
UPDATE {TABLE_NAME} SET {FIELD}={VALUE} WHERE {CONDITION} LIMIT 1000;

-- 大数据量查询使用LIMIT分页
SELECT * FROM {TABLE_NAME} WHERE {CONDITION} LIMIT 0, 1000;
SELECT * FROM {TABLE_NAME} WHERE {CONDITION} LIMIT 1000, 1000;
```

---

## 4. SQL复核标准

### 4.1 自动复核项

| 复核项 | Oracle 复核方法 | MySQL 复核方法 | 通过标准 |
|--------|----------------|---------------|----------|
| 表结构验证 | `describe_table` | `DESCRIBE {table}` | 结构符合预期 |
| 数据验证 | `execute_query` | `execute_sql` | 数据内容正确 |
| 行数验证 | `SELECT COUNT(*)` | `SELECT COUNT(*)` | 行数变化符合预期 |
| 关联验证 | 关联表查询 | 关联表查询 | 关联数据无异常 |

### 4.2 人工复核项

| 复核项 | 复核方法 | 责任人 |
|--------|----------|--------|
| SQL逻辑正确性 | 代码审查 | 开发人员 |
| 业务数据合理性 | 业务验证 | 业务人员 |
| 影响范围评估 | 影响分析 | DBA |
| 数据库兼容性 | 语法审查 | 开发人员 |

---

## 5. 回退标准

### 5.1 回退触发条件

| 条件 | 回退级别 | Oracle 适用 | MySQL 适用 |
|------|----------|------------|------------|
| 单条SQL执行失败 | statement | ✓ | ✓ |
| 脚本内多条SQL关联失败 | script | ✓ | ✓ |
| 复核结果不通过 | script/full | ✓ | ✓ |
| 业务需求变更 | full | ✓ | ✓ |

### 5.2 回退SQL生成规则

| 原操作 | Oracle 回退操作 | MySQL 回退操作 | 数据来源 |
|--------|----------------|---------------|----------|
| INSERT | DELETE | DELETE | 使用INSERT的ID列表 |
| DELETE | INSERT（快照数据） | INSERT（快照数据） | 使用执行前快照 |
| UPDATE | UPDATE（快照数据） | UPDATE（快照数据） | 使用执行前快照 |
| CREATE TABLE | DROP TABLE CASCADE CONSTRAINTS | DROP TABLE IF EXISTS | 无需额外数据 |
| ALTER TABLE ADD | ALTER TABLE DROP COLUMN | ALTER TABLE DROP COLUMN | 无需额外数据 |
| CREATE INDEX | DROP INDEX | DROP INDEX IF EXISTS ON {table} | 无需额外数据 |
| CREATE SEQUENCE | DROP SEQUENCE | 无（MySQL无序列） | 无需额外数据 |

### 5.3 回退验证

回退后必须验证：
1. 数据已恢复到执行前状态
2. 表结构与执行前一致
3. 关联数据无异常

### 5.4 MySQL 事务回退

MySQL MCP 支持事务控制，可在执行前开启事务，失败时整体回滚：

```sql
START TRANSACTION;
-- 执行DML操作
INSERT INTO TM_AUTHORITY (...) VALUES (...);
UPDATE TM_BUSINESS_PARAMETER SET ...;
-- 如全部成功
COMMIT;
-- 如任一失败
ROLLBACK;
```

> 注意：MySQL MCP 默认自动提交模式。使用事务时需在脚本开头添加 `START TRANSACTION`。
