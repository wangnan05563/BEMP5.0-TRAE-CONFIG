# SonarQube 代码质量扫描报告

| 项目 | 值 |
|------|-----|
| 项目名称 | BEMP HNNXBank - 机构管理优化 |
| 项目Key | bemp-ext-hnnxbank-org-management |
| 银行配置 | hnnxbank (河南农信/河南农商银行) |
| 扫描日期 | 2026-07-23 |
| SonarQube版本 | 26.1.0.118079 |
| 扫描方式 | SonarQube MCP (mcp_sonarqube) |
| 报告生成人 | BEMP实施工程师 |

---

## 1. 扫描范围与配置

### 1.1 扫描范围（增量代码）

本次扫描覆盖《机构管理优化》个性化需求涉及的11个功能点（F-01~F-11）的全部新增/修改代码。

**后端（Java）：**

| 模块 | 文件路径 | 说明 |
|------|---------|------|
| hnnxbank-adapter-as | POBM010304MessageConverter.java | 同步机构柜员信息适配器 |
| hnnxbank-adapter-as | BOPC010101MessageConverter.java | 同步核心贷款余额信息适配器 |
| hnnxbank-biz-as | sm/controller/branch/ 下4个文件 | 机构控制层（Branch/LegalPersonVirtual/BranchAdmin/BranchQuery） |
| hnnxbank-biz-as | sm/service/impl/branch/ 下3个文件 | 机构服务实现层 |
| hnnxbank-biz-as | sm/service/impl/user/HnnxbankBranchUserServiceImpl.java | 机构用户服务 |
| hnnxbank-biz-as | ce/disc/ 下24个文件 | 贴现业务（Controller/Service/Atom/Dao/Util） |
| hnnxbank-biz-as | tk/job/service/impl/SyncPjgcs*JobServiceImpl.java | PJGCS机构参数同步定时任务 |
| hnnxbank-biz-as | tk/job/service/impl/SyncPjgx*JobServiceImpl.java | PJGGX机构关系同步定时任务 |
| hnnxbank-biz-api | tk/job/service/Sync*JobService.java | 定时任务接口 |
| hnnxbank-biz-api | sm/ 下branch相关DTO/VO | 机构数据传输对象 |

**前端（Vue/JS）：**

| 文件路径 | 说明 |
|---------|------|
| frontend/.../sm/auth/branch/branch.vue | 机构管理页面 |
| frontend/.../sm/auth/branch/branchAdmin.vue | 机构管理员页面 |
| frontend/.../sm/auth/branch/roleDistribute.vue | 角色分配页面 |
| frontend/.../locale/lang/zh-CN.js | 中文语言包 |

### 1.2 SonarQube 配置

| 配置项 | 值 |
|--------|-----|
| SonarQube Server | http://localhost:9000 |
| Java Home | D:\code\Java\jdk-25.0.1 |
| SonarQube Install Path | D:\code\sonar\sonarqube-26.1.0.118079 |
| Sonar Scanner | D:\code\sonar\sonar-scanner-8.0.1.6346-windows-x64 |
| MCP Server | mcp_sonarqube |
| 质量门禁阈值 - 新代码覆盖率 | >=80% |
| 质量门禁阈值 - 新代码重复率 | <=3% |
| 质量门禁阈值 - 新增问题数 | 0 |

---

## 2. 质量门禁状态（Quality Gate）

| 指标 | 状态 |
|------|------|
| **质量门禁总体状态** | **OK (通过)** |
| 门禁条件数 | 0 (未配置具体门禁条件) |

> **说明：** 项目质量门禁状态为 OK，但项目未配置具体的门禁条件（conditions 为空）。建议项目管理员在 SonarQube 中配置质量门禁条件，确保新代码满足覆盖率、重复率、新增问题数等阈值要求。

### SonarQube Dashboard 访问地址
- 项目主页：http://localhost:9000/dashboard?id=bemp-ext-hnnxbank-org-management

---

## 3. 项目整体度量指标

### 3.1 代码规模

| 指标 | 值 |
|------|-----|
| 代码行数 (NCLOC) | 37,481 |
| 圈复杂度 (Cyclomatic Complexity) | 6,626 |
| 技术债务 (SQALE Index) | 19,088 分钟 (约 318 小时) |

### 3.2 问题统计（整体项目）

