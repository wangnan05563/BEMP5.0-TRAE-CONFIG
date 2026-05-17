# BEMP 测试数据管理指南

## 概述

本文档定义 BEMP 自动化测试中测试数据的分类、查询、准备、使用和清理策略。核心方法是通过 **Oracle MCP 工具** 直接查询和操作数据库，快速定位数据缺口并准备测试数据，确保测试数据可追溯、可隔离、可清理。

---

## 1. 测试数据准备流程

### 1.1 总体流程

```
测试用例分析 → 数据需求梳理 → Oracle MCP查询现有数据 → 识别数据缺口 → 补充测试数据 → 验证数据就绪 → 执行测试
```

### 1.2 各阶段说明

| 阶段 | 工具 | 产出 |
|------|------|------|
| 测试用例分析 | 读取 test-cases/ 目录下用例文件 | 每个用例所需的数据清单 |
| 数据需求梳理 | 人工分析 | 按模块分类的数据需求表 |
| Oracle MCP查询 | `mcp_oracle-mcp_execute_query` | 现有数据快照 |
| 识别数据缺口 | 对比需求与现有数据 | 缺口清单 + 补充SQL |
| 补充测试数据 | `mcp_oracle-mcp_execute_query` (INSERT/UPDATE) | 数据就绪确认 |
| 验证数据就绪 | SELECT 查询验证 | 数据就绪报告 |

---

## 2. 数据库操作指南（Oracle MCP）

### 2.1 Oracle MCP 工具说明

通过 `bemp-implementation-engineer` 智能体调用 Oracle MCP 工具操作数据库：

| 工具 | 用途 |
|------|------|
| `mcp_oracle-mcp_list_schemas` | 列出数据库Schema |
| `mcp_oracle-mcp_list_tables` | 列出指定Schema下的表 |
| `mcp_oracle-mcp_describe_table` | 查看表结构定义 |
| `mcp_oracle-mcp_execute_query` | 执行SQL查询/变更 |

### 2.2 标准查询流程

**第1步：探索表结构**

```sql
-- 按关键字搜索表名
SELECT table_name FROM user_tables WHERE table_name LIKE '%{关键字}%' ORDER BY table_name;

-- 查看表结构
-- 使用 mcp_oracle-mcp_describe_table 工具，传入 schema 和 table_name
```

**第2步：查询现有数据**

```sql
-- 查询全量数据（小表）
SELECT * FROM {表名} WHERE LEGAL_NO = '000010';

-- 按条件查询
SELECT * FROM {表名} WHERE {条件} ORDER BY CREATE_TIME DESC;
```

**第3步：识别缺口**

对比测试用例所需数据与查询结果，识别缺失的数据类型和记录。

**第4步：补充数据**

```sql
-- INSERT 新增数据
INSERT INTO {表名} ({字段列表}) VALUES ({值列表});
COMMIT;

-- UPDATE 修改数据
UPDATE {表名} SET {字段} = {值} WHERE {条件};
COMMIT;
```

**第5步：验证**

```sql
SELECT * FROM {表名} WHERE {新增数据的标识条件};
```

---

## 3. 核心表结构与查询模板

### 3.1 机构数据（TM_BRANCH）

#### 表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| BRCH_NO | VARCHAR2(30) | 机构号（主键之一） |
| BRCH_NAME | VARCHAR2(255) | 机构名称 |
| PARENT_BRCH_NO | VARCHAR2(30) | 上级机构号 |
| MASTER_BRCH_NO | VARCHAR2(30) | 主机构号 |
| BRCH_LEVEL | VARCHAR2(1) | 机构层级（9=虚拟根, 2=总行, 3=分行, 4=支行） |
| LEGAL_NO | VARCHAR2(6) | 法人号 |
| BANK_NO | VARCHAR2(12) | 银行号 |
| CPES_BRCH_CODE | VARCHAR2(9) | 票交所机构代码 |
| ORG_CODE | VARCHAR2(10) | 组织机构代码 |
| IS_VIRTUAL_BRCH | CHAR(1) | 是否虚拟机构 |
| RESERVE1 | VARCHAR2(250) | 预留1（当前存机构类型编码JG01/JG02） |
| RESERVE2~5 | VARCHAR2(250) | 预留2~5（当前为空） |

