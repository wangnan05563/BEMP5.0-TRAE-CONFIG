# 河南农信 10月底上线需求 - 增量测试用例（2026-09-20 代码修复后）

> 需求来源：docs/原始需求/00-10月底上线需求.md（需求2/需求3/需求7）
> 触发事件：2026-09-20 上午客户共享模式代码修复 + 客户共享模式参数值调整 DML（V202301.03.081_202609201000）
> 本文件为**增量用例**，存量复用关系见文末《存量复用与修订说明》
> 编写日期：2026-09-20 | 编写：bemp-auto-tester
> v1.1（2026-09-20 用例评审修复）：M-1 TC-BRANCH-028排查SQL由LIKE '%SIMPLE%'改为RESERVE2列核对（落库字段经L869/L871实测=BranchDto.reserve2）、观察项2定案闭环；M-2 TC-CUSTCORP-018断言收敛（互斥仅校验createBrchNos不含brchNos）+登记缺陷观察单OBS-01互斥实现不对称；M-3 TC-CREDITINFO-066余额数据源核对提升为前置步骤+补前后端接口锚点+登记缺陷观察单OBS-02（实现仅同步acptBalance单值，非需求5类汇总）；一般修复：全部锚点补全banks/hnnxbank完整路径并区分产品版/河南农信版、TC-CUSTACCT-019锚点修正L655-658、TC-BRANCH-029开关关闭态回归点登记交付文档回归清单。锚点版本标注约定：**[河南农信版]**=banks/ext-hnnxbank 或 frontend/.../banks/hnnxbank/**；**[产品版]**=served/**（未做银行个性化）

## 缺陷观察单（用例侧登记，转开发确认，走缺陷修复流程闭环）

| 编号 | 缺陷描述 | 代码锚点（实测） | 影响 | 处置 |
|------|---------|----------------|------|------|
| OBS-01 | 客户侧与账号侧createBrchNo单值互斥实现不对称：账号侧单值分支同时校验brchNos与createBrchNos两集合非空才拼接；客户侧单值分支仅校验createBrchNos，brchNos仍独立拼IN（两集合同时非空时生成"IN+IN"双条件，语义冗余非报错，但与账号侧行为不一致） | [产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustCorpServiceUtil.java L204-205（互斥仅校验getCreateBrchNos）、L208-210（brchNos独立拼IN）；对照[产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustAcctServiceUtil.java L220-224（单值分支双校验isEmpty(brchNos)&&isEmpty(createBrchNos)） | 客户/账号两页面多选+单值组合查询行为不一致，潜在空结果风险 | 转bemp-personalized-developer确认是否统一为双校验；用例TC-CUSTCORP-018按当前实现断言 |
| OBS-02 | 需求§7.1.2.18要求同步按钮汇总5类银票余额（贴现余额/回购式贴现余额/转入余额/质押式逆回购余额/买断式逆回购余额），实现仅按会员大额行号取承兑贴现贷款信息最新一条的acptBalance单值反显，且数据源DTO无回购式贴现余额/转入余额/两类逆回购余额字段 | [河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/service/impl/HnnxAcceptBankCreditServiceImpl.java L289-291（getLatestInfoByBankNo→acptBalance单值）；[河南农信版] banks/ext-hnnxbank/hnnxbank-biz-api/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/dto/HnnxAcptDiscLoanInfoDto.java L39/L45/L51（仅acptBalance/discBalance/loanBalance三余额字段） | 同步反显的已用额度口径与需求不符（缺4类余额汇总） | 转bemp-personalized-developer确认需求口径；用例TC-CREDITINFO-066按分支断言（见该用例） |

---

## 一、需求2 企业客户管理优化 - 增量

### TC-CUSTCORP-016 企业客户维护-共享模式下创建机构名称单选且默认全量查询

```yaml
用例编号: TC-CUSTCORP-016
用例名称: 共享模式(参数=1)下企业客户维护创建机构名称为单选且默认查询全量数据
所属模块: 企业客户维护
优先级: P1
测试类型: 功能测试
测试方式: Playwright（规则RULE-09，组件测试-动态绑定下拉框）
前置条件:
  - 已执行DML脚本V202301.03.081_202609201000使bm.cust.is_share_cust_corp_branch参数值为'1'
  - 已以法人管理员登录系统
  - 已导航至【业务管理子系统】-【客户管理】-【企业客户管理】-【企业客户维护】页面
  - 法人下存在多个机构且均有客户数据（测试数据见文末数据准备章节D1）
执行步骤:
  - 步骤1: 进入企业客户维护页面，观察页面初始化后"创建机构名称"字段
  - 步骤2: 点击"创建机构名称"字段，观察弹出机构树是否提供复选框
  - 步骤3: 观察页面初始化后默认查询结果的数据范围
  - 步骤4: 手动选择单个机构点击查询，检查查询结果
预期结果:
  - 页面初始化后"创建机构名称"弹出机构树不显示复选框，仅支持单选
  - 页面初始化默认查询结果包含法人内全部机构的客户数据（非仅本机构及下级）
  - 手动选择单个机构查询后，结果仅包含该机构创建的客户数据
  - 无TypeError/ReferenceError控制台错误
代码锚点: [河南农信版] frontend/src/views/bizViews/banks/hnnxbank/bm/cust/corp/custCorp.vue L27(:showCheckBox="!isShareCustCropBranch")、L1197-1218(param==="0"分支不执行时createBrchNo置空)
测试假设: 代码事实为共享模式(参数=1)时单选+全量、非共享(参数=0)时多选+预填本机构及下级，与需求文档"默认查询本机构及下级"表述存在口径差异，已列观察项待用例评审确认
可执行性: 独立可执行
```

### TC-CUSTCORP-017 企业客户维护-非共享模式下预填本机构及下级多选

```yaml
用例编号: TC-CUSTCORP-017
用例名称: 非共享模式(参数=0)下企业客户维护默认预填本机构及下级且创建机构名称支持多选
所属模块: 企业客户维护
优先级: P1
测试类型: 功能测试
测试方式: Playwright（规则RULE-09，组件测试-多选下拉）
前置条件:
  - 通过TM_BUSINESS_PARAMETER将bm.cust.is_share_cust_corp_branch参数值临时调整为'0'（数据准备SQL见文末D2）
  - 已以某分支机构用户登录系统
  - 该机构存在下级机构且下级机构已创建客户数据
  - 已导航至企业客户维护页面
执行步骤:
  - 步骤1: 进入企业客户维护页面，观察"创建机构名称"字段默认值
  - 步骤2: 点击"创建机构名称"字段，观察弹出机构树是否提供复选框
  - 步骤3: 勾选多个下级机构后点击查询，检查查询结果
  - 步骤4: 检查默认查询结果的机构范围
预期结果:
  - 页面初始化后"创建机构名称"自动预填本机构及全部下级机构（逗号分隔显示）
  - 弹出机构树显示复选框，支持多选
  - 默认查询结果仅包含本机构及下级机构创建的客户数据
  - 勾选多个机构查询后，结果仅包含所选机构的数据
代码锚点: [河南农信版] frontend/src/views/bizViews/banks/hnnxbank/bm/cust/corp/custCorp.vue L1197-1215(param==="0"时queryBrchNoTree返回brchList并join(",")预填)
可执行性: 需专项数据（需临时调整共享模式参数并准备多机构客户数据，执行后恢复参数=1）
```

### TC-CUSTCORP-018 客户侧createBrchNo与createBrchNos互斥空判断代码审查

```yaml
用例编号: TC-CUSTCORP-018
用例名称: 客户侧查询条件createBrchNo与createBrchNos互斥判断防止空交集（含brchNos组合走查）
所属模块: 企业客户维护-后端
优先级: P0
测试类型: 代码审查
测试方式: 代码审查（规则RULE-01，2026-09-20修复回归）
前置条件:
  - 源代码已拉取到本地工作区
  - 后端已按2026-09-20修复版本编译
执行步骤:
  - 步骤1: 打开[产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustCorpServiceUtil.java，定位transCustCorpDtoToCriteria方法
  - 步骤2: 检查createBrchNo单值拼接分支的前置条件是否包含createBrchNos为空判断
  - 步骤3: 检查createBrchNos数组拼接分支（IN条件）是否独立存在
  - 步骤4: 构造createBrchNo与createBrchNos同时非空的DTO走查代码路径，确认两者不会同时拼接
  - 步骤5: 组合走查createBrchNo与brchNos同时非空的DTO路径，核对单值分支与brchNos IN分支的拼接关系（v1.1评审新增：客户侧互斥不含brchNos）
  - 步骤6: 对照账号侧CustAcctServiceUtil单值分支的双校验实现，记录两侧差异（登记OBS-01）
预期结果:
  - 步骤2中createBrchNoEqualTo仅在getCreateBrchNo()非空且getCreateBrchNos()为空集合时执行（L204-205，不含brchNos校验）
  - 步骤3中andCreateBrchNoIn(getCreateBrchNos())在数组非空时独立执行（L214-216）
  - 步骤4中createBrchNo与createBrchNos两条件不同时拼接，不会生成"= AND IN"空交集SQL
  - 步骤5中createBrchNo单值分支（L204-207）与brchNos IN分支（L208-210）相互独立，两集合同时非空时生成"IN+IN"双条件拼接（当前实现事实，登记OBS-01待开发确认）
  - 步骤6中账号侧单值分支为双校验（L221-223：isEmpty(brchNos)&&isEmpty(createBrchNos)），与客户侧实现不对称，差异已在文件头缺陷观察单OBS-01登记
代码锚点: [产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustCorpServiceUtil.java L203-207(互斥判断与注释,仅校验createBrchNos)、L208-210(brchNos独立IN分支)、L214-216(createBrchNos IN分支)；对照[产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustAcctServiceUtil.java L220-224(单值分支双校验)；[产品版] served/api/cs/common-api/src/main/java/com/hundsun/bemp/bm/cust/service/corp/dto/CustCorpDto.java L189(List<String> createBrchNos)
可执行性: 独立可执行
```

### TC-CUSTCORP-019 企业客户维护-清空创建机构条件后恢复共享模式默认全量

```yaml
用例编号: TC-CUSTCORP-019
用例名称: 企业客户维护清空创建机构条件后查询恢复共享模式默认全量结果
所属模块: 企业客户维护
优先级: P1
测试类型: 功能测试
测试方式: Playwright（规则RULE-09，修订存量TC-CUSTCORP-015的不确定预期）
前置条件:
  - bm.cust.is_share_cust_corp_branch参数值为'1'（共享模式）
  - 已以法人管理员登录系统
  - 已导航至企业客户维护页面
  - 法人下多个机构均有客户数据（数据准备D1）
执行步骤:
  - 步骤1: 进入企业客户维护页面，记录默认查询结果总笔数
  - 步骤2: 选择某个创建机构执行查询，记录结果总笔数
  - 步骤3: 清空"创建机构名称"选择（清空按钮或删除标签）
  - 步骤4: 点击查询按钮，检查结果总笔数与机构范围
预期结果:
  - 步骤4查询结果总笔数等于步骤1默认查询结果总笔数
  - 步骤4结果包含法人内全部机构的客户数据（恢复全量，与共享模式默认行为一致）
  - 查询过程无控制台错误
代码锚点: [河南农信版] frontend/src/views/bizViews/banks/hnnxbank/bm/cust/corp/custCorp.vue L1216-1218(共享模式createBrchNo="")、[产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustCorpServiceUtil.java L203-216(空条件不拼机构过滤)
可执行性: 独立可执行
```

### TC-CUSTCORP-020 客户共享模式参数值落库验证

```yaml
用例编号: TC-CUSTCORP-020
用例名称: 客户共享模式两参数经DML调整后落库值均为1
所属模块: 企业客户管理-数据库配置
优先级: P1
测试类型: 配置验证
测试方式: 数据库查询（规则RULE-06）
前置条件:
  - Oracle MCP已连接BEMP业务库
  - DML脚本V202301.03.081_202609201000_客户共享模式参数值调整已执行
执行步骤:
  - 步骤1: 执行SQL: SELECT PARAM_KEY, PARAM_VALUE FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY IN ('bm.cust.is_share_cust_corp_branch','bm.cust.is_share_cust_acct_branch')
  - 步骤2: 重复执行一次DML脚本（幂等性验证）
  - 步骤3: 重复步骤1查询
预期结果:
  - 步骤1返回两行记录，PARAM_VALUE均为'1'
  - 步骤2重复执行不报错且无重复插入（脚本为按PARAM_KEY的幂等UPDATE）
  - 步骤3查询结果与步骤1一致
代码锚点: deploy/bemp-script/src/main/resources/banks/河南农信/V202301.03.081_202609201000_T202609200001_客户共享模式参数值调整.dml.sql L5-6
可执行性: 独立可执行
```

### TC-CUSTACCT-016 企业账号管理-共享模式下创建机构名称单选且默认全量查询

```yaml
用例编号: TC-CUSTACCT-016
用例名称: 共享模式(参数=1)下企业账号管理创建机构名称为单选且默认查询全量数据
所属模块: 企业账号管理
优先级: P1
测试类型: 功能测试
测试方式: Playwright（规则RULE-09）
前置条件:
  - bm.cust.is_share_cust_acct_branch参数值为'1'（DML已执行）
  - 已以法人管理员登录系统
  - 已导航至【业务管理子系统】-【客户管理】-【企业客户管理】-【企业账号管理】页面
  - 法人下多个机构均有账号数据（数据准备D1）
执行步骤:
  - 步骤1: 进入企业账号管理页面，观察"创建机构名称"字段
  - 步骤2: 点击"创建机构名称"字段，观察弹出机构树是否提供复选框
  - 步骤3: 观察默认查询结果的数据范围
预期结果:
  - "创建机构名称"弹出机构树不显示复选框，仅支持单选
  - 默认查询结果包含法人内全部机构的账号数据
  - 无TypeError/ReferenceError控制台错误
代码锚点: [河南农信版] frontend/src/views/bizViews/banks/hnnxbank/bm/cust/acct/custAcct.vue L26(:showCheckBox="!isShareCustCropBranch")
测试假设: 账号页复用同一共享模式参数读取逻辑，分支行为与客户页一致（getShowCreateBrchNo同构实现）
可执行性: 独立可执行
```

### TC-CUSTACCT-017 企业账号管理-非共享模式下预填本机构及下级多选

```yaml
用例编号: TC-CUSTACCT-017
用例名称: 非共享模式(参数=0)下企业账号管理默认预填本机构及下级且支持多选
所属模块: 企业账号管理
优先级: P1
测试类型: 功能测试
测试方式: Playwright（规则RULE-09）
前置条件:
  - 通过SQL将bm.cust.is_share_cust_acct_branch参数值临时调整为'0'（数据准备D2）
  - 已以某分支机构用户登录系统
  - 该机构及下级机构已创建账号数据
  - 已导航至企业账号管理页面
执行步骤:
  - 步骤1: 进入企业账号管理页面，观察"创建机构名称"字段默认值
  - 步骤2: 点击"创建机构名称"字段，观察是否提供复选框
  - 步骤3: 勾选多个机构后点击查询，检查结果
预期结果:
  - 页面初始化后"创建机构名称"自动预填本机构及下级机构
  - 弹出机构树显示复选框支持多选
  - 默认查询结果仅包含本机构及下级机构创建的账号数据
  - 多选查询后结果仅包含所选机构的数据
代码锚点: [河南农信版] frontend/src/views/bizViews/banks/hnnxbank/bm/cust/acct/custAcct.vue L644(brchList.join(",")预填)、[产品版] served/api/cs/common-api/src/main/java/com/hundsun/bemp/bm/cust/service/acct/dto/CustAcctDto.java L144(List<String> createBrchNos)
可执行性: 需专项数据（需临时调参+多机构账号数据，执行后恢复参数=1）
```

### TC-CUSTACCT-018 账号侧createBrchNo与createBrchNos互斥实现代码审查

```yaml
用例编号: TC-CUSTACCT-018
用例名称: 账号侧查询条件createBrchNo单值与createBrchNos数组互斥生效
所属模块: 企业账号管理-后端
优先级: P0
测试类型: 代码审查
测试方式: 代码审查（规则RULE-01，2026-09-20修复回归）
前置条件:
  - 源代码已拉取到本地工作区
执行步骤:
  - 步骤1: 打开[产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustAcctServiceUtil.java，定位账号Example Criteria组装方法
  - 步骤2: 检查createBrchNos非空时andCreateBrchNoIn分支
  - 步骤3: 检查createBrchNo单值EqualTo分支与createBrchNos、brchNos的双互斥前置条件（账号侧为双校验实现，见L221-223）
  - 步骤4: 确认DTO层CustAcctDto已声明List<String> createBrchNos字段
预期结果:
  - 步骤2中createBrchNos非空时执行andCreateBrchNoIn(getCreateBrchNos())
  - 步骤3中createBrchNoEqualTo仅在brchNos与createBrchNos两集合均为空时执行（L221-223双校验），三条件不同时拼接
  - 步骤4中CustAcctDto存在createBrchNos数组字段（L144）
  - 步骤3双校验实现与客户侧单校验（仅createBrchNos）不对称，差异已登记缺陷观察单OBS-01
代码锚点: [产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustAcctServiceUtil.java L208-209(createBrchNos IN)、L220-224(createBrchNo单值分支双校验，含L220注释)、[产品版] served/api/cs/common-api/src/main/java/com/hundsun/bemp/bm/cust/service/acct/dto/CustAcctDto.java L144
可执行性: 独立可执行
```

### TC-CUSTACCT-019 企业账号管理-清空创建机构条件后恢复默认全量

```yaml
用例编号: TC-CUSTACCT-019
用例名称: 企业账号管理清空创建机构条件后查询恢复共享模式默认全量结果
所属模块: 企业账号管理
优先级: P1
测试类型: 功能测试
测试方式: Playwright（规则RULE-09，修订存量TC-CUSTACCT-015的不确定预期）
前置条件:
  - bm.cust.is_share_cust_acct_branch参数值为'1'
  - 已以法人管理员登录系统
  - 已导航至企业账号管理页面
  - 法人下多个机构均有账号数据（数据准备D1）
执行步骤:
  - 步骤1: 进入企业账号管理页面，记录默认查询结果总笔数
  - 步骤2: 选择某创建机构查询，记录结果总笔数
  - 步骤3: 清空"创建机构名称"选择
  - 步骤4: 点击查询按钮，检查结果总笔数与机构范围
预期结果:
  - 步骤4查询结果总笔数等于步骤1默认查询结果总笔数
  - 步骤4结果包含法人内全部机构的账号数据
  - 查询过程无控制台错误
代码锚点: [河南农信版] frontend/src/views/bizViews/banks/hnnxbank/bm/cust/acct/custAcct.vue L655-658(共享分支置空createBrchNo/createBrchName)、[产品版] served/bm/cust-as/src/main/java/com/hundsun/bemp/bm/cust/service/impl/util/CustAcctServiceUtil.java L208-221(空条件不拼机构过滤)
可执行性: 独立可执行
```

---

## 二、需求3 分理处机构业务办理优化 - 增量

### TC-BRANCH-028 机构表简单机构字段落库验证

```yaml
用例编号: TC-BRANCH-028
用例名称: 机构表RESERVE2列承载是否简单机构字段且新增机构默认值为否
所属模块: 机构管理-数据库
优先级: P1
测试类型: 数据库验证
测试方式: 数据库查询（规则RULE-06）
前置条件:
  - Oracle MCP已连接BEMP业务库
  - 后端已部署2026-09-20版本（含简单机构字段读写）
执行步骤:
  - 步骤1: 执行SQL核对机构表RESERVE2列: SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, DATA_DEFAULT FROM USER_TAB_COLUMNS WHERE COLUMN_NAME = 'RESERVE2' AND TABLE_NAME LIKE '%BRCH%'
  - 步骤2: 核对DATA_DEFAULT：若列级默认值已配置则断言默认码值为'0'（否）；若DATA_DEFAULT为空则默认值由代码层兜底（parseSimpleBranchFlag else分支L876默认setReserve2("0")），两种情形均判定默认值链路有效
  - 步骤3: 通过UI新增机构不勾选"是否简单机构"（保持默认否），随后执行SELECT BRCH_NO, RESERVE2 FROM {步骤1确认的机构表} WHERE BRCH_NO='{新机构号}'核对落库值
  - 步骤4: 查询机构管理页面确认新机构"是否简单机构"显示为"否"
预期结果:
  - 步骤1确认机构表存在RESERVE2列（VARCHAR2），即"是否简单机构"落库字段（码值'1'=是/'0'=否，由导入解析setReserve2证实）
  - 步骤2默认值链路判定有效（列级DATA_DEFAULT='0'或代码层L876兜底二者其一）
  - 步骤3落库值RESERVE2='0'
  - 步骤4页面显示"是否简单机构"为"否"（默认值生效）
代码锚点: [河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxBankBranchController.java L869(“是”→setReserve2("1"))、L871(“否”→setReserve2("0"))、L876(缺省→setReserve2("0"))
可执行性: 需专项数据（需UI新增一条机构数据）
```

### TC-BRANCH-029 简单机构特性开关硬编码固化验证

```yaml
用例编号: TC-BRANCH-029
用例名称: 简单机构特性开关当前恒为true且开关关闭分支预留说明
所属模块: 机构管理-配置
优先级: P2
测试类型: 代码审查
测试方式: 代码审查（规则RULE-04）
前置条件:
  - 源代码已拉取到本地工作区
执行步骤:
  - 步骤1: 打开[河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxBankBranchController.java定位isSimpleBranchFeatureEnabled方法
  - 步骤2: 确认方法返回值
  - 步骤3: 检查L350(模板列)与L504(导入解析)处对该开关的引用方式
预期结果:
  - isSimpleBranchFeatureEnabled()返回硬编码true（L1039-1041）
  - 开关关闭时行为按注释约定为"模板不含是否简单机构列、导入跳过解析"（L1037注释）
  - 开关关闭场景（模板缺列/导入跳过）本期不可执行，标注为预留回归点并同步登记交付文档回归清单：后续开关改为读参数时需补充关闭态回归用例（回归清单条目：TC-BRANCH-029关闭态回归）
代码锚点: [河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxBankBranchController.java L1034-1041(开关方法与注释)、L350、L504(引用点)
可执行性: 独立可执行
```

### TC-BRANCH-030 批量导入是否简单机构非法值报错文案验证

```yaml
用例编号: TC-BRANCH-030
用例名称: 机构批量导入是否简单机构列非法值精确报错
所属模块: 机构管理-批量导入
优先级: P1
测试类型: 代码审查 + Playwright
测试方式: 代码审查（规则RULE-03错误文案）+ Playwright对照
前置条件:
  - 源代码已拉取到本地工作区
  - 已以法人管理员登录系统并导航至机构管理页面
  - 准备导入模板Excel，其中一行"是否简单机构"填"Y"、其余行合法
执行步骤:
  - 步骤1: 代码审查[河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxBankBranchController.java L863-878导入校验逻辑（parseSimpleBranchFlag方法）
  - 步骤2: 页面上传该Excel执行批量导入
  - 步骤3: 检查报错信息
预期结果:
  - 步骤1确认仅"是"/"否"两个字面量合法（L868/L870 equals判断，合法值落库setReserve2("1"/"0")）
  - 步骤2导入被拦截不落库
  - 步骤3报错文案精确为"第{行号}行是否简单机构[Y]错误，应为是或否；"（String.format第%d行+[%s]拼接，L873）
代码锚点: [河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/sm/controller/branch/HnnxBankBranchController.java L863-878
可执行性: 独立可执行
```

---

## 三、需求7 承兑行额度管理 - 增量（存量124条复用，见文末）

### TC-CREDITBATCH-076 承兑行额度管理表DDL结构验证

```yaml
用例编号: TC-CREDITBATCH-076
用例名称: 承兑行额度管理两表建表结构与状态码值验证
所属模块: 承兑行额度管理-数据库
优先级: P1
测试类型: 数据库验证
测试方式: 数据库查询（规则RULE-06）
前置条件:
  - Oracle MCP已连接BEMP业务库
  - DDL脚本V202301.03.081_202605130001_新增承兑行额度管理表已执行
执行步骤:
  - 步骤1: SELECT COLUMN_NAME, DATA_TYPE, DATA_DEFAULT FROM USER_TAB_COLUMNS WHERE TABLE_NAME='HNNX_ACCBANK_CREDIT_BATCH'按名称排序
  - 步骤2: 同法查询HNNX_ACCBANK_CREDIT_INFO表
  - 步骤3: 对照DDL锚点核对关键列
预期结果:
  - 步骤1存在列: LEGAL_NO(NOT NULL)、CREDIT_TYPE(DEFAULT '2'由注释声明)、CUST_NO、CREDIT_DT(NUMBER(8))、TOTAL_COUNT，主键PK_ACCBANK_CREDIT_BATCH(ID)
  - 步骤2存在列: CREDIT_STATUS(VARCHAR2(4) DEFAULT '0')、CREDIT_LIMIT_AMT(授信额度)、DO_AMT(可用额度)、USED_CREDIT_AMT(已用额度)、FREEZED_AMT(冻结额度)、ACTIVE_DT/FAILURE_DT(NUMBER(8))、IS_RECIRCLE(DEFAULT '0')，主键PK_ACCBANK_CREDIT_INFO(ID)
  - 步骤3列清单与DDL脚本L5-45/L47-118一致，CREDIT_STATUS码值约定为0-未提交/1-待复核/5-已复核（与状态流转用例TC-CREDITBATCH-049~052断言一致）
代码锚点: deploy/bemp-script/src/main/resources/banks/河南农信/V202301.03.081_202605130001_T202605130001_新增承兑行额度管理表.ddl.sql L5-45(批次表)/L47-118(明细表)
可执行性: 独立可执行
```

### TC-CREDITINFO-066 同步按钮5类银票余额逐类汇总口径验证

```yaml
用例编号: TC-CREDITINFO-066
用例名称: 同步按钮银票余额按承兑行总行匹配汇总反显已用额度（含5类余额数据源核对前置步骤）
所属模块: 承兑行额度管理-批复明细
优先级: P0
测试类型: 功能测试
测试方式: Playwright（规则RULE-09，存量TC-CREDITINFO-033/034/045为整体与幂等口径，本条为5类逐类增强）
前置条件:
  - 步骤0（v1.1评审提升为前置步骤，原测试假设）：5类银票余额数据源核对——按OBS-02锚点核对实现取数链：[河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/service/impl/HnnxAcceptBankCreditServiceImpl.java L289（getLatestInfoByBankNo按custBankNo取最新记录）→L290-291（acptBalance单值反显）；核对数据源DTO [河南农信版] banks/ext-hnnxbank/hnnxbank-biz-api/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/dto/HnnxAcptDiscLoanInfoDto.java 余额字段清单（当前实测仅acptBalance/discBalance/loanBalance三类，无回购式贴现余额/转入余额/两类逆回购余额字段）。核对结论决定断言分支：若开发已按5类汇总改造则走分支A，若仍为acptBalance单值则走分支B（当前代码事实）
  - 已以普通柜员登录系统
  - 已存在已复核状态的额度批复明细记录（复核状态=已复核），记下其客户名称对应的承兑行（会员大额行号）
  - 分支A：在该承兑行总行名下分别构造5类票据余额数据（数据准备D3），各类金额预置为互不相同的已知值（如100/200/300/400/500元）；分支B：在该承兑行总行（custBankNo匹配）名下构造承兑贴现贷款信息最新记录，acptBalance预置已知值（如1500元）
  - 已打开该批复明细的新增/修改额度批复明细弹窗
执行步骤:
  - 步骤1: 在弹窗中先录入授信额度（如5000），不点击同步，观察已用额度初始值
  - 步骤2（分支A）: 仅存在第1类（贴现余额100）数据时点击同步按钮，记录已用额度反显值；（分支B）点击同步按钮，记录已用额度反显值
  - 步骤3（分支A）: 逐类追加第2~5类余额数据，每次点击同步按钮记录反显值；（分支B）修改数据源最新记录acptBalance值（如改为2000）后再次点击同步，记录反显值
  - 步骤4: 数据齐备后再点击同步，检查已用额度终值与可用额度
预期结果:
  - 分支A（实现为5类汇总，与需求§7.1.2.18一致）：步骤2已用额度反显100（可用额度=5000-100=4900）；步骤3随类别逐次累加200/500/900/1400；步骤4反显1500（5类之和），可用额度=5000-1500=3500
  - 分支B（当前实现事实，acptBalance单值）：步骤2已用额度反显1500（acptBalance值），可用额度=5000-1500=3500；步骤3反显2000（取最新记录值），可用额度=5000-2000=3000；可用额度=授信额度-已用额度公式在两分支均成立
  - 同步过程无控制台错误
  - 分支B执行时OBS-02偏差事实成立（实现反显值≠5类汇总值），随缺陷观察单走缺陷修复流程
接口锚点: 前端[河南农信版] frontend/src/views/bizViews/banks/hnnxbank/pc/credit/acceptBankCreditGrantInfo.vue L488(post至func_syncUsedCreditAmt)、L494(可用额度=授信额度-已用额度计算)；后端[河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/controller/HnnxAcceptBankCreditInfoController.java L120-127(func_syncUsedCreditAmt入口)；服务实现[河南农信版] banks/ext-hnnxbank/hnnxbank-biz-as/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/service/impl/HnnxAcceptBankCreditServiceImpl.java L283-313(syncUsedCreditAmt事务方法)
代码锚点: 同接口锚点；数据源字段[河南农信版] banks/ext-hnnxbank/hnnxbank-biz-api/src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/dto/HnnxAcptDiscLoanInfoDto.java L39(acptBalance)/L45(discBalance)/L51(loanBalance)
测试假设: 无（v1.1已将原"余额表结构核对"假设提升为前置步骤0实测核对，断言按核对结论分支化）
可执行性: 需专项数据（分支A需5类余额数据/分支B需承兑贴现贷款信息记录，执行后清理测试数据并复核余额归零）
```

---

## 四、存量复用与修订说明

### 存量复用清单（本文件不重复编制）

| 需求 | 存量条目 | 文件 | 复用结论 |
|------|---------|------|---------|
| 需求2 | TC-CUSTCORP-010~015、TC-CUSTACCT-010~015（12条） | bm/enterprise-cust-opt.md | 默认查询/多选/全选/法人管理员场景复用；015两条预期含"或"，由本文件TC-CUSTCORP-019/TC-CUSTACCT-019收敛替代（评审时作废或修订） |
| 需求3 | TC-BRANCH-020~027、TC-CUSTACCT-020~023、TC-CUSTSIGN/SIGNAUDIT/SIGNRECORD/CUSTINFO-010~012（25条） | bm/sub-branch-opt.md | 新增/修改/同步/批量导入/模板/递归查找/报备4菜单3通道全部复用，无需增量 |
| 需求7 | TC-CREDITBATCH-020~075、TC-CREDITINFO-020~065、TC-CREDITRECHECK-020~039（124条） | bm/credit/credit-management.md | 用户列出的全部需求点已覆盖：使用规则14条(020-031/061/068)、删除守卫(047)、未选提示(036/038/023-026/075)、失效日期>生效日期(INFO-031/032/040)、复核/撤销/导出(RECHECK-020~038)、确定后重算(INFO-035)；本文件仅补DDL验证与5类逐类口径 |

### 需求-实现口径观察项（提请用例评审确认）

1. 需求2文档要求"默认查询本机构及下级机构创建的数据"，代码事实为共享模式(参数=1)下默认全量+创建机构条件单选；非共享模式(参数=0)下才预填本机构及下级+多选。2026-09-20 DML已将两参数统一为'1'。TC-CUSTCORP-016/TC-CUSTACCT-016按代码事实断言，若评审确认需求优先则返回代码开发阶段。
2. 【已定案闭环 v1.1】需求3简单机构字段落库方式：经代码实测确认为机构表RESERVE2保留字段承载（码值'1'=是/'0'=否），锚点[河南农信版] HnnxBankBranchController.java L869/L871/L876，deploy脚本目录无独立DDL属正常（产品化机构表已有RESERVE2保留列）；落库验证用例TC-BRANCH-028已改为RESERVE2列核对，原"落库方式未确认"测试假设消除。

---

## 五、测试数据准备

| 编号 | 用途 | 内容 |
|------|------|------|
| D1 | 共享模式全量查询验证 | 复用现有法人下多机构客户/账号数据；不足时通过UI在各机构创建1条客户/账号 |
| D2 | 非共享模式临时调参 | UPDATE TM_BUSINESS_PARAMETER SET PARAM_VALUE='0' WHERE PARAM_KEY IN ('bm.cust.is_share_cust_corp_branch','bm.cust.is_share_cust_acct_branch'); 执行后重启前端会话并重新登录，用例执行完毕必须恢复为'1'并复核（参照TC-CUSTCORP-020步骤1） |
| D3 | 同步按钮余额数据 | 分支A：通过业务操作构造该承兑行总行的5类票据余额各1笔；分支B（当前实现事实）：构造承兑贴现贷款信息最新记录（acptBalance已知值，custBankNo匹配该承兑行总行）。数据源以TC-CREDITINFO-066步骤0核对结论为准；SQL直插前必须核对目标表结构与行数基线，用例执行后清理测试数据并复核余额归零 |
| 就绪检查SQL | TC-CUSTCORP-020 | SELECT PARAM_KEY, PARAM_VALUE FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY LIKE 'bm.cust.is_share_cust%'; |
| 就绪检查SQL | TC-CREDITBATCH-076 | SELECT COUNT(*) FROM HNNX_ACCBANK_CREDIT_INFO; （表存在且可查询即通过） |

## 用例统计

| 模块 | 用例数量 | P0 | P1 | P2 | P3 |
|------|---------|-----|-----|-----|-----|
| 需求2-企业客户管理优化 | 9 | 2 | 7 | 0 | 0 |
| 需求3-分理处机构业务办理优化 | 3 | 0 | 2 | 1 | 0 |
| 需求7-承兑行额度管理 | 2 | 1 | 1 | 0 | 0 |
| **合计** | **14** | **3** | **10** | **1** | **0** |

### 跨模块可执行性分布
- 独立可执行：10条（含代码审查6条）
- 需专项数据：4条（TC-CUSTCORP-017/TC-CUSTACCT-017调参临时态、TC-BRANCH-028、TC-CREDITINFO-066）
- 测试方式分布：Playwright 6、代码审查 6、数据库查询 2（TC-BRANCH-030为代码审查+Playwright双方式，计入代码审查）

## 用例自校验结果
- 统计一致性：通过-统计表合计14条，实际用例14条，P0=3/P1=10/P2=1，一一对应
- 预期结果确定性：通过-全部预期为确定行为；存量015两条的"或"措辞已由019两条收敛替代并在复用清单中注明
- 编号规范性：通过-TC-CUSTCORP-016~020、TC-CUSTACCT-016~019、TC-BRANCH-028~030、TC-CREDITBATCH-076、TC-CREDITINFO-066均接续各前缀存量最大序号，无重复无跳号
- 前置条件完整性：通过-均含登录角色与数据准备要求
- 跨模块可执行性预标注：通过-4条标注需专项数据并给出数据准备编号
- 单一职责：通过-每条用例仅验证一个测试点
- P0锚点实测自检（v1.1）：通过-TC-CUSTCORP-018（CustCorpServiceUtil L204-205仅校验createBrchNos/L208-210 brchNos独立IN/L214-216，实测吻合）、TC-CUSTACCT-018（CustAcctServiceUtil L208-209/L220-224双校验、CustAcctDto L144，实测吻合）、TC-CREDITINFO-066（前端acceptBankCreditGrantInfo.vue L488/L494、后端Controller L120-127、ServiceImpl L283-313、DTO L39/L45/L51，实测吻合）
- 主要问题闭环自检（v1.1）：通过-M-1 RESERVE2核对（L869/L871/L876实测）+观察项2定案、M-2 brchNos组合走查+OBS-01登记、M-3前置步骤0+前后端接口锚点+OBS-02登记
- 自校验结论：可提交评审