| 问题类型 | 数量 |
|---------|------|
| 总违规数 (Violations) | 1,783 |
| Bug | 28 |
| 漏洞 (Vulnerabilities) | 0 |
| 代码异味 (Code Smells) | 1,755 |
| 安全热点 (Security Hotspots) | 21 |

### 3.3 评级与质量指标

| 指标 | 值 | 评级 |
|------|-----|------|
| 可靠性评级 (Reliability Rating) | 3.0 | C (中等风险) |
| 安全性评级 (Security Rating) | 1.0 | A (优秀) |
| 可维护性评级 (SQALE Rating) | 1.0 | A (优秀) |
| 代码覆盖率 (Coverage) | 0.0% | - (无测试覆盖) |
| 重复代码率 (Duplicated Lines Density) | 27.6% | - (偏高) |

### 3.4 新代码指标

| 指标 | 值 |
|------|-----|
| 新增问题 (New Violations) | 未配置新代码周期，无法获取 |
| 新增Bug (New Bugs) | 未配置新代码周期，无法获取 |
| 新增代码异味 (New Code Smells) | 未配置新代码周期，无法获取 |
| 新代码覆盖率 (New Coverage) | 未配置新代码周期，无法获取 |
| 新代码重复率 (New Duplication) | 未配置新代码周期，无法获取 |

> **注意：** 项目未配置新代码周期（New Code Period），导致 new_ 系列指标无法获取。建议项目管理员在 SonarQube 中配置新代码周期为"参考前一版本"或"特定日期"，以便追踪增量代码质量。

---

## 4. 本次需求相关文件问题清单

### 4.1 问题严重度分布（本次需求涉及文件）

| 严重度 | 数量 | 说明 |
|--------|------|------|
| BLOCKER | 0 | 无阻断级问题 |
| CRITICAL (HIGH) | 9 | 认知复杂度过高、重复字面量 |
| MAJOR (MEDIUM) | 12 | 废弃方法、System.out.println、未使用参数等 |
| MINOR (LOW) | 15 | 循环控制、isEmpty()、钻石操作符等 |
| INFO | 2 | "Brain Method" 检测 |
| **合计** | **38** | |

### 4.2 CRITICAL（严重）问题清单

| # | 规则 | 文件 | 行号 | 问题描述 | 修复建议 |
|---|------|------|------|----------|---------|
| 1 | java:S3776 | HnnxBankBranchController.java | 158 | 认知复杂度101（允许15） | 拆分 batchImportValidate 方法为更小的子方法 |
| 2 | java:S3776 | HnnxbankBranchAdminController.java | 142 | 认知复杂度37（允许15） | 拆分复杂方法，提取校验逻辑到独立方法 |
| 3 | java:S1192 | HnnxbankBranchAdminController.java | 152 | 重复字面量"</br>" 3次 | 定义常量 LINE_BREAK |
| 4 | java:S3776 | HnnxbankBranchServiceImpl.java | 176 | 认知复杂度49（允许15） | 拆分服务方法，降低嵌套层级 |
| 5 | java:S3776 | BOPC010101MessageConverter.java | 47 | 认知复杂度64（允许15） | 拆分 fromMessage 方法，提取文件解析和数据处理逻辑 |
| 6 | java:S3776 | HnnxBankDiscBillServiceImpl.java | 195 | 认知复杂度56（允许15） | 拆分 submitElecFlow 方法为多个校验步骤 |
| 7 | java:S3776 | HnnxBankDiscBillServiceImpl.java | 101 | 认知复杂度24（允许15） | 拆分 getRiskBillNo 方法 |
| 8 | java:S3776 | HnnxDiscCompanyRosterController.java | 181 | 认知复杂度30（允许15） | 拆分控制器方法 |
| 9 | java:S3776 | HnnxDiscOccurAtomImpl.java | 59 | 认知复杂度27（允许15） | 拆分原子操作方法 |

### 4.3 MAJOR（主要）问题清单

