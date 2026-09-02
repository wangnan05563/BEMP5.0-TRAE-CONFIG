---
name: "bemp-backend-code-review"
description: "审查BEMP银行个性化后端代码是否符合项目规范，含代码结构、注解、参数传递、安全性、性能等检查。支持多银行配置切换。"
whenToUse: "需要审查BEMP工程各银行个性化后端代码是否符合项目规范"
triggers: "代码/规范/code 走查/审查/审核/把关/review"
version: "3.4.0"
updated: "2026-08-30"
config: "config/bank-config.json"
scripts: "scripts/auto-scan.ps1"
template: "templates/report-template.md"
references:
  generalJavaPitfalls: "references/general-java-pitfalls.md"
checklists:
  specConsistency: "config/spec-consistency-checklist.json"
  degradation: "config/degradation-checklist.json"
  reviewFlow: "config/review-flow-checklist.json"
---

## 配置加载铁律（取参前必读）

本技能 config 下 JSON 中的 `${ENV:VAR}` 是占位符，直接读文件得到的是字面量，不是参数值。取参数值必须先解析：

```powershell
# 解析整个配置 / 取单键（以解析结果为参数值，禁止拿 ${ENV:XXX} 字面量当值用）
python  "..\_shared\load_config.py"  --file "<本技能配置路径>"  --get <a.b.c>
node    "..\_shared\load-config.js"  --file "<本技能配置路径>"  --get <a.b.c>
```

- 解析链：环境变量 > `_shared/env-config.json` environmentDefaults（唯一配置入口）> `${ENV:VAR:默认值}` 内联默认值
- 解析报错 → 跑 `powershell -File "<skills根>\_shared\doctor-config.ps1"`，按 FAIL 清单修复（改 _shared 或设环境变量，禁止把真值回写技能 config）
- 完整约定见 [_shared/config-loading-guide.md](../_shared/config-loading-guide.md)

# BEMP后端代码审查

## 银行配置

银行参数在 `config/bank-config.json` 中管理。切换银行时修改 `_shared/env-config.json` 的 `BANK_CODE` 即可，无需改本文档。

| 占位符 | 当前值 | 说明 |
|--------|--------|------|
| `{bankName}` | `${ENV:BANK_NAME}` | 中文名称 |
| `{bankCode}` | `${ENV:BANK_CODE}` | 目录/包名 |
| `{sourceDir}` | banks/ext-${ENV:BANK_CODE} | 源码根目录 |
| `{packagePath}` | com.hundsun.bemp.${ENV:BANK_CODE} | 包路径 |
| `{classPrefix}` | `${ENV:BANK_CLASS_NAME_PREFIX}` | 类名前缀 |
| `{dtoPrefix}` | `${ENV:BANK_CLASS_PREFIX}` | DTO前缀 |
| `{urlPrefixes}` | /hnnx/, `${ENV:BANK_URL_PREFIX}` | 请求路径前缀 |

