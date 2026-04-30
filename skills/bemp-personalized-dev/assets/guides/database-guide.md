# 数据库开发指南

> 本文档整合了数据库开发规范与代码模板，是 BEMP 个性化数据库开发的完整参考。

---

## 一、开发规范

# 河南农信 BEMP 数据库开发规范

## 目录

- [1. 概述](#1-概述)
- [2. 数据库设计规范](#2-数据库设计规范)
- [3. 字段命名规范](#3-字段命名规范)
- [4. 主键策略](#4-主键策略)
- [5. 索引设计规范](#5-索引设计规范)
- [6. SQL 开发规范](#6-sql 开发规范)
- [7. MyBatis 开发规范](#7-mybatis 开发规范)
- [8. 数据库类型映射](#8-数据库类型映射)
- [9. 数据字典管理](#9-数据字典管理)
- [10. 数据库变更管理](#10-数据库变更管理)
- [11. 公共字段说明](#11-公共字段说明)
- [12. 标准字段说明](#12-标准字段说明)
- [13. 安全保密设计](#13-安全保密设计)

---

## 1. 概述

### 1.1 文档目的

本文档旨在规范河南农信 BEMP 系统数据库开发流程，确保数据库设计的规范性、一致性和可维护性。

### 1.2 适用范围

- 河南农信 BEMP 系统所有数据库表设计
- 数据库脚本编写和维护
- MyBatis DAO 层开发
- 数据库变更和版本管理

### 1.3 支持的数据库类型

- **Oracle**: 主要生产数据库（Oracle 9i 以上）
- **MySQL**: 开发和测试环境
- **DB2**: 部分客户环境（DB2 9 以上）
- **Sybase**: 部分客户环境
- **Informix**: 部分客户环境

### 1.4 数据库设计工具

- Sybase PowerDesigner 10.0

---

## 2. 数据库设计规范

### 2.1 表命名规范

#### 2.1.1 表名格式

```
表名 = 子系统前缀 + 模块名 + 业务含义
```

| 子系统 | 前缀 | 示例 |
|--------|------|------|
| 公共 | common | TM_开头 |
| 系统管理 | sm | TM_、TB_开头 |
| 承兑 | ce | TE_CE_开头 |
| 贴现 | be | TB_BE_开头 |
| 票据池 | pl | TE_PL_开头 |
| 同业 | pc | TT_PC_开头 |

#### 2.1.2 表分类前缀

| 表类型 | 前缀 | 说明 | 示例 |
|--------|------|------|------|
| 系统表 | TM_ | 系统级配置表 | TM_AUTHORITY(权限表) |
| 业务表 | TB_ | 业务流程表 | TB_FLOW_ROUTE(流程路线) |
| 交易表 | TE_ | 交易记录表 | TE_CE_ACPT_BATCH(承兑批次) |
| 临时表 | TT_ | 临时数据表 | TT_TASK(任务表) |
| 历史表 | HIS_ | 历史数据表 | HIS_BILL_INFO(票据历史信息) |

#### 2.1.3 表名长度限制

- **Oracle**: 表名不超过 30 个字符
- **MySQL**: 表名不超过 64 个字符
- **DB2**: 表名不超过 128 个字符

#### 2.1.4 索引命名

- 各种索引名前加上 `IDX_`
- 历史表中的表名前加 `HIS_` 前缀

### 2.2 数据库架构

电子商业汇票综合处理平台分为公共库和业务库：

- **公共库**: 包含权限管理、客户管理、审批管理、系统管理、用户管理、产品管理、日终管理、冲正管理等公共需求所需要的表信息
- **业务库**: 包含了承兑、贴现、转贴现、质押、解质押、托收等票据业务需求所需要的表信息

### 2.3 表结构设计原则

#### 2.3.1 必选字段

所有业务表必须包含以下基础字段:

```sql
-- 主键
ID number(16,0) NOT NULL

-- 法人编号 (多法人支持)
LEGAL_NO varchar2(6)

-- 创建时间
CREATE_TIME number(17,0)

-- 更新时间
UPDATE_TIME number(17,0)

-- 预留字段 (至少 3 个)
RESERVE1 varchar2(255)
RESERVE2 varchar2(255)
RESERVE3 varchar2(255)
```

#### 2.3.2 字段顺序规范

字段在表中的顺序应遵循:

1. 主键字段 (ID)
2. 机构相关字段 (LEGAL_NO, BRCH_NO 等)
3. 业务字段 (按重要性排序)
4. 时间字段 (CREATE_TIME, UPDATE_TIME)
5. 预留字段 (RESERVE1, RESERVE2, RESERVE3)

#### 2.3.3 示例

```sql
CREATE TABLE TM_FOCUS_OPER (
    id  number(16,0) NOT NULL,              -- 主键
    legal_no  varchar2(6),                   -- 法人编号
    focus_type  varchar2(4),                 -- 集中管理模式
    auth_id  number(16,0),                   -- 权限 id
    license_user_no  varchar2(20),           -- 授权用户编号
    license_user_name  varchar2(50),         -- 授权用户姓名
    license_brch_no  varchar2(30),           -- 授权机构号
    license_brch_name  varchar2(255),        -- 授权机构名
    licensed_brch_no  varchar2(30),          -- 被授权机构号
    licensed_brch_name  varchar2(255),       -- 被授权机构名
    create_time  number(17,0),               -- 创建时间
    update_time  number(17,0),               -- 修改时间
    CONSTRAINT pk_TM_FOCUS_OPER PRIMARY KEY (id)
);

-- 字段注释
COMMENT ON COLUMN TM_FOCUS_OPER.id IS '主键 ID';
COMMENT ON COLUMN TM_FOCUS_OPER.legal_no IS '法人编号';
COMMENT ON COLUMN TM_FOCUS_OPER.focus_type IS '集中管理模式';
COMMENT ON COLUMN TM_FOCUS_OPER.auth_id IS '权限 id';
COMMENT ON COLUMN TM_FOCUS_OPER.license_user_no IS '授权用户编号';
COMMENT ON COLUMN TM_FOCUS_OPER.license_user_name IS '授权用户姓名';
COMMENT ON COLUMN TM_FOCUS_OPER.license_brch_no IS '授权机构号';
COMMENT ON COLUMN TM_FOCUS_OPER.license_brch_name IS '授权机构名';
COMMENT ON COLUMN TM_FOCUS_OPER.licensed_brch_no IS '被授权机构号';
COMMENT ON COLUMN TM_FOCUS_OPER.licensed_brch_name IS '被授权机构名';
COMMENT ON COLUMN TM_FOCUS_OPER.create_time IS '创建时间';
COMMENT ON COLUMN TM_FOCUS_OPER.update_time IS '修改时间';
```

---

## 3. 字段命名规范

### 3.1 通用字段命名

| 字段含义 | 字段名 | 类型 | 说明 |
|----------|--------|------|------|
| 主键 | ID | number(16,0) | 所有表统一 |
| 法人编号 | LEGAL_NO | varchar2(6) | 多法人隔离 |
| 机构号 | BRCH_NO | varchar2(30) | 操作机构 |
| 用户编号 | USER_NO | varchar2(20) | 操作用户 |
| 柜员号 | TELLER_NO | varchar2(20) | 交易柜员 |
| 创建时间 | CREATE_TIME | number(17,0) | 时间戳 |
| 更新时间 | UPDATE_TIME | number(17,0) | 时间戳 |
| 预留字段 | RESERVE1-5 | varchar2(255) | 扩展字段 |

### 3.2 业务字段命名

#### 3.2.1 编号类字段

| 业务含义 | 字段名 | 类型 | 示例 |
|----------|--------|------|------|
| 批次号 | BATCH_NO | varchar2(32) | 202301010001 |
| 票据号码 | BILL_NO | varchar2(30) | 3051234567890123 |
| 协议编号 | PROTOCOL_NO | varchar2(32) | XY202301010001 |
| 合同编号 | CONTRACT_NO | varchar2(32) | HT202301010001 |
| 业务编号 | BUSI_NO | varchar2(32) | YW202301010001 |

#### 3.2.2 金额类字段

| 业务含义 | 字段名 | 类型 | 说明 |
|----------|--------|------|------|
| 票面金额 | FACE_AMT | number(16,2) | 票据面值 |
| 交易金额 | TRANS_AMT | number(16,2) | 实际交易金额 |
| 余额 | BALANCE | number(16,2) | 账户余额 |
| 利息 | INTEREST | number(16,2) | 利息金额 |
| 手续费 | FEE | number(16,2) | 手续费 |

#### 3.2.3 日期时间字段

| 业务含义 | 字段名 | 类型 | 说明 |
|----------|--------|------|------|
| 交易日期 | TRANS_DT | number(8,0) | YYYYMMDD |
| 交易时间 | TRANS_TM | number(6,0) | HHMMSS |
| 到期日期 | DUE_DT | number(8,0) | YYYYMMDD |
| 起息日期 | VALUE_DT | number(8,0) | YYYYMMDD |

#### 3.2.4 状态类字段

| 业务含义 | 字段名 | 类型 | 说明 |
|----------|--------|------|------|
| 状态 | STATUS | varchar2(2) | 业务状态 |
| 处理状态 | PROC_STATUS | varchar2(2) | 处理状态 |
| 审核状态 | AUDIT_STATUS | varchar2(2) | 审核状态 |
| 标志 | FLAG | varchar2(1) | 0-否 1-是 |

### 3.3 命名注意事项

1. **使用大写字母**: 所有字段名使用大写字母
2. **单词分隔**: 多个单词使用下划线分隔
3. **语义清晰**: 字段名应清晰表达业务含义
4. **避免缩写**: 除非是行业通用缩写 (如 AMT, DT, TM)
5. **一致性**: 相同含义字段在不同表中使用相同命名

---

## 4. 主键策略

### 4.1 主键类型

#### 4.1.1 数值型主键 (推荐)

```sql
-- Oracle
ID number(16,0) NOT NULL

-- MySQL
ID bigint NOT NULL

-- DB2
ID bigint NOT NULL
```

**优点**:
- 性能好，索引效率高
- 占用空间小
- 与框架兼容性好

### 4.2 主键生成策略

#### 4.2.1 序列生成 (Oracle)

```sql
-- 创建序列
CREATE SEQUENCE SEQ_TM_FOCUS_OPER
START WITH 1
INCREMENT BY 1
NOCACHE
NOCYCLE;

-- 使用序列
INSERT INTO TM_FOCUS_OPER (ID, ...) 
VALUES (SEQ_TM_FOCUS_OPER.NEXTVAL, ...);
```

#### 4.2.2 自增主键 (MySQL)

```sql
CREATE TABLE TM_FOCUS_OPER (
    ID bigint NOT NULL AUTO_INCREMENT,
    ...
    PRIMARY KEY (ID)
);
```

#### 4.2.3 框架生成 (推荐)

使用 BEMP 框架的主键生成器:

```java
// DAO 层使用框架注解
@PrimaryKey(type = PrimaryKey.Type.SEQUENCE, value = "SEQ_TM_FOCUS_OPER")
private Long id;
```

### 4.3 主键命名规范

- **序列命名**: `SEQ_` + 表名
- **主键约束**: `pk_` + 表名
- **示例**:
  - 表：TM_FOCUS_OPER
  - 序列：SEQ_TM_FOCUS_OPER
  - 主键约束：pk_TM_FOCUS_OPER

---

## 5. 索引设计规范

### 5.1 索引命名规范

```
索引名 = 索引类型前缀 + 表名 + 索引字段 (可选)
```

| 索引类型 | 前缀 | 示例 |
|----------|------|------|
| 主键索引 | pk_ | pk_TM_FOCUS_OPER |
| 唯一索引 | uk_ | uk_TM_USER_NO |
| 普通索引 | idx_ | idx_TE_CE_BILL_1 |
| 外键索引 | fk_ | fk_TM_ROLE_USER |

### 5.2 索引设计原则

#### 5.2.1 必须创建索引的场景

1. 主键字段 (自动创建)
2. 外键字段
3. 频繁用于 WHERE 条件的字段
4. 频繁用于 JOIN 连接的字段
5. 频繁用于 ORDER BY 的字段

#### 5.2.2 索引设计示例

```sql
-- 单列索引
CREATE INDEX idx_te_ce_recourse_bill_1 ON te_ce_recourse_bill (bill_no);

-- 复合索引 (注意字段顺序)
CREATE INDEX idx_te_ce_acpt_batch_2 ON te_ce_acpt_batch (trans_brch_no, create_time);

-- 唯一索引
CREATE UNIQUE INDEX uk_tm_user_no ON tm_user (user_no);
```

### 5.3 索引优化建议

1. **复合索引字段顺序**:
   - 将选择性高的字段放在前面
   - 将等值查询字段放在范围查询字段前面

2. **避免过度索引**:
   - 单表索引建议不超过 5 个
   - 定期清理未使用的索引

3. **索引维护**:
   - 定期分析索引使用率
   - 对大表进行索引重建

---

## 6. SQL 开发规范

### 6.1 SQL 编写规范

#### 6.1.1 基本规范

1. **关键字大写**: SELECT, INSERT, UPDATE, DELETE, WHERE, FROM
2. **表名、字段名大写**: TM_USER, USER_NO
3. **缩进对齐**: 使用 2 个空格缩进
4. **注释完整**: 复杂 SQL 必须添加注释

#### 6.1.2 SELECT 语句规范

```sql
-- 推荐：明确列出需要的字段
SELECT 
    ID,
    USER_NO,
    USER_NAME,
    BRCH_NO
FROM TM_USER
WHERE STATUS = '1'
    AND LEGAL_NO = #{legalNo}
ORDER BY CREATE_TIME DESC;

-- 不推荐：使用 SELECT *
SELECT * FROM TM_USER;
```

#### 6.1.3 INSERT 语句规范

```sql
-- 推荐：明确列出字段名
INSERT INTO TM_FOCUS_OPER (
    ID,
    LEGAL_NO,
    FOCUS_TYPE,
    AUTH_ID,
    CREATE_TIME,
    UPDATE_TIME
) VALUES (
    #{id},
    #{legalNo},
    #{focusType},
    #{authId},
    #{createTime},
    #{updateTime}
);
```

#### 6.1.4 UPDATE 语句规范

```sql
-- 推荐：包含 WHERE 条件，设置更新时间
UPDATE TM_FOCUS_OPER
SET 
    FOCUS_TYPE = #{focusType},
    AUTH_ID = #{authId},
    UPDATE_TIME = #{updateTime}
WHERE ID = #{id}
    AND LEGAL_NO = #{legalNo};
```

#### 6.1.5 DELETE 语句规范

```sql
-- 推荐：使用逻辑删除而非物理删除
UPDATE TM_FOCUS_OPER
SET 
    STATUS = '9',  -- 9 表示已删除
    UPDATE_TIME = #{updateTime}
WHERE ID = #{id};

-- 如必须物理删除，确保有条件限制
DELETE FROM TM_TEMP_TABLE
WHERE CREATE_TIME < #{expireTime};
```

### 6.2 多表关联查询

#### 6.2.1 JOIN 规范

```sql
-- 推荐：使用显式 JOIN 语法
SELECT 
    u.ID,
    u.USER_NO,
    r.ROLE_NAME
FROM TM_USER u
INNER JOIN TM_USER_ROLE ur ON u.ID = ur.USER_ID
INNER JOIN TM_ROLE r ON ur.ROLE_ID = r.ID
WHERE u.STATUS = '1'
    AND r.STATUS = '1';

-- 不推荐：使用隐式连接
SELECT u.ID, u.USER_NO, r.ROLE_NAME
FROM TM_USER u, TM_USER_ROLE ur, TM_ROLE r
WHERE u.ID = ur.USER_ID 
    AND ur.ROLE_ID = r.ID;
```

#### 6.2.2 关联优化

1. **控制关联表数量**: 单次查询关联表不超过 5 个
2. **使用 EXISTS 替代 IN**: 子查询数据量大时使用 EXISTS
3. **避免笛卡尔积**: 确保关联条件正确

---

## 7. MyBatis 开发规范

### 7.1 DAO 接口规范

#### 7.1.1 继承 BaseDao

所有 DAO 接口必须继承 BaseDao:

```java
package com.hundsun.bemp.hnnxbank.biz.sm.dao.role;

import com.hundsun.bemp.fw.dao.base.BaseDao;
import com.hundsun.bemp.sm.dao.role.entity.Role;
import com.hundsun.bemp.sm.dao.role.entity.RoleExample;

public interface HnnxRoleDao extends BaseDao<Role, RoleExample, Long> {
    
    /**
     * 自定义查询方法
     * @param queryRoleDto 查询条件
     * @param pageInfo 分页信息
     * @return 角色列表
     */
    Page<Role> pageQueryHnnxAuditRoles(
        @Param("query") QueryRoleDto queryRoleDto, 
        @Param("pageInfo") PageInfo pageInfo
    );
}
```

#### 7.1.2 方法命名规范

- 查询方法：`select` + `By` + 条件，如 `selectByExample`
- 分页查询：`page` + 查询含义，如 `pageQueryRoles`
- 统计方法：`count` + `By` + 条件，如 `countByExample`

### 7.2 Mapper XML 规范

#### 7.2.1 基本结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" 
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.hundsun.bemp.hnnxbank.biz.sm.dao.role.HnnxRoleDao">
    
    <!-- 结果映射 -->
    <resultMap id="BaseResultMap" type="com.hundsun.bemp.sm.dao.role.entity.Role">
        <id column="ID" jdbcType="BIGINT" property="id" />
        <result column="LEGAL_NO" jdbcType="VARCHAR" property="legalNo" />
        <result column="ROLE_NAME" jdbcType="VARCHAR" property="roleName" />
        <result column="CREATE_TIME" jdbcType="BIGINT" property="createTime" />
        <result column="UPDATE_TIME" jdbcType="BIGINT" property="updateTime" />
    </resultMap>
    
    <!-- 自定义查询 -->
    <select id="pageQueryHnnxAuditRoles" resultMap="BaseResultMap">
        SELECT DISTINCT r.*
        FROM TM_ROLE r
        INNER JOIN TM_USER_ROLE ur ON r.ID = ur.ROLE_ID
        WHERE r.STATUS = '1'
            AND ur.USER_ID = #{query.userId}
        ORDER BY r.CREATE_TIME DESC
    </select>
    
</mapper>
```

#### 7.2.2 动态 SQL 规范

```xml
<!-- 使用 if 标签进行条件判断 -->
<select id="selectByCondition" resultMap="BaseResultMap">
    SELECT * FROM TM_USER
    <where>
        <if test="userNo != null and userNo != ''">
            AND USER_NO = #{userNo}
        </if>
        <if test="userName != null and userName != ''">
            AND USER_NAME LIKE CONCAT('%', #{userName}, '%')
        </if>
        <if test="status != null and status != ''">
            AND STATUS = #{status}
        </if>
    </where>
</select>
```

---

## 8. 数据库类型映射

### 8.1 数据库类型对应关系

| 字段类型 | 类型名称 | SYBASE | ORACLE | DB2 | INFORMIX |
|---------|---------|--------|--------|-----|----------|
| CHAR(%n) | 定长字符型 | CHAR(%n) | CHAR(%n) | CHAR(%n) | CHAR(%n) |
| VARCHAR2(%n) | 变长字符型 | VARCHAR(%n) | VARCHAR2(%n) | VARCHAR(%n) | VARCHAR(%n) |
| INTEGER | 整型 | INT | INTEGER | INTEGER | INTEGER |
| NUMBER(%s,%p) | 数值型 | NUMERIC(%s,%p) | NUMBER(%s,%p) | NUMERIC(%s,%p) | NUMERIC(%s,%p) |

### 8.2 Java 类型映射

| 数据库类型 | Java 类型 | 说明 |
|-----------|----------|------|
| NUMBER(16,0) | Long | 主键、ID 类字段 |
| NUMBER(16,2) | BigDecimal | 金额类字段 |
| NUMBER(10,6) | BigDecimal | 利率类字段 |
| VARCHAR2 | String | 字符串字段 |
| DATE | Date | 日期字段 |
| TIMESTAMP | Timestamp | 时间戳字段 |
| CLOB | String | 大文本字段 |

### 8.3 时间字段约定

| 字段名称 | 数据类型 | 缺省 | 注释 |
|---------|---------|------|------|
| 日期 | DATE | | yyyy-MM-dd |
| 时间 | TIMESTAMP | | yyyy-MM-dd H24:MIN:MS |

### 8.4 金额字段约定

| 字段名称 | 数据类型 | 缺省 | 注释 |
|---------|---------|------|------|
| 金额 | NUMBER(16,2) | 0.00 | 票据金额、交易金额等 |
| 利率 | NUMBER(10,6) | 0.000000 | 利率、费率等 |

---

## 9. 数据字典管理

### 9.1 数据字典定义

数据字典用于定义系统中使用的各种枚举值、状态码、标志位等的含义和取值范围。

### 9.2 数据字典分类

#### 9.2.1 子系统代码

| 值 | 说明 |
|----|------|
| C | 平台子系统 |
| P | 纸票子系统 |
| E | 电票子系统 |

#### 9.2.2 行分类

| 值 | 说明 |
|----|------|
| 1 | 商业银行 |
| 2 | 中央银行 |

#### 9.2.3 客户类别

| 值 | 说明 |
|----|------|
| 2 | 企业(对公) |
| 3 | 非银行金融机构 |

#### 9.2.4 业务参与者类型

| 值 | 说明 |
|----|------|
| 0 | 接入行 |
| 1 | 企业 |
| 2 | 人民银行 |
| 3 | 被代理行 |
| 4 | 被代理财务公司 |
| 5 | 接入财务公司 |

#### 9.2.5 票据类型

| 值 | 说明 |
|----|------|
| 1 | 银票 |
| 2 | 商票 |

#### 9.2.6 借贷标志

| 值 | 说明 |
|----|------|
| D | 借 |
| C | 贷 |
| S | 收 |
| F | 付 |

注：D,F(归属借方余额) C,S(归属贷方余额)

#### 9.2.7 业务状态类

| 字段 | 值 | 说明 |
|------|----|------|
| BILL_STATUS | 1 | 银行承兑 |
| BILL_STATUS | 2 | 签发 |
| BILL_STATUS | 3 | 未用退回 |
| BILL_STATUS | 4 | 扣款 |
| BILL_STATUS | 5 | 垫款 |
| BILL_STATUS | 6 | 付款 |
| BILL_STATUS | -1 | 默认值 |

#### 9.2.8 标志位类

| 字段 | 值 | 说明 |
|------|----|------|
| IS_DELAY | 0 | 否 |
| IS_DELAY | 1 | 是 |
| IS_LOCK | 0 | 未锁 |
| IS_LOCK | 1 | 已锁 |
| SIGN_FLAG | 0 | 未签收 |
| SIGN_FLAG | 1 | 已签收 |
| DEL_FLAG | 0 | 未删除 |
| DEL_FLAG | 1 | 已删除 |
| SUSPEND_FLAG | 0 | 未挂失 |
| SUSPEND_FLAG | 1 | 已挂失 |
| IF_OVERDUE | 0 | 未逾期 |
| IF_OVERDUE | 1 | 已逾期 |

### 9.3 数据字典使用规范

1. **统一管理**: 数据字典统一维护，避免重复定义
2. **代码中使用常量**: 在代码中使用常量类定义数据字典值
3. **前端展示**: 前端通过数据字典接口获取显示文本
4. **国际化支持**: 数据字典支持国际化配置

---

## 10. 数据库变更管理

### 10.1 变更流程

1. **需求分析**: 明确变更需求和影响范围
2. **设计评审**: 评审数据库设计方案
3. **脚本编写**: 编写 DDL/DML 脚本
4. **测试验证**: 在测试环境验证脚本
5. **生产发布**: 在生产环境执行变更

### 10.2 脚本规范

#### 10.2.1 DDL 脚本

```sql
-- 创建表
CREATE TABLE TM_NEW_TABLE (
    ID number(16,0) NOT NULL,
    LEGAL_NO varchar2(6),
    FIELD1 varchar2(50),
    CREATE_TIME number(17,0),
    UPDATE_TIME number(17,0),
    CONSTRAINT pk_TM_NEW_TABLE PRIMARY KEY (ID)
);

-- 添加注释
COMMENT ON TABLE TM_NEW_TABLE IS '新表说明';
COMMENT ON COLUMN TM_NEW_TABLE.ID IS '主键 ID';
COMMENT ON COLUMN TM_NEW_TABLE.LEGAL_NO IS '法人编号';
COMMENT ON COLUMN TM_NEW_TABLE.FIELD1 IS '字段1';
COMMENT ON COLUMN TM_NEW_TABLE.CREATE_TIME IS '创建时间';
COMMENT ON COLUMN TM_NEW_TABLE.UPDATE_TIME IS '修改时间';

-- 创建索引
CREATE INDEX idx_TM_NEW_TABLE_1 ON TM_NEW_TABLE (LEGAL_NO);
```

#### 10.2.2 DML 脚本

```sql
-- 插入数据
INSERT INTO TM_DICT (ID, DICT_TYPE, DICT_CODE, DICT_NAME)
VALUES (SEQ_TM_DICT.NEXTVAL, 'BILL_TYPE', '1', '银票');

-- 更新数据
UPDATE TM_DICT 
SET DICT_NAME = '商业承兑汇票'
WHERE DICT_TYPE = 'BILL_TYPE' AND DICT_CODE = '2';

-- 删除数据
DELETE FROM TM_DICT 
WHERE DICT_TYPE = 'OLD_TYPE';
```

### 10.3 版本管理

1. **脚本命名**: `V{版本号}_{日期}_{描述}.sql`
   - 示例：`V1.0.0_20230101_create_user_table.sql`
2. **版本记录**: 维护版本变更日志
3. **回滚脚本**: 每个变更脚本配套编写回滚脚本

---

## 11. 公共字段说明

### 11.1 基础公共字段

所有表必须包含以下公共字段：

| 序号 | 中文名称 | 字段 | 长度 | 备注 |
|------|---------|------|------|------|
| 1 | 主键ID | ID | NUMBER(16,0) | 物理主键 |
| 2 | 创建时间 | CREATE_TIME | TIMESTAMP | 记录创建时间 |
| 3 | 修改时间 | UPDATE_TIME | TIMESTAMP | 记录最后修改时间 |
| 4 | 保留字段1 | RESERVE1 | VARCHAR2(250) | 个性化开发使用 |
| 5 | 保留字段2 | RESERVE2 | VARCHAR2(250) | 个性化开发使用 |
| 6 | 保留字段3 | RESERVE3 | VARCHAR2(250) | 个性化开发使用 |

### 11.2 票面信息字段

| 序号 | 中文名称 | 字段 | 长度 | 备注 |
|------|---------|------|------|------|
| 1 | 票据号码 | BILL_NO | VARCHAR2(30) | 纸票票号16位 电票票号30位 |
| 2 | 票据类型 | BILL_TYPE | CHAR(1) | 1-银票 2-商票 |
| 3 | 票据介质 | BILL_CLASS | CHAR(1) | 1-纸票 2-电票 |
| 4 | 出票日期 | ACPT_DATE | DATE | |
| 5 | 汇票到期日 | DUE_DATE | DATE | |
| 6 | 出票人全称 | REMITTER | VARCHAR2(200) | |
| 7 | 出票人账号 | REMITTER_ACCT_NO | VARCHAR2(32) | |
| 8 | 出票人开户行行号 | REMITTER_BANK_NO | VARCHAR2(12) | |
| 9 | 出票人开户行行名 | REMITTER_BANK_NAME | VARCHAR2(200) | |
| 10 | 出票人开户机构号 | REMITTER_BRCH_NO | VARCHAR2(10) | |
| 11 | 收款人全称 | PAYEE | VARCHAR2(200) | |
| 12 | 收款人账号 | PAYEE_ACCT_NO | VARCHAR2(32) | |
| 13 | 收款人开户行行名 | PAYEE_BANK_NAME | VARCHAR2(200) | |
| 14 | 收款人开户行行号 | PAYEE_BANK_NO | VARCHAR2(12) | |
| 15 | 票据金额 | BILL_MONEY | NUMBER(16,2) | |
| 16 | 承兑人全称 | ACCEPTOR | VARCHAR2(200) | |
| 17 | 承兑人开户行行名 | ACCEPTOR_BANK_NAME | VARCHAR2(200) | |
| 18 | 承兑人开户行行号 | ACCEPTOR_BANK_NO | VARCHAR2(12) | |
| 19 | 付款行行号 | DRAWEE_BANK_NO | VARCHAR2(12) | |
| 20 | 付款行行名 | DRAWEE_BANK_NAME | VARCHAR2(200) | |
| 21 | 付款行地址 | DRAWEE_BANK_ADDR | VARCHAR2(250) | |
| 22 | 保证人名称 | GUANRANTEER_NAME | VARCHAR2(200) | |
| 23 | 保证人地址 | GUANRANTEER_ADDRESS | VARCHAR2(250) | |
| 24 | 保证日期 | GUANRANTEER_DATE | VARCHAR2(8) | |
| 25 | 交易合同号 | CONTRACT_NO | VARCHAR2(32) | |

### 11.3 客户信息字段

| 序号 | 中文名称 | 字段 | 长度 | 备注 |
|------|---------|------|------|------|
| 1 | 客户号 | CUST_NO | VARCHAR2(20) | |
| 2 | 客户名称 | CUST_NAME | VARCHAR2(200) | |
| 3 | 客户账号 | CUST_ACCT_NO | VARCHAR2(32) | |
| 4 | 客户账户开户行 | CUST_BANK_NO | VARCHAR2(12) | |
| 5 | 客户账户开户行名称 | CUST_BANK_NAME | VARCHAR2(200) | |
| 6 | 组织机构代码 | ORG_CODE | VARCHAR2(10) | |
| 7 | 客户地址 | CUST_ADDRESS | VARCHAR2(250) | |

### 11.4 业务公共信息字段

| 序号 | 中文名称 | 字段 | 长度 | 备注 |
|------|---------|------|------|------|
| 1 | 法人编号 | MEMBER_NO | VARCHAR2(15) | 租户编号或法人编号 |
| 2 | 票据ID | BILL_ID | LONG | 票据交易登记中心票面信息表的ID |
| 3 | 清单ID | LIST_ID | LONG | 业务清单表中的ID |
| 4 | 业务批次ID | BATCH_ID | LONG | 批次表的ID |
| 5 | 业务批次编号 | BATCH_NO | VARCHAR2(15) | 2位模块号+yyyymmdd+5位数 |
| 6 | 交易ID | TRANS_ID | LONG | 交易登记中心交易ID |
| 7 | 机构ID | BRANCH_ID | LONG | 机构表ID |
| 8 | 机构编号 | BRANCH_NO | VARCHAR2(10) | 机构表编号 |
| 9 | 操作柜员ID | OPER_ID | LONG | 用户表ID |
| 10 | 操作柜员编号 | OPER_NO | VARCHAR2(20) | 用户表用户编号 |
| 11 | 额度是否检查标记 | CREDIT_FLAG | CHAR(1) | 1-是 0-否 |
| 12 | 利息是否计算标记 | INTEREST_FLAG | CHAR(1) | 1-是 0-否 |
| 13 | 是否同城 | IS_SAME_CITY | CHAR(1) | 1-同城 0-异地 |

---

## 12. 标准字段说明

### 12.1 基础字段

| 序号 | 中文名称 | 长度 | 数据库类型 | 备注 |
|------|---------|------|-----------|------|
| 1 | 主键ID | 16 | NUMBER(16,0) | |
| 2 | 名称 | 200 | VARCHAR2 | |
| 3 | 客户号 | 20 | VARCHAR2 | |
| 4 | 账号 | 32 | VARCHAR2 | |
| 5 | 机构号 | 10 | VARCHAR2 | |
| 6 | 联行号 | 12 | VARCHAR2 | |
| 7 | 状态 | 10 | VARCHAR2 | |
| 8 | 日期 | | DATE | |
| 9 | 时间 | | TIMESTAMP | |
| 10 | 票号 | 30 | VARCHAR2 | |
| 11 | 金额 | 16 | NUMBER(16,2) | |
| 12 | 利率 | 10 | NUMBER(10,6) | |
| 13 | 备注 | 250 | VARCHAR2 | |
| 14 | 地址 | 250 | VARCHAR2 | |
| 15 | 邮编 | 6 | VARCHAR2 | |
| 16 | 手机号码 | 11 | VARCHAR2 | |
| 17 | 联系电话 | 50 | VARCHAR2 | |
| 18 | 类型-简 | 1 | CHAR | 1:xx;2:yy,3:zz |
| 19 | 类型-复 | 10 | VARCHAR2 | |
| 20 | 标志位 | 1 | CHAR | 1-是 0-否 |
| 21 | 组织机构代码 | 10 | VARCHAR2 | |
| 22 | 客户经理编号 | 20 | VARCHAR2 | |
| 23 | 电子签名 | | CLOB | |
| 24 | 柜员号 | 20 | VARCHAR2 | |
| 25 | 产品编号 | 10 | VARCHAR2 | |
| 26 | 返回码 | 20 | VARCHAR2 | |
| 27 | 业务批次号 | 15 | VARCHAR2 | 2位模块号+yyyymmdd+5位数 |

---

## 13. 安全保密设计

### 13.1 访问控制

数据库的设计中，通过区分不同的访问者、不同的访问类型和不同的数据对象，进行分别对待而获得数据库安全保密的设计考虑：

1. **用户权限分级**: 根据用户角色分配不同的数据库访问权限
2. **数据隔离**: 通过 LEGAL_NO 字段实现多法人数据隔离
3. **敏感数据加密**: 对客户账号、密码等敏感信息进行加密存储
4. **操作审计**: 记录所有数据库操作日志，便于审计追溯

### 13.2 数据备份

1. **定期备份**: 每日进行数据库全量备份
2. **增量备份**: 每小时进行增量备份
3. **备份验证**: 定期验证备份数据的可恢复性

### 13.3 安全规范

1. **禁止直接访问生产数据库**: 所有数据操作必须通过应用层接口
2. **敏感字段脱敏**: 日志和导出文件中敏感字段必须脱敏
3. **SQL 注入防护**: 使用参数化查询，禁止拼接 SQL

---

## 附录 A. 恒生电子数据库编码规范补充

本章节内容来源于恒生电子数据库编码规范，作为河南农信 BEMP 数据库开发规范的补充。

### A.1 约束等级定义

| 约束等级 | 约束效力 | 强制性 |
|---------|---------|--------|
| 【强制】 | 违反该项将被认为代码存在严重缺陷 | 团队必须遵守 |
| 【推荐】 | 违反该项将被认为代码存在轻微缺陷 | 根据具体产品特性的不同，选择性地遵守 |
| 【参考】 | 违反该项可被认为代码存在优化空间 | 从产品持续优化及人员技能提升的角度，参考使用 |

### A.2 对象命名规范补充

#### A.2.1 对象命名格式

**【推荐】** 对象的命名由三部分组成：对象前缀+模块名+对象标识，使用下划线"_"进行分隔，长度不超过30个字符。例如：v_crm_custinfo。

| 对象类型 | 对象前缀 | 说明 |
|---------|---------|------|
| 表（table） | 无 | |
| 临时表（temporary table） | t 或 tmp | |
| 视图（view） | v | 格式：v_表名（不建议使用视图） |
| 非唯一索引（index） | idx | 格式：idx_表名_每列首字母 |
| 唯一索引（unique index） | uk | 格式：uk_表名_每列首字母（如果索引字段只有一个，建议索引名为 uk_表名_列名） |
| 主键（primary key） | pk | 格式：pk_表名 |
| 过程（procedure） | p 或 sp | 不建议使用 |
| 函数（function） | f 或 fn | 不建议使用 |

#### A.2.2 命名规则

**【推荐】** 命名只能使用英文字母、数字和下划线，全部使用小写字符。禁止以数字开头，名称前后不能加引号。

**【推荐】** 命名尽量采用有意义且简短的英文单词，最多使用四个单词。多个单词组成的，中间以下划线分隔。在不产生歧义的前提下可以使用单词简写，如：info, cfg 等。

**【推荐】** 字段命名时，含义要明确。比如 user 表的用户编号字段，不能仅仅命名为 id，应命名为 user_id。好处是在进行多表关联时更容易理解，比如 user.user_id = role.user_id。表达"是否"概念的字段，建议使用 is_ 作为前缀，如"是否删除"应命名为 is_deleted。

**【推荐】** 字段命名时避免数字在下划线之后。理由：避免 Jres 工具驼峰转下划线出问题。

**【强制】** 禁止使用数据库关键字和保留字进行命名。

**【推荐】** 不使用复数形式的名词，但只有复数形式的名词除外。必须使用复数形式的词，例如：news（新闻）、times（次数）。字段包含多个以逗号分隔的值时，应加后缀 _list。比如客户权限，值为 'a,b,c'，应命名为 client_privilege_list。

#### A.2.3 变量和参数命名

**【推荐】** 变量和参数的命名格式如下：变量前缀+变量标识。其中变量标识的命名方式同字段命名。本地变量以 v_ 为前缀，参数以 p_ 为前缀。例如 v_begin_date。

**【强制】** 除循环变量外，禁止使用单个字符（如 i、j、k）命名变量。

### A.3 格式规范补充

#### A.3.1 缩进

**【强制】** 代码块采用缩进风格书写，缩进格数为 2 个空格，禁止使用 tab 键。说明：每次缩进 2 个空格，并非每行缩进 2 个空格。

**【推荐】** 在 insert 语句中，insert 部分的字段应与 select/values 部分的字段一一对应，并且字段应与 into 关键字左对齐。

#### A.3.2 大小写

**【推荐】** 除字符串外，统一使用小写字符书写。说明：MySQL 在 Windows 下不区分大小写，但在 Linux 下默认是区分大小写的。建议将参数 lower_case_table_names 设为 1，规避大小写敏感问题。

#### A.3.3 换行

**【强制】** 不允许把多个短语句写在一行中，一行只写一条语句。

**【推荐】** 同一条语句中关键字右对齐。

**【推荐】** 相对独立的程序块之间需要用空行隔开，空行数必须是一行。如 if 语句、for 循环等代码块前后需要空一行。

**【推荐】** 对超过 120 字符的语句要分行书写，不出现水平滚动条为宜，在低优先级操作符处换行，操作符放在新行之首。

**【强制】** begin、end 等关键字独立成行。

#### A.3.4 空格

**【推荐】** 操作符前后应以空格分隔。

```sql
-- 推荐
set v_error_no = 0

-- 不推荐
set v_error_no=0
```

**【推荐】** 分隔符之后应以空格分隔。

```sql
-- 推荐
select 1, 2, 3

-- 不推荐
select 1,2,3
```

#### A.3.5 注释

**【推荐】** 脚本文件、函数、过程头部和代码修改处应进行注释，内容包括：创建者、创建日期、功能描述、修改记录。

**【强制】** 注释应紧挨其描述的代码，在其描述代码的上方或者右方。

**【推荐】** 注释如放在代码段的上方则应与其上面的代码段用空行隔开。

**【强制】** 注释与所描述的代码进行同样的缩进。

**【推荐】** 通过对函数、过程、变量等进行合理命名，使代码成为自注释的。

### A.4 设计规范补充

#### A.4.1 通用设计规范

**【推荐】** 字段应选择合适的数据类型及长度。尽量不要用 char 类型，用 varchar 类型代替。仅当存储的字符是相同、固定的长度且有非数字时使用 char 类型。

**【推荐】** 建表时字段应按下面的顺序从前往后排列：主键字段 > 常用字段 > 短小字段 > 非空字段 > 其他字段。

**【推荐】** 遵循三范式设计原则，个别情况下可考虑反范式设计。

**【推荐】** 表上的索引建议不超过 5 个，每个索引的字段数建议不超过 5 个。索引应该由 DBA 或技术经理统一管理维护，禁止开发和实施人员私自增加、改动。

**【强制】** 禁止使用外键，外键约束应该在应用层处理。建议在 ER 图里保留外键。

**【推荐】** 主键统一使用无符号整型，MySQL 设置该字段为 auto_increment 自增，Oracle 12c 使用 GENERATED ALWAYS AS IDENTITY 新特性定义该字段。理由：兼容 Oracle 和 MySQL 数据库，只维护一份表结构。业务 SQL 也便于兼容。

**【推荐】** 应用程序中原则上禁止对主键字段进行更新，如需更新，需要显性通过产品架构师审批。

#### A.4.2 MySQL 特有设计规范

**【推荐】** 使用 InnoDB 存储引擎。

**【推荐】** 字符集统一使用 UTF8MB4。

**【强制】** 所有表都必须有主键。

**【强制】** 禁止使用 enum/set/bool 类型。

**【推荐】** 尽量不使用 text/blobs 等大字段类型。

**【强制】** 禁止使用浮点类型 FLOAT 和 DOUBLE。

**【推荐】** 对较长的字符型字段建立索引时，应使用前缀索引。

**【推荐】** 字段建议定义为 not null，并且指定默认值。

#### A.4.3 Oracle 特有设计规范

**【推荐】** 表和索引的数据分不同表空间存储。

**【推荐】** 原则上每个表都应该有主键。优先使用业务主键，在业务主键超过 3 个字段时考虑使用逻辑主键，把业务主键建成唯一约束。

**【推荐】** 不建议在分区表上创建全局索引，原则上一律使用 local 索引。

**【推荐】** 字段类型使用字符型。理由：产品需要同时兼任多种数据库，Oracle 字段类型默认为字节型，MySQL 为字符型。为保证设计字段长度不会导致 MySQL 过长，或者 Oracle 长度不足，因此统一为字符型。

### A.5 语法规范补充

#### A.5.1 通用语法规范

**【强制】** 使用 SQL99 语法标准，在多表关联时用 join 关键字。

**【强制】** 禁止 select * 这样的代码，必须将字段名一一列出。

**【强制】** insert 语句中必须列出要插入的字段名。

**【强制】** 当 SQL 涉及到多个表时，必须为每个字段指定表名前缀。定义表和子查询的别名时不能重名。

**【强制】** 合并多个表的数据时，如果不需要去除重复数据或明确知道这些表的数据不存在重复，应使用 union all，而不是 union。union 需要做排序和去重操作，效率不如 union all。

**【推荐】** 尽量避免使用 or 操作符。

**【强制】** 对于不需要查询的字段，不要放在 select 子句中，尤其是 text/blob 等大字段。

**【推荐】** 应避免带 in 的子查询，尽量改写成 join。

**【强制】** 开发人员禁止私自使用 hint。hint 应提交给 DBA 或技术经理进行评估。

**【强制】** 外连接一律用 left join，禁止使用 right join。

**【推荐】** 尽量使用内连接，减少使用外连接，内连接效率比外连接高。

**【推荐】** where 条件列上禁止使用函数和表达式，也要避免数据类型的隐式转换。

**【推荐】** 避免不必要的排序。order by、group by、distinct、union 等操作都有可能排序。MySQL 中使用 group by 时，默认会进行排序，如果不需要排序，可以使用 order by null。

**【推荐】** 使用 like 进行模糊查询时，% 不要放在首位（尽量避免 '%abc%' 的写法），因为会限制对索引的使用。例如 like 'abc%' 可以走索引，而 like '%abc' 或者 '%abc%' 基本不会走索引。

**【推荐】** 原则上禁止使用触发器。

**【强制】** update 和 delete 语句必须有 where 子句。理由：避免遗漏条件而误对整表操作。

**【推荐】** 在查询语句中，如果查询表的数据量较大，尽量不使用自定义函数或标量子查询。

**【推荐】** 分页加载逻辑建议使用唯一键进行排序，因为 Oracle 对重复值的排序不稳定。

**【推荐】** 删除全表数据，建议使用 truncate 命令。

#### A.5.2 MySQL 特有语法规范

**【推荐】** 避免三个表以上的关联查询，避免大表间的 join。联表查询时，连接列的数据类型必须一致。

**【推荐】** 不建议使用存储过程、函数。

#### A.5.3 Oracle 特有语法规范

**【推荐】** 尽量使用静态 SQL，少用动态 SQL。使用动态 SQL 时要注意绑定变量。

**【强制】** 对于动态 SQL，新研发产品应该强制使用绑定变量。

**【推荐】** 原则上避免使用游标变量，必须使用时要及时关闭游标。

**【推荐】** 不要随意使用 commit，应保证事务完整性。理由：频繁 commit 不但不会带来性能上的提升，反而可能会有所降低。commit 应该放在循环体外。

**【强制】** 禁止使用 goto 语句来控制流程。

**【推荐】** 过程、函数中，确保所有的变量和参数都使用到，增强代码的严谨性。

**【推荐】** 变量赋值时，尽量使用 := 赋值替代 select into，因为前者效率高。

### A.6 版本移植规范

如果需要同时开发 Oracle 和 MySQL 两个版本，建议参考下面的编码规则，可一定程度上减少代码移植过程中的修改量。

**【推荐】** 对于单行注释应使用 "-- " 方式。

**【强制】** 对于字符串应该使用单引号括起来。理由：MySQL 还支持双引号的方式，但 Oracle 不支持。

**【推荐】** 尽量避免使用 full join。理由：MySQL 还不支持 full join。

**【推荐】** 避免在 group by 和 having 子句中使用列的别名。理由：Oracle 不支持这种语法。

**【推荐】** from 子句中的子查询要定义别名。理由：MySQL 中这个别名是必须要有的。

### A.7 脚本规范补充

#### A.7.1 脚本规范总则

**【推荐】** 脚本必须支持重复执行不报错。理由：不影响集成和测试等多次升级。

**【推荐】** 脚本名需要加上执行用户作为前缀，以".sql"文件格式存储。理由：便于及时发现脚本提交路径和执行用户不正确。

**【推荐】** 数据库中加入特定系统参数表标识数据库环境（如生产、测试），在执行 dml、ddl 脚本时先判断此参数是否吻合。理由：防止诸如清库等脚本在错误的环境执行。

**【强制】** 在修改代码的上一行书写注释，包括：修改日期，修改单编号/QC号：修改说明。

```sql
-- 20210506 Mxxxxxxxx：新增字段xxxxxxxxx
-- 20210507 Mxxxxxxxx：新增索引xxxxxxxxx
```

**【强制】** 对于业务依赖的修改，应在代码逻辑上保证其依赖性。理由：防止上一步执行失败后，继续执行下一步操作。

**【推荐】** 在脚本前部应打印脚本名称或标记。理由：在升级报错时能快速定位。

**【推荐】** 在升级前对重要数据进行统一备份，其他数据可在脚本中自行备份。理由：便于升级异常后的数据恢复。

**【推荐】** 升级脚本集成时，需要将脚本执行日志落地到本地文件。理由：便于后期对升级进行回溯。

**【推荐】** 对执行耗时较长的脚本，在执行前进行提示。理由：提高升级友好性。

#### A.7.2 MySQL 特有脚本规范

**【推荐】** 脚本中需要判断执行数据库是否正确。理由：防止脚本在错误的数据库下执行。

**【推荐】** 代码中避免使用反引号"`"。理由：防止数据库将特殊代码强制解析。

**【推荐】** 脚本前加入开启或关闭自动提交事务的控制语句。理由：防止破坏事务原子性。

#### A.7.3 Oracle 特有脚本规范

**【强制】** PLSQL 匿名块脚本后需要增加"/"，顶格书写单独成行。理由：Oracle 语法格式要求。

**【推荐】** 文件头加上 set define off; 文件尾加上 set define on; 理由：防止脚本中含有引用字符而导致报错。

**【推荐】** 脚本中需要判断执行用户是否正确。理由：防止脚本被错误的用户执行。

#### A.7.4 数据库对象脚本规范

**【强制】** 单个表的表结构修改代码写在一个文件中。理由：防止脚本执行先后顺序不一致产生报错。

**【推荐】** 对表结构的修改应调用专门的过程来处理。如：增加表字段、增删索引等。理由：减少重复代码，降低出错率。

**【强制】** 对数据库对象的创建、修改、删除和数据的新增、修改前，应先进行存在性判断。理由：防止升级对象已存在或不存在造成脚本报错。

**【强制】** 在表上新增字段时，若指定默认值，则必须指定 not null。理由：防止表数据太多导致升级卡住。

**【推荐】** 不对表中已存在的字段进行删除，可以使用重命名代替。理由：删除字段时影响太大，表中数据太多时存在安全隐患。

**【强制】** 对数据库表进行删除、重建之后，应恢复该表原有的索引和约束。理由：防止因缺少索引对性能造成影响，防止因缺少约束对数据质量造成影响。

**【强制】** 对数据库对象进行删除、重建之后，应恢复该对象原有的对外权限。理由：防止升级之后其它用户访问不到该对象。

**【推荐】** 对表进行增加字段时，应同时加上字段备注。理由：对字段的用途更加清楚。

#### A.7.5 表数据脚本规范

**【强制】** 单个表的表数据修改代码写在一个文件中。理由：防止脚本执行先后顺序不一致造成数据修改被覆盖。

**【强制】** 在书写 update 和 delete 语句时，必须带有 where 条件，否则需要由特定人员审核。理由：防止遗漏过滤条件对整表数据进行操作。

### A.8 脚本示例

建议将下列示例中的判断存在性和对象操作语句封装在过程中，脚本直接调用过程来进行修改。

#### A.8.1 Oracle 新增表示例

```sql
set define off;
set feedback off;
prompt 脚本文件名或标记
declare
  v_rowcount number;
begin
  -- 20210506 M2021050600001：创建表【表名】
  select count(*)
    into v_rowcount
   from user_tables
  where table_name = upper('表名');

  if v_rowcount = 0 then
    execute immediate '具体的建表语句';
  end if;
end;
/
set define on;
set feedback on;
```

#### A.8.2 Oracle 新增字段示例

```sql
set define off;
set feedback off;
prompt 脚本文件名或标记
declare
  v_rowcount number;
begin
  -- 20210506 M2021050600001：新增字段【字段名】
  select count(*)
    into v_rowcount
   from user_tab_columns
  where table_name = upper('表名')
    and column_name = upper('字段名');

  if v_rowcount = 0 then
    execute immediate 'alter table 表名 add 字段名 字段类型 default 默认值 not null';
    execute immediate 'comment on column 表名.字段名 is ''字段中文名''';
  end if;
end;
/
set define on;
set feedback on;
```

#### A.8.3 MySQL 新增表示例

```sql
select '脚本文件名或标记';
use 数据库名;
-- 20210506 M2021050600001：创建表【表名】
create table if not exists 数据库名.表名 (
  具体的建表语句
) engine = 存储引擎 default charset = 字符集 collate = 校对集 comment = '表注释';
```

#### A.8.4 MySQL 新增字段示例

```sql
select '脚本文件名或标记';
use 数据库名;
-- 20210506 M2021050600001：新增字段【字段名】
set @v_count = 0;
select count(*) into @v_count 
from information_schema.columns 
where TABLE_SCHEMA = '数据库名' 
  and TABLE_NAME = '表名' 
  and column_name = '字段名';
set @sql = if(@v_count = 0, "增加字段语句", "select '表名.字段名 is OK.'");
prepare stmt from @sql;
execute stmt;
```


---

## 二、代码模板

# 河南农信 BEMP 数据库开发模板

## 目录

- [1. DDL 模板](#1-ddl 模板)
- [2. DML 模板](#2-dml 模板)
- [3. DAO 接口模板](#3-dao 接口模板)
- [4. MyBatis Mapper 模板](#4-mybatis-mapper 模板)
- [5. Entity 实体类模板](#5-entity 实体类模板)
- [6. 序列创建模板](#6-序列创建模板)
- [7. 索引创建模板](#7-索引创建模板)
- [8. 变更脚本模板](#8-变更脚本模板)

---

## 1. DDL 模板

### 1.1 Oracle 建表模板

```sql
-- 脚本头部注释
-- 需求编号：[需求编号]
-- 变更描述：[表名] - [表说明]
-- 开发人员：[姓名]
-- 变更日期：[YYYY-MM-DD]
-- 评审人员：[姓名]

-- 创建表
CREATE TABLE [TABLE_NAME] (
    ID              number(16,0) NOT NULL,     -- 主键 ID
    LEGAL_NO        varchar2(6),                -- 法人编号
    [BUSINESS_FIELDS],                          -- 业务字段
    CREATE_TIME     number(17,0),               -- 创建时间
    UPDATE_TIME     number(17,0),               -- 更新时间
    RESERVE1        varchar2(255),              -- 预留字段 1
    RESERVE2        varchar2(255),              -- 预留字段 2
    RESERVE3        varchar2(255),              -- 预留字段 3
    CONSTRAINT pk_[TABLE_NAME] PRIMARY KEY (ID)
) TABLESPACE [TABLESPACE_NAME];

-- 字段注释
COMMENT ON TABLE [TABLE_NAME] IS '[表说明]';
COMMENT ON COLUMN [TABLE_NAME].ID IS '主键 ID';
COMMENT ON COLUMN [TABLE_NAME].LEGAL_NO IS '法人编号';
[BUSINESS_FIELD_COMMENTS]
COMMENT ON COLUMN [TABLE_NAME].CREATE_TIME IS '创建时间';
COMMENT ON COLUMN [TABLE_NAME].UPDATE_TIME IS '更新时间';
COMMENT ON COLUMN [TABLE_NAME].RESERVE1 IS '预留字段 1';
COMMENT ON COLUMN [TABLE_NAME].RESERVE2 IS '预留字段 2';
COMMENT ON COLUMN [TABLE_NAME].RESERVE3 IS '预留字段 3';

-- 提交
COMMIT;
```

### 1.2 MySQL 建表模板

```sql
-- 脚本头部注释
-- 需求编号：[需求编号]
-- 变更描述：[表名] - [表说明]
-- 开发人员：[姓名]
-- 变更日期：[YYYY-MM-DD]
-- 评审人员：[姓名]

-- 创建表
CREATE TABLE [TABLE_NAME] (
    ID              bigint NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    LEGAL_NO        varchar(6) COMMENT '法人编号',
    [BUSINESS_FIELDS],
    CREATE_TIME     bigint COMMENT '创建时间',
    UPDATE_TIME     bigint COMMENT '更新时间',
    RESERVE1        varchar(255) COMMENT '预留字段 1',
    RESERVE2        varchar(255) COMMENT '预留字段 2',
    RESERVE3        varchar(255) COMMENT '预留字段 3',
    PRIMARY KEY (ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='[表说明]';
```

### 1.3 DB2 建表模板

```sql
-- 脚本头部注释
-- 需求编号：[需求编号]
-- 变更描述：[表名] - [表说明]
-- 开发人员：[姓名]
-- 变更日期：[YYYY-MM-DD]
-- 评审人员：[姓名]

-- 创建表
CREATE TABLE [TABLE_NAME] (
    ID              bigint NOT NULL,
    LEGAL_NO        varchar(6),
    [BUSINESS_FIELDS],
    CREATE_TIME     bigint,
    UPDATE_TIME     bigint,
    RESERVE1        varchar(255),
    RESERVE2        varchar(255),
    RESERVE3        varchar(255),
    CONSTRAINT pk_[TABLE_NAME] PRIMARY KEY (ID)
) IN [TABLESPACE_NAME];

-- 字段注释
COMMENT ON TABLE [TABLE_NAME] IS '[表说明]';
COMMENT ON COLUMN [TABLE_NAME].ID IS '主键 ID';
COMMENT ON COLUMN [TABLE_NAME].LEGAL_NO IS '法人编号';
[BUSINESS_FIELD_COMMENTS]
COMMENT ON COLUMN [TABLE_NAME].CREATE_TIME IS '创建时间';
COMMENT ON COLUMN [TABLE_NAME].UPDATE_TIME IS '更新时间';
COMMENT ON COLUMN [TABLE_NAME].RESERVE1 IS '预留字段 1';
COMMENT ON COLUMN [TABLE_NAME].RESERVE2 IS '预留字段 2';
COMMENT ON COLUMN [TABLE_NAME].RESERVE3 IS '预留字段 3';

-- 提交
COMMIT;
```

### 1.4 建表完整示例

```sql
-- 需求编号：T202301010001
-- 变更描述：TM_FOCUS_OPER - 集中操作表
-- 开发人员：张三
-- 变更日期：2023-01-01
-- 评审人员：李四

-- 创建表
CREATE TABLE TM_FOCUS_OPER (
    ID                 number(16,0) NOT NULL,
    LEGAL_NO           varchar2(6),
    FOCUS_TYPE         varchar2(4),
    AUTH_ID            number(16,0),
    LICENSE_USER_NO    varchar2(20),
    LICENSE_USER_NAME  varchar2(50),
    LICENSE_BRCH_NO    varchar2(30),
    LICENSE_BRCH_NAME  varchar2(255),
    LICENSED_BRCH_NO   varchar2(30),
    LICENSED_BRCH_NAME varchar2(255),
    CREATE_TIME        number(17,0),
    UPDATE_TIME        number(17,0),
    RESERVE1           varchar2(255),
    RESERVE2           varchar2(255),
    RESERVE3           varchar2(255),
    CONSTRAINT pk_TM_FOCUS_OPER PRIMARY KEY (ID)
) TABLESPACE TBS_DATA_BILL;

-- 字段注释
COMMENT ON TABLE TM_FOCUS_OPER IS '集中操作表';
COMMENT ON COLUMN TM_FOCUS_OPER.ID IS '主键 ID';
COMMENT ON COLUMN TM_FOCUS_OPER.LEGAL_NO IS '法人编号';
COMMENT ON COLUMN TM_FOCUS_OPER.FOCUS_TYPE IS '集中管理模式';
COMMENT ON COLUMN TM_FOCUS_OPER.AUTH_ID IS '权限 id';
COMMENT ON COLUMN TM_FOCUS_OPER.LICENSE_USER_NO IS '授权用户编号';
COMMENT ON COLUMN TM_FOCUS_OPER.LICENSE_USER_NAME IS '授权用户姓名';
COMMENT ON COLUMN TM_FOCUS_OPER.LICENSE_BRCH_NO IS '授权机构号';
COMMENT ON COLUMN TM_FOCUS_OPER.LICENSE_BRCH_NAME IS '授权机构名';
COMMENT ON COLUMN TM_FOCUS_OPER.LICENSED_BRCH_NO IS '被授权机构号';
COMMENT ON COLUMN TM_FOCUS_OPER.LICENSED_BRCH_NAME IS '被授权机构名';
COMMENT ON COLUMN TM_FOCUS_OPER.CREATE_TIME IS '创建时间';
COMMENT ON COLUMN TM_FOCUS_OPER.UPDATE_TIME IS '修改时间';
COMMENT ON COLUMN TM_FOCUS_OPER.RESERVE1 IS '预留字段 1';
COMMENT ON COLUMN TM_FOCUS_OPER.RESERVE2 IS '预留字段 2';
COMMENT ON COLUMN TM_FOCUS_OPER.RESERVE3 IS '预留字段 3';

-- 提交
COMMIT;
```

---

## 2. DML 模板

### 2.1 插入数据模板

```sql
-- 插入单条记录
INSERT INTO [TABLE_NAME] (
    ID,
    LEGAL_NO,
    [BUSINESS_FIELDS],
    CREATE_TIME,
    UPDATE_TIME
) VALUES (
    #{id},
    #{legalNo},
    [businessValues],
    #{createTime},
    #{updateTime}
);

-- 批量插入 (Oracle)
INSERT ALL
    INTO [TABLE_NAME] (ID, LEGAL_NO, ...) VALUES (SEQ_[TABLE_NAME].NEXTVAL, '000000', ...)
    INTO [TABLE_NAME] (ID, LEGAL_NO, ...) VALUES (SEQ_[TABLE_NAME].NEXTVAL, '000000', ...)
SELECT 1 FROM DUAL;

-- 批量插入 (MySQL)
INSERT INTO [TABLE_NAME] (ID, LEGAL_NO, ...) VALUES
(1, '000000', ...),
(2, '000000', ...),
(3, '000000', ...);
```

### 2.2 更新数据模板

```sql
-- 按主键更新
UPDATE [TABLE_NAME]
SET 
    [BUSINESS_FIELDS] = #{businessFields},
    UPDATE_TIME = #{updateTime}
WHERE ID = #{id}
    AND LEGAL_NO = #{legalNo};

-- 按条件批量更新
UPDATE [TABLE_NAME]
SET 
    STATUS = #{status},
    UPDATE_TIME = #{updateTime}
WHERE LEGAL_NO = #{legalNo}
    AND [CONDITION_FIELDS];
```

### 2.3 删除数据模板

```sql
-- 逻辑删除 (推荐)
UPDATE [TABLE_NAME]
SET 
    STATUS = '9',
    UPDATE_TIME = #{updateTime}
WHERE ID = #{id};

-- 物理删除 (谨慎使用)
DELETE FROM [TABLE_NAME]
WHERE ID = #{id}
    AND LEGAL_NO = #{legalNo};

-- 批量删除
DELETE FROM [TABLE_NAME]
WHERE ID IN
<foreach collection="ids" item="id" open="(" separator="," close=")">
    #{id}
</foreach>;
```

### 2.4 查询数据模板

```sql
-- 按主键查询
SELECT 
    ID,
    LEGAL_NO,
    [BUSINESS_FIELDS],
    CREATE_TIME,
    UPDATE_TIME
FROM [TABLE_NAME]
WHERE ID = #{id};

-- 按条件查询
SELECT 
    ID,
    LEGAL_NO,
    [BUSINESS_FIELDS],
    CREATE_TIME,
    UPDATE_TIME
FROM [TABLE_NAME]
WHERE LEGAL_NO = #{legalNo}
    AND STATUS = '1'
    <if test="brchNo != null">
        AND BRCH_NO = #{brchNo}
    </if>
ORDER BY CREATE_TIME DESC;

-- 分页查询
SELECT 
    ID,
    LEGAL_NO,
    [BUSINESS_FIELDS]
FROM [TABLE_NAME]
WHERE LEGAL_NO = #{legalNo}
LIMIT #{offset}, #{pageSize};

-- 统计查询
SELECT COUNT(*)
FROM [TABLE_NAME]
WHERE LEGAL_NO = #{legalNo}
    AND STATUS = '1';
```

---

## 3. DAO 接口模板

### 3.1 基础 DAO 模板

```java
package com.hundsun.bemp.hnnxbank.biz.[module].dao.[entity];

import com.hundsun.bemp.fw.dao.base.BaseDao;
import com.hundsun.bemp.[module].dao.[entity].entity.[Entity];
import com.hundsun.bemp.[module].dao.[entity].entity.[Entity]Example;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * [Entity] 数据访问对象
 * 
 * @ProductName: bemp
 * @Author: [姓名]
 * @Date: [日期]
 * <p>
 * -----------------------------------------------------------------------------------------------------
 * | 修改单号 | 修改人员 | 修改日期 | 评审人员 | 修改说明
 * -----------------------------------------------------------------------------------------------------
 * |        |         |         |         |
 * -----------------------------------------------------------------------------------------------------
 * <p>
 * Copyright © 2020 Hundsun Technologies Inc. All Rights Reserved
 **/
public interface [Entity]Dao extends BaseDao<[Entity], [Entity]Example, Long> {

    /**
     * 按条件分页查询
     * 
     * @param example 查询条件
     * @param pageInfo 分页信息
     * @return 查询结果列表
     */
    List<[Entity]> pageByExample([Entity]Example example, PageInfo pageInfo);

    /**
     * 自定义查询方法
     * 
     * @param [param] 查询参数
     * @return 查询结果
     */
    List<[Entity]> selectBy[Condition](@Param("[param]") [ParamType] [param]);
}
```

### 3.2 扩展 DAO 模板

```java
package com.hundsun.bemp.hnnxbank.biz.[module].dao.[entity];

import com.hundsun.bemp.fw.dao.base.BaseDao;
import com.hundsun.bemp.[module].dao.[entity].entity.[Entity];
import com.hundsun.bemp.[module].dao.[entity].entity.[Entity]Example;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * [Entity] 扩展数据访问对象
 * 
 * @ProductName: bemp
 * @Author: [姓名]
 * @Date: [日期]
 **/
public interface Hnnx[Entity]Dao extends BaseDao<[Entity], [Entity]Example, Long> {

    /**
     * 个性化分页查询
     * 
     * @param query 查询条件 DTO
     * @param pageInfo 分页信息
     * @return 查询结果列表
     */
    Page<[Entity]> pageQueryHnnx[Entity]s(
        @Param("query") [QueryDto] query, 
        @Param("pageInfo") PageInfo pageInfo
    );

    /**
     * 批量插入
     * 
     * @param list 实体列表
     * @return 影响行数
     */
    int batchInsert(@Param("list") List<[Entity]> list);

    /**
     * 批量更新
     * 
     * @param list 实体列表
     * @return 影响行数
     */
    int batchUpdate(@Param("list") List<[Entity]> list);
}
```

---

## 4. MyBatis Mapper 模板

### 4.1 基础 Mapper XML 模板

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" 
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.hundsun.bemp.hnnxbank.biz.[module].dao.[entity].[Entity]Dao">
    
    <!-- 结果映射 -->
    <resultMap id="BaseResultMap" type="[EntityFullClassPath]">
        <id column="ID" jdbcType="BIGINT" property="id" />
        <result column="LEGAL_NO" jdbcType="VARCHAR" property="legalNo" />
        <result column="FIELD1" jdbcType="VARCHAR" property="field1" />
        <result column="FIELD2" jdbcType="DECIMAL" property="field2" />
        <result column="CREATE_TIME" jdbcType="BIGINT" property="createTime" />
        <result column="UPDATE_TIME" jdbcType="BIGINT" property="updateTime" />
        <result column="RESERVE1" jdbcType="VARCHAR" property="reserve1" />
        <result column="RESERVE2" jdbcType="VARCHAR" property="reserve2" />
        <result column="RESERVE3" jdbcType="VARCHAR" property="reserve3" />
    </resultMap>
    
    <!-- 基础列 -->
    <sql id="Base_Column_List">
        ID, LEGAL_NO, FIELD1, FIELD2, CREATE_TIME, UPDATE_TIME, RESERVE1, RESERVE2, RESERVE3
    </sql>
    
    <!-- 分页查询 -->
    <select id="pageByExample" resultMap="BaseResultMap">
        SELECT 
        <include refid="Base_Column_List" />
        FROM [TABLE_NAME]
        <where>
            <if test="example.legalNo != null and example.legalNo != ''">
                AND LEGAL_NO = #{example.legalNo}
            </if>
            <if test="example.status != null and example.status != ''">
                AND STATUS = #{example.status}
            </if>
        </where>
        ORDER BY CREATE_TIME DESC
    </select>
    
    <!-- 自定义查询 -->
    <select id="selectBy[Condition]" resultMap="BaseResultMap">
        SELECT 
        <include refid="Base_Column_List" />
        FROM [TABLE_NAME]
        WHERE LEGAL_NO = #{legalNo}
            AND [CONDITION] = #{[param]}
    </select>
    
    <!-- 批量插入 -->
    <insert id="batchInsert" parameterType="java.util.List">
        INSERT INTO [TABLE_NAME] (
            ID, LEGAL_NO, FIELD1, FIELD2, CREATE_TIME, UPDATE_TIME
        ) VALUES
        <foreach collection="list" item="item" separator=",">
            (
                #{item.id},
                #{item.legalNo},
                #{item.field1},
                #{item.field2},
                #{item.createTime},
                #{item.updateTime}
            )
        </foreach>
    </insert>
    
    <!-- 批量更新 -->
    <update id="batchUpdate" parameterType="java.util.List">
        <foreach collection="list" item="item" separator=";">
            UPDATE [TABLE_NAME]
            SET 
                FIELD1 = #{item.field1},
                FIELD2 = #{item.field2},
                UPDATE_TIME = #{item.updateTime}
            WHERE ID = #{item.id}
        </foreach>
    </update>
</mapper>
```

### 4.2 扩展 Mapper XML 模板

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" 
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.hundsun.bemp.hnnxbank.biz.[module].dao.[entity].Hnnx[Entity]Dao">
    
    <!-- 继承基础 ResultMap -->
    <resultMap id="HnnxResultMap" type="[EntityFullClassPath]" extends="BaseResultMap">
        <!-- 扩展字段 -->
    </resultMap>
    
    <!-- 个性化分页查询 -->
    <select id="pageQueryHnnx[Entity]s" resultMap="HnnxResultMap">
        SELECT DISTINCT e.*
        FROM [TABLE_NAME] e
        <if test="query.hasJoin">
            INNER JOIN [JOIN_TABLE] j ON e.ID = j.[ENTITY]_ID
        </if>
        WHERE 1=1
        <if test="query.legalNo != null and query.legalNo != ''">
            AND e.LEGAL_NO = #{query.legalNo}
        </if>
        <if test="query.brchNo != null and query.brchNo != ''">
            AND e.BRCH_NO = #{query.brchNo}
        </if>
        <if test="query.status != null and query.status != ''">
            AND e.STATUS = #{query.status}
        </if>
        <if test="query.[condition] != null">
            AND e.[FIELD] = #{query.[condition]}
        </if>
        <if test="query.keyword != null and query.keyword != ''">
            AND (e.NAME LIKE CONCAT(CONCAT('%', #{query.keyword}), '%')
                 OR e.CODE LIKE CONCAT(CONCAT('%', #{query.keyword}), '%'))
        </if>
        <if test="query.ids != null and query.ids.size() > 0">
            AND e.ID IN
            <foreach collection="query.ids" item="id" open="(" separator="," close=")">
                #{id}
            </foreach>
        </if>
        ORDER BY e.CREATE_TIME DESC
    </select>
    
    <!-- 统计查询 -->
    <select id="countByCondition" resultType="java.lang.Long">
        SELECT COUNT(*)
        FROM [TABLE_NAME] e
        <where>
            <if test="query.legalNo != null">
                AND e.LEGAL_NO = #{query.legalNo}
            </if>
            <if test="query.status != null">
                AND e.STATUS = #{query.status}
            </if>
        </where>
    </select>
</mapper>
```

---

## 5. Entity 实体类模板

### 5.1 基础 Entity 模板

```java
package com.hundsun.bemp.[module].dao.[entity].entity;

import com.hundsun.bemp.fw.dao.mybatis.plugin.annotations.PrimaryKey;
import com.hundsun.bemp.fw.dao.mybatis.plugin.annotations.TableName;

import java.io.Serializable;

/**
 * [Entity] 实体类
 * 
 * @ProductName: bemp
 * @Author: [姓名]
 * @Date: [日期]
 **/
@TableName("[TABLE_NAME]")
public class [Entity] implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * 主键 ID
     */
    @PrimaryKey(type = PrimaryKey.Type.SEQUENCE, value = "SEQ_[TABLE_NAME]")
    private Long id;
    
    /**
     * 法人编号
     */
    private String legalNo;
    
    /**
     * [字段说明]
     */
    private String field1;
    
    /**
     * [字段说明]
     */
    private Long createTime;
    
    /**
     * 更新时间
     */
    private Long updateTime;
    
    /**
     * 预留字段 1
     */
    private String reserve1;
    
    /**
     * 预留字段 2
     */
    private String reserve2;
    
    /**
     * 预留字段 3
     */
    private String reserve3;
    
    // Getter 和 Setter 方法
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getLegalNo() {
        return legalNo;
    }
    
    public void setLegalNo(String legalNo) {
        this.legalNo = legalNo;
    }
    
    public String getField1() {
        return field1;
    }
    
    public void setField1(String field1) {
        this.field1 = field1;
    }
    
    public Long getCreateTime() {
        return createTime;
    }
    
    public void setCreateTime(Long createTime) {
        this.createTime = createTime;
    }
    
    public Long getUpdateTime() {
        return updateTime;
    }
    
    public void setUpdateTime(Long updateTime) {
        this.updateTime = updateTime;
    }
    
    public String getReserve1() {
        return reserve1;
    }
    
    public void setReserve1(String reserve1) {
        this.reserve1 = reserve1;
    }
    
    public String getReserve2() {
        return reserve2;
    }
    
    public void setReserve2(String reserve2) {
        this.reserve2 = reserve2;
    }
    
    public String getReserve3() {
        return reserve3;
    }
    
    public void setReserve3(String reserve3) {
        this.reserve3 = reserve3;
    }
}
```

### 5.2 Example 查询条件模板

```java
package com.hundsun.bemp.[module].dao.[entity].entity;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * [Entity] 查询条件类
 * 
 * @ProductName: bemp
 * @Author: [姓名]
 * @Date: [日期]
 **/
public class [Entity]Example implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * 排序字段
     */
    private String orderByClause;
    
    /**
     * 是否去重
     */
    private boolean distinct;
    
    /**
     * 查询条件列表
     */
    protected List<Criteria> oredCriteria;
    
    /**
     * 法人编号
     */
    private String legalNo;
    
    /**
     * 状态
     */
    private String status;
    
    /**
     * 构造函数
     */
    public [Entity]Example() {
        oredCriteria = new ArrayList<Criteria>();
    }
    
    /**
     * 设置排序字段
     */
    public void setOrderByClause(String orderByClause) {
        this.orderByClause = orderByClause;
    }
    
    /**
     * 获取排序字段
     */
    public String getOrderByClause() {
        return orderByClause;
    }
    
    /**
     * 设置是否去重
     */
    public void setDistinct(boolean distinct) {
        this.distinct = distinct;
    }
    
    /**
     * 获取是否去重
     */
    public boolean isDistinct() {
        return distinct;
    }
    
    /**
     * 获取查询条件列表
     */
    public List<Criteria> getOredCriteria() {
        return oredCriteria;
    }
    
    /**
     * 添加查询条件
     */
    public void or(Criteria criteria) {
        oredCriteria.add(criteria);
    }
    
    /**
     * 创建查询条件
     */
    public Criteria or() {
        Criteria criteria = createCriteriaInternal();
        oredCriteria.add(criteria);
        return criteria;
    }
    
    /**
     * 创建查询条件
     */
    public Criteria createCriteria() {
        Criteria criteria = createCriteriaInternal();
        if (oredCriteria.size() == 0) {
            oredCriteria.add(criteria);
        }
        return criteria;
    }
    
    /**
     * 创建查询条件 (内部方法)
     */
    protected Criteria createCriteriaInternal() {
        Criteria criteria = new Criteria();
        return criteria;
    }
    
    /**
     * 清除查询条件
     */
    public void clear() {
        oredCriteria.clear();
        orderByClause = null;
        distinct = false;
    }
    
    // Getter 和 Setter
    public String getLegalNo() {
        return legalNo;
    }
    
    public void setLegalNo(String legalNo) {
        this.legalNo = legalNo;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    /**
     * 内部条件类
     */
    protected abstract static class GeneratedCriteria {
        protected List<Criterion> criteria;
        
        protected GeneratedCriteria() {
            super();
            criteria = new ArrayList<Criterion>();
        }
        
        public boolean isValid() {
            return criteria.size() > 0;
        }
        
        public List<Criterion> getAllCriteria() {
            return criteria;
        }
        
        public List<Criterion> getCriteria() {
            return criteria;
        }
        
        protected void addCriterion(String condition) {
            if (condition == null) {
                throw new RuntimeException("Value for condition cannot be null");
            }
            criteria.add(new Criterion(condition));
        }
        
        protected void addCriterion(String condition, Object value, String property) {
            if (value == null) {
                throw new RuntimeException("Value for " + property + " cannot be null");
            }
            criteria.add(new Criterion(condition, value));
        }
        
        protected void addCriterion(String condition, Object value1, Object value2, String property) {
            if (value1 == null || value2 == null) {
                throw new RuntimeException("Between values for " + property + " cannot be null");
            }
            criteria.add(new Criterion(condition, value1, value2));
        }
        
        // 添加具体的查询条件方法
        public Criteria andIdEqualTo(Long value) {
            addCriterion("ID =", value, "id");
            return (Criteria) this;
        }
        
        public Criteria andLegalNoEqualTo(String value) {
            addCriterion("LEGAL_NO =", value, "legalNo");
            return (Criteria) this;
        }
        
        public Criteria andStatusEqualTo(String value) {
            addCriterion("STATUS =", value, "status");
            return (Criteria) this;
        }
    }
    
    /**
     * 条件类
     */
    public static class Criteria extends GeneratedCriteria {
        protected Criteria() {
            super();
        }
    }
    
    /**
     * 条件封装类
     */
    public static class Criterion {
        private String condition;
        private Object value;
        private Object secondValue;
        private boolean noValue;
        private boolean singleValue;
        private boolean betweenValue;
        private boolean listValue;
        
        protected Criterion(String condition) {
            super();
            this.condition = condition;
            this.noValue = true;
        }
        
        protected Criterion(String condition, Object value) {
            super();
            this.condition = condition;
            this.value = value;
            if (value instanceof List<?>) {
                this.listValue = true;
            } else {
                this.singleValue = true;
            }
        }
        
        protected Criterion(String condition, Object value, Object secondValue) {
            super();
            this.condition = condition;
            this.value = value;
            this.secondValue = secondValue;
            this.betweenValue = true;
        }
        
        // Getter 方法
        public String getCondition() {
            return condition;
        }
        
        public Object getValue() {
            return value;
        }
        
        public Object getSecondValue() {
            return secondValue;
        }
        
        public boolean isNoValue() {
            return noValue;
        }
        
        public boolean isSingleValue() {
            return singleValue;
        }
        
        public boolean isBetweenValue() {
            return betweenValue;
        }
        
        public boolean isListValue() {
            return listValue;
        }
    }
}
```

---

## 6. 序列创建模板

### 6.1 Oracle 序列模板

```sql
-- 创建序列
CREATE SEQUENCE SEQ_[TABLE_NAME]
START WITH 1              -- 起始值
INCREMENT BY 1            -- 步长
MINVALUE 1                -- 最小值
NOMAXVALUE                -- 无最大值
NOCACHE                   -- 不缓存
NOCYCLE;                  -- 不循环

-- 使用示例
INSERT INTO [TABLE_NAME] (ID, ...)
VALUES (SEQ_[TABLE_NAME].NEXTVAL, ...);

-- 查询当前值
SELECT SEQ_[TABLE_NAME].CURRVAL FROM DUAL;

-- 查询下一个值
SELECT SEQ_[TABLE_NAME].NEXTVAL FROM DUAL;

-- 删除序列
DROP SEQUENCE SEQ_[TABLE_NAME];
```

### 6.2 序列使用示例

```sql
-- 需求编号：T202301010001
-- 变更描述：创建 TM_FOCUS_OPER 表序列
-- 开发人员：张三
-- 变更日期：2023-01-01

-- 创建序列
CREATE SEQUENCE SEQ_TM_FOCUS_OPER
START WITH 1
INCREMENT BY 1
MINVALUE 1
NOMAXVALUE
NOCACHE
NOCYCLE;

-- 提交
COMMIT;
```

---

## 7. 索引创建模板

### 7.1 单列索引模板

```sql
-- 创建单列索引
CREATE INDEX idx_[TABLE_NAME]_[FIELD] 
ON [TABLE_NAME] ([FIELD])
TABLESPACE [TABLESPACE_NAME];

-- 示例
CREATE INDEX idx_tm_focus_oper_legal_no 
ON tm_focus_oper (legal_no)
TABLESPACE TBS_DATA_BILL;
```

### 7.2 复合索引模板

```sql
-- 创建复合索引 (注意字段顺序)
CREATE INDEX idx_[TABLE_NAME]_[FIELD1]_[FIELD2] 
ON [TABLE_NAME] ([FIELD1], [FIELD2])
TABLESPACE [TABLESPACE_NAME];

-- 示例
CREATE INDEX idx_te_ce_acpt_batch_2 
ON te_ce_acpt_batch (trans_brch_no, create_time)
TABLESPACE TBS_DATA_BILL;
```

### 7.3 唯一索引模板

```sql
-- 创建唯一索引
CREATE UNIQUE INDEX uk_[TABLE_NAME]_[FIELD] 
ON [TABLE_NAME] ([FIELD])
TABLESPACE [TABLESPACE_NAME];

-- 示例
CREATE UNIQUE INDEX uk_tm_user_no 
ON tm_user (user_no)
TABLESPACE TBS_DATA_BILL;
```

### 7.4 函数索引模板

```sql
-- 创建函数索引
CREATE INDEX idx_[TABLE_NAME]_[FUNC] 
ON [TABLE_NAME] (UPPER([FIELD]))
TABLESPACE [TABLESPACE_NAME];

-- 示例
CREATE INDEX idx_tm_user_name_upper 
ON tm_user (UPPER(user_name))
TABLESPACE TBS_DATA_BILL;
```

---

## 8. 变更脚本模板

### 8.1 DDL 变更脚本模板

```sql
-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：[需求编号]
-- 变更描述：[详细描述]
-- 影响范围：[影响的模块和功能]
-- 开发人员：[姓名]
-- 开发日期：[YYYY-MM-DD]
-- 评审人员：[姓名]
-- 测试人员：[姓名]
-- 版本号：[V5.0.0.0]
-- ==========================================================================

-- 开始时间
WHENEVER SQLERROR EXIT SQL.SQLCODE;
SET SERVEROUTPUT ON;
DECLARE
    v_count NUMBER;
BEGIN
    DBMS_OUTPUT.PUT_LINE('开始执行变更脚本...');
    DBMS_OUTPUT.PUT_LINE('执行时间：' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));
END;
/

-- ==========================================================================
-- 变更内容
-- ==========================================================================

-- 1. 创建表
CREATE TABLE [TABLE_NAME] (
    ...
);

-- 2. 添加字段注释
COMMENT ON COLUMN [TABLE_NAME].[FIELD] IS '[说明]';

-- 3. 创建索引
CREATE INDEX idx_[TABLE_NAME]_[FIELD] ON [TABLE_NAME] ([FIELD]);

-- 4. 创建序列
CREATE SEQUENCE SEQ_[TABLE_NAME] START WITH 1 INCREMENT BY 1;

-- ==========================================================================
-- 结束处理
-- ==========================================================================
COMMIT;

SET SERVEROUTPUT ON;
DECLARE
    v_count NUMBER;
BEGIN
    DBMS_OUTPUT.PUT_LINE('变更脚本执行成功!');
    DBMS_OUTPUT.PUT_LINE('完成时间：' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));
END;
/
WHENEVER SQLERROR CONTINUE;
```

### 8.2 DML 变更脚本模板

```sql
-- ==========================================================================
-- 脚本信息
-- ==========================================================================
-- 需求编号：[需求编号]
-- 变更描述：[详细描述]
-- 影响范围：[影响的模块和功能]
-- 开发人员：[姓名]
-- 开发日期：[YYYY-MM-DD]
-- 评审人员：[姓名]
-- 测试人员：[姓名]
-- 版本号：[V5.0.0.0]
-- ==========================================================================

-- 开始时间
WHENEVER SQLERROR EXIT SQL.SQLCODE;

-- ==========================================================================
-- 变更内容
-- ==========================================================================

-- 1. 插入数据字典
INSERT INTO TM_DICT (
    ID, LEGAL_NO, DICT_GROUP_CODE, DICT_KEY, DICT_VALUE, 
    DESCRIPTION, CREATE_TIME, UPDATE_TIME
) VALUES (
    [ID], '000000', '[DICT_GROUP]', '[KEY]', '[VALUE]',
    '[说明]', [createTime], [updateTime]
);

-- 2. 插入业务参数
INSERT INTO TM_BUSINESS_PARAMETER (
    ID, LEGAL_NO, PARAM_TITLE, PARAM_KEY, PARAM_NAME, 
    PARAM_VALUE, PARAM_TYPE, PARAM_REMARK, CREATE_TIME, UPDATE_TIME
) VALUES (
    [ID], '000000', '[标题]', '[KEY]', '[名称]',
    '[值]', '[类型]', '[说明]', [createTime], [updateTime]
);

-- 3. 更新数据
UPDATE [TABLE_NAME]
SET [FIELD] = [VALUE],
    UPDATE_TIME = [timestamp]
WHERE [CONDITION];

-- ==========================================================================
-- 结束处理
-- ==========================================================================
COMMIT;
WHENEVER SQLERROR CONTINUE;
```

### 8.3 回滚脚本模板

```sql
-- ==========================================================================
-- 回滚脚本信息
-- ==========================================================================
-- 原脚本：[原脚本名称]
-- 回滚原因：[回滚原因]
-- 回滚人员：[姓名]
-- 回滚日期：[YYYY-MM-DD]
-- ==========================================================================

-- 开始回滚
WHENEVER SQLERROR EXIT SQL.SQLCODE;

-- ==========================================================================
-- 回滚内容
-- ==========================================================================

-- 1. 删除表
DROP TABLE [TABLE_NAME];

-- 2. 删除索引
DROP INDEX idx_[TABLE_NAME]_[FIELD];

-- 3. 删除序列
DROP SEQUENCE SEQ_[TABLE_NAME];

-- 4. 删除数据
DELETE FROM TM_DICT WHERE ID = [ID];
DELETE FROM TM_BUSINESS_PARAMETER WHERE ID = [ID];

-- ==========================================================================
-- 结束处理
-- ==========================================================================
COMMIT;
WHENEVER SQLERROR CONTINUE;
```

---

## 附录

### 附录 A: 常用字段类型参考

| 业务场景 | 字段类型 | Oracle | MySQL | 说明 |
|----------|----------|--------|-------|------|
| 主键 | 数值型 | NUMBER(16,0) | BIGINT | 所有表统一 |
| 金额 | 数值型 | NUMBER(16,2) | DECIMAL(16,2) | 精确到分 |
| 利率 | 数值型 | NUMBER(10,6) | DECIMAL(10,6) | 百分比 |
| 日期 | 数值型 | NUMBER(8,0) | INT | YYYYMMDD |
| 时间 | 数值型 | NUMBER(6,0) | INT | HHMMSS |
| 时间戳 | 数值型 | NUMBER(17,0) | BIGINT | 毫秒数 |
| 短文本 | 字符型 | VARCHAR2(50) | VARCHAR(50) | 编号类 |
| 中文本 | 字符型 | VARCHAR2(200) | VARCHAR(200) | 名称类 |
| 长文本 | 字符型 | VARCHAR2(500) | VARCHAR(500) | 描述类 |
| 大文本 | 大对象 | CLOB | TEXT | 备注类 |

### 附录 B: 表空间命名规范

| 数据类型 | 表空间名 | 说明 |
|----------|----------|------|
| 系统数据 | TBS_SYSTEM | 系统表 |
| 业务数据 | TBS_DATA_BILL | 业务表 |
| 索引数据 | TBS_INDEX_BILL | 业务索引 |
| 临时数据 | TBS_TEMP | 临时表 |
| 历史数据 | TBS_HISTORY | 历史表 |

### 附录 C: 脚本执行顺序

1. DDL 脚本 (表结构)
2. 序列脚本
3. 索引脚本
4. DML 脚本 (基础数据)
5. 权限脚本

---

**文档版本**: 1.0.0  
**最后更新**: 2023-01-01  
**维护人员**: BEMP 开发团队