| # | 规则 | 文件 | 行号 | 问题描述 | 修复建议 |
|---|------|------|------|----------|---------|
| 1 | java:S1172 | HnnxbankBranchAdminController.java | 413 | 未使用的方法参数"userInfo"、"targetUserNo" | 移除未使用的参数或添加 @SuppressWarnings |
| 2 | java:S125 | BOPC010101MessageConverter.java | 83 | 注释掉的代码应移除 | 删除注释掉的代码行 |
| 3 | java:S106 | BOPC010101MessageConverter.java | 60 | System.out.println 不应使用 | 替换为 logger.debug() |
| 4 | java:S5738 | HnnxBankDiscBillServiceImpl.java | 232 | 调用废弃方法 new Integer() | 替换为 Integer.valueOf() |
| 5 | java:S1854 | HnnxBankDiscBillServiceImpl.java | 110 | 无用的局部变量赋值"discBills" | 移除无用赋值 |
| 6 | java:S1066 | HnnxBankDiscBillServiceImpl.java | 310 | 可合并的if语句 | 合并嵌套if为单个条件 |
| 7 | java:S1066 | HnnxBankDiscBillServiceImpl.java | 136 | 可合并的if语句 | 合并嵌套if为单个条件 |
| 8 | java:S1149 | HnnxDiscCompanyRosterController.java | 194 | 使用StringBuilder替代StringBuffer | 替换 StringBuffer 为 StringBuilder |
| 9 | java:S1149 | HnnxDiscCompanyRosterController.java | (多处) | 使用StringBuilder替代StringBuffer | 同上 |
| 10 | java:S1068 | HnnxAcceptBankCreditAspect.java | 29 | 未使用的"logger"私有字段 | 移除未使用字段或添加使用 |
| 11 | java:S112 | (多处Example文件) | - | 使用泛型异常 | 替换为具体异常类型 |
| 12 | java:S125 | (多处文件) | - | 注释代码应移除 | 清理注释掉的代码 |

### 4.4 MINOR（次要）问题清单

| # | 规则 | 文件 | 行号 | 问题描述 | 修复建议 |
|---|------|------|------|----------|---------|
| 1 | java:S135 | HnnxBankBranchController.java | 172 | 循环内break/continue过多 | 减少循环内的控制流语句 |
| 2 | java:S135 | HnnxBankBranchController.java | 345 | 循环内break/continue过多 | 同上 |
| 3 | java:S1155 | HnnxBankBranchController.java | 161 | 使用isEmpty()替代size()>0 | 替换为 isEmpty() |
| 4 | java:S5411 | HnnxBankBranchController.java | 91 | 使用原始boolean表达式 | 简化Boolean表达式 |
| 5 | java:S1155 | HnnxbankBranchAdminController.java | 147 | 使用isEmpty()替代size()>0 | 替换为 isEmpty() |
| 6 | java:S135 | HnnxbankBranchAdminController.java | 154 | 循环内break/continue过多 | 减少控制流语句 |
| 7 | java:S2293 | HnnxbankBranchServiceImpl.java | 192 | 使用钻石操作符<> | 简化泛型构造 |
| 8 | java:S1124 | HnnxDiscOccurAtomImpl.java | 47 | 修饰符顺序不符合规范 | 调整修饰符顺序 |
| 9 | java:S1874 | HnnxDiscOccurAtomImpl.java | - | 废弃API使用 | 替换为推荐API |
| 10-15 | (多处) | (多个文件) | - | 代码风格问题 | 按规则修复 |

### 4.5 INFO（信息）问题清单

| # | 规则 | 文件 | 行号 | 问题描述 | 修复建议 |
|---|------|------|------|----------|---------|
| 1 | java:S6541 | HnnxBankDiscBillServiceImpl.java | 195 | "Brain Method" 检测：LOC 167>64, 复杂度 32>14, 嵌套 5>2, 变量 45>6 | 重构方法，降低各项指标 |
| 2 | java:S6541 | (其他文件) | - | "Brain Method" 检测 | 同上 |

---

## 5. 安全热点（Security Hotspot）清单

### 5.1 安全热点概况

| 指标 | 值 |
|------|-----|
| 安全热点总数 | 21 |
| 待审查 (TO_REVIEW) | 因Token权限不足无法获取详细列表 |
| 安全漏洞 (Vulnerabilities) | 0 |

> **注意：** `search_security_hotspots` MCP 工具返回 "Insufficient privileges" 错误，当前 Token 权限不足以查询安全热点详情。建议在 SonarQube Web 界面直接查看：http://localhost:9000/security_hotspots?id=bemp-ext-hnnxbank-org-management

### 5.2 静态分析发现的安全风险

基于代码静态审查，以下为可能触发安全热点的代码模式：

