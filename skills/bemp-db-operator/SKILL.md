---
name: "bemp-db-operator"
description: "BEMP数据库标准化操作技能。通过Oracle MCP实现一次性连接数据库，提供SQL执行、结果复核、异常回退的完整机制。触发场景：需要连接数据库执行查询/变更操作、验证SQL脚本、数据复核或回退时调用。"
---

# BEMP 数据库标准化操作技能

## 文档信息

| 项目 | 内容 |
|------|------|
| 技能名称 | bemp-db-operator |
| 版本 | V1.0.0 |
| 更新日期 | 2026-05-13 |
| 维护团队 | BEMP 开发团队 |

---

## 1. 技能职责

### 1.1 核心功能

本技能负责 BEMP 系统数据库的标准化操作，提供从连接到执行到复核的完整闭环：

| 功能 | 说明 |
|------|------|
| 一次性数据库连接 | 通过 Oracle MCP 建立可靠连接，避免重复连接开销 |
| SQL 脚本执行 | 支持 DDL/DML/DQL 各类 SQL 的标准化执行 |
| 执行结果复核 | 自动验证执行结果，比对预期与实际差异 |
| 异常回退机制 | 执行失败时自动触发回退，保障数据安全 |
| 操作日志记录 | 全程记录操作轨迹，满足审计追溯要求 |

### 1.2 适用范围

- BEMP 系统所有数据库操作（Oracle 为主）
- 个性化开发中的增量SQL脚本执行
- 数据变更的复核与验证
- 异常场景的数据回退

### 1.3 预期解决的问题

- 数据库连接不稳定导致操作中断
- SQL执行无复核导致数据错误
- 异常操作无法回退造成数据损失
- 操作无日志导致无法追溯

---

## 2. 触发场景

| 场景编号 | 触发条件 | 典型用例 |
|----------|----------|----------|
| S1 | 需要连接数据库执行查询操作 | 查询表结构、验证数据、统计记录数 |
| S2 | 需要执行增量SQL脚本 | 个性化开发中的菜单/参数/表结构变更 |
| S3 | 需要对SQL执行结果进行复核 | 验证INSERT后数据是否正确写入 |
| S4 | 需要回退已执行的数据库变更 | SQL执行异常或结果不符合预期 |
| S5 | 需要验证SQL脚本语法和规范性 | 脚本执行前的预检查 |
| S6 | 需要对比执行前后的数据差异 | 变更影响评估 |

---

## 3. 文档结构

```
bemp-db-operator/
├── SKILL.md                          # 本文件 - Skill 定义
├── config/
│   ├── db-config.json                # 数据库连接配置
│   └── execution-policy.json         # 执行策略配置
├── scripts/
│   ├── db-connect-test.sql           # 数据库连接测试脚本
│   ├── pre-check.sql                 # SQL执行前预检查脚本
│   ├── post-verify.sql               # SQL执行后验证脚本
│   └── rollback-template.sql         # 回退脚本模板
├── assets/
│   └── templates/
│       ├── execution-report.md       # 执行报告模板
│       └── rollback-report.md        # 回退报告模板
└── references/
    ├── connection-guide.md           # 数据库连接规范
    ├── sql-standards.md              # SQL编写与执行标准
    └── safety-guide.md               # 安全操作规范
```

---

## 4. 执行步骤

### 第一阶段：环境准备与配置

#### 步骤1：读取数据库配置

从 `config/db-config.json` 读取连接参数：

```json
{
    "host": "10.20.18.177",
    "port": 1521,
    "serviceName": "orcl",
    "username": "bemp_hnnx",
    "password": "123456",
    "schema": "BEMP_HNNX",
    "bankName": "河南农信"
}
```

**配置说明**：
- `host`：数据库主机地址
- `port`：数据库端口
- `serviceName`：Oracle 服务名
- `username`：数据库用户名
- `password`：数据库密码
- `schema`：默认 Schema
- `bankName`：银行名称（对应SQL脚本目录名）

#### 步骤2：建立数据库连接

通过 Oracle MCP 工具建立连接，按以下顺序执行：

1. **连接测试**：调用 `mcp_oracle-mcp_list_schemas` 验证连接可用性
2. **Schema确认**：调用 `mcp_oracle-mcp_list_tables` 确认目标Schema可访问
3. **记录连接状态**：记录连接成功/失败信息

```
连接验证流程：
list_schemas → 成功 → list_tables(schema=BEMP_HNNX) → 成功 → 连接就绪
           → 失败 → 检查配置 → 重试(最多3次) → 仍失败 → 报错终止
```

**连接失败处理**：
- 检查 `config/db-config.json` 中的连接参数是否正确
- 确认 Oracle MCP 服务是否正常运行
- 确认网络连通性（主机地址、端口）

---

### 第二阶段：SQL执行前预检查

#### 步骤3：SQL脚本规范性检查

在执行任何SQL前，必须进行以下预检查：

