# 通用 Java/REST 陷阱清单（按需读取）

> **定位**：本文件承载从 SKILL.md 外迁的**警告/提示级通用规范**（模型参数知识已覆盖、非 BEMP 专属的内容）。
> **读取时机**：仅在审查命中对应特征时展开相关小节，禁止未命中时全文加载。
> **召回保障**：阻塞/严重级检查项（toMap 缺 merge、GET 状态变更、Integer== 等）仍保留在 SKILL.md「审查判断标准」与 auto-scan.ps1 中，本文件缺失不影响其检出。

## §1 REST API 设计（警告级，命中 Controller/接口设计审查时读取）

- 语义化 HTTP 动词：GET 查询、POST 创建、PUT 全量更新、PATCH 局部更新、DELETE 删除（GET 引发状态变更仍为**阻塞级**，见 SKILL.md 判断标准）
- URL 用复数名词而非动词（`/users` 而非 `/getUsers`），路径层级表达关联（`/users/{id}/orders`）
- 响应体一致性：同一集合要么全包装要么全裸返回，不可混合
- 禁止返回 200+错误体（应使用 4xx/5xx 状态码）
- 响应用 DTO 而非实体对象（避免 JPA 懒加载 N+1 和字段泄漏）
- 全局异常处理器统一错误格式，禁止暴露堆栈信息
- 向后兼容：同版本内禁止删除接口/字段、变更字段类型、增加必填参数
- API 版本化：公共接口路径包含版本号（`/v1/`、`/v2/`）

## §2 DTO 定义样板（命中 DTO 新增/修改审查时读取）

```java
public class HnnxXxxReq implements Serializable {
    private static final long serialVersionUID = 1L;
    private String fieldName;
    // getter / setter / toString（toString 排除密码/密钥等敏感字段）
}
```

- 推荐 Controller 写法：`BempValidUtil.validBaseRequest(req);` 或手动判空（详见 SKILL.md 第 5 节场景表）

## §3 Null 安全与数值比较（通用部分，命中链式调用/Optional/比较运算时读取）

- 公共 API 参数用 `Objects.requireNonNull()` 或在入口处判空；公共 API 标注 `@Nullable`/`@NonNull`
- 可能为空的返回值用 `Optional`；`Optional.get()` 前必须有 `isPresent()` 检查
- Integer 缓存 -128~127，包装类型比较用 equals
- `test.contains(null)` 会抛 NPE（`test.equals(null)` 不会）

## §4 性能通用项（命中循环/资源/正则特征时读取）

- 资源在 try-with-resources/finally 中关闭（Closeable/AutoCloseable、数据库连接/Statement）
- 流关闭顺序：先开后关、后开先关
- 正则表达式预编译为 static final Pattern，禁止循环内 matches()
- 紧循环中可复用对象避免重复创建；优先使用 IntStream/LongStream
- 大文件边读边处理，禁止一次性读取

## §5 并发通用项（命中线程/锁/异步特征时读取）

- SimpleDateFormat 用局部变量/ThreadLocal；HashMap→ConcurrentHashMap
- 共享可变状态必须同步；禁止非 final 对象上 synchronized
- check-then-act 改用原子操作（如 `computeIfAbsent` 替代 `if(!containsKey) put`）
- 双重检查锁定必须配合 volatile；优先使用 `AtomicReference`/`AtomicInteger`
- `Lock.unlock()` 必须放在 finally 中
- CompletableFuture 必须有异常处理（exceptionally/handle）
- `ExecutorService` 必须配置关闭（`@PreDestroy` shutdown）
- 考虑标注 `@ThreadSafe`/`@NotThreadSafe` 明确线程安全意图

> BEMP 专属并发规则（Redis 锁事务外、MVCC、@Async 自调用失效等）在 SKILL.md 第 13 节，不外迁。

## §6 集合与流（命中集合操作特征时读取）

- 禁止遍历中修改集合（用 `removeIf` 替代 `iterator.remove`）
- 简单操作用循环而非 Stream（Stream 用于转换，循环用于副作用）
- `Collectors.toList()` 返回的集合不一定可变，需可变时用 `toCollection(ArrayList::new)`
- 不可变集合优先用 `List.of()`/`Set.of()`/`Map.of()`；防御性拷贝用 `List.copyOf()`
- Parallel Stream 需理解分叉/合并开销，仅适用于大数据量无状态操作
- `Collectors.toMap()` 重复 key 抛异常必须提供 merge 函数、value 不能为 null（**严重级**，auto-scan 第 16 项自动检出）

## §7 Java 惯用法（通用部分，命中对应特征时读取）

- `equals` 与 `hashCode` 必须成对实现；hashCode 中仅用不可变字段，用 `Objects.hash()` 简化
- 领域对象必须实现 `toString`（排除敏感字段）
- 构造参数>3-4 个时使用 Builder 模式
- instanceof 模式匹配为 Java 16+ 特性，本项目 Java 8 不适用，仅作升级参考
- 时间格式化：HH(24h) vs hh(12h) 禁止误用（auto-scan 第 11 项自动检出）
- double 转 BigDecimal 用 `BigDecimal.valueOf()` 或 String 构造防精度丢失
- replaceAll 支持正则，replace 为纯文本替换
- subString/数组下标需确保不越界