| # | 文件 | 行号 | 风险描述 | 风险等级 |
|---|------|------|----------|---------|
| 1 | POBM010304MessageConverter.java | 129 | e.printStackTrace() 暴露堆栈信息 | 低 |
| 2 | BOPC010101MessageConverter.java | 60 | System.out.println 输出敏感数据 | 低 |
| 3 | BOPC010101MessageConverter.java | 72 | Integer.valueOf 可能触发 NumberFormatException | 中 |
| 4 | HnnxBankDiscBillServiceImpl.java | 250 | new Integer() 废弃方法，可能存在整数溢出风险 | 低 |

---

## 6. 重复代码率、覆盖率、复杂度等指标

### 6.1 指标汇总

| 指标 | 当前值 | 阈值 | 状态 |
|------|--------|------|------|
| 代码覆盖率 | 0.0% | >=80% | 不通过 (无测试代码) |
| 重复代码率 | 27.6% | <=3% | 不通过 (偏高) |
| 圈复杂度 | 6,626 | - | 整体可接受 |
| 技术债务 | 19,088分钟 | - | 约318小时 |

### 6.2 重复代码分析

重复代码率 27.6% 偏高，主要原因：
1. MyBatis Generator 生成的 Example 类存在大量重复模式
2. Controller 层的 CRUD 操作存在代码重复
3. Adapter 层的报文解析逻辑存在重复

### 6.3 覆盖率分析

覆盖率为 0.0%，说明项目缺少单元测试。本次需求新增的定时任务（SyncPjgcsBranchParamJobServiceImpl、SyncPjgxBranchRelationJobServiceImpl）代码质量较好，但同样缺少单元测试覆盖。

---

## 7. 与代码评审的交叉验证结果

### 7.1 重点关注项验证矩阵

| # | 重点关注项 | 代码评审发现 | SonarQube 扫描结果 | 交叉验证结论 |
|---|-----------|-------------|-------------------|-------------|
| 1 | POBM010304MessageConverter: e.printStackTrace() | 行129: catch块中 e.printStackTrace()，吞异常 | 未单独标记（旧代码） | **确认存在**：生产代码不应使用 e.printStackTrace()，应使用 logger.error |
| 2 | POBM010304MessageConverter: 日志占位符缺失 | 行88: logger.info("...响应json：", commonResp) 缺少{}占位符 | 未单独标记 | **确认存在**：日志参数不会被替换，commonResp不会被输出 |
| 3 | BOPC010101MessageConverter: System.out.println | 行60: System.out.println(line[j]) | java:S106 标记为 MAJOR | **SonarQube 已确认**：应替换为 logger |
| 4 | BOPC010101MessageConverter: Integer.valueOf 空串 | 行72: Integer.valueOf(totalNuAKMZZ) 当AKMZZ为空时NPE | 未单独标记 | **确认存在**：当文件不存在或为空时，totalNuAKMZZ为空字符串，触发NumberFormatException |
| 5 | HnnxbankBranchUserServiceImpl: @Resource 注入 | 行62-69: 使用@Resource注入 | 未标记（BEMP框架模式） | **误报/可接受**：@Resource是JSR-250标准注解，BEMP项目混合使用@Resource和@CloudReference |
| 6 | HnnxbankBranchUserServiceImpl: commons-lang StringUtils | 行37: import org.apache.commons.lang.StringUtils | 未单独标记 | **确认存在**：应使用 commons-lang3 的 StringUtils |
| 7 | HnnxbankBranchUserServiceImpl: Logger 类名错误 | 行60: getLogger(BranchUserServiceImpl.class) | 未单独标记 | **确认存在**：应为 HnnxbankBranchUserServiceImpl.class，影响日志类别定位 |
| 8 | HnnxBankLegalPersonVirtualController: @Resource 注入 | 行47: @Resource注入DAO | 未标记（BEMP框架模式） | **误报/可接受**：同上 |
| 9 | HnnxBankLegalPersonVirtualController: commons-lang StringUtils | 行21: import org.apache.commons.lang.StringUtils | 未单独标记 | **确认存在**：应使用 commons-lang3 |
| 10 | HnnxBankBranchController: calculateBranchLevel 循环内调远程服务 | 行519-543: while循环内调用branchService.getCacheBranch | java:S3776 认知复杂度问题 | **确认存在**：批量导入时N+1远程调用性能问题，但有maxLevel=10保护 |
| 11 | HnnxBankDiscBillServiceImpl: new Integer() 废弃方法 | 行250: new Integer(maxBillSizeForBank) | java:S5738 标记为 MAJOR | **SonarQube 已确认**：应替换为 Integer.valueOf() |
| 12 | 定时任务: CBS 文件为空时清空表数据 | SyncPjgcs/SyncPjgx: 文件存在但内容为空时dataList为空，仍调用syncBatchData清空表 | 无SonarQube问题（逻辑问题非代码规范问题） | **确认存在**：CBS文件为空时 dataList 为空，syncBatchData 会先 deleteAll 再 insertBatch(空)，导致表数据被清空 |

