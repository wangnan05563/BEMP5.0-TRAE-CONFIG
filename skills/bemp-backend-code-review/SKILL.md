---
name: "bemp-backend-code-review"
description: "审查BEMP银行个性化后端代码是否符合项目规范，含代码结构、注解、参数传递、安全性、性能等检查。支持多银行配置切换。"
whenToUse: "需要审查BEMP工程各银行个性化后端代码是否符合项目规范"
triggers: "代码/规范/code 走查/审查/审核/把关/review"
version: "3.1.0"
updated: "2026-05-22"
config: "config/bank-config.json"
scripts: "scripts/auto-scan.ps1"
template: "templates/report-template.md"
---

# BEMP后端代码审查

## 银行配置

银行参数在 `config/bank-config.json` 中管理。切换银行时修改 `currentBank` 即可，无需改本文档。

| 占位符 | 当前值 | 说明 |
|--------|--------|------|
| `{bankName}` | 河南农信 | 中文名称 |
| `{bankCode}` | hnnxbank | 目录/包名 |
| `{sourceDir}` | banks/ext-hnnxbank | 源码根目录 |
| `{packagePath}` | com.hundsun.bemp.hnnxbank | 包路径 |
| `{classPrefix}` | HnnxBank | 类名前缀 |
| `{dtoPrefix}` | Hnnx | DTO前缀 |
| `{urlPrefixes}` | /hnnx/, /hnnxbank/ | 请求路径前缀 |