| 检查项 | 检查方法 | 通过标准 |
|--------|----------|----------|
| 语法正确性 | 目视审查 + 试执行EXPLAIN | 无语法错误 |
| WHERE条件 | 检查DELETE/UPDATE语句 | 必须有WHERE条件 |
| 幂等性 | 检查是否包含"先删除后新增" | DELETE + INSERT 模式 |
| 事务完整性 | 检查是否有COMMIT | DML末尾有COMMIT |
| 表/字段存在性 | 调用 `describe_table` 确认 | 目标对象存在 |
| 数据影响范围 | 执行SELECT COUNT预估 | 影响行数在预期范围内 |

**预检查执行方式**：

```
1. 对DDL脚本：调用 describe_table 检查目标表是否存在
2. 对DML脚本：
   a. 提取DELETE/UPDATE的WHERE条件，转为SELECT COUNT(*)查询
   b. 调用 execute_query 执行预估查询
   c. 确认影响行数在合理范围内
3. 对INSERT脚本：检查目标表结构是否匹配
```

#### 步骤4：执行前数据快照

对变更涉及的数据进行执行前快照，用于复核和回退：

```
快照策略：
- DML变更：SELECT目标数据，记录变更前状态
- DDL变更：记录表结构信息（describe_table结果）
- 快照结果作为复核基准
```

---

### 第三阶段：SQL执行

#### 步骤5：执行SQL脚本

根据脚本类型选择执行策略：

| 脚本类型 | 执行方式 | 超时设置 | 自动提交 |
|----------|----------|----------|----------|
| DDL (.ddl.sql) | 逐语句执行 | 60秒/语句 | 否，手动COMMIT |
| DML (.dml.sql) | 逐语句执行 | 30秒/语句 | 否，手动COMMIT |
| 查询 (.sql) | 整体执行 | 120秒 | N/A |

**执行策略配置**（来自 `config/execution-policy.json`）：

```json
{
    "ddlTimeout": 60,
    "dmlTimeout": 30,
    "queryTimeout": 120,
    "maxRetries": 3,
    "retryInterval": 5,
    "autoCommit": false,
    "dryRun": false,
    "affectRowLimit": 10000
}
```

**执行流程**：

```
1. 读取SQL脚本文件内容
2. 按分号拆分为独立SQL语句
3. 逐语句执行：
   a. 执行当前语句
   b. 记录执行结果（成功/失败/影响行数）
   c. 如失败：
      - 记录失败语句和错误信息
      - 根据策略决定是否继续
      - 如需回退，进入第四阶段
4. 全部成功后执行COMMIT
5. 进入第三阶段复核
```

**注意事项**：
- Oracle MCP 的 `execute_query` 仅支持 SELECT 语句
- DDL/DML 操作需要通过 SQL*Plus 或其他工具执行
- 通过 Oracle MCP 的 `execute_query` 可验证 SELECT 结果

---

### 第四阶段：执行后复核

#### 步骤6：结果验证

执行后必须进行结果验证：

| 验证类型 | 验证方法 | 预期结果 |
|----------|----------|----------|
| DDL验证 | `describe_table` 检查表结构 | 表/字段/索引已创建 |
| INSERT验证 | `execute_query` 查询新增数据 | 数据已写入且内容正确 |
| UPDATE验证 | `execute_query` 查询更新后数据 | 数据已更新且值正确 |
| DELETE验证 | `execute_query` 查询确认数据已删除 | 数据已删除 |

**复核流程**：

```
1. 根据脚本类型选择验证方式
2. 执行验证查询
3. 比对执行前快照与执行后数据
4. 生成复核报告（使用 assets/templates/execution-report.md 模板）
5. 如复核不通过，进入回退流程
```

#### 步骤7：生成执行报告

使用执行报告模板记录完整操作过程：

```markdown
# 数据库操作执行报告

## 基本信息
- 操作时间：[时间]
- 操作人员：[人员]
- 需求编号：[编号]
- 数据库：[连接信息]

## 执行内容
- 脚本文件：[文件名]
- 脚本类型：[DDL/DML]
- 影响表：[表名列表]

## 执行结果
- 执行状态：[成功/失败/部分成功]
- 影响行数：[行数]
- 执行耗时：[耗时]

## 复核结果
- 复核状态：[通过/不通过]
- 数据一致性：[一致/不一致]
- 差异说明：[如有差异]

## 回退信息
- 是否需要回退：[是/否]
- 回退脚本：[如需要]
```

---

### 第五阶段：异常处理与回退

#### 步骤8：异常处理

| 异常类型 | 处理策略 | 后续操作 |
|----------|----------|----------|
| 连接失败 | 重试3次，间隔5秒 | 仍失败则终止并报告 |
| SQL语法错误 | 停止执行，记录错误 | 修正后重新执行 |
| 执行超时 | 终止当前语句 | 评估是否需要回退 |
| 约束冲突 | 停止执行，记录冲突 | 检查数据后决定回退或修正 |
| 影响行数超限 | 停止执行，发出警告 | 确认后继续或回退 |

#### 步骤9：回退操作