### 7.2 新增代码质量评估

| 文件 | SonarQube 问题数 | 评估 |
|------|-----------------|------|
| SyncPjgcsBranchParamJobServiceImpl.java | 0 | **优秀** - 代码规范，try-with-resources，预编译Pattern |
| SyncPjgxBranchRelationJobServiceImpl.java | 0 | **优秀** - 同上 |
| HnnxBankBranchController.java | 4 | **中等** - 认知复杂度高，但有maxLevel保护 |
| HnnxbankBranchAdminController.java | 4 | **中等** - 认知复杂度高，未使用参数 |
| HnnxBankDiscBillServiceImpl.java | 7 | **较差** - 废弃方法、认知复杂度高、无用赋值 |
| BOPC010101MessageConverter.java | 3+ | **较差** - System.out.println、注释代码、认知复杂度 |
| POBM010304MessageConverter.java | 0 | **良好**（SonarQube未标记，但静态分析发现日志和异常处理问题） |
| HnnxbankBranchUserServiceImpl.java | 0 | **良好**（SonarQube未标记，但静态分析发现commons-lang和Logger类名问题） |
| HnnxBankLegalPersonVirtualController.java | 0 | **良好**（SonarQube未标记，但静态分析发现commons-lang问题） |

### 7.3 交叉验证总结

- **SonarQube 确认的问题**：System.out.println (S106)、废弃方法 new Integer() (S5738)、认知复杂度过高 (S3776) 等
- **代码评审发现但 SonarQube 未标记的问题**：e.printStackTrace()、日志占位符缺失、commons-lang 旧版引用、Logger 类名错误、CBS 文件为空时清空表数据
- **SonarQube 标记但代码评审未重点关注的问题**：注释代码 (S125)、StringBuffer 替代 (S1149)、钻石操作符 (S2293) 等
- **误报/可接受项**：@Resource 注入（BEMP 框架标准模式）

---

## 8. 修复优先级建议

### P0 - 必须立即修复（阻断级）
无阻断级问题。

### P1 - 高优先级修复（严重级）

| 优先级 | 文件 | 问题 | 修复方案 |
|--------|------|------|---------|
| P1-1 | HnnxBankDiscBillServiceImpl.java:250 | new Integer() 废弃方法 | 替换为 Integer.valueOf(maxBillSizeForBank) |
| P1-2 | BOPC010101MessageConverter.java:60 | System.out.println | 替换为 logger.debug(line[j]) |
| P1-3 | POBM010304MessageConverter.java:129 | e.printStackTrace() 吞异常 | 替换为 logger.error("请求发送失败", e) 并抛出 BempRuntimeException |
| P1-4 | POBM010304MessageConverter.java:88 | 日志占位符缺失 | 修改为 logger.info("POBM010304MessageConverter响应json：{}", commonResp) |
| P1-5 | HnnxbankBranchUserServiceImpl.java:60 | Logger 类名错误 | 修改为 LoggerFactory.getLogger(HnnxbankBranchUserServiceImpl.class) |
| P1-6 | HnnxbankBranchUserServiceImpl.java:37 | commons-lang 旧版 | 替换为 org.apache.commons.lang3.StringUtils |
| P1-7 | HnnxBankLegalPersonVirtualController.java:21 | commons-lang 旧版 | 替换为 org.apache.commons.lang3.StringUtils |
| P1-8 | 定时任务 SyncPjgcs/SyncPjgx | CBS文件为空时清空表 | 在调用 syncBatchData 前检查 dataList 是否为空，为空时跳过同步并记录警告 |

### P2 - 中优先级修复（主要级）