#### 查询模板

```sql
-- 查询机构树形结构
SELECT BRCH_NO, BRCH_NAME, PARENT_BRCH_NO, BRCH_LEVEL, LEGAL_NO, BANK_NO, CPES_BRCH_CODE, ORG_CODE, RESERVE1, RESERVE2
FROM TM_BRANCH
WHERE LEGAL_NO = '000010'
ORDER BY BRCH_LEVEL, BRCH_NO;

-- 查询指定机构的所有下级机构
SELECT BRCH_NO, BRCH_NAME, BRCH_LEVEL
FROM TM_BRANCH
WHERE LEGAL_NO = '000010'
START WITH BRCH_NO = '{机构号}'
CONNECT BY PRIOR BRCH_NO = PARENT_BRCH_NO;

-- 查询机构层级深度
SELECT BRCH_NO, BRCH_NAME, LEVEL AS TREE_DEPTH
FROM TM_BRANCH
WHERE LEGAL_NO = '000010'
START WITH BRCH_NO = '233'
CONNECT BY PRIOR BRCH_NO = PARENT_BRCH_NO;
```

#### ⚠️ "是否简单机构"字段

当前 TM_BRANCH 表中**不存在**"是否简单机构"字段。全库搜索 SIMPLE/EASY 关键字均无匹配。

| 方案 | 说明 | 建议 |
|------|------|------|
| 使用 RESERVE2 | 当前为空，可直接映射 | ✅ **推荐**：值域 1=是/0=否 |
| 新增字段 | 需DDL变更 | 需开发团队配合 |
| 使用 IS_VIRTUAL_BRCH | 含义不同 | ❌ 语义不匹配 |

```sql
-- 标记简单机构（使用RESERVE2）
UPDATE TM_BRANCH SET RESERVE2 = '1' WHERE BRCH_NO = '{机构号}' AND LEGAL_NO = '000010';
COMMIT;

-- 取消简单机构标记
UPDATE TM_BRANCH SET RESERVE2 = '0' WHERE BRCH_NO = '{机构号}' AND LEGAL_NO = '000010';
COMMIT;

-- 查询所有简单机构
SELECT BRCH_NO, BRCH_NAME, PARENT_BRCH_NO, BRCH_LEVEL
FROM TM_BRANCH
WHERE LEGAL_NO = '000010' AND RESERVE2 = '1';
```

---

### 3.2 用户数据（TM_USER）

#### 表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| USER_NO | VARCHAR2(20) | 用户号 |
| USER_NAME | VARCHAR2(50) | 用户名 |
| PWD | VARCHAR2(250) | 密码（SHA-256哈希） |
| USER_TYPE | VARCHAR2(1) | 用户类型（1=场务, 2=机构管理员, 3=柜员, 4=法人管理员, 6=审批虚拟柜员） |
| BRCH_NO | VARCHAR2(30) | 所属机构号 |
| IS_ENABLE | CHAR(1) | 是否启用（1=启用, 0=禁用） |
| PWD_EXPIRATION | NUMBER | 密码过期日（YYYYMMDD格式数值） |
| PWD_ERR_TIMES | NUMBER | 密码错误次数 |
| LOGIN_STATUS | VARCHAR2(1) | 登录状态（0=未登录, 1=已登录） |
| LEGAL_NO | VARCHAR2(6) | 法人号 |

#### 查询模板

