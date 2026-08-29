---
name: "bemp-backend-code-review"
description: "审查BEMP银行个性化后端代码是否符合项目规范，含代码结构、注解、参数传递、安全性、性能等检查。支持多银行配置切换。"
whenToUse: "需要审查BEMP工程各银行个性化后端代码是否符合项目规范"
triggers: "代码/规范/code 走查/审查/审核/把关/review"
version: "3.2.0"
updated: "2026-07-22"
config: "config/bank-config.json"
scripts: "scripts/auto-scan.ps1"
template: "templates/report-template.md"
checklists:
  specConsistency: "config/spec-consistency-checklist.json"
  degradation: "config/degradation-checklist.json"
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

银行参数在 `config/bank-config.json` 中管理。切换银行时修改 `currentBank` 即可，无需改本文档。

| 占位符 | 当前值 | 说明 |
|--------|--------|------|
| `{bankName}` | `${ENV:BANK_NAME}` | 中文名称 |
| `{bankCode}` | `${ENV:BANK_CODE}` | 目录/包名 |
| `{sourceDir}` | banks/ext-${ENV:BANK_CODE} | 源码根目录 |
| `{packagePath}` | com.hundsun.bemp.${ENV:BANK_CODE} | 包路径 |
| `{classPrefix}` | `${ENV:BANK_CLASS_NAME_PREFIX}` | 类名前缀 |
| `{dtoPrefix}` | `${ENV:BANK_CLASS_PREFIX}` | DTO前缀 |
| `{urlPrefixes}` | /hnnx/, `${ENV:BANK_URL_PREFIX}` | 请求路径前缀 |

> 以上为占位符示例，实际值由 _shared/env-config.json 的 environmentDefaults 提供。