| 优先级 | 文件 | 问题 | 修复方案 |
|--------|------|------|---------|
| P2-1 | BOPC010101MessageConverter.java:72 | Integer.valueOf 空串风险 | 添加空串校验，提供默认值0 |
| P2-2 | HnnxBankBranchController.java:158 | 认知复杂度101 | 继续拆分方法（已部分抽取，需进一步重构） |
| P2-3 | BOPC010101MessageConverter.java:83 | 注释代码 | 删除注释掉的代码 |
| P2-4 | HnnxBankDiscBillServiceImpl.java:110 | 无用赋值 | 移除 discBills 的无用赋值 |
| P2-5 | HnnxBankDiscBillServiceImpl.java:310,136 | 可合并if | 合并嵌套if语句 |

### P3 - 低优先级修复（次要级）

| 优先级 | 文件 | 问题 | 修复方案 |
|--------|------|------|---------|
| P3-1 | 多处文件 | size()>0 替代 isEmpty() | 批量替换为 isEmpty() |
| P3-2 | 多处文件 | 钻石操作符 | 使用 <> 简化泛型 |
| P3-3 | HnnxBankBranchController.java:172,345 | 循环控制流 | 减少break/continue使用 |

---

## 9. 扫描方法说明

### 9.1 扫描流程

1. **SonarQube 服务检测**：检测到 SonarQube 26.1.0.118079 服务在端口9000运行（PID: 18664），Java 25.0.1
2. **MCP 连接验证**：通过 mcp_sonarqube MCP 服务器成功连接，确认项目 bemp-ext-hnnxbank-org-management 存在
3. **质量门禁检查**：通过 get_project_quality_gate_status 获取门禁状态为 OK
4. **问题扫描**：通过 search_sonar_issues_in_projects 按文件分组查询问题
5. **度量获取**：通过 get_component_measures 获取项目整体度量指标
6. **安全热点查询**：search_security_hotspots 工具因 Token 权限不足返回错误，降级为静态分析
7. **静态分析交叉验证**：对7个核心文件进行逐文件代码审查，与 SonarQube 结果交叉验证

### 9.2 降级处理

| 场景 | 降级方案 | 执行结果 |
|------|---------|---------|
| search_security_hotspots 权限不足 | 降级为静态代码审查 | 已识别4个潜在安全风险 |
| 新代码指标无法获取 | 使用整体指标替代 | 已标注数据为整体项目指标 |
| HTTP 直连 SonarQube 失败 | 使用 MCP 工具连接 | MCP 连接成功 |

### 9.3 Token 权限说明

当前 SonarQube Token 权限不足，无法执行以下操作：
- search_security_hotspots（查询安全热点详情）
- 建议项目管理员为 Token 授予 "Browse" 和 "See Security Hotspot" 权限

---

## 10. 结论与建议

### 10.1 总体评估

| 维度 | 评级 | 说明 |
|------|------|------|
| 可靠性 | C | 存在28个Bug，需关注 |
| 安全性 | A | 无安全漏洞，21个热点待审查 |
| 可维护性 | A | 技术债务可控 |
| 代码覆盖率 | - | 0%，急需补充单元测试 |
| 重复代码 | - | 27.6%，偏高 |

### 10.2 本次需求代码质量评价

本次《机构管理优化》需求新增代码整体质量**中等偏上**：
- **优秀部分**：两个定时任务文件（SyncPjgcs/SyncPjgx）代码规范，无 SonarQube 问题
- **需改进部分**：BOPC010101MessageConverter（System.out.println、注释代码）、HnnxBankDiscBillServiceImpl（废弃方法、认知复杂度高）
- **静态分析补充发现**：POBM010304MessageConverter（日志占位符、异常处理）和 HnnxbankBranchUserServiceImpl（Logger类名、commons-lang版本）的问题未被 SonarQube 标记但确实存在

### 10.3 改进建议

1. **立即修复 P1 级问题**：8个高优先级问题（废弃方法、System.out.println、日志占位符、commons-lang版本等）
2. **补充单元测试**：优先为定时任务和机构校验逻辑编写测试
3. **配置新代码周期**：在 SonarQube 中配置 New Code Period，追踪增量代码质量
4. **配置质量门禁条件**：设置具体门禁阈值，确保新代码满足质量要求
5. **修复 Token 权限**：为 MCP Token 授予安全热点查询权限

---

*报告结束*
