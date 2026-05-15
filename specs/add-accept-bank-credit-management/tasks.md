# Tasks

* [x] Task 1: 创建数据库建表DDL脚本

  * [x] SubTask 1.1: 创建HNNX_ACCBANK_CREDIT_BATCH建表SQL（含索引），参考设计文档第3.1节
  * [x] SubTask 1.2: 创建HNNX_ACCBANK_CREDIT_INFO建表SQL（含索引），参考设计文档第3.2节
  * [x] SubTask 1.3: 将DDL脚本放置到deploy/bemp-script/目录，按项目版本管理规范命名

* [x] Task 2: 创建Entity实体类

  * [x] SubTask 2.1: 创建HnnxAcceptBankCreditBatch.java（批次实体类）
  * [x] SubTask 2.2: 创建HnnxAcceptBankCreditInfo.java（明细实体类）
  * [x] SubTask 2.3: 创建Example类（HnnxAcceptBankCreditBatchExample、HnnxAcceptBankCreditInfoExample）

* [x] Task 3: 创建DAO接口与Mapper XML

  * [x] SubTask 3.1: 创建HnnxAcceptBankCreditBatchDao.java
  * [x] SubTask 3.2: 创建HnnxAcceptBankCreditInfoDao.java（含4个额度操作方法）
  * [x] SubTask 3.3: 创建HnnxAcceptBankCreditBatchDao.xml
  * [x] SubTask 3.4: 创建HnnxAcceptBankCreditInfoDao.xml（含4个额度操作update语句）

* [x] Task 4: 重写HnnxAcceptBankCreditServiceImpl

  * [x] SubTask 4.1: 移除@CloudReference对CreditGrantBatchService/CreditGrantInfoService的依赖
  * [x] SubTask 4.2: 注入HnnxAcceptBankCreditBatchDao和HnnxAcceptBankCreditInfoDao
  * [x] SubTask 4.3: 重写queryCreditBatchPage方法，使用独立DAO分页查询
  * [x] SubTask 4.4: 重写addCreditBatch方法，使用独立DAO插入
  * [x] SubTask 4.5: 重写delCreditBatch方法，使用独立DAO删除（含存在额度信息时不可删除的校验）
  * [x] SubTask 4.6: 重写queryCreditInfoPage方法，使用独立DAO分页查询
  * [x] SubTask 4.7: 重写addCreditInfo方法，使用独立DAO插入（含额度编号生成、可用额度计算）
  * [x] SubTask 4.8: 重写updateCreditInfo方法，使用独立DAO更新（含状态校验：只有未提交可修改）
  * [x] SubTask 4.9: 重写delCreditInfo方法，使用独立DAO删除（含状态校验：只有未提交可删除）
  * [x] SubTask 4.10: 重写submitReCheckGrantInfo方法（状态0→1）
  * [x] SubTask 4.11: 重写cancelSubmitReCheckGrantInfo方法（状态1→0）
  * [x] SubTask 4.12: 重写reCheckGrantInfo方法（状态1→5，记录复核柜员号和日期）
  * [x] SubTask 4.13: 重写cancelReCheckGrantInfo方法（状态5→1）
  * [x] SubTask 4.14: 重写syncUsedCreditAmt方法，调用HnnxAcptDiscLoanInfoService汇总票据余额
  * [x] SubTask 4.15: 移除所有transXxxDtoToProd/transXxxDtoFromProd转换方法

* [x] Task 5: 新增AOP切面HnnxAcceptBankCreditAspect

  * [x] SubTask 5.1: 创建HnnxAcceptBankCreditAspect.java，定义@Aspect切面类
  * [x] SubTask 5.2: 定义@AfterReturning切点拦截CreditAnalysisServiceImpl.creditOperate()
  * [x] SubTask 5.3: 定义@AfterReturning切点拦截CreditAnalysisServiceImpl.cancelCreditOperate()
  * [x] SubTask 5.4: 实现extractDto方法从BaseRequest中提取CreditAnalysisDto
  * [x] SubTask 5.5: 实现needAcceptBankCredit方法判断是否涉及银票承兑行额度
  * [x] SubTask 5.6: 实现determineOperType方法从CreditResumeTask获取操作类型
  * [x] SubTask 5.7: 在HnnxAcceptBankCreditService中新增occupyAcceptBankCredit方法
  * [x] SubTask 5.8: 在HnnxAcceptBankCreditService中新增releaseAcceptBankCredit方法
  * [x] SubTask 5.9: 在HnnxAcceptBankCreditService中新增reverseAcceptBankCredit方法
  * [x] SubTask 5.10: 实现occupyAcceptBankCredit逻辑
  * [x] SubTask 5.11: 实现releaseAcceptBankCredit逻辑
  * [x] SubTask 5.12: 实现reverseAcceptBankCredit逻辑

* [x] Task 6: 代码审查与编译验证

  * [x] SubTask 6.1: 后端代码审查（修复AOP切面异常处理、PageInfo构造器、pom依赖）
  * [x] SubTask 6.2: Maven编译验证通过

# Task Dependencies

* [Task 1] 是 [Task 2] 的前置依赖
* [Task 2] 是 [Task 3] 的前置依赖
* [Task 3] 是 [Task 4] 的前置依赖
* [Task 4] 是 [Task 5] 的前置依赖
* [Task 6] 是所有开发完成后的验证步骤
