# 承兑行额度管理 - 独立表结构与AOP集成 Spec

## Why

当前承兑行额度管理ServiceImpl复用了产品化CreditGrantBatchService/CreditGrantInfoService，数据存储在产品化PC_CREDIT_GRANT_BATCH/INFO表中，仅通过creditType="2"区分。根据详细设计文档要求，需改为独立表结构（HNNX_ACCBANK_CREDIT_*），实现与产品化额度管理的完全数据隔离，并新增AOP切面实现交易流程中承兑行额度的自动占用/释放。

## What Changes

- **BREAKING**: 重写HnnxAcceptBankCreditServiceImpl，从复用产品化服务改为使用独立DAO/Entity操作独立表
- 新增2张独立数据库表：HNNX_ACCBANK_CREDIT_BATCH、HNNX_ACCBANK_CREDIT_INFO
- 新增DAO接口与Entity类：HnnxAcceptBankCreditBatchDao、HnnxAcceptBankCreditInfoDao及对应Entity
- 新增MyBatis Mapper XML：HnnxAcceptBankCreditBatchDao.xml、HnnxAcceptBankCreditInfoDao.xml
- 新增AOP切面：HnnxAcceptBankCreditAspect，拦截CreditAnalysisServiceImpl实现承兑行额度自动占用/释放
- 新增DDL建表脚本

## Impact

- Affected code:
  - `HnnxAcceptBankCreditServiceImpl.java`（重写，从复用产品化服务改为独立DAO）
  - `banks/ext-hnnxbank/hnnxbank-biz-as/` 新增dao/entity/aspect目录及文件
  - `deploy/bemp-script/` 新增DDL脚本
- 不影响现有前端代码（前端接口路径和参数不变）
- 不影响产品化额度管理模块（完全隔离）

## ADDED Requirements

### Requirement: 独立数据库表结构

系统 SHALL 创建2张独立表存储承兑行额度数据，与产品化PC_CREDIT_*表完全隔离。

#### Scenario: 建表脚本执行
- **WHEN** 执行DDL脚本
- **THEN** 创建HNNX_ACCBANK_CREDIT_BATCH表（含ID、LEGAL_NO、CREDIT_TYPE、CUST_TYPE、MEMBER_ID、MEMBER_BANK_NO、CUST_NO、CUST_NAME、CREDIT_DT、OPER_TELLER_NO、TOTAL_COUNT等字段）
- **AND** 创建HNNX_ACCBANK_CREDIT_INFO表（含ID、LEGAL_NO、BATCH_ID、CREDIT_INFO_NO、CREDIT_TYPE、CUST_TYPE、CUST_NAME、CREDIT_STATUS、CREDIT_LIMIT_AMT、DO_AMT、USED_CREDIT_AMT、FREEZED_AMT、ACTIVE_DT、FAILURE_DT、IS_RECIRCLE、MEMBER_ID、CUST_BANK_NO、CUST_NO、BRCH_NO、BRCH_NAME、OPER_TELLER_NO、CHECK_TELLER_NO、CHECK_DT等字段）
- **AND** 创建必要索引（LEGAL_NO、BATCH_ID、CREDIT_STATUS、CUST_NO、CREDIT_INFO_NO、ACTIVE_DT+FAILURE_DT）

### Requirement: 独立DAO/Entity层

系统 SHALL 创建独立的DAO接口和Entity类操作HNNX_ACCBANK_CREDIT_*表。

#### Scenario: DAO接口定义
- **WHEN** 创建HnnxAcceptBankCreditBatchDao和HnnxAcceptBankCreditInfoDao
- **THEN** 继承BaseDao，支持CRUD和分页查询
- **AND** Entity类字段与数据库表字段一一对应
- **AND** Mapper XML定义完整的SQL映射

### Requirement: ServiceImpl重写为独立DAO操作

系统 SHALL 重写HnnxAcceptBankCreditServiceImpl，使用独立DAO操作独立表，不再依赖产品化CreditGrantBatchService/CreditGrantInfoService。

#### Scenario: 批次查询
- **WHEN** 调用queryCreditBatchPage
- **THEN** 通过HnnxAcceptBankCreditBatchDao查询HNNX_ACCBANK_CREDIT_BATCH表
- **AND** 固定设置creditType="2"（承兑行阈值）

#### Scenario: 明细查询
- **WHEN** 调用queryCreditInfoPage
- **THEN** 通过HnnxAcceptBankCreditInfoDao查询HNNX_ACCBANK_CREDIT_INFO表
- **AND** 支持按生效日期、失效日期、复核状态、额度信息编号筛选

#### Scenario: 同步已用额度
- **WHEN** 调用syncUsedCreditAmt
- **THEN** 汇总"贴现余额、回购式贴现余额、转入余额、质押式逆回购余额、买断式逆回购余额"
- **AND** 按承兑行总行维度汇总银票余额
- **AND** 可用额度 = 授信额度 - 已用额度

### Requirement: AOP切面实现额度自动占用/释放

系统 SHALL 通过AOP切面拦截CreditAnalysisServiceImpl，在产品化额度操作成功后自动执行承兑行额度占用/释放。

#### Scenario: 转贴现买入占用额度
- **WHEN** 交易模块调用CreditAnalysisServiceImpl.creditOperate()且操作类型为"used"
- **AND** 票据种类为银票且非自承自贴
- **THEN** AOP切面自动调用HnnxAcceptBankCreditService.occupyAcceptBankCredit()
- **AND** 更新HNNX_ACCBANK_CREDIT_INFO的USED_CREDIT_AMT和DO_AMT

#### Scenario: 转贴现卖出释放额度
- **WHEN** 交易模块调用CreditAnalysisServiceImpl.creditOperate()且操作类型为"resume"
- **AND** 票据种类为银票且非自承自贴
- **THEN** AOP切面自动调用HnnxAcceptBankCreditService.releaseAcceptBankCredit()
- **AND** 更新HNNX_ACCBANK_CREDIT_INFO的USED_CREDIT_AMT和DO_AMT

#### Scenario: 自承自贴不占用额度
- **WHEN** 票据为自承自贴
- **THEN** AOP切面的needAcceptBankCredit()返回false，不执行承兑行额度操作

#### Scenario: 卖出回购不触发额度操作
- **WHEN** 交易为卖出回购
- **THEN** 产品化不调用creditOperate()，AOP切面不触发

#### Scenario: 额度不足时交易回滚
- **WHEN** 承兑行额度不足，occupyAcceptBankCredit()抛出BempRuntimeException
- **THEN** 整个事务回滚，产品化额度操作也被撤销

## MODIFIED Requirements

### Requirement: HnnxAcceptBankCreditServiceImpl数据访问方式
**原实现**：通过@CloudReference调用产品化CreditGrantBatchService/CreditGrantInfoService，使用DTO转换
**修改为**：通过@Resource注入独立DAO（HnnxAcceptBankCreditBatchDao/HnnxAcceptBankCreditInfoDao），直接操作独立表
