# SQL解析模式参考

## 支持的SQL语法（Oracle）

### DDL语句

| 语句类型 | 语法模式 | 提取信息 | 操作类型 |
|---------|---------|---------|---------|
| ALTER TABLE ADD (多字段) | `ALTER TABLE tbl ADD (col1 type1, col2 type2)` | 表名+字段列表 | 新增 |
| ALTER TABLE ADD (单字段) | `ALTER TABLE tbl ADD col type` | 表名+字段+类型 | 新增 |
| ALTER TABLE MODIFY | `ALTER TABLE tbl MODIFY (col1 type1)` | 表名+字段+新类型 | 修改 |
| ALTER TABLE DROP COLUMN | `ALTER TABLE tbl DROP COLUMN col` | 表名+字段名 | 删除 |
| CREATE TABLE | `CREATE TABLE tbl (col1 type1, col2 type2, ...)` | 表名+全部字段 | 新增表 |
| CREATE INDEX | `CREATE INDEX idx ON tbl (col ASC)` | 索引名+表名+字段 | 新增索引 |
| CREATE UNIQUE INDEX | `CREATE UNIQUE INDEX idx ON tbl (col)` | 索引名+表名+字段 | 新增索引 |
| DROP TABLE | `DROP TABLE tbl` | 表名 | 删除表 |
| DROP INDEX | `DROP INDEX idx` | 索引名 | 删除索引 |
| COMMENT ON COLUMN | `COMMENT ON COLUMN tbl.col IS 'comment'` | 表名+字段名+注释 | (元数据) |
| COMMENT ON TABLE | `COMMENT ON TABLE tbl IS 'comment'` | 表名+注释 | (元数据) |

### DML语句

| 语句类型 | 语法模式 | 提取信息 | 操作类型 |
|---------|---------|---------|---------|
| INSERT INTO | `INSERT INTO tbl (cols) VALUES (vals)` | 表名+列列表 | INSERT |
| UPDATE | `UPDATE tbl SET col=val WHERE cond` | 表名+WHERE条件 | UPDATE |
| DELETE FROM | `DELETE FROM tbl WHERE cond` | 表名 | DELETE |
| DELETE+INSERT | 同表先DELETE再INSERT | 表名+关键ID | DELETE+INSERT |

## 文件命名规范

BEMP项目SQL增量脚本命名格式：
```
V{主版本}.{次版本}.{补丁}_{日期}_{任务号}_{需求描述}.{ddl|dml}.sql
```

示例：
- `V202101.03.103_202511110910_T202511113698_票据标注表结构调整(标准需求).ddl.sql`
- `V202101.03.103_202511110910_T202511113698_票据标识配置调整(标准需求).dml.sql`

文件名后缀区分：
- `.ddl.sql` → 表结构变更（DDL）
- `.dml.sql` → 数据变更（DML）

## 类型规范化规则

Oracle常见字段类型规范化：

| 原始类型 | 规范化格式 |
|---------|-----------|
| VARCHAR2(250) | varchar2(250) |
| NUMBER(11,6) | number(11,6) |
| NUMBER(16,0) | number(16,0) |
| CHAR(1) | char(1) |
| DATE | date |
| CLOB | clob |
| TIMESTAMP(6) | timestamp(6) |

## DELETE+INSERT合并规则

当同一文件中对同一表先执行DELETE再执行INSERT时，合并为"DELETE+INSERT"操作类型。
这表示是配置数据的更新（先删后插），而非纯粹的删除或新增。

合并条件：
1. 同一SQL文件内
2. 同一目标表
3. DELETE出现在INSERT之前