```sql
-- 按用户类型查询
SELECT USER_NO, USER_NAME, USER_TYPE, BRCH_NO, IS_ENABLE, PWD_EXPIRATION, LOGIN_STATUS
FROM TM_USER
WHERE LEGAL_NO = '000010' AND USER_TYPE IN ('2','3','4')
ORDER BY USER_TYPE, USER_NO;

-- 查询法人管理员
SELECT USER_NO, USER_NAME, BRCH_NO
FROM TM_USER
WHERE LEGAL_NO = '000010' AND USER_TYPE = '4';

-- 查询已禁用用户
SELECT USER_NO, USER_NAME, USER_TYPE, BRCH_NO
FROM TM_USER
WHERE LEGAL_NO = '000010' AND IS_ENABLE = '0';

-- 查询密码已过期用户
SELECT USER_NO, USER_NAME, PWD_EXPIRATION
FROM TM_USER
WHERE LEGAL_NO = '000010' AND PWD_EXPIRATION < TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDD'));
```

#### 密码规则

| 项目 | 值 |
|------|-----|
| 加密方式 | SHA-256 哈希（64位十六进制） |
| 默认密码哈希 | `ddbcfe94f08537e96133b213d75b9ffb3e405281eae546f644f298a27e9065f7` |
| 大部分用户默认密码 | 888888 |
| 密码复杂度正则 | `^(?![^A-Za-z]+$)(?![^0-9]+$).{6,18}$`（6-18位，含字母和数字） |
| 初始密码/有效期/错误次数 | ⚠️ 不在数据库中，需查应用配置文件 |

---

### 3.3 角色数据（TM_ROLE + TM_BRANCH_ROLE + TM_USER_ROLE）

#### 查询模板

```sql
-- 查询角色定义
SELECT ID, ROLE_NAME, ROLE_TYPE, BRCH_NO
FROM TM_ROLE
WHERE LEGAL_NO = '000010'
ORDER BY ROLE_TYPE, ROLE_NAME;

-- 查询机构-角色关联（含角色名）
SELECT br.BRCH_NO, b.BRCH_NAME, br.ROLE_ID, r.ROLE_NAME, r.ROLE_TYPE, br.AUDIT_STATUS
FROM TM_BRANCH_ROLE br
LEFT JOIN TM_BRANCH b ON br.BRCH_NO = b.BRCH_NO
LEFT JOIN TM_ROLE r ON br.ROLE_ID = r.ID
WHERE br.LEGAL_NO = '000010'
ORDER BY br.BRCH_NO, r.ROLE_NAME;

-- 查询用户-角色关联
SELECT ur.USER_NO, u.USER_NAME, r.ROLE_NAME
FROM TM_USER_ROLE ur
LEFT JOIN TM_USER u ON ur.USER_NO = u.USER_NO
LEFT JOIN TM_ROLE r ON ur.ROLE_ID = r.ID
WHERE u.LEGAL_NO = '000010'
ORDER BY ur.USER_NO, r.ROLE_NAME;

-- 查询无角色的机构（适合测试"机构不具备角色"报错）
SELECT b.BRCH_NO, b.BRCH_NAME
FROM TM_BRANCH b
WHERE b.LEGAL_NO = '000010' AND b.BRCH_LEVEL IN ('3','4')
AND NOT EXISTS (SELECT 1 FROM TM_BRANCH_ROLE br WHERE br.BRCH_NO = b.BRCH_NO);
```

---

### 3.4 客户数据（TM_CUST_CORP + TM_CUST_ACCT）

#### 查询模板

