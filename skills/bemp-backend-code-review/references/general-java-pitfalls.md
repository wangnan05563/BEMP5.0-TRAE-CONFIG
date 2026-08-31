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
