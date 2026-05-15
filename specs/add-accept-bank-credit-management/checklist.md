* [x] HNNX\_ACCBANK\_CREDIT\_BATCH建表DDL已创建，字段与设计文档第3.1节一致

* [x] HNNX\_ACCBANK\_CREDIT\_INFO建表DDL已创建，字段与设计文档第3.2节一致

* [x] 索引已创建（LEGAL\_NO、BATCH\_ID、CREDIT\_STATUS、CUST\_NO、CREDIT\_INFO\_NO、ACTIVE\_DT+FAILURE\_DT）

* [x] HnnxAcceptBankCreditBatch.java Entity类字段与数据库表一一对应

* [x] HnnxAcceptBankCreditInfo.java Entity类字段与数据库表一一对应

* [x] HnnxAcceptBankCreditBatchExample.java 已创建，结构参考产品化CreditGrantBatchExample

* [x] HnnxAcceptBankCreditInfoExample.java 已创建，结构参考产品化CreditGrantInfoExample

* [x] HnnxAcceptBankCreditBatchDao.java 继承BaseDao，支持CRUD和分页查询

* [x] HnnxAcceptBankCreditInfoDao.java 继承BaseDao，含4个额度操作方法

* [x] HnnxAcceptBankCreditBatchDao.xml Mapper XML定义完整resultMap和CRUD SQL

* [x] HnnxAcceptBankCreditInfoDao.xml Mapper XML定义完整resultMap和CRUD SQL，含4个额度操作update语句

* [x] HnnxAcceptBankCreditServiceImpl不再依赖产品化CreditGrantBatchService/CreditGrantInfoService

* [x] HnnxAcceptBankCreditServiceImpl使用@Resource注入独立DAO

* [x] 批次查询queryCreditBatchPage使用独立DAO分页查询

* [x] 批次新增addCreditBatch使用独立DAO插入

* [x] 批次删除delCreditBatch含存在额度信息时不可删除的校验

* [x] 明细查询queryCreditInfoPage使用独立DAO分页查询

* [x] 明细新增addCreditInfo含额度编号生成和可用额度计算

* [x] 明细修改updateCreditInfo含状态校验（只有未提交可修改）

* [x] 明细删除delCreditInfo含状态校验（只有未提交可删除）

* [x] 提交复核submitReCheckGrantInfo状态0→1

* [x] 撤销提交cancelSubmitReCheckGrantInfo状态1→0

* [x] 复核reCheckGrantInfo状态1→5，记录复核柜员号和日期

* [x] 撤销复核cancelReCheckGrantInfo状态5→1

* [x] 同步已用额度syncUsedCreditAmt调用HnnxAcptDiscLoanInfoService汇总票据余额

* [x] 所有transXxxDtoToProd/transXxxDtoFromProd转换方法已移除

* [x] HnnxAcceptBankCreditAspect.java已创建，定义@Aspect切面类

* [x] @AfterReturning切点拦截CreditAnalysisServiceImpl.creditOperate()

* [x] @AfterReturning切点拦截CreditAnalysisServiceImpl.cancelCreditOperate()

* [x] extractDto方法能从BaseRequest中正确提取CreditAnalysisDto

* [x] needAcceptBankCredit方法正确判断银票且非自承自贴

* [x] determineOperType方法从CreditResumeTask获取操作类型

* [x] occupyAcceptBankCredit方法：查询承兑行额度→校验可用额度→更新USED\_CREDIT\_AMT和DO\_AMT

* [x] releaseAcceptBankCredit方法：更新USED\_CREDIT\_AMT和DO\_AMT

* [x] reverseAcceptBankCredit方法实现撤销占用/释放的逆向操作

* [x] 额度不足时occupyAcceptBankCredit抛出BempRuntimeException触发事务回滚

* [x] 后端代码审查通过（修复AOP异常处理、PageInfo构造器、pom依赖）

* [x] Maven编译通过