当执行失败或复核不通过时，执行回退：

**回退策略**（来自 `config/execution-policy.json`）：

```json
{
    "rollbackStrategy": "auto",
    "rollbackLevel": "statement",
    "backupBeforeExecute": true,
    "generateRollbackScript": true
}
```

| 回退级别 | 说明 | 适用场景 |
|----------|------|----------|
| statement | 单语句回退 | 单条SQL执行失败 |
| script | 整个脚本回退 | 脚本内多条SQL有关联 |
| full | 全量回退到执行前状态 | 重大变更失败 |

**回退流程**：

```
1. 确定回退级别
2. 生成回退SQL（基于执行前快照）
   - INSERT → DELETE
   - DELETE → INSERT（使用快照数据）
   - UPDATE → UPDATE（使用快照数据）
   - CREATE TABLE → DROP TABLE
   - ALTER TABLE ADD → ALTER TABLE DROP COLUMN
3. 执行回退SQL
4. 验证回退结果
5. 生成回退报告
```

---

## 5. 输出标准

### 5.1 执行成功标准

| 指标 | 标准 |
|------|------|
| 连接状态 | 一次性连接成功，无重试 |
| 执行状态 | 所有SQL语句执行成功 |
| 复核状态 | 数据一致性验证通过 |
| 日志完整性 | 操作全程有日志记录 |
| 报告生成 | 执行报告已生成 |

### 5.2 日志记录要求

每次操作必须记录以下日志：

```
[时间戳] [操作类型] [脚本文件] [执行状态] [影响行数] [耗时]
[时间戳] [复核] [验证SQL] [预期结果] [实际结果] [是否一致]
[时间戳] [回退] [回退SQL] [回退状态] [回退行数]
```

### 5.3 结果验证标准

| 验证维度 | 验证方法 | 通过标准 |
|----------|----------|----------|
| 结构验证 | describe_table | 表结构符合预期 |
| 数据验证 | execute_query | 数据内容与预期一致 |
| 行数验证 | SELECT COUNT(*) | 影响行数在预期范围内 |
| 关联验证 | 关联表查询 | 关联数据无异常 |

---

## 6. Oracle MCP 工具使用指南

### 6.1 可用工具

| 工具 | 用途 | 示例 |
|------|------|------|
| `mcp_oracle-mcp_list_schemas` | 列出所有Schema | 验证连接 |
| `mcp_oracle-mcp_list_tables` | 列出Schema下所有表 | 确认表存在 |
| `mcp_oracle-mcp_describe_table` | 查看表结构 | DDL验证 |
| `mcp_oracle-mcp_execute_query` | 执行只读SQL | 数据查询/验证 |

### 6.2 使用约束

- `execute_query` 仅支持 SELECT/DESCRIBE/EXPLAIN 语句
- DDL/DML 操作无法通过 MCP 直接执行
- 查询结果可能被截断，大数据量需分页

### 6.3 典型操作模式

```
# 连接验证
mcp_oracle-mcp_list_schemas()

# 确认表存在
mcp_oracle-mcp_list_tables(schema="BEMP_HNNX")

# 查看表结构
mcp_oracle-mcp_describe_table(table="TM_AUTHORITY", schema="BEMP_HNNX")

# 查询数据
mcp_oracle-mcp_execute_query(query="SELECT COUNT(*) FROM TM_AUTHORITY WHERE ID > 1000", schema="BEMP_HNNX")

# 预估影响行数
mcp_oracle-mcp_execute_query(query="SELECT COUNT(*) FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY LIKE 'pc.credit%'", schema="BEMP_HNNX")
```

---

## 7. 快速操作参考

### 7.1 标准操作流程（速查）

```
1. 读取 config/db-config.json → 获取连接参数
2. mcp_oracle-mcp_list_schemas → 验证连接
3. mcp_oracle-mcp_describe_table → 预检查目标表
4. mcp_oracle-mcp_execute_query → 执行前快照
5. [执行SQL脚本] → 通过SQL*Plus或其他工具
6. mcp_oracle-mcp_execute_query → 执行后验证
7. 生成执行报告 → 使用模板
8. 如异常 → 执行回退 → 生成回退报告
```

### 7.2 常用查询模板

```sql
-- 查询表记录数
SELECT COUNT(*) FROM {TABLE_NAME};

-- 查询表结构
DESCRIBE {TABLE_NAME};

-- 查询菜单树
SELECT ID, AUTH_NAME, AUTH_TYPE, PARENT_ID, URL FROM TM_AUTHORITY WHERE ID IN ({ID_LIST}) ORDER BY ID;

-- 查询业务参数
SELECT PARAM_KEY, PARAM_NAME, PARAM_VALUE FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY LIKE '{PREFIX}%';

-- 预估DELETE影响行数
SELECT COUNT(*) FROM {TABLE_NAME} WHERE {CONDITION};

-- 查询表字段信息
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = UPPER('{TABLE_NAME}') ORDER BY COLUMN_ID;
```