> 以上为占位符示例，实际值由 _shared/env-config.json 的 environmentDefaults 提供。切换指南见 [附录B](#附录b银行配置切换指南)。

## 配置继承与生效配置

**三级继承**：技能级 `defaults` → 项目级 `projectOverrides` → 银行级 `bankOverrides.{bankCode}`，按 `id` 匹配仅覆盖指定字段（severity/checkLogic/fixSuggestion/enabled 等），`enabled: false` 可禁用检查项。

**生效配置探测（省 token，禁止整读 checklist JSON）**：
- SC/DG/RF 检查项以本文档 §22/23/24 的表格为默认生效集
- 仅当 `python ..\_shared\load_config.py --file <对应checklist路径> --get bankOverrides.{bankCode}` 返回覆盖内容时，才读取对应 JSON 按继承规则合并；返回 `[ERROR] 配置路径不存在` 即该银行无覆盖，直接用默认生效集（勿视为故障重试）
- `config/review-flow-checklist.json` 的 `parameters.maxInClauseSize`（默认1000）需在 RF-002/RF-004 执行时用 `--get parameters.maxInClauseSize` 取实际值

**配置文件清单**：

| 文件 | 用途 | 检查项数 |
|------|------|---------|
| `config/bank-config.json` | 银行参数 + 执行环境参数（`environment.shellInterpreter` 等） | - |
| `config/spec-consistency-checklist.json` | Spec一致性检查 | 6项 |
| `config/degradation-checklist.json` | 降级处理模式检查 | 6项 |
| `config/review-flow-checklist.json` | 流程与真实性检查（含 parameters 节） | 4项 |

> **执行命令参数化**：shell 命令解释器统一从 `bank-config.json` 的 `environment.shellInterpreter`（默认 `powershell`）读取，文档中以 `{shellInterpreter}` 占位——禁止在任何环境硬编码 `pwsh` 或 `powershell` 字面量。

## 审查模式与单轮闭环

| 模式 | 扫描范围 | 触发 |
|------|---------|------|
| 快速自检 | 仅阻塞级 | `{shellInterpreter} {shellArguments} scripts/auto-scan.ps1` |
| 增量审查 | `git diff --name-only` 变更文件 | 默认 |
| 全量审查 | `{sourceDir}/**/*.java` | 增量集为空且用户确认后 |

**模式自动推断（I1）**：先跑 `git diff --name-only`——有输出→增量；为空→询问用户是否全量。用户显式指定模式时优先。

**单轮闭环（F1）**：触发 → `_shared` 链自动解析银行 → I1 推断模式 → auto-scan L0 预筛 → **仅读取命中文件+变更文件**（L0-FILES 清单外的一律不读）→ 审查 → 报告落盘 → 摘要返回。全程禁止 AskUserQuestion（唯一例外：阶段1 Spec 口径冲突预检发现未消歧项）。

**长内容外置（I3）**：用户在对话中粘贴长日志/spec/代码时，引导其存为临时文件传路径，禁止长内容内联进入上下文。

**子代理隔离（C2）**：按模块用 Task 子代理执行深审，主会话仅回收"发现清单（检查ID+文件+行号+严重度）"；子代理 prompt 中内嵌该模块命中的检查项原文，代码原文不进主会话上下文。子代理交付的存在性结论按 RF-001 由主会话复核。

**审查缓存（I4）**：auto-scan.ps1 `-ExportManifest` 生成 `reports/.scan-manifest-{bankCode}.json`（文件+SHA256）。重复审查时先比对上次 manifest，未变更且已审文件跳过，报告中注明"缓存跳过 N 个未变更文件"。

---

## 审查规则

### 1. 目录与包结构
- 【强制】代码必须在 `{sourceDir}` 下，包路径 `{packagePath}.{module}.{layer}`

### 2. 个性化类开发
- 【强制】**extends** 产品实现类的 Service/Atom 加 `@CustomizedBean`（替换产品Bean）
- 【强制】**仅 implements** 个性化接口的 Service/Atom 不加 `@CustomizedBean`，只需 `@CloudComponent`
- 【强制】类名加 `{classPrefix}` 前缀，如 `HnnxBankRebuyBillAtomImpl extends RebuyBillAtomImpl`
- 【强制】Controller 不加 `@CustomizedBean`，应继承 BaseController

**判断规则**：`extends XxxImpl` → `@CustomizedBean` + `@CloudComponent`；`implements XxxService`（仅接口）→ 仅 `@CloudComponent`

### 3. Controller 规范

- 【强制】`@RestController` + 路径以 `{urlPrefixes}` 任一开头
- 【推荐】新功能用 DTO 对象接收参数，兼容旧代码可用 `BaseRequest`（见第5节）
- 返回值：`CommonResp` 或 `void`（导出），方法加 `@RequestMapping` 指定 method
- 【阻塞】GET 禁止做状态变更操作（激活/删除等）
- 【强制】集合接口必须有分页（默认20条），禁止返回全量数据
- 通用 REST 设计细则（HTTP动词语义/URL名词化/版本化/响应体一致性/错误格式等，警告级）→ [general-java-pitfalls.md §1](references/general-java-pitfalls.md)

### 4. Service 规范
- 【强制】实现类 `@CloudComponent`，接口 `@CloudService`，方法 `@CloudFunction`
- 【强制】对外接口/DTO 放 `{bankCode}-biz-api` 工程：接口在 `{module}/service/` 包（@CloudService），实现放 biz-as 同构包路径（@CloudComponent）；接口/DTO 留在 as 工程属分层契约违规（阻塞）

### 5. 参数传递

**优先级：新功能→DTO对象 ⭐ | 兼容旧代码→BaseRequest | 少用@RequestBody**

| 场景 | 参数接收方式 | 关键约束 |
|------|------------|---------|
| 新功能 | `public CommonResp xxx(HnnxXxxReq req)` | DTO 属性名=前端参数名，Spring MVC 自动绑定 form-data |
| 兼容旧代码 | `public CommonResp xxx(BaseRequest<QryDto> req)` | 前端用 `requestDto: {...}` 格式 |
| JSON场景 | `public CommonResp xxx(@RequestBody HnnxXxxReq req)` | 需前端改 `Content-Type: application/json` |

❌ 不推荐：仅支持 extParam 格式的单一方式。DTO 定义样板见 [§2](references/general-java-pitfalls.md)。

**检查清单**：前后端参数名一致(fieldName=filedName)、DTO有getter/setter、空值校验、基本类型用包装类(Integer非int)、方法参数>3个考虑参数对象、禁止布尔参数（用枚举替代）、公共API输入必须校验

### 6. DTO 设计
- 命名：`{dtoPrefix}` + 功能名 + `Req/Resp/QueryDto`
- 存放：`{sourceDir}/{bankCode}-biz-api/src/main/java/.../dto/`，与接口同域就近（`{module}/dto/` 或 `{module}/service/{子域}/dto/`），禁止跨域混放；接口迁移保持包名不变（引用方零改动）

### 7. 依赖注入
- 远程服务：`@CloudReference` | 本地Bean：`@Autowired`（禁止`@Resource`）

### 8. 服务调用与数据完整性

调用产品化服务前，确保 DTO 设置了所有必需字段（userNo、legalNo、brchNo、roleIds、userType等）。

> 排查方案参见 [附录A](#附录a常见问题排查表)

**检查清单**：主键✓ 外键✓ 业务必需字段✓ 关联查询字段✓ 类型标识字段✓

**调研流程**：查看接口定义 → 查看实现逻辑 → 参考已有示例 → 测试验证

### 9. 日志记录与异常处理

**日志**：ERROR：异常/失败 | WARN：潜在问题 | INFO：关键操作 | DEBUG：调试(生产关闭)
- 禁止记录密码/密钥；异常必须包含异常对象 `LOGGER.error("msg", e)`

**异常处理**：
- 禁止空 catch 块（吞异常）或过宽 catch `Exception`/`Throwable`
- 捕获异常后必须保留原始堆栈：`throw new XxxException("msg", e)`
- 禁止用异常做流程控制；自定义领域异常区分业务错误
- 检查异常不应泄漏到 API 边界
- AOP切面重写逻辑时必须打印日志说明进入切面

### 10. 代码质量与Null安全

**代码质量**：中文注释（关键逻辑）、`BempRuntimeException` 异常、空值边界处理

**Null Safety（BEMP要点）**：
- 禁止链式调用未判空（如 `user.getName().toUpperCase()`）
- 可能为空的返回值禁止返回 null（改用 `Collections.emptyList()`）
- List判断顺序：先null再size；循环前检查空数据集防死循环
- 通用 Null 安全细则（Optional/@Nullable/Integer缓存等）→ [§3](references/general-java-pitfalls.md)

**数值比较（阻塞级）**：
- BigDecimal比较用compareTo，禁止==或equals（精度：1.0 vs 1.00）
- Integer/Long/String比较用equals，禁止==（auto-scan 第10项检出）
- 边界值确认：逻辑判断遗漏等于的情况（如≥遗漏=）

### 11. 安全性
- [ ] 禁止日志输出密码/密钥/Token
- [ ] 禁止硬编码密钥/连接字符串
- [ ] SQL使用参数化查询（`#{}`），禁止字符串拼接
- [ ] 服务端二次校验输入；文件上传限制类型和大小
- [ ] 敏感操作校验权限；排查越权风险

### 12. 性能与资源管理

- [ ] 无N+1查询；批量操作用批量接口（RF-002 专项见 §24）
- [ ] 循环内不调用远程服务；大对象及时释放
- [ ] 资源关闭与流顺序 → [§4](references/general-java-pitfalls.md)
- [ ] 禁止循环内字符串拼接（用 StringBuilder）
- [ ] 分页查询必须加唯一排序字段，否则跳页重复
- [ ] 大数据量分页查询每页≤2000条（推荐500）；日终任务默认10条需改为分页
- [ ] 批量插入替代逐条插入；大数据量禁止全表加载到内存
- [ ] 大数据量统计用数据库group by，禁止内存循环相加

### 13. 事务、并发与异步（BEMP专属）

- [ ] `@Transactional(rollbackFor = Exception.class)`，边界合理
- [ ] 无自调用导致事务失效；事务失效需通过原子层配置
- [ ] 大事务拆分：批量处理每批≤2000条，分小事务提交
- [ ] 事务提交要及时：发报文后事务未提交导致查不到数据
- [ ] Redis锁防并发：条件查询前加锁、加锁后再查询一次
- [ ] Redis锁必须在事务外面（事务内加锁→释放锁但事务未提交→并发问题）
- [ ] Redis锁推荐用`addLockInTime`，不用`LockUtils.getLock().addLock`
- [ ] 死锁风险：update/delete先查再按主键操作，避免仅用索引字段锁全表
- [ ] 同一事务更新多张表需保证顺序一致，避免死锁
- [ ] 事务未提交不得开线程查询后置状态（如签收后自动记账）
- [ ] 不得随意开独立事务（mybatis查询缓存导致查不到新增数据）
- [ ] 事务A中两次同样SQL查询结果一致（MVCC），注意别依赖中间状态
- [ ] 共享对象防篡改：Converter类属性并发下被篡改，用局部变量/JSONObject传递
- [ ] `@Async` 方法必须 public + 从不同 Bean 调用（同类自调用不生效）
- [ ] `@EnableAsync` 已配置 + 自定义线程池（禁止默认SimpleAsyncTaskExecutor）
- [ ] ThreadLocal必须在当前线程finally中释放
- [ ] 通用并发细则（DCL/原子类/锁finally等）→ [§5](references/general-java-pitfalls.md)

### 14. 国际化与Maven
- API路径前后端一致；`pom.xml` 版本参考 `bom/import-bom/pom.xml`
- Java 1.8语法，命名规范

### 15. 集合与流
- `Collectors.toMap()` 重复key必须提供merge函数 `(v1,v2)->v2`，value不能为null（**严重级**）
- 其余集合/流通用细则 → [§6](references/general-java-pitfalls.md)

### 16. Java惯用法

**BEMP要点**：
- 静态变量有final修饰修改后需重新打包
- BigDecimal.divide必须设精度：`divide(divisor, scale, RoundingMode)`
- 金额多步乘除：先乘后除，过程不精确最后才精确到小数位
- 计算日期天数用DateUtils，禁止Integer相减（跨月跨年错误）
- 子票区间字段用Long，禁止Integer
- for循环中queryDto每次需重新new并赋值
- 通用惯用法细则（equals/hashCode/Builder/replaceAll等）→ [§7](references/general-java-pitfalls.md)

### 17. 测试建议
- 审查时建议补充的单元测试场景 → [§8](references/general-java-pitfalls.md)

### 18. 架构与分层

- 包组织策略明确：按功能（推荐）或按层，不可混合
- 禁止跨层调用：Controller不调Service实现、Service不依赖Controller
- 领域包不引入框架注解（@Entity/@Repository/@JsonIgnore）
- 禁止循环依赖：A→B→C→A
- `util/`、`common/` 包不得无限增长（应归属对应功能模块）
- DTO在边界处转换，领域对象不出边界
- 新增功能应仅影响对应功能包，不应触碰多个包

### 19. SQL与数据库专项
- 大表查询必须加索引；关联查询字段加索引
- 查询条件中使用函数会导致索引失效，改用范围查询
- SQL兼容：Oracle空字符串=null、下划线转义escape '\'、MySQL删除无别名、信创环境通用写法
- SQL拼接：条件拼接正确性、MyBatis类型转换(BigDecimal.ZERO=0.0)、超长SQL分批查询
- 查询性能：避免大循环查询(用Map替代循环单查)、多表关联优化、数据库统计替代内存计算
- 分页规范：必须加唯一排序、默认条数检查、跳页问题处理
- `!= 'xxx'`查不出null记录；`in()`不超过1000个（RF parameters.maxInClauseSize）；or太多数据库报错
- 查询/更新条件必须做空判断，防止全表查询/全表更新
- 日期条件避免`<=当前营业日`（数据量大不走索引），改用范围查询
- `updateById`全字段更新 vs `updateByIdSelective`空值不拼接，并发场景用Selective
- mybatis.xml非String类型不得写`!= ''`；`#{bankNo}`需加`jdbcType=VARCHAR`
- left join右表过滤条件会失效，批次+明细查询需注意
- varchar截取需转字节处理（中文GBK 2字节/UTF-8 3字节）
- 更新时where条件加前置状态控制防并发，并判断更新结果集

### 20. 票据业务专项
- 金额计算：需求评审明确规则、金额加减通过数据库操作
- 保证金/扣款/利率：算法累加一致性、扣款分摊正确性、利率单位确认(÷100问题)
- 日终任务：分页处理全部数据(非默认10条)、连接超时调参、日期计算考虑月份变化
- 流水号：取后6位避免重复、对象共享防覆盖、循环使用防重复
- 硬编码：产品代码/机构号不写死、文件解析字段长度配置化
- 代码拷贝：拷贝代码需全面修改，涉及后续修改的不要拷贝
- 方法修改：方法签名不建议修改，建议新增方法防NoSuchMethodError
- 分录配置：acct_tran_no唯一、group_no/row_no不重复、history_flag规则、修改后刷新缓存
- 接口流水号：BaseRequest必须setReqFlowNo，循环调用需重新生成
- 票交所机构：查询需确认有效(ST01)/注销(ST03)，承兑人名称vs开户行名称来源不同表
- 客户账号：账号+行号才唯一（不同客户可能同账号），查询需注意active_flag
- 等分化后：billInfo的Id在其他表不唯一，不能只按billId查询
- 加字段后：DTO转换方法(dto→entity/entity→dto/dto→example)也要补充字段
- 产品号判断：优先用父产品号，可做到向后兼容

### 21. BEMP项目规范
- `@CloudComponent`继承顺序：implements接口，不extends实现类
- 依赖注入严格用`@Autowired`，禁止`@Resource`
- StringUtils统一用`commons-lang3`，禁止commons-lang
- PageInfo默认pageSize=10，日终/大数据量场景需显式设置
- dataprovide.xml分页查询必须加唯一排序，union all需包裹后排序
- 产品方法private可改protected，但需检查个性化是否同步修改
- 引入第三方包需检查传递依赖冲突（如slf4j-simple与log4j）
- 升级二方包需检查是否涉及SQL脚本，放banks下不放increment下
- 拷贝代码需检查example是否有对应set，避免查询条件不生效
- Dto属性类型不要Date，导出用专门Dto再转换
- 首页提醒必须用Controller模式，禁止sql模式

### 22. Spec一致性检查

比对代码实现与spec（需求文档/设计文档）的一致性，捕获"实现与设计偏差"类缺陷。**前置条件**：无spec时跳过本节并在报告中注明。

| ID | 检查项 | 严重度 | 检查要点 |
|----|--------|--------|---------|
| SC-001 | 日志级别一致性 | 严重 | spec要求error vs 代码实现warn/info |
| SC-002 | 异常处理一致性 | 阻塞 | spec要求抛异常 vs 代码实现return |
| SC-003 | 任务隔离一致性 | 严重 | spec要求任务隔离 vs 代码静默跳过/中断 |
| SC-004 | 错误文案一致性 | 警告 | spec定义文案 vs 代码实际文案 |
| SC-005 | 流程顺序一致性 | 严重 | spec步骤顺序 vs 代码调用顺序 |
| SC-006 | 参数校验一致性 | 阻塞 | spec校验要求 vs 代码实现 |

> 各项 checkLogic/fixSuggestion/example 见 `config/spec-consistency-checklist.json`（生效配置探测见「配置继承与生效配置」节）。典型场景：spec要求"CBS文件不存在时记录error日志并抛异常终止"，代码"LOGGER.warn + return" → SC-001(严重) + SC-002(阻塞)。

### 23. 降级处理模式检查

系统化检查降级处理是否符合规范，捕获静默失败、数据丢失、流程中断。

| ID | 降级场景 | 严重度 | 正确处理 | 错误处理 |
|----|---------|--------|---------|---------|
| DG-001 | 文件不存在 | 阻塞 | 关键文件抛异常，可选文件warn+降级 | 静默return无日志 |
| DG-002 | 文件为空 | 严重 | 必填文件抛异常，可空文件返回空集合 | return null致NPE |
| DG-003 | 数据为空 | 严重 | 返回空集合+info日志，区分无数据vs查询失败 | return null或静默跳过 |
| DG-004 | 网络异常 | 严重 | 有限次重试(≤3次)+退避，失败后抛异常 | 直接catch+return不重试 |
| DG-005 | 服务不可用 | 阻塞 | 核心服务抛异常，非核心服务降级+warn | 核心服务静默跳过 |
| DG-006 | 配置缺失 | 严重 | 必填配置抛异常，可选配置用默认值+info | 必填配置用默认值0/空串 |

> 各项 checkLogic/example 见 `config/degradation-checklist.json`。与SC协同：spec有明确要求时用SC-002，spec未明确时用DG规则兜底。

### 24. 流程与真实性检查

> 源自反洗钱(中互金)需求复盘：假目录(`ext-hhnxbank` vs `ext-hnnxbank`)、循环内逐条查库N+1、口径迭代后注释漂移、SQL臆造函数。配置于 `config/review-flow-checklist.json`，数值阈值（maxInClauseSize 等）用 `--get parameters.*` 取值。

| ID | 检查项 | 严重度 | 核心逻辑 |
|----|--------|--------|---------|
| RF-001 | 环境真实性验证 | 阻塞 | sourceDir/关键文件 RunCommand 级核验（Test-Path）；子智能体存在性结论须主会话复核；近似目录名人工裁决 |
| RF-002 | 循环内逐条查库补全(N+1) | 严重 | 批量收集缺失项 → 按 maxInClauseSize 分片一次 in 查询 → 内存回填（仅空缺项）；单条场景委托同一实现 |
| RF-003 | 注释实现漂移 | 严重 | 注释中的字段名/表名/取数路径与代码实现逐一比对；口径变更必须同步注释 |
| RF-004 | SQL 引用真实性 | 阻塞 | 新增 SQL 的表名/列名/JOIN 条件须存量 mapper 或实体佐证；写后回读自查 UNION/join/in 结构完整性 |

---

## 快速自检

执行 `{shellInterpreter} {shellArguments} scripts/auto-scan.ps1` 自动检查以下阻塞项：

1. Service/Atom（extends产品实现类）缺 `@CustomizedBean`
2. Controller 误加 `@CustomizedBean`
3. 请求映射路径不以配置的 URL 前缀开头
4. Controller 缺少 `@RestController`
5. DTO 未实现 `Serializable`
6. Controller 返回值非 `CommonResp`/`void`
7. DTO 命名前缀不符 `{dtoPrefix}` 规范
8. 使用 `e.printStackTrace()` 替代日志
9. BigDecimal 用 `==`/`equals` 比较
10. Integer/Long 用 `==` 比较
11. 时间格式误用 `hh`(12h) 替代 `HH`(24h)
12. SQL 存在字符串拼接
13. 硬编码机构号/产品代码
14. 使用 `@Resource` 注入（应用 `@Autowired`）
15. 使用 `commons-lang` 的 `StringUtils`（应用 `commons-lang3`）
16. `Collectors.toMap()` 缺少 merge 函数

**L0 预筛（I2）**：脚本尾部输出 `L0-FILES` 机器可读清单（含全部风险特征的候选文件）。LLM 审查阶段只读该清单 + git 变更文件，其余文件不进入上下文。

---

## 审查流程

### 阶段1：前置检查
- **环境真实性验证（RF-001，阻塞）**：对 `{sourceDir}`、`{dtoSourceDir}` 及本次将读写的每个关键文件执行 RunCommand 级存在性核验（`Test-Path`）后方可行动——Glob/Grep/Read 的索引命中不作为存在依据；子智能体的存在性结论必须主会话复核后才可采信；同一目录出现多个近似名称候选时人工裁决
- **Spec口径冲突预检**：读取 spec 前先汇总会话内同一业务要素的不同表述（字段名/表名/码值/版本），未消歧项以 AskUserQuestion 定案后再比对实现，禁止静默选边——冲突记录写入报告"口径变更记录"段
- 文件位置/包结构/类前缀/注解/URL前缀/DTO前缀按 §1-§7 检查

### 阶段2-3：代码规范 + 质量安全
按 §2-§21 逐节检查，命中通用知识特征时按引用加载 references 对应小节。

### 阶段4：Spec一致性与降级模式检查
按 §22/§23 表格逐项比对；生效配置按「配置继承与生效配置」探测后执行。

### 阶段4.5：流程与真实性检查
按 §24 RF-001~RF-004 执行，阈值取自 `review-flow-checklist.json` parameters 节。

### 阶段5：Maven编译 → 阶段6：输出报告（模板见 `templates/report-template.md`）

---

## 审查判断标准

严重度分级（详细规则参见前述各章节）：

- 🟠**阻塞**（必须修复）：结构违规（文件位置/包路径/类前缀/`@CustomizedBean`/`@RestController`/URL前缀/DTO前缀）、对外接口/DTO 未放 `{bankCode}-biz-api` 工程或 DTO 跨域混放（分层契约违规，见 §4/§6）、Maven编译失败、安全漏洞（硬编码密钥/SQL拼接）、公共API返回null、GET引发状态变更、Spec要求抛异常但代码return（SC-002/SC-006）、关键文件不存在静默return（DG-001）、核心服务不可用静默跳过（DG-005）、环境真实性未验证即行动（RF-001）、SQL表名列名join条件无佐证或臆造函数（RF-004）、`@Resource`注入、mybatis非String类型写`!= ''`、循环依赖、BigDecimal/Integer/Long用`==`比较、查询/更新条件缺空判断、领域包引入框架注解
- 🟠**严重**（强烈建议）：服务调用缺必需字段、异常处理不完善（吞异常/丢堆栈）、空指针风险、日志含敏感信息/不规范、N+1查询/循环调远程、循环内逐条查库补全且未批量化（RF-002）、注释实现漂移致凭证失真（RF-003）、事务边界不合理、资源未关闭、`@Async`同类自调用、`Collectors.toMap`缺merge函数、Redis锁缺失/在事务内、Spec日志级别/任务隔离/流程顺序不一致（SC-001/SC-003/SC-005）、降级处理不当（DG-002~DG-004/DG-006）、分页查询缺唯一排序、大事务未拆分
- 🟡**警告**（建议）：格式化/变量命名/注释规范、DTO未实现Serializable、equals/hashCode未配对、toString含敏感字段、遍历中修改集合、并行Stream滥用、URL使用动词、API无版本路径、`Executor`未配置关闭、日终任务默认10条未改分页、硬编码产品代码/机构号、时间格式hh误用为HH、`@CloudComponent`继承实现类、Dto属性用Date类型、`StringUtils`用commons-lang、Spec错误文案不一致（SC-004）
- 🟢**提示**（可选）：轻微问题，不影响功能，建议优化。如：注释拼写/措辞、局部变量命名风格细节、过度防御性判空、可读性改进、未使用的private方法、import顺序、魔法值未抽取常量但语义清晰、日志级别info/debug选择失当但不影响排障

---

## 审查报告

报告保存路径：`bemp-backend-code-review/reports/{bankCode}_YYYY-MM-DD_HHmmss_[full|incremental]_report.md`

**报告输出规范（省 token）**：
- 只列违规项+修复建议；通过项仅汇总计数（如"§13 并发 20 项：18 通过 2 违规"）
- 详略分级：阻塞=位置+错对代码对照+修复；严重=位置+一行修复；警告=一行式；提示=仅计数
- 禁止复述规则原文/checklist 全文/审查过程性叙述

---

## 重要提醒

1. 【强制】Service/Atom extends产品实现类加 `@CustomizedBean`；仅implements个性化接口不加，用 `@CloudComponent`；Controller不加、继承BaseController
2. 【推荐】新功能参数用DTO对象，兼容旧代码用BaseRequest（见第5节）
3. 【强制】代码在 `{sourceDir}` 下；DTO前缀 `{dtoPrefix}`；编译通过
4. 【强制】提交前执行 `auto-scan.ps1`；完成后调用本技能走查

---

## 附录A：常见问题排查表

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| "法人编号和机构号都不能为空" | 调用服务时DTO缺brchNo | `setBrchNo()`，详见第8节 |
| "用户名或密码错误" | 前后端参数格式不匹配 | 对齐格式，选DTO/BaseRequest之一 |
| Content type not supported | @RequestBody vs form-data冲突 | 去@RequestBody(推荐) 或 前端改为JSON |
| Object cannot be cast to XxxReq | 前后端参数结构不一致 | DTO→传对象，BaseRequest→requestDto，JSON→@RequestBody |
| Maven编译失败 | Java版本/依赖/缺少import | `mvn compile -DskipTests`；检查pom.xml |
| 参数获取为null | 参数名不一致/DTO缺setter/前端未传 | 确保大小写一致、有setter、前端传值 |
| 服务调用超时 | 死循环/慢查询/事务未提交/依赖未注入 | 逐项排查循环依赖、SQL索引、事务、注入 |

---

## 附录B：银行配置切换指南

**切换步骤**（单一入口在 `_shared/env-config.json`）：
1. 编辑 `_shared/env-config.json` 的 `environmentDefaults.BANK_CODE` 为目标 bankCode（同时同步该文件其它 `BANK_*` 参数）；本技能 `currentBank` 为 `${ENV:BANK_CODE}` 占位符，无需修改
2. 若 `config/bank-config.json` 的 `banks` 字典中无该银行参数，参照 `example` 模板添加
3. 会话级临时切换可用 `$env:BANK_CODE = 'xxx'`（优先级高于 _shared 默认值）

**切换后检查**：`sourceDir` 存在✓ `dtoSourceDir` 存在✓ 运行 `auto-scan.ps1` 通过✓ 报告银行名正确✓