> 切换指南见 [附录B](#附录b银行配置切换指南)

## 配置继承机制

所有配置文件遵循三级继承：**技能级默认(defaults) → 项目级覆盖(projectOverrides) → 银行级覆盖(bankOverrides.{bankCode})**

| 级别 | 配置位置 | 作用 | 覆盖规则 |
|------|---------|------|---------|
| 技能级 | `config/*.json` 的 `defaults` | 全局默认检查项 | 基线，不可删除 |
| 项目级 | `config/*.json` 的 `projectOverrides` | 项目通用覆盖 | 按id匹配，覆盖指定字段 |
| 银行级 | `config/*.json` 的 `bankOverrides.{bankCode}` | 单银行特殊规则 | 按id匹配，最高优先级 |

**覆盖原则**：按 `id` 匹配，仅覆盖指定字段，未覆盖字段继承上一级默认值。`enabled: false` 可禁用某检查项。

**配置文件清单**：

| 文件 | 用途 | 检查项数 |
|------|------|---------|
| `config/bank-config.json` | 银行参数（目录/包名/前缀等）+ 执行环境参数（`environment.shellInterpreter` 等） | - |
| `config/spec-consistency-checklist.json` | Spec一致性检查（代码实现vs spec要求） | 6项 |
| `config/degradation-checklist.json` | 降级处理模式检查（异常/空值/服务降级） | 6项 |
| `config/review-flow-checklist.json` | 流程与真实性检查（环境真实性/N+1批处理/注释漂移/SQL引用真实性） | 4项 |

> **执行命令参数化**：审查相关 shell 命令的解释器统一从 `bank-config.json` 的 `environment.shellInterpreter`（默认 `powershell`，可被 `banks.{bankCode}.environment` 覆盖）读取，文档中以 `{shellInterpreter}` 占位——禁止在任何环境硬编码 `pwsh` 或 `powershell` 字面量。

## 审查模式

| 模式 | 扫描范围 | 触发 |
|------|---------|------|
| 快速自检 | 仅阻塞级 | `{shellInterpreter} {shellArguments} scripts/auto-scan.ps1` |
| 增量审查 | `git diff --name-only` 变更文件 | 粘贴变更文件列表 |
| 全量审查 | `{sourceDir}/**/*.java` | 默认 |

---

## 审查规则

### 1. 目录与包结构
- 【强制】代码必须在 `{sourceDir}` 下，包路径 `{packagePath}.{module}.{layer}`

### 2. 个性化类开发
- 【强制】**extends** 产品实现类的 Service/Atom 加 `@CustomizedBean`（替换产品Bean）
- 【强制】**仅 implements** 个性化接口的 Service/Atom 不加 `@CustomizedBean`，只需 `@CloudComponent`
- 【强制】类名加 `{classPrefix}` 前缀，如 `HnnxBankRebuyBillAtomImpl extends RebuyBillAtomImpl`
- 【强制】Controller 不加 `@CustomizedBean`，应继承 BaseController

**判断规则**：
- `extends XxxImpl` → 加 `@CustomizedBean` + `@CloudComponent`（替换产品化Bean）
- `implements XxxService`（仅实现接口）→ 仅 `@CloudComponent`（新建Bean，无需替换）

### 3. Controller 规范

- 【强制】`@RestController` + 路径以 `{urlPrefixes}` 任一开头
- 【推荐】新功能用 DTO 对象接收参数，兼容旧代码可用 `BaseRequest`（参见第5节）
- 返回值：`CommonResp` 或 `void`（导出），方法加 `@RequestMapping` 指定 method

**API设计**：
- 使用语义化HTTP动词：GET查询、POST创建、PUT全量更新、PATCH局部更新、DELETE删除
- 禁止GET做状态变更操作（如激活、删除）
- 集合接口必须有分页（默认20条），禁止返回全量数据
- URL使用复数名词而非动词（`/users` 而非 `/getUsers`），路径层级表达关联（`/users/{id}/orders`）
- 响应体一致性：同一集合要么全包装要么全裸返回，不可混合
- 禁止返回200+错误体（应使用4xx/5xx状态码）
- 响应使用DTO而非实体对象（避免JPA懒加载N+1和字段泄漏）
- 全局异常处理器统一错误格式，禁止暴露堆栈信息
- 向后兼容：同版本内禁止删除接口/字段、变更字段类型、增加必填参数
- API版本化：公共接口路径包含版本号（`/v1/`、`/v2/`）

### 4. Service 规范
- 【强制】实现类 `@CloudComponent`，接口 `@CloudService`，方法 `@CloudFunction`

### 5. 参数传递

**优先级：新功能→DTO对象 ⭐ | 兼容旧代码→BaseRequest | 少用@RequestBody**

| 场景 | 参数接收方式 | 关键约束 |
|------|------------|---------|
| 新功能 | `public CommonResp xxx(HnnxXxxReq req)` | DTO 属性名=前端参数名，Spring MVC 自动绑定 form-data |
| 兼容旧代码 | `public CommonResp xxx(BaseRequest<QryDto> req)` | 前端用 `requestDto: {...}` 格式 |
| JSON场景 | `public CommonResp xxx(@RequestBody HnnxXxxReq req)` | 需前端改 `Content-Type: application/json` |

```java
// 推荐：DTO对象（Spring MVC自动绑定form-data）
public CommonResp batchCopyRole(HnnxBatchCopyRoleReq req) {
    BempValidUtil.validBaseRequest(req); // 或手动判空
}

// 备选：BaseRequest（兼容旧代码）
public CommonResp queryList(BaseRequest<QryDto> req) {
    BempValidUtil.validBaseRequest(req);
}
```

❌ 不推荐：仅支持 extParam 格式的单一方式

**DTO 定义**（`implements Serializable` + getter/setter + toString）：

```java
public class HnnxXxxReq implements Serializable {
    private static final long serialVersionUID = 1L;
    private String fieldName;
    // getter / setter / toString
}
```

**检查清单**：前后端参数名一致(fieldName=filedName)、DTO有getter/setter、空值校验、基本类型用包装类(Integer非int)、方法参数>3个考虑参数对象、禁止布尔参数（用枚举替代）、公共API输入必须校验

### 6. DTO 设计
- 命名：`{dtoPrefix}` + 功能名 + `Req/Resp/QueryDto`
- 存放：`{sourceDir}/{bankCode}-biz-api/src/main/java/.../dto/`

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
- 检查异常（checked exception）不应泄漏到 API 边界
- AOP切面重写逻辑时必须打印日志说明进入切面

### 10. 代码质量与Null安全

**代码质量**：中文注释（关键逻辑）、`BempRuntimeException` 异常、空值边界处理

**Null Safety**：
- 禁止链式调用未判空（如 `user.getName().toUpperCase()`）
- 公共API参数用 `Objects.requireNonNull()` 或在入口处判空
- 可能为空的返回值用 `Optional`，禁止返回 null（改用 `Collections.emptyList()`）
- `Optional.get()` 前必须有 `isPresent()` 检查
- 公共API标注 `@Nullable`/`@NonNull`

**数值比较**：
- BigDecimal比较用compareTo，禁止==或equals（精度：1.0 vs 1.00）
- Integer/Long/String比较用equals，禁止==（Integer缓存-128~127）
- 边界值确认：逻辑判断遗漏等于的情况（如≥遗漏=）
- List判断顺序：先null再size；循环前检查空数据集防死循环
- test.contains(null)会抛NPE（test.equals(null)不会）

### 11. 安全性 🆕v2.0
- [ ] 禁止日志输出密码/密钥/Token
- [ ] 禁止硬编码密钥/连接字符串
- [ ] SQL使用参数化查询（`#{}`），禁止字符串拼接
- [ ] 服务端二次校验输入；文件上传限制类型和大小
- [ ] 敏感操作校验权限；排查越权风险

### 12. 性能与资源管理

- [ ] 无N+1查询；批量操作用批量接口
- [ ] 循环内不调用远程服务；大对象及时释放
- [ ] 资源在 try-with-resources/finally 中关闭（Closeable/AutoCloseable、数据库连接/Statement）
- [ ] 流关闭顺序：先开后关、后开先关；File.getInputStream()每次new新流须用已有变量
- [ ] 禁止循环内字符串拼接（用 StringBuilder）
- [ ] 正则表达式预编译为 static final Pattern，禁止循环内 matches()
- [ ] 紧循环中可复用对象避免重复创建；优先使用 IntStream/LongStream
- [ ] 分页查询必须加唯一排序字段，否则跳页重复
- [ ] 大数据量分页查询每页≤2000条（推荐500）；日终任务默认10条需改为分页
- [ ] 批量插入替代逐条插入；大数据量禁止全表加载到内存
- [ ] 大数据量统计用数据库group by，禁止内存循环相加
- [ ] 大文件边读边处理，禁止一次性读取

### 13. 事务、并发与异步

- [ ] `@Transactional(rollbackFor = Exception.class)`，边界合理
- [ ] 无自调用导致事务失效；共享状态有同步机制
- [ ] 大事务拆分：批量处理每批≤2000条，分小事务提交
- [ ] 事务失效：方法调用未经过Spring（自调用）导致事务失效，需通过原子层配置
- [ ] 事务提交要及时：发报文后事务未提交导致查不到数据
- [ ] SimpleDateFormat用局部变量/ThreadLocal；HashMap→ConcurrentHashMap
- [ ] 共享可变状态必须同步；禁止非final对象上synchronized
- [ ] check-then-act模式改用原子操作（如 `computeIfAbsent` 替代 `if(!containsKey) put`）
- [ ] 双重检查锁定必须配合 volatile；优先使用 `AtomicReference`/`AtomicInteger`
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
- [ ] CompletableFuture 必须有异常处理（exceptionally/handle）
- [ ] `ExecutorService` 必须配置关闭（`@PreDestroy` shutdown）
- [ ] `Lock.unlock()` 必须放在 finally 中
- [ ] 考虑标注 `@ThreadSafe`/`@NotThreadSafe` 明确线程安全意图

### 14. 国际化与Maven
- API路径前后端一致；`pom.xml` 版本参考 `bom/import-bom/pom.xml`
- Java 1.8语法，命名规范

### 15. 集合与流

- 禁止遍历中修改集合（用 `removeIf` 替代 `iterator.remove`）
- 简单操作用循环而非 Stream（Stream 用于转换，循环用于副作用）
- `Collectors.toList()` 返回的集合不一定可变，需可变时用 `toCollection(ArrayList::new)`
- 不可变集合优先用 `List.of()`/`Set.of()`/`Map.of()`；防御性拷贝用 `List.copyOf()`
- Parallel Stream 需理解分叉/合并开销，仅适用于大数据量无状态操作
- `Collectors.toMap()` 重复key会抛异常，必须提供merge函数 `(v1,v2)->v2`
- `Collectors.toMap()` 的value不能为null，否则NPE

### 16. Java惯用法

- `equals` 与 `hashCode` 必须成对实现；仅重写其中一个会导致 HashMap/HashSet 异常
- hashCode 中仅使用不可变字段；用 `Objects.hash()` 简化实现
- 领域对象必须实现 `toString`（便于调试日志），但排除敏感字段（密码/密钥）
- 构造参数>3-4个时使用 Builder 模式
- 优先使用 instanceof 模式匹配（Java 16+）：`if (o instanceof User user)`
- 时间格式化：HH(24h) vs hh(12h)，禁止误用
- double转BigDecimal注意精度丢失，用BigDecimal.valueOf()或String构造
- replaceAll vs replace：前者支持正则，后者纯文本替换
- 静态变量有final修饰修改后需重新打包
- BigDecimal.divide必须设精度：`divide(divisor, scale, RoundingMode)`，否则ArithmeticException
- 金额多步乘除：先乘后除，过程不精确最后才精确到小数位
- subString/数组下标需确保不越界
- 计算日期天数用DateUtils，禁止Integer相减（跨月跨年错误）
- 子票区间字段用Long，禁止Integer
- ThreadLocal必须在当前线程finally中释放
- for循环中queryDto每次需重新new并赋值

### 17. 测试建议

审查时建议对以下场景补充单元测试：
- null 输入 / 空集合 / 边界值（0、-1、最大值）
- 异常分支（服务调用失败、参数校验不通过）
- 并发场景（共享缓存、计数器、懒加载初始化）
- 事务边界（跨服务调用、回滚条件）

### 18. 架构与分层

- 包组织策略明确：按功能（推荐）或按层，不可混合
- 禁止跨层调用：Controller不调Service实现、Service不依赖Controller
- 领域包不引入框架注解（@Entity/@Repository/@JsonIgnore）
- 禁止循环依赖：A→B→C→A
- `util/`、`common/` 包不得无限增长（应归属对应功能模块）
- DTO在边界处转换，领域对象不出边界
- 新增功能应仅影响对应功能包，不应触碰多个包

### 19. SQL与数据库专项 🆕v3.0
- 大表查询必须加索引；关联查询字段加索引
- 查询条件中使用函数会导致索引失效，改用范围查询
- SQL兼容：Oracle空字符串=null、下划线转义escape '\'、MySQL删除无别名、信创环境通用写法
- SQL拼接：条件拼接正确性、MyBatis类型转换(BigDecimal.ZERO=0.0)、超长SQL分批查询
- 查询性能：避免大循环查询(用Map替代循环单查)、多表关联优化、数据库统计替代内存计算
- 分页规范：必须加唯一排序、默认条数检查、跳页问题处理
- `!= 'xxx'`查不出null记录；`in()`不超过1000个；or太多数据库报错
- 查询/更新条件必须做空判断，防止全表查询/全表更新
- 日期条件避免`<=当前营业日`（数据量大不走索引），改用范围查询
- `updateById`全字段更新 vs `updateByIdSelective`空值不拼接，并发场景用Selective
- mybatis.xml非String类型不得写`!= ''`；`#{bankNo}`需加`jdbcType=VARCHAR`
- left join右表过滤条件会失效，批次+明细查询需注意
- varchar截取需转字节处理（中文GBK 2字节/UTF-8 3字节）
- 更新时where条件加前置状态控制防并发，并判断更新结果集

### 20. 票据业务专项 🆕v3.0
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

### 21. BEMP项目规范 🆕v3.1
- `@CloudComponent`继承顺序：implements接口，不extends实现类
- 依赖注入严格用`@Autowired`，禁止`@Resource`
- StringUtils统一用`commons-lang3`（`org.apache.commons.lang3.StringUtils`），禁止commons-lang
- PageInfo默认pageSize=10，日终/大数据量场景需显式设置
- dataprovide.xml分页查询必须加唯一排序，union all需包裹后排序
- 产品方法private可改protected，但需检查个性化是否同步修改
- 引入第三方包需检查传递依赖冲突（如slf4j-simple与log4j）
- 升级二方包需检查是否涉及SQL脚本，放banks下不放increment下
- 拷贝代码需检查example是否有对应set，避免查询条件不生效
- Dto属性类型不要Date，导出用专门Dto再转换
- 首页提醒必须用Controller模式，禁止sql模式

### 22. Spec一致性检查 🆕v3.2

比对代码实现与spec（需求文档/设计文档）要求的一致性，捕获"实现与设计偏差"类缺陷。检查项通过 `config/spec-consistency-checklist.json` 管理，支持三级配置继承。

**前置条件**：审查时需获取对应的spec文档（PRD/详细设计/需求确认记录），无spec时跳过本节并在报告中注明"未提供spec，跳过一致性检查"。

**检查清单**（配置驱动，以下为默认项，可按银行覆盖）：

| ID | 检查项 | 严重度 | 检查要点 |
|----|--------|--------|---------|
| SC-001 | 日志级别一致性 | 严重 | spec要求error vs 代码实现warn/info |
| SC-002 | 异常处理一致性 | 阻塞 | spec要求抛异常 vs 代码实现return |
| SC-003 | 任务隔离一致性 | 严重 | spec要求任务隔离 vs 代码实现静默跳过/中断 |
| SC-004 | 错误文案一致性 | 警告 | spec定义文案 vs 代码实际文案 |
| SC-005 | 流程顺序一致性 | 严重 | spec步骤顺序 vs 代码调用顺序 |
| SC-006 | 参数校验一致性 | 阻塞 | spec校验要求 vs 代码实现 |

**执行方式**：
1. 读取 `config/spec-consistency-checklist.json`，按 `defaults → projectOverrides → bankOverrides.{currentBank}` 合并生效配置
2. 逐项比对spec要求与代码实现，记录不一致项
3. 每个不一致项输出：检查ID、spec要求、代码实现、偏差描述、修复建议

**典型场景**（BUG-005复盘）：
- spec要求"CBS文件不存在时记录error日志并抛异常终止"
- 代码实现"LOGGER.warn + return"（降级处理）
- 判定：SC-001日志级别不一致(严重) + SC-002异常处理不一致(阻塞)

### 23. 降级处理模式检查 🆕v3.2

系统化检查代码中的降级处理模式是否符合规范，捕获"降级处理不当"导致的静默失败、数据丢失、流程中断。检查项通过 `config/degradation-checklist.json` 管理，支持三级配置继承。

**检查清单**（配置驱动，以下为默认项，可按银行覆盖）：

| ID | 降级场景 | 严重度 | 正确处理 | 错误处理 |
|----|---------|--------|---------|---------|
| DG-001 | 文件不存在 | 阻塞 | 关键文件抛异常，可选文件warn+降级 | 静默return无日志 |
| DG-002 | 文件为空 | 严重 | 必填文件抛异常，可空文件返回空集合 | return null致NPE |
| DG-003 | 数据为空 | 严重 | 返回空集合+info日志，区分无数据vs查询失败 | return null或静默跳过 |
| DG-004 | 网络异常 | 严重 | 有限次重试(≤3次)+退避，失败后抛异常 | 直接catch+return不重试 |
| DG-005 | 服务不可用 | 阻塞 | 核心服务抛异常，非核心服务降级+warn | 核心服务静默跳过 |
| DG-006 | 配置缺失 | 严重 | 必填配置抛异常，可选配置用默认值+info | 必填配置用默认值0/空串 |

**执行方式**：
1. 读取 `config/degradation-checklist.json`，按三级继承合并生效配置
2. 扫描代码中所有异常处理分支(try-catch/条件判空/文件操作/远程调用/配置读取)
3. 逐项检查降级处理是否符合规范，记录不符合项
4. 每个不符合项输出：检查ID、降级场景、当前处理方式、正确处理方式、修复建议

**与Spec一致性检查的协同**：
- SC-002（异常处理一致性）检查"代码是否与spec一致"
- DG-001~DG-006 检查"降级处理本身是否符合规范"
- 两者互补：spec有明确要求时用SC-002，spec未明确时用DG规则兜底

---

## 24. 流程与真实性检查 🆕v3.3

> 源自反洗钱(中互金)需求开发复盘：修复真实案例——改动误写入一字之差的假目录(`ext-hhnxbank` vs `ext-hnnxbank`)、循环内逐条查库补全 N+1、口径六轮迭代后注释仍描述废弃取数路径、SQL 臆造出不存在函数。四项检查配置化于 `config/review-flow-checklist.json`，逐项检查方式见 [阶段4.5](#阶段45流程与真实性检查--v33)。

| ID | 检查项 | 典型缺陷信号 |
|----|--------|-------------|
| RF-001 | 环境真实性验证(阻塞) | 子智能体称"文件缺失/存在"但未复核；仅凭 Glob/Grep 命中即编辑 |
| RF-002 | 循环内逐条查库补全(严重) | for 循环体内 singletonList 单查；批量/单条双实现并存 |
| RF-003 | 注释实现漂移(严重) | javadoc 引用的字段名/表名/常量在代码中已无对应引用路径 |
| RF-004 | SQL 引用真实性(阻塞) | 新增 mapper 含存量中从未出现的表名/函数；UNION 段结构不对称 |

---

## 快速自检

执行 `{shellInterpreter} {shellArguments} scripts/auto-scan.ps1` 自动检查以下阻塞项：

1. Service/Atom（extends产品实现类）是否缺少 `@CustomizedBean`
2. Controller 是否误加 `@CustomizedBean`
3. 请求映射路径是否以配置的 URL 前缀开头
4. Controller 是否缺少 `@RestController`
5. DTO 是否实现 `Serializable`
6. Controller 返回值是否为 `CommonResp`/`void`
7. DTO 命名前缀是否符合 `{dtoPrefix}` 规范
8. 是否使用 `e.printStackTrace()` 替代日志
9. BigDecimal 是否用 `==`/`equals` 比较
10. Integer/Long 是否用 `==` 比较
11. 时间格式是否误用 `hh`(12h) 替代 `HH`(24h)
12. SQL 是否存在字符串拼接
13. 是否存在硬编码机构号/产品代码
14. 是否使用 `@Resource` 注入（应用 `@Autowired`）
15. 是否使用 `commons-lang` 的 `StringUtils`（应用 `commons-lang3`）
16. `Collectors.toMap()` 是否缺少 merge 函数

---

## 审查流程

### 阶段1：前置检查
- **环境真实性验证 🆕v3.3（RF-001，阻塞）**：对 `{sourceDir}`、`{dtoSourceDir}` 及本次将读写的每个关键文件执行 RunCommand 级存在性核验（`Test-Path`/`Get-ChildItem` 或等价命令）后方可行动——Glob/Grep/Read 的索引命中不作为存在依据；子智能体交付的"文件存在/缺失"结论必须由主会话复核后才可采信；同一目录出现多个近似名称候选时人工裁决
- **Spec口径冲突预检 🆕v3.3**：读取 spec 前先汇总会话内同一业务要素的不同表述（字段名/表名/码值/版本），生成口径冲突清单；未消歧项以 AskUserQuestion 定案后再比对实现，禁止静默选边——冲突记录写入报告"口径变更记录"段
- 文件位置 `{sourceDir}` ✓ → 包结构 `{packagePath}.{module}.{layer}` ✓ → 类名前缀 `{classPrefix}` ✓
- `@CustomizedBean`(Service/Atom extends产品实现类) / `@RestController`(Controller) / `@CloudReference`(依赖注入)
- 路径以 `{urlPrefixes}` 开头 ✓ → DTO 实现 `Serializable` ✓ → DTO 前缀 `{dtoPrefix}` ✓

### 阶段2：代码规范
- Controller：参数方式(DTO优先) → 返回CommonResp → 中文注释
- API设计：HTTP动词语义✓ GET无副作用✓ 分页支持✓ URL名词✓ DTO响应✓ 错误格式✓
- 参数：前后端格式匹配 → 参数名一致 → getter/setter → 空值校验
- 服务调用：必需字段全设置 → 查看过实现 → 正确处理返回值

### 阶段3：质量与安全
- Null安全：链式调用判空✓ Optional正确使用✓ 禁止返回null✓
- 异常处理：禁止吞异常✓ 保留原始堆栈✓ BempRuntimeException✓
- 日志：LOGGER✓ 级别✓ 无敏感信息✓
- 安全：服务端校验✓ 参数化查询✓ 权限校验✓
- 性能：无N+1✓ 循环内无远程调用✓ StringBuilder✓ 资源释放✓
- 并发异步：事务边界✓ ConcurrentHashMap✓ @Async正确调用✓ CompletableFuture异常处理✓
- 集合与流：无遍历中修改✓ Stream使用合理✓ 不可变集合✓
- Java惯用法：equals/hashCode配对✓ toString无敏感信息✓ Builder模式✓
- 架构分层：无跨层调用✓ 领域无框架依赖✓ 无循环依赖✓ DTO边界转换✓
- SQL与数据库：索引✓ SQL兼容性✓ 拼接正确性✓ 分页排序✓ 查询性能✓ 空判断防全表✓ mybatis规范✓
- 票据业务：金额计算规则✓ 利率单位✓ 日终分页✓ 流水号唯一性✓ 无硬编码✓ 分录配置✓ 客户账号唯一性✓
- BEMP规范：@CloudComponent继承✓ @Autowired✓ StringUtils lang3✓ PageInfo默认值✓ 第三方依赖✓

### 阶段4：Spec一致性与降级模式检查 🆕v3.2

**Spec一致性检查**（配置见 `config/spec-consistency-checklist.json`）：
- 读取spec文档（PRD/详细设计/需求确认记录），无spec时注明"跳过一致性检查"
- 逐项比对：日志级别✓ 异常处理✓ 任务隔离✓ 错误文案✓ 流程顺序✓ 参数校验✓
- 每个不一致项记录：检查ID、spec要求、代码实现、偏差描述、修复建议

**降级处理模式检查**（配置见 `config/degradation-checklist.json`）：
- 扫描所有异常处理分支(try-catch/条件判空/文件操作/远程调用/配置读取)
- 逐项检查：文件不存在✓ 文件为空✓ 数据为空✓ 网络异常✓ 服务不可用✓ 配置缺失✓
- 每个不符合项记录：检查ID、降级场景、当前处理方式、正确处理方式、修复建议

### 阶段4.5：流程与真实性检查 🆕v3.3

**检查项配置见 `config/review-flow-checklist.json`**，数值阈值（如 `maxInClauseSize`）集中在该文件 `parameters` 节管理：

| ID | 检查项 | 严重度 | 核心逻辑 |
|----|--------|--------|---------|
| RF-001 | 环境真实性验证 | 阻塞 | sourceDir/关键文件 RunCommand 级核验；子智能体存在性结论须主会话复核 |
| RF-002 | 循环内逐条查库补全(N+1) | 严重 | 批量收集缺失项 → 按 `maxInClauseSize` 分片一次 in 查询 → 内存回填（仅空缺项）；批量与单条共用同一实现 |
| RF-003 | 注释实现漂移 | 严重 | 注释中的字段名/表名/取数路径与代码实现逐一比对；口径变更必须同步注释 |
| RF-004 | SQL 引用真实性 | 阻塞 | 新增 SQL 的表名/列名/JOIN 条件须存量 mapper 或实体佐证；写后回读自查 UNION/join/in 结构完整性 |

每个不符合项记录：检查ID、问题场景、当前写法 vs 正确写法、修复建议（示例已内置 JSON `example` 节）。

### 阶段5：Maven编译 → 阶段6：输出报告（模板见 `templates/report-template.md`）

---

## 审查判断标准

严重度分级（详细规则参见前述各章节）：

- 🟠**阻塞**（必须修复）：结构违规（文件位置/包路径/类前缀/`@CustomizedBean`/`@RestController`/URL前缀/DTO前缀）、Maven编译失败、安全漏洞（硬编码密钥/SQL拼接）、公共API返回null、GET引发状态变更、Spec要求抛异常但代码return（SC-002/SC-006）、关键文件不存在静默return（DG-001）、核心服务不可用静默跳过（DG-005）、环境真实性未验证即行动（RF-001）、SQL表名列名join条件无佐证或臆造函数（RF-004）、`@Resource`注入、mybatis非String类型写`!= ''`、循环依赖、BigDecimal/Integer/Long用`==`比较、查询/更新条件缺空判断、领域包引入框架注解
- 🟠**严重**（强烈建议）：服务调用缺必需字段、异常处理不完善（吞异常/丢堆栈）、空指针风险、日志含敏感信息/不规范、N+1查询/循环调远程、循环内逐条查库补全且未批量化（RF-002）、注释实现漂移致凭证失真（RF-003）、事务边界不合理、资源未关闭、`@Async`同类自调用、`Collectors.toMap`缺merge函数、Redis锁缺失/在事务内、Spec日志级别/任务隔离/流程顺序不一致（SC-001/SC-003/SC-005）、降级处理不当（DG-002~DG-004/DG-006）、分页查询缺唯一排序、大事务未拆分
- 🟡**警告**（建议）：格式化/变量命名/注释规范、DTO未实现Serializable、equals/hashCode未配对、toString含敏感字段、遍历中修改集合、并行Stream滥用、URL使用动词、API无版本路径、`Executor`未配置关闭、日终任务默认10条未改分页、硬编码产品代码/机构号、时间格式hh误用为HH、`@CloudComponent`继承实现类、Dto属性用Date类型、`StringUtils`用commons-lang、Spec错误文案不一致（SC-004）
- 🟢**提示**（可选）：轻微问题，不影响功能，建议优化。如：注释拼写/措辞、局部变量命名风格细节、过度防御性判空、可读性改进（提取局部变量/简化条件表达式）、未使用的private方法、import顺序、魔法值未抽取常量但语义清晰、日志级别info/debug选择失当但不影响排障

---

## 审查报告

报告保存路径：`bemp-backend-code-review/reports/{bankCode}_YYYY-MM-DD_HHmmss_[full|incremental]_report.md`

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
| "法人编号和机构号都不能为空" | 调用服务时DTO缺brchNo | `setBrchNo()`，详见第8节数据完整性清单 |
| "用户名或密码错误" | 前后端参数格式不匹配 | 对齐格式，选DTO/BaseRequest之一（见第5节方式选择） |
| Content type not supported | @RequestBody vs form-data冲突 | 去@RequestBody(推荐) 或 前端改为JSON |
| Object cannot be cast to XxxReq | 前后端参数结构不一致 | DTO→传对象，BaseRequest→requestDto，JSON→@RequestBody |
| Maven编译失败 | Java版本/依赖/缺少import | `mvn compile -DskipTests`；检查pom.xml |
| 参数获取为null | 参数名不一致/DTO缺setter/前端未传 | 确保大小写一致、有setter、前端传值 |
| 服务调用超时 | 死循环/慢查询/事务未提交/依赖未注入 | 逐项排查循环依赖、SQL索引、事务、注入 |

---

## 附录B：银行配置切换指南

**切换步骤**（单一入口在 `_shared/env-config.json`）：
1. 编辑 `_shared/env-config.json` 的 `environmentDefaults.BANK_CODE` 为目标 bankCode（同时同步该文件其它 `BANK_*` 参数）；本技能 `config/bank-config.json` 的 `currentBank` 为 `${ENV:BANK_CODE}` 占位符，无需修改
2. 若 `config/bank-config.json` 的 `banks` 字典中无该银行参数，参照 `example` 模板添加
3. 会话级临时切换可用 `$env:BANK_CODE = 'xxx'`（优先级高于 _shared 默认值）

> 配置参数说明见开头 [银行配置](#银行配置) 表，关键字段：`bankName`/`bankCode`/`bankCodeShort`/`sourceDir`/`packagePath`/`classPrefix`/`dtoPrefix`/`urlPrefixes`/`dtoSourceDir`/`enableAutoScan`

**切换后检查**：`sourceDir` 存在✓ `dtoSourceDir` 存在✓ 运行 `auto-scan.ps1` 通过✓ 报告银行名正确✓