# BEMP 项目 SonarQube 规则豁免与误报处理

## 规则豁免清单

以下规则在 BEMP 项目中可豁免或标记为误报，因为它们与 BEMP 框架设计冲突。

### 1. java:S112 — 抛出通用 Exception

**触发场景**：方法签名抛出 `Exception` 而非具体子类

**豁免原因**：BEMP 框架统一使用 `BempRuntimeException` 包装业务异常，Controller 层方法签名继承框架基类，无法修改

**判断标准**：
- 如果是 Service 实现类中抛出 `BempRuntimeException` → 不豁免，这是正确做法
- 如果是 Controller 方法签名声明 `throws Exception` → 豁免，框架基类要求

**comment 模板**：
```
BEMP框架误报：Controller方法继承BaseController，方法签名由框架定义，无法修改throws声明。
```

---

### 2. java:S116 — 字段命名不符合规范

**触发场景**：DTO 或 Entity 字段名如 `custNo`、`doAmt` 不符合 Java 命名规范

**豁免原因**：字段名需与数据库列名和前端接口字段保持一致，修改会破坏序列化/反序列化

**判断标准**：
- Entity 字段名与数据库列名对应 → 豁免
- DTO 字段名与前端接口对应 → 豁免
- Service 内部变量名不规范 → 不豁免，需修复

---

### 3. java:S1144 — 未使用的私有方法

**触发场景**：标记为 `private` 的方法在当前类中无直接调用

**豁免原因**：BEMP 的 `@CloudReference` 和 `@CloudComponent` 通过代理调用方法，编译时无法检测到调用关系

**判断标准**：
- 方法被 Spring AOP 代理调用 → 豁免
- 方法确实无任何调用 → 不豁免，需删除

---

### 4. java:S6212 — 方法引用替代 Lambda

**触发场景**：Lambda 表达式可简化为方法引用

**豁免原因**：部分 Lambda 需要保留以保持代码可读性和调试友好性

**判断标准**：
- 简单的方法引用（如 `this::processData`）→ 不豁免，改为方法引用
- 复杂 Lambda 需要保留上下文 → 可豁免

---

### 5. java:S1132 — 字符串常量放在 equals 左侧

**触发场景**：`variable.equals("constant")` 而非 `"constant".equals(variable)`

**豁免原因**：BEMP 项目中大部分比较场景已通过空检查保护

**判断标准**：
- 变量已做非空检查 → 可豁免
- 变量可能为 null → 不豁免，需修复

---

## 误报处理流程

### Step 1：识别误报

扫描到问题后，先判断是否属于上述豁免清单中的规则。

### Step 2：验证误报

- 检查代码上下文，确认是否满足豁免条件
- 检查 BEMP 框架基类或接口定义
- 确认运行时行为是否安全

### Step 3：标记误报

```
调用 change_sonar_issue_status(
  key=问题ID,
  status="falsepositive",
  comment="BEMP框架误报：[具体原因]"
)
```

### Step 4：记录豁免

将确认的豁免规则记录到本文件，保持文档更新。

---

## 不可豁免规则

以下规则在任何情况下都不可豁免，必须修复：

| 规则 | 原因 |
|------|------|
| secrets:S6702 | 密钥泄露直接威胁生产安全 |
| java:S2068 | 硬编码密码不可接受 |
| java:S2078 | SQL注入风险不可接受 |
| java:S2259 | 空指针异常影响系统可靠性 |
| java:S3776 | 认知复杂度超标影响可维护性 |
| java:S2095 | 资源泄露导致系统不稳定 |

---

## BEMP 框架注解与 SonarQube 规则映射

| BEMP 注解 | 可能触发的规则 | 处理方式 |
|-----------|---------------|----------|
| @CloudComponent | S112（未使用组件） | 豁免：框架代理实例化 |
| @CloudReference | S1144（未使用字段） | 豁免：框架代理注入 |
| @CloudService | S112（接口方法签名） | 豁免：框架接口规范 |
| @Transactional | S112（异常声明） | 豁免：Spring代理处理 |
| @Resource | S1144（未使用字段） | 豁免：依赖注入 |