> 切换指南见 [附录B](#附录b银行配置切换指南)

## 审查模式

| 模式 | 扫描范围 | 触发 |
|------|---------|------|
| 快速自检 | 仅阻塞级 | `pwsh scripts/auto-scan.ps1` |
| 增量审查 | `git diff --name-only` 变更文件 | 粘贴变更文件列表 |
| 全量审查 | `{sourceDir}/**/*.java` | 默认 |

---

## 审查规则

### 1. 目录与包结构
- 【强制】代码必须在 `{sourceDir}` 下，包路径 `{packagePath}.{module}.{layer}`

### 2. 个性化类开发
- 【强制】Service/Atom 实现类加 `@CustomizedBean`
- 【强制】类名加 `{classPrefix}` 前缀，如 `HnnxBankRebuyBillAtomImpl extends RebuyBillAtomImpl`
- 【强制】Controller 不加 `@CustomizedBean`，应继承 BaseController

### 3. Controller 规范

- 【强制】`@RestController` + 路径以 `{urlPrefixes}` 任一开头
- 【推荐】新功能用 DTO 对象接收参数，兼容旧代码可用 `BaseRequest`（参见第5节）
- 返回值：`CommonResp` 或 `void`（导出），方法加 `@RequestMapping` 指定 method

**API设计**：
- 使用语义化HTTP动词：GET查询、POST创建、PUT全量更新、PATCH局部更新、DELETE删除
- 禁止GET做状态变更操作（如激活、删除）
- 集合接口必须有分页（默认20条），禁止返回全量数据
- URL使用名词而非动词（`/users` 而非 `/getUsers`）
- 禁止返回200+错误体（应使用4xx/5xx状态码）
- 响应使用DTO而非实体对象（避免JPA懒加载N+1和字段泄漏）
- 全局异常处理器统一错误格式，禁止暴露堆栈信息

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

### 18. API设计规范

- HTTP动词语义化（GET=查询、POST=创建、PUT=替换、PATCH=局部更新、DELETE=删除）
- 禁止GET请求引发状态变更
- 集合接口必须支持分页，默认20条上限
- URL使用复数名词（`/users` 非 `/getUsers`），路径层级表达关联（`/users/{id}/orders`）
- 响应体一致性：同一集合要么全包装要么全裸返回，不可混合
- 错误响应：HTTP状态码区分4xx（客户端）/5xx（服务端），禁止200+error体
- 向后兼容：同版本内禁止删除接口/字段、变更字段类型、增加必填参数
- API版本化：公共接口路径包含版本号（`/v1/`、`/v2/`）

### 19. 架构与分层

- 包组织策略明确：按功能（推荐）或按层，不可混合
- 禁止跨层调用：Controller不调Service实现、Service不依赖Controller
- 领域包不引入框架注解（@Entity/@Repository/@JsonIgnore）
- 禁止循环依赖：A→B→C→A
- `util/`、`common/` 包不得无限增长（应归属对应功能模块）
- DTO在边界处转换，领域对象不出边界
- 新增功能应仅影响对应功能包，不应触碰多个包

### 20. SQL与数据库专项 🆕v3.0
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

### 21. 票据业务专项 🆕v3.0
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

### 22. BEMP项目规范 🆕v3.1
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

---

## 快速自检

执行 `pwsh .trae/skills/bemp-backend-code-review/scripts/auto-scan.ps1` 自动检查以下阻塞项：

1. Service/Atom 类是否缺少 `@CustomizedBean`
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
- 文件位置 `{sourceDir}` ✓ → 包结构 `{packagePath}.{module}.{layer}` ✓ → 类名前缀 `{classPrefix}` ✓
- `@CustomizedBean`(Service/Atom) / `@RestController`(Controller) / `@CloudReference`(依赖注入)
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

### 阶段4：Maven编译 → 阶段5：输出报告（模板见 `templates/report-template.md`）

---

## 审查判断标准

| 🟠阻塞(必须修复) | 🟠严重(强烈建议) | 🟡警告(建议) |
|-----------------|-----------------|-------------|
| 文件不在 `{sourceDir}` | 服务调用缺必需字段 | 格式化不规范 |
| Service/Atom缺 `@CustomizedBean` | 未查看服务方法实现 | 变量命名不规范 |
| Controller加 `@CustomizedBean` | 缺中文注释 | 冗余代码 |
| 路径不以 `{urlPrefixes}` 开头 | 异常处理不完善(吞异常/丢堆栈) | 注释不清晰 |
| DTO缺getter/setter | 空指针风险(链式调用未判空) | DTO未实现Serializable |
| Maven编译失败 | 日志不规范 | 非线程安全类误用 |
| 硬编码密码/密钥 | 日志含敏感信息 | equals/hashCode未配对 |
| SQL字符串拼接 | N+1查询/循环调远程 | toString含敏感字段 |
| DTO前缀不符合 `{dtoPrefix}` | 事务边界不合理 | 遍历中修改集合 |
| 参数名与前端不一致 | 资源未关闭/循环内String拼接 | 构造参数过多未用Builder |
| 公共API返回null(应返回Optional) | check-then-act竞态条件 | 并行Stream滥用 |
| GET请求引发状态变更 | 集合接口无分页 | URL使用动词(getUsers) |
| 响应返回实体对象 | 200+错误体(应4xx/5xx) | API无版本路径 |
| 领域包引入框架注解 | @Async同类自调用 | CompletableFuture无异常处理 |
| 循环依赖A→B→C→A | util包无限增长 | Executor未配置关闭 |
| BigDecimal用==或equals比较 | 分页查询缺唯一排序 | 日终任务默认10条未改分页 |
| Integer/Long用==比较 | 大循环查询(应用Map) | 硬编码产品代码/机构号 |
| 边界值遗漏等于 | 大事务未拆分 | 时间格式hh误用为HH |
| SQL兼容性未考虑 | Redis锁缺失 | 金额计算未通过数据库 |
| 使用@Resource注入(应用@Autowired) | Redis锁在事务内 | @CloudComponent继承实现类 |
| 查询/更新条件缺空判断 | Collectors.toMap缺merge函数 | Dto属性用Date类型 |
| mybatis非String类型写!= '' | 分录配置编号重复 | StringUtils用commons-lang |

---

## 审查报告

报告保存路径：`.trae/skills/bemp-backend-code-review/reports/{bankCode}_YYYY-MM-DD_HHmmss_[full|incremental]_report.md`

---

## 重要提醒

1. 【强制】Service/Atom加 `@CustomizedBean`；Controller不加、继承BaseController
2. 【推荐】新功能参数用DTO对象，兼容旧代码用BaseRequest（见第5节）
3. 【强制】代码在 `{sourceDir}` 下；DTO前缀 `{dtoPrefix}`；编译通过
4. 【强制】提交前执行 `auto-scan.ps1`；完成后调用本技能走查

---

## 快速问题定位

| 现象 | 原因 | 方案 |
|------|------|------|
| "法人编号和机构号都不能为空" | 调用服务未设brchNo | `userDto.setBrchNo(...)` |
| "用户名或密码错误" | 前后端参数格式不匹配 | 对齐DTO/requestDto/JSON格式 |
| 参数为null | 参数名不一致 | 确保大小写一致 |
| Content type not supported | @RequestBody vs form-data冲突 | 去@RequestBody或前端改JSON |
| 类型转换异常 | 参数格式不匹配 | DTO↔直接对象 / BaseRequest↔requestDto |
| Maven编译失败 | Java版本/依赖 | `mvn compile -DskipTests` |
| DTO前缀不符 | 切换银行后未更新命名 | 改为 `{dtoPrefix}`+功能名 |

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

**切换步骤**：
1. 编辑 `config/bank-config.json`
2. 改 `currentBank` 为目标 bankCode
3. 若无该银行配置，参照 `example` 模板在 `banks` 中添加

**配置参数**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `bankName` | 是 | 中文名称 |
| `bankCode` | 是 | 目录名/包名（如 hnnxbank） |
| `bankCodeShort` | 是 | URL前缀简码（如 hnnx） |
| `sourceDir` | 是 | 源码根目录（如 banks/ext-hnnxbank） |
| `packagePath` | 是 | 包路径（如 com.hundsun.bemp.hnnxbank） |
| `classPrefix` | 是 | 类名前缀（如 HnnxBank） |
| `dtoPrefix` | 是 | DTO前缀（如 Hnnx） |
| `urlPrefixes` | 是 | URL前缀数组（如 ["/hnnx/","/hnnxbank/"]） |
| `dtoSourceDir` | 是 | DTO源码目录 |
| `enableAutoScan` | 是 | 是否启用自动扫描 |

**切换后检查**：`sourceDir` 存在✓ `dtoSourceDir` 存在✓ 运行 `auto-scan.ps1` 通过✓ 报告银行名正确✓