## §8 单元测试建议（命中测试补充建议时读取）

建议对以下场景补充单元测试：
- null 输入 / 空集合 / 边界值（0、-1、最大值）
- 异常分支（服务调用失败、参数校验不通过）
- 并发场景（共享缓存、计数器、懒加载初始化）
- 事务边界（跨服务调用、回滚条件）

## §9 静默跳过无日志（命中钩子/切面/开关分支特征时读取）

**为什么是坑**：钩子/切面/过滤器/开关分支的 continue/return 跳过若无日志，"业务成功但效果未生效"类缺陷排查时无迹可循——日志里查不到任何卡点记录，只能靠排除法逐层缩小范围，远程环境协作时演变为多轮往返。跳过本身可能是正确业务行为（如开关关闭、条件不满足），但"无痕迹的正确跳过"与"被误判的跳过"从外部完全无法区分，排查成本天差地别。

**识别特征**：
- @Aspect/@Around/@Before、拦截器 preHandle、过滤器 doFilter 中的条件 return/continue
- 开关判断（`if (!enabled) return;`）后直接退出，无 log 语句
- 空 catch 块或 catch 后直接 return/continue（异常被吞，连 fail-open/fail-close 决策都无从谈起）

**修复方向**（对应 review-flow-checklist RF-011）：跳过分支补 info 日志并携带判定依据的关键上下文（参与判定的字段值+结论）；异常分支论证 fail-open/fail-close 策略并在注释写明下游兜底依据。

## §10 行号级等同比较（命中 equals 比较业务编码字段特征时读取）

**为什么是坑**：用行号/机构号/编码的 equals 判定业务"等同"，隐含假设"编码相等=业务语义等同"。当字段跨业务环节复用时该假设崩塌——字段值可能来自其他环节（如转贴现买入的贴现行字段值=上手外行），他行承兑+他行贴现且两行号恰相等的票会被误判为"同法人自承自贴"，触发错误的跳过分支。编码级相等≠业务等同，且粒度错配无编译错误、难以被常规测试暴露，往往要到生产数据撞上边界组合才显形。

**识别特征**：
- equals/== 比较行号、机构号、客户号等业务编码字段后进入跳过/拦截分支
- 被比较字段来自交易要素/上游 DTO，且业务链路含多个环节（字段值可能由前手环节写入）
- 注释或方法名声称"同机构/同法人判定"，但实现仅比较行号/编码

**修复方向**（对应 review-flow-checklist RF-012）：按业务口径确认真实比较粒度（法人/机构/行号），粒度不匹配时升级为业务语义级判定（如法人级经机构表关联比对），并注释说明为什么选该粒度。

## §11 工作区基线回退（命中 diff 变更量与任务预期明显不符特征时读取）

**为什么是坑**：多会话/自动化流程并行的工作区中，文件可能被非预期回退（自动化 git 操作、误 checkout、stash 残留）。此时工作区版本 = 旧基线 + 本次新增改动，`git diff` 会把"删除已提交的历史修复"与"本任务新增"混在同一个 diff 里且无任何编译错误——直接提交会永久丢失多个已闭环缺陷修复，相关缺陷静默复发且回溯极其困难；反之不甄别就放弃提交，又可能丢掉本次真实工作。变更量是唯一低成本、高信噪比的先导信号。

**识别特征**：
- git diff --stat 的变更量与本任务预期改动点清单明显不符（如预期 +9 行却出现 169 行且大段删除）
- diff 中出现纯删除 hunk，且被删代码对应近期提交引入的方法/字段/配置键（该回退并非本任务要求）
- 子智能体汇报"该改动已在合版代码中存在/无需修改"，但与其 diff 证据对不上（需 trust-but-verify 复核）

**修复方向**（对应 review-flow-checklist RF-013，处置细则见 bemp-personalized-dev config/workspace-baseline-policy.json）：备份工作区态 → 仅对回退文件 `git checkout HEAD --` 恢复基线（禁止目录级批量 checkout，禁止回滚其他会话 WIP）→ 以最小 diff 重放本任务改动 → 重新编译 → 从历史修复 commit 的 diff 提取标志性标识符 grep 确认在位后才提交。

## §12 提交裹挟（命中 commit 涉及多任务文件特征时读取）

**为什么是坑**：多任务并行的工作区中，`git add .` / `commit -a` 会把其他会话的半成品需求、无关配置改动、模板二进制一并提交——他人需求以本任务名义入仓，回溯归责困难；混入回退态文件时还会连带丢失历史修复（见 §11）。提交是工作区状态的"快照点"，快照不纯净会让后续所有按 commit 追溯的动作（还原、对比、归责）全部失真。

**识别特征**：
- 一次 commit 的文件清单超出本任务改动点清单
- 使用 `git add .`、`git add -A`、`git commit -a` 而非精确文件路径 add
- 提交内容包含与提交说明无关的文件（如 .gitignore、pom、模板 xls、其他模块源码）

**修复方向**（对应 review-flow-checklist RF-014）：提交前逐文件 diff 三分类（taskChange 提交 / otherWip 留置不提交不回滚 / regression 按 §11 处置）→ 仅精确路径 add → 独立 commit → `git show --stat HEAD` 核对文件清单与甄别结果一致 → 工作区保留的他人 WIP 原样留置并在交接说明中列明。