```sql
-- 查询企业客户
SELECT CUST_NO, CUST_NAME, CREATE_BRCH_NO, OPERATE_BRCH_NO, ACTIVATE_FLAG, UNIFIED_CREDIT_CODE
FROM TM_CUST_CORP
WHERE LEGAL_NO = '000010'
ORDER BY CREATE_BRCH_NO, CUST_NO;

-- 查询企业账号
SELECT ca.CUST_NO, cc.CUST_NAME, ca.ACCT_NO, ca.ACCT_NAME, ca.ACCT_TYPE, ca.ACTIVATE_FLAG, ca.OPEN_BRCH_NO, ca.IS_OTHER_BANK_ACCT
FROM TM_CUST_ACCT ca
LEFT JOIN TM_CUST_CORP cc ON ca.CUST_NO = cc.CUST_NO
WHERE cc.LEGAL_NO = '000010'
ORDER BY ca.CUST_NO, ca.ACCT_NO;

-- 查询指定机构创建的客户（数据隔离验证）
SELECT CUST_NO, CUST_NAME, CREATE_BRCH_NO
FROM TM_CUST_CORP
WHERE LEGAL_NO = '000010' AND CREATE_BRCH_NO = '{机构号}';

-- 查询指定机构及下级机构创建的客户
SELECT c.CUST_NO, c.CUST_NAME, c.CREATE_BRCH_NO
FROM TM_CUST_CORP c
WHERE c.LEGAL_NO = '000010'
AND EXISTS (
    SELECT 1 FROM TM_BRANCH b
    WHERE b.BRCH_NO = c.CREATE_BRCH_NO
    START WITH b.BRCH_NO = '{机构号}'
    CONNECT BY PRIOR b.BRCH_NO = b.PARENT_BRCH_NO
);
```

---

### 3.5 报备数据（TM_CUST_CORP_SIGN + TM_CUST_ELEC_SIGN）

#### 查询模板

```sql
-- 查询企业信息报备
SELECT CUST_NO, CUST_NAME, SIGN_STATUS, CREATE_BRCH_NO, MEMBER_ID, CPES_BRCH_CODE, MEMBER_TYPE
FROM TM_CUST_CORP_SIGN
WHERE LEGAL_NO = '000010'
ORDER BY CREATE_BRCH_NO;

-- 查询电子商业汇票签约
SELECT CUST_NO, CUST_NAME, ACCT_NO, SIGN_STATUS, CREATE_BRCH_NO, OPERATE_BRCH_NO, OPEN_BANK_NO, SIGN_BANK_NO
FROM TM_CUST_ELEC_SIGN
WHERE LEGAL_NO = '000010'
ORDER BY CREATE_BRCH_NO;

-- 查询待复核报备（SIGN_STATUS=0为未签约/待复核）
SELECT * FROM TM_CUST_CORP_SIGN
WHERE LEGAL_NO = '000010' AND SIGN_STATUS = '0';
```

---

### 3.6 系统参数（TM_BUSINESS_PARAMETER）

#### 查询模板

```sql
-- 查询密码相关参数
SELECT ID, LEGAL_NO, PARAM_TITLE, PARAM_KEY, PARAM_NAME, PARAM_VALUE
FROM TM_BUSINESS_PARAMETER
WHERE PARAM_KEY LIKE '%password%' OR PARAM_KEY LIKE '%pwd%' OR PARAM_KEY LIKE '%auth%';

-- 查询所有业务参数
SELECT PARAM_KEY, PARAM_NAME, PARAM_VALUE, LEGAL_NO
FROM TM_BUSINESS_PARAMETER
WHERE LEGAL_NO = '000010'
ORDER BY PARAM_KEY;
```

---

## 4. 测试数据分类

### 4.1 基础数据（不创建不清理）

| 数据类型 | 表名 | 说明 |
|---------|------|------|
| 机构数据 | TM_BRANCH | 系统初始化预置 |
| 用户数据 | TM_USER | 系统初始化预置 |
| 角色数据 | TM_ROLE | 系统初始化预置 |
| 机构-角色关联 | TM_BRANCH_ROLE | 系统初始化预置 |
| 参数配置 | TM_BUSINESS_PARAMETER | 系统初始化预置 |

### 4.2 业务数据（测试后需清理）

