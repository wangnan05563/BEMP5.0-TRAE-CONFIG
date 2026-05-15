# BEMP 测试数据管理指南

## 概述

本文档定义 BEMP 自动化测试中测试数据的分类、创建、使用和清理策略，确保测试数据可追溯、可隔离、可清理。

## 1. 测试数据分类

### 1.1 基础数据

环境预置数据，测试过程中不创建也不清理。

| 数据类型 | 示例 | 说明 |
|---------|------|------|
| 机构数据 | 总行、分行、支行 | 系统初始化时预置 |
| 柜员数据 | wangnan01 等 | 系统初始化时预置 |
| 权限数据 | 角色、菜单权限 | 系统初始化时预置 |
| 参数配置 | 业务参数、系统参数 | 系统初始化时预置 |

### 1.2 业务数据

测试过程中创建的数据，测试完成后需要清理。

| 数据类型 | 示例 | 创建方式 |
|---------|------|----------|
| 额度批次 | 承兑行额度批次 | API 或 UI 创建 |
| 额度明细 | 承兑行额度明细 | API 或 UI 创建 |
| 企业信息报备 | 客户签约信息 | API 或 UI 创建 |

### 1.3 状态数据

用于状态流转测试的不同状态记录，测试完成后需要清理。

| 数据类型 | 状态枚举 | 说明 |
|---------|---------|------|
| 额度批次 | 草稿(0)、待复核(1)、已复核(5) | 不同状态用于流转验证 |
| 额度明细 | 草稿(0)、待复核(1)、已复核(5) | 不同状态用于流转验证 |

## 2. 数据库操作指南

### 2.1 数据库连接

通过 Oracle MCP 工具连接数据库，连接信息由环境配置决定。

### 2.2 关键表结构

#### HNNX_ACCBANK_CREDIT_BATCH（额度批次表）

| 字段 | 类型 | 说明 |
|------|------|------|
| BATCH_ID | VARCHAR2 | 批次主键 |
| BATCH_NO | VARCHAR2 | 批次编号 |
| BRCH_NO | VARCHAR2 | 机构号 |
| BRCH_NAME | VARCHAR2 | 机构名称 |
| CREDIT_TYPE | VARCHAR2 | 额度类型 |
| STATUS | VARCHAR2 | 状态（0-草稿/1-待复核/5-已复核） |
| CREATE_USER | VARCHAR2 | 创建人 |
| CREATE_TIME | DATE | 创建时间 |
| UPDATE_TIME | DATE | 更新时间 |

#### HNNX_ACCBANK_CREDIT_INFO（额度明细表）

| 字段 | 类型 | 说明 |
|------|------|------|
| INFO_ID | VARCHAR2 | 明细主键 |
| BATCH_ID | VARCHAR2 | 关联批次ID |
| ACCBANK_NO | VARCHAR2 | 承兑行号 |
| ACCBANK_NAME | VARCHAR2 | 承兑行名称 |
| CREDIT_AMT | NUMBER | 额度金额 |
| STATUS | VARCHAR2 | 状态（0-草稿/1-待复核/5-已复核） |
| CREATE_USER | VARCHAR2 | 创建人 |
| CREATE_TIME | DATE | 创建时间 |
| UPDATE_TIME | DATE | 更新时间 |

### 2.3 常用查询 SQL

查询批次列表：

```sql
SELECT BATCH_ID, BATCH_NO, BRCH_NO, BRCH_NAME, STATUS, CREATE_USER, CREATE_TIME
FROM BBEP.HNNX_ACCBANK_CREDIT_BATCH
ORDER BY CREATE_TIME DESC
```

查询明细列表：

```sql
SELECT INFO_ID, BATCH_ID, ACCBANK_NO, ACCBANK_NAME, CREDIT_AMT, STATUS, CREATE_USER, CREATE_TIME
FROM BBEP.HNNX_ACCBANK_CREDIT_INFO
ORDER BY CREATE_TIME DESC
```

按状态筛选批次：

```sql
SELECT BATCH_ID, BATCH_NO, STATUS
FROM BBEP.HNNX_ACCBANK_CREDIT_BATCH
WHERE STATUS = '0'
```

统计各状态数量：

```sql
SELECT STATUS, COUNT(*) AS CNT
FROM BBEP.HNNX_ACCBANK_CREDIT_BATCH
GROUP BY STATUS
ORDER BY STATUS
```

### 2.4 数据清理 SQL

删除测试创建的批次：

```sql
DELETE FROM BBEP.HNNX_ACCBANK_CREDIT_BATCH
WHERE CREATE_USER = 'wangnan01'
AND CREATE_TIME > TO_DATE('2025-05-15', 'YYYY-MM-DD')
```

删除测试创建的明细：

```sql
DELETE FROM BBEP.HNNX_ACCBANK_CREDIT_INFO
WHERE CREATE_USER = 'wangnan01'
AND CREATE_TIME > TO_DATE('2025-05-15', 'YYYY-MM-DD')
```

重置状态（将已复核回退为草稿）：

```sql
UPDATE BBEP.HNNX_ACCBANK_CREDIT_BATCH
SET STATUS = '0'
WHERE BATCH_ID = :batch_id
```

> 清理明细时需先删除明细再删除批次，因为明细表通过 BATCH_ID 关联批次表。

## 3. 测试数据生命周期

### 3.1 创建阶段

测试开始前确保必要数据存在：

- 检查基础数据是否完整（机构、柜员、权限）
- 创建测试所需的业务数据（通过 API 或 UI）
- 记录创建的数据标识（主键ID、编号），用于后续引用和清理

### 3.2 使用阶段

测试过程中引用数据：

- 通过数据标识定位特定记录
- 验证数据状态变更
- 验证数据查询结果

### 3.3 清理阶段

测试完成后删除创建的数据：

- 通过 API 删除业务数据
- 或通过数据库 SQL 直接清理
- 清理顺序：先明细后批次（外键依赖）
- 验证清理结果（查询确认数据已删除）

### 3.4 隔离原则

不同测试用例的数据互不干扰：

- 每个测试用例创建独立的数据记录
- 不依赖其他测试用例创建的数据
- 测试完成后立即清理本用例创建的数据
- 使用唯一标识（如时间戳）区分不同用例的数据

## 4. 测试数据管理最佳实践

### 4.1 数据命名规范

测试创建的数据使用统一前缀，便于识别和清理：

- 批次编号：`TEST_YYYYMMDD_NNN`
- 明细标识：包含创建时间和用例编号

### 4.2 数据快照

关键测试步骤前后截图记录数据状态，便于问题定位：

```
1. 操作前截图 → 记录初始数据状态
2. 执行操作 → 修改数据
3. 操作后截图 → 记录变更后数据状态
4. 对比前后截图 → 验证数据变更符合预期
```

### 4.3 数据恢复

测试异常中断时的数据恢复策略：

- 记录所有创建操作，异常时按记录反向清理
- 数据库操作使用事务，异常时回滚
- 定期备份关键测试数据表