| 数据类型 | 表名 | 创建方式 | 清理方式 |
|---------|------|----------|---------|
| 企业客户 | TM_CUST_CORP | UI/INSERT | DELETE WHERE CUST_NO LIKE 'TEST%' |
| 企业账号 | TM_CUST_ACCT | UI/INSERT | DELETE WHERE CUST_NO LIKE 'TEST%' |
| 报备记录 | TM_CUST_CORP_SIGN | UI/INSERT | DELETE WHERE CUST_NO LIKE 'TEST%' |
| 额度批次 | HNNX_ACCBANK_CREDIT_BATCH | UI/INSERT | DELETE WHERE CREATE_USER = '{测试用户}' |
| 额度明细 | HNNX_ACCBANK_CREDIT_INFO | UI/INSERT | 先删明细再删批次 |

### 4.3 状态数据（用于流转验证）

| 数据类型 | 状态枚举 | 修改方式 |
|---------|---------|---------|
| 额度批次 | 草稿(0)→待复核(1)→已复核(5) | UPDATE STATUS字段 |
| 报备记录 | 未签约(0)→已签约(1) | UPDATE SIGN_STATUS字段 |

---

## 5. 数据缺口识别与补充

### 5.1 常见数据缺口清单

| 缺口类型 | 影响用例 | 检查SQL | 补充方案 |
|---------|---------|---------|---------|
| 无简单机构 | 分理处优化全部用例 | `SELECT * FROM TM_BRANCH WHERE RESERVE2 = '1'` | UPDATE RESERVE2='1' |
| 无下级机构客户 | 机构数据隔离验证 | `SELECT DISTINCT CREATE_BRCH_NO FROM TM_CUST_CORP` | INSERT到不同机构 |
| 无待复核记录 | 报备复核页面验证 | `SELECT * FROM TM_CUST_CORP_SIGN WHERE SIGN_STATUS='0'` | INSERT或UPDATE状态 |
| 无临时角色 | 批量复制角色场景 | `SELECT * FROM TM_ROLE WHERE ROLE_TYPE='2'` | INSERT临时角色 |
| 机构无角色 | "机构不具备角色"报错 | 见3.3查询模板 | 利用现有233302/233303 |
| 密码参数缺失 | 管理员导入-初始密码 | `SELECT * FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY LIKE '%pwd%'` | 查应用配置文件 |

### 5.2 补充数据SQL模板

#### 在指定机构下创建测试客户

```sql
INSERT INTO TM_CUST_CORP (ID, LEGAL_NO, CUST_NO, CUST_NAME, CREATE_BRCH_NO, OPERATE_BRCH_NO, ACTIVATE_FLAG, UNIFIED_CREDIT_CODE, INDUSTRY_TYPE, ENTERPRISE_SCALE)
VALUES (TM_CUST_CORP_SEQ.NEXTVAL, '000010', 'TEST{机构号后3位}001', '测试客户-{机构名}', '{机构号}', '{机构号}', '1', '91330100TEST{序号}X', 'A0000', 'SC01');
COMMIT;
```

#### 在简单机构下创建测试客户

```sql
-- 先标记简单机构
UPDATE TM_BRANCH SET RESERVE2 = '1' WHERE BRCH_NO = '{分理处机构号}' AND LEGAL_NO = '000010';
COMMIT;

-- 再创建客户
INSERT INTO TM_CUST_CORP (ID, LEGAL_NO, CUST_NO, CUST_NAME, CREATE_BRCH_NO, OPERATE_BRCH_NO, ACTIVATE_FLAG, UNIFIED_CREDIT_CODE, INDUSTRY_TYPE, ENTERPRISE_SCALE)
VALUES (TM_CUST_CORP_SEQ.NEXTVAL, '000010', 'TEST{机构号后3位}002', '分理处测试客户', '{分理处机构号}', '{分理处机构号}', '1', '91330100TEST{序号}Z', 'A0000', 'SC03');
COMMIT;
```

> ⚠️ 以上SQL为模板，执行前需确认序列名、必填字段和约束条件。建议先 `DESCRIBE_TABLE` 确认表结构。

---

## 6. 机构数据隔离验证方法

### 6.1 验证原理

BEMP 系统的机构数据隔离规则：用户只能查看**本机构及下级机构**的数据。

### 6.2 验证步骤

1. **准备数据**：确保不同机构下有独立的业务数据
2. **账号A登录**：使用机构A的账号登录，执行查询，记录结果集
3. **账号B登录**：使用机构B的账号登录，执行相同查询，记录结果集
4. **对比验证**：确认两个结果集无交叉数据

### 6.3 推荐账号组合

| 验证场景 | 账号A | 账号B | 预期差异 |
|---------|-------|-------|---------|
| 总行 vs 分行 | mllzs01(233) | sjl03(233301) | 总行可见全部，分行仅可见233301及下级 |
| 分行 vs 分行 | sjl03(233301) | sjl001(234) | 各自仅可见本机构及下级 |
| 总行 vs 支行 | mllzs01(233) | 100100(10010) | 总行可见全部，支行仅可见10010 |

### 6.4 数据准备检查

```sql
-- 检查各机构是否有独立的客户数据
SELECT CREATE_BRCH_NO, COUNT(*) AS CUST_COUNT
FROM TM_CUST_CORP
WHERE LEGAL_NO = '000010'
GROUP BY CREATE_BRCH_NO
ORDER BY CREATE_BRCH_NO;

-- 如果某机构无客户数据，需补充
```

---

## 7. 测试数据生命周期

### 7.1 创建阶段

测试开始前确保必要数据存在：

- 通过 Oracle MCP 查询检查基础数据是否完整
- 创建测试所需的业务数据（通过 UI 或 INSERT）
- 记录创建的数据标识（主键ID、编号），用于后续引用和清理

### 7.2 使用阶段

测试过程中引用数据：

- 通过数据标识定位特定记录
- 验证数据状态变更
- 验证数据查询结果

### 7.3 清理阶段

测试完成后删除创建的数据：

```sql
-- 清理测试客户数据
DELETE FROM TM_CUST_ACCT WHERE CUST_NO LIKE 'TEST%';
DELETE FROM TM_CUST_CORP_SIGN WHERE CUST_NO LIKE 'TEST%';
DELETE FROM TM_CUST_CORP WHERE CUST_NO LIKE 'TEST%';
COMMIT;

-- 清理测试额度数据
DELETE FROM HNNX_ACCBANK_CREDIT_INFO WHERE CREATE_USER = '{测试用户}' AND CREATE_TIME > TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDD'));
DELETE FROM HNNX_ACCBANK_CREDIT_BATCH WHERE CREATE_USER = '{测试用户}' AND CREATE_TIME > TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDD'));
COMMIT;

-- 恢复简单机构标记
UPDATE TM_BRANCH SET RESERVE2 = NULL WHERE BRCH_NO IN ('{测试标记的机构号列表}') AND LEGAL_NO = '000010';
COMMIT;
```

> 清理顺序：先明细后批次（外键依赖），先子表后主表。

### 7.4 隔离原则

- 每个测试用例创建独立的数据记录
- 测试数据使用 `TEST` 前缀便于识别和清理
- 不依赖其他测试用例创建的数据
- 测试完成后立即清理本用例创建的数据

---

## 8. 数据库关键表速查

| 表名 | 用途 | 关键字段 | 数据量级 |
|------|------|---------|---------|
| TM_BRANCH | 机构信息 | BRCH_NO, BRCH_LEVEL, PARENT_BRCH_NO, RESERVE2 | ~12条 |
| TM_USER | 用户信息 | USER_NO, USER_TYPE, BRCH_NO, PWD, IS_ENABLE | ~16条 |
| TM_ROLE | 角色定义 | ID, ROLE_NAME, ROLE_TYPE | ~5条 |
| TM_BRANCH_ROLE | 机构-角色关联 | BRCH_NO, ROLE_ID, AUDIT_STATUS | ~18条 |
| TM_USER_ROLE | 用户-角色关联 | USER_NO, ROLE_ID | ~12条 |
| TM_LEGALPERSON_ROLE | 法人角色 | ROLE_ID, LEGAL_NO | ~2条 |
| TM_CUST_CORP | 企业客户 | CUST_NO, CUST_NAME, CREATE_BRCH_NO | ~8条 |
| TM_CUST_ACCT | 企业账号 | CUST_NO, ACCT_NO, OPEN_BRCH_NO | ~15条 |
| TM_CUST_CORP_SIGN | 企业信息报备 | CUST_NO, SIGN_STATUS, CREATE_BRCH_NO | ~2条 |
| TM_CUST_ELEC_SIGN | 电票签约 | CUST_NO, ACCT_NO, SIGN_STATUS | ~7条 |
| TM_CPES_BRANCH | 报备机构 | BRCH_CODE, BRCH_TYPE, IS_CENTER_BRCH | 大量 |
| TM_BUSINESS_PARAMETER | 业务参数 | PARAM_KEY, PARAM_VALUE, LEGAL_NO | 中量 |
| TM_SYS_PARAMETER | 系统参数 | - | 空 |
| HNNX_ACCBANK_CREDIT_BATCH | 额度批次 | BATCH_ID, BATCH_NO, STATUS | 测试产生 |
| HNNX_ACCBANK_CREDIT_INFO | 额度明细 | INFO_ID, BATCH_ID, CREDIT_AMT, STATUS | 测试产生 |

### 3.7 承兑行额度管理数据（HNNX_ACCBANK_CREDIT_BATCH + HNNX_ACCBANK_CREDIT_INFO）

#### 表结构

**HNNX_ACCBANK_CREDIT_BATCH（额度批次表）**

| 字段 | 类型 | 说明 |
|------|------|------|
| BATCH_ID | VARCHAR2 | 批次ID（主键） |
| BATCH_NO | VARCHAR2 | 批次编号 |
| CREDIT_TYPE | VARCHAR2 | 授信类型（承兑行阈值） |
| CUST_TYPE | VARCHAR2 | 客户类型（同业） |
| MEMBER_ID | VARCHAR2 | 会员代码 |
| MEMBER_BANK_NO | VARCHAR2 | 会员大额行号 |
| CUST_NO | VARCHAR2 | 客户号 |
| CUST_NAME | VARCHAR2 | 客户名称 |
| CREDIT_DATE | NUMBER | 授信日期 |
| OPERATOR | VARCHAR2 | 操作员 |
| TOTAL_COUNT | NUMBER | 总笔数 |
| LEGAL_NO | VARCHAR2 | 法人号 |
| CREATE_TIME | NUMBER | 创建时间 |
| CREATE_USER | VARCHAR2 | 创建用户 |

**HNNX_ACCBANK_CREDIT_INFO（额度明细表）**

| 字段 | 类型 | 说明 |
|------|------|------|
| INFO_ID | VARCHAR2 | 明细ID（主键） |
| BATCH_ID | VARCHAR2 | 批次ID（外键） |
| INFO_NO | VARCHAR2 | 额度信息编号 |
| CUST_NAME | VARCHAR2 | 客户名称 |
| STATUS | VARCHAR2 | 复核状态（0=未提交, 1=待复核, 5=已复核） |
| CREDIT_TYPE | VARCHAR2 | 授信类型 |
| CREDIT_AMT | NUMBER | 授信额度 |
| AVAILABLE_AMT | NUMBER | 可用额度 |
| USED_AMT | NUMBER | 已用额度 |
| FROZEN_AMT | NUMBER | 冻结额度 |
| EFFECTIVE_DATE | NUMBER | 生效日期 |
| EXPIRY_DATE | NUMBER | 失效日期 |
| IS_CIRCULATE | VARCHAR2 | 是否可循环 |
| LEGAL_NO | VARCHAR2 | 法人号 |
| CREATE_TIME | NUMBER | 创建时间 |
| CREATE_USER | VARCHAR2 | 创建用户 |

#### 查询模板

```sql
-- 查询额度批次
SELECT BATCH_ID, BATCH_NO, CREDIT_TYPE, CUST_TYPE, CUST_NAME, CREDIT_DATE, OPERATOR, TOTAL_COUNT
FROM HNNX_ACCBANK_CREDIT_BATCH
WHERE LEGAL_NO = '000010'
ORDER BY CREATE_TIME DESC;

-- 查询额度明细（含批次信息）
SELECT i.INFO_NO, i.STATUS, i.CREDIT_TYPE, i.CREDIT_AMT, i.AVAILABLE_AMT, i.USED_AMT, i.FROZEN_AMT,
       i.EFFECTIVE_DATE, i.EXPIRY_DATE, i.IS_CIRCULATE, b.CUST_NAME, b.MEMBER_ID, b.MEMBER_BANK_NO
FROM HNNX_ACCBANK_CREDIT_INFO i
LEFT JOIN HNNX_ACCBANK_CREDIT_BATCH b ON i.BATCH_ID = b.BATCH_ID
WHERE i.LEGAL_NO = '000010'
ORDER BY i.CREATE_TIME DESC;

-- 按状态查询额度明细
SELECT INFO_NO, CUST_NAME, STATUS, CREDIT_AMT, AVAILABLE_AMT, USED_AMT
FROM HNNX_ACCBANK_CREDIT_INFO
WHERE LEGAL_NO = '000010' AND STATUS = '{0/1/5}';

-- 查询待复核额度明细
SELECT INFO_NO, CREDIT_AMT, AVAILABLE_AMT, USED_AMT, EFFECTIVE_DATE, EXPIRY_DATE
FROM HNNX_ACCBANK_CREDIT_INFO
WHERE LEGAL_NO = '000010' AND STATUS = '1';

-- 修改额度明细状态（用于测试数据准备）
UPDATE HNNX_ACCBANK_CREDIT_INFO SET STATUS = '{目标状态}' WHERE INFO_NO = '{额度信息编号}' AND LEGAL_NO = '000010';
COMMIT;
```

#### 数据清理

```sql
-- 清理测试额度数据（先明细后批次）
DELETE FROM HNNX_ACCBANK_CREDIT_INFO WHERE CREATE_USER = '{测试用户}' AND LEGAL_NO = '000010';
DELETE FROM HNNX_ACCBANK_CREDIT_BATCH WHERE CREATE_USER = '{测试用户}' AND LEGAL_NO = '000010';
COMMIT;
```

---

## 9. 最佳实践

### 9.1 查询优先原则

- **先查后改**：任何数据变更前先 SELECT 确认现状
- **小范围验证**：UPDATE/DELETE 前先用 SELECT WHERE 验证影响范围
- **事务保护**：INSERT/UPDATE 后立即 COMMIT，避免锁表

### 9.2 数据命名规范

测试创建的数据使用统一前缀，便于识别和清理：

- 客户号：`TEST{机构号后3位}{序号}`（如 TEST301001）
- 客户名：`测试客户-{用途描述}`
- 批次编号：`TEST_YYYYMMDD_NNN`

### 9.3 数据快照

关键测试步骤前后截图记录数据状态，便于问题定位：

```
1. 操作前截图 → 记录初始数据状态
2. 执行操作 → 修改数据
3. 操作后截图 → 记录变更后数据状态
4. 对比前后截图 → 验证数据变更符合预期
```

### 9.4 数据恢复

测试异常中断时的数据恢复策略：

- 记录所有创建操作，异常时按记录反向清理
- 使用 `TEST` 前缀快速定位并清理所有测试数据
- 定期备份关键测试数据表
