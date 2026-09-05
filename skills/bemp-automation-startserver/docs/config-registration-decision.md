# P11 配置登记决策树（通用化）

> 版本：v1.0（2026-09-02）
> 适用范围：BEMP 全技能库 + 各银行个性化工程。本文档不绑定任何银行名与端口字面量，登记时按"键名 + 通道"对照决策，真值一律写入对应配置入口。
> 背景：配置类问题（读不到值 / 改了不生效 / 占位符原样出现在报错里）的根因绝大多数是**登记通道选错**或**根本未登记**，而非代码缺陷。本决策树用于在动手前 5 分钟内判定"该配置应登记到哪里、何时生效、失败长什么样"。

---

## 1. 三条配置通道总览

| 通道 | 代码读取方式 | 登记位置 | 生效时机 | 典型配置 |
|------|-------------|---------|---------|---------|
| A. Spring 配置通道 | `@Value("${key}")` / `@ConfigurationProperties` | PropertiesAutoLoad 加载的 **`bemp_home` 下 `env.properties`**（及工程 `application.properties`） | **Bean 创建时一次性绑定**，登记后需**重启对应 SpringBoot 服务** | 批量任务文件根路径、文件名前缀、模块级开关 |
| B. 参数中心通道 | `BusinessParameterService.findParamValueByParamKey` 等运行时查询 | **`TM_BUSINESS_PARAMETER` 类参数表**（法人级记录 `LEGAL_NO=<法人号>`；全局级 `LEGAL_NO='000000'`） | 运行时查询，**通常即时生效**（有缓存的参数以缓存刷新周期为准） | 业务开关、法人级差异化参数、阈值类参数 |
| C. 技能/脚本通道 | 启动脚本、PreCheck 等通过 `${ENV:VAR}` 占位符引用 | **`_shared/env-config.json` 的 `environmentDefaults`**（唯一配置入口；解析链 = 环境变量 > environmentDefaults） | 下一次执行该脚本时生效（脚本每次启动重新解析） | 机器路径、服务端口键（`BEMP_*_PORT`）、银行键（`BANK_*`）、数据库连接 |

**核心原则：判定通道的唯一依据是"代码如何读取该配置"，不是"配置内容像什么"。** 同样是"一个文件路径"，`@Value` 读的就走 A 通道，参数表查询读的就走 B 通道，脚本 `${ENV:}` 引用的就走 C 通道——内容相似的配置可能分属不同通道。

---

## 2. 配置登记决策树

```mermaid
flowchart TD
    S[拿到一个待登记配置键] --> Q1{代码如何读取它?}

    Q1 -->|@Value / @ConfigurationProperties| A[A 通道 Spring 配置]
    Q1 -->|BusinessParameterService<br/>findParamValueByParamKey 等查询| B[B 通道 参数表]
    Q1 -->|启动脚本 / PreCheck<br/>ENV:VAR 占位符| C[C 通道 env-config]

    A --> A1{区分法人/全局差异?}
    A1 -->|不需要区分法人| A2[登记 env.properties<br/>键=完整占位符名]
    A1 -->|同一键需按法人不同取值| A3[说明选错通道<br/>改用 B 通道重新接线]
    A2 --> A4[重启承载该 Bean 的 SpringBoot 服务<br/>才生效]

    B --> B1{法人级 or 全局级?}
    B1 -->|法人级| B2[参数表插入 LEGAL_NO=对应法人号]
    B1 -->|全局级/兜底| B3[参数表插入 LEGAL_NO=000000]
    B2 --> B4[运行时即时生效<br/>注意法人参数优先、全局回退的取参语义]
    B3 --> B4

    C --> C1{机器相关 or 环境变量已设?}
    C1 -->|临时覆盖| C2[设置同名环境变量<br/>优先级最高]
    C1 -->|长期默认| C3[登记 _shared/env-config.json<br/>environmentDefaults 段]
    C3 --> C4[下一次执行脚本时生效<br/>禁止把真值回写技能 config]

    A4 & B4 & C4 --> V[回归验证: 实际执行读取方, 确认读到新值]
    V -->|读到新值| OK[登记完成]
    V -->|读不到/报错| F{失败特征?}
    F -->|报错含 xxx 字面量未解析| F1[配置未登记 或 通道选错<br/>回到 Q1 重新判定]
    F -->|读到旧值| F2[A 通道: 未重启服务<br/>B 通道: 缓存/取参语义问题<br/>C 通道: 改了技能 config 而非 env-config]
```

### 文本版（无渲染环境时）

```
待登记配置键
├─ 代码用 @Value / @ConfigurationProperties 读？
│   ├─ 是 → 【A 通道】登记到 bemp_home 下 env.properties
│   │        └─ 生效：Bean 创建时一次性绑定 → 必须重启对应 SpringBoot 服务
│   └─ 同一键还需按法人区分取值？→ 是则说明通道选错，改 B 通道
├─ 代码用 BusinessParameterService 运行时查询？
│   ├─ 是 → 【B 通道】登记到 TM_BUSINESS_PARAMETER 类参数表
│   │        ├─ 法人级：LEGAL_NO = 对应法人号
│   │        └─ 全局级：LEGAL_NO = '000000'
│   │        └─ 生效：运行时查询，通常即时生效（留意缓存与取参语义）
└─ 启动脚本 / PreCheck 用 ${ENV:VAR} 引用？
    └─ 是 → 【C 通道】登记到 _shared/env-config.json environmentDefaults
             ├─ 临时覆盖：设同名环境变量（优先级最高）
             └─ 生效：下次执行脚本时生效；禁止把真值回写技能 config
```

---

## 3. 生效判定速查

| 场景 | 生效条件 | 常见误判 |
|------|---------|---------|
| `@Value` Bean 创建时一次性绑定 | 重启对应 SpringBoot 服务 | 改了 env.properties 就以为生效 → 实际进程内还是旧值 |
| `@ConfigurationProperties` 绑定类 | 重启（除非启用了配置刷新机制） | 同上 |
| 参数表运行时查询 | 下一次查询即生效 | 以为要重启 → 白白多一次重启 |
| 参数表法人级 vs 全局级 | 法人参数优先、`LEGAL_NO='000000'` 全局兜底 | 只配了全局，法人级另有记录时被"参数优先"语义遮蔽 |
| 脚本 `${ENV:VAR}` | 下次执行脚本时生效 | 改了技能自身 config 里的值 → 真值必须落 env-config，技能 config 只放占位符 |

---

## 4. 失败特征速查（看报错反推根因）

| 失败特征 | 根因判定 | 处置 |
|---------|---------|------|
| 报错/日志/页面出现 `${xxx}` 字面量未解析 | 配置**未登记**，或**通道选错**（占位符无人解析） | 回到决策树第 1 步，确认读取方与登记位置 |
| `@Value` 注入值为空或一直旧值 | A 通道未重启服务；或键名与占位符不完全一致（大小写/前缀/默认值语法） | 重启服务；逐字符核对键名 |
| 参数表查到 null / 回退默认值 | B 通道 `LEGAL_NO` 不对（法人记录缺失时未按全局兜底查询语义传参）；或 paramKey 拼写不一致 | 核对取参代码的 legalNo 传参语义与参数表记录 |
| 脚本报"找不到驱动器 `${ENV`"或解析失败硬失败 | C 通道键未在 env-config 登记（且无环境变量、无内联默认值） | 在 `environmentDefaults` 补登该键；用 doctor-config.ps1 按 FAIL 清单修复 |
| 启动脚本把 `${ENV:XXX}` 字面量当路径 | 占位符方言与解析器不匹配 / 键未登记 | 核对脚本解析器支持的方言；键登记到唯一入口 |

> 本次 PreCheck 脚本端口误报事件即属上表第 4 类的"内容侧"变体：脚本端口号字面量写死，未走 C 通道 → 机器端口非默认值时产生假 WARN/假 FAIL。处置范式相同：**读取方改从配置解析链取值，真值登记唯一入口**。

---

## 5. 实战案例（匿名化）：批量任务文件根路径参数误判通道

**现象**：某银行个性化工程的"名单文件同步批量任务"运行时始终读取不到新调整的文件根目录，文件扫描仍指向旧位置。

**误判过程**：实施人员认为"文件根路径是运维可调参数"，于是将其登记到**参数表（B 通道）**，反复调整参数表记录并重跑任务，均不生效——因为该参数在代码侧的读取方式是：

```java
// 批量任务服务类中的成员注入（A 通道特征）
@Value("${ecifFile.ecifFilePath}")
private String ecifFilePath;
```

`@Value` 在 Bean 创建时一次性绑定，运行期根本不会查询参数表 → B 通道登记注定无效。

**按决策树处置**：

1. **判定入口**：查看代码读取方式 → `@Value("${ecifFile.ecifFilePath}")` → 走 **A 通道**。
2. **错误登记清理**：从参数表移除无效记录，避免后续维护者再次误判。
3. **正确登记**：在 `bemp_home` 下 `env.properties` 登记 `ecifFile.ecifFilePath=<目标目录>`。
4. **生效动作**：重启承载该批量任务的 SpringBoot 服务（A 通道必须重启）。
5. **回归验证**：重跑批量任务，确认文件扫描指向新目录；同时在日志确认无 `${ecifFile.ecifFilePath}` 字面量残留。

**沉淀结论**：
- "像运维参数"不等于"走参数表通道"，**唯一判据是代码读取方式**；
- A 通道的键名必须与占位符逐字符一致（含命名空间前缀 `ecifFile.`）；
- 同类批量任务的文件路径/前缀类参数（如 `cbsFile.*`、`ecifFile.*`）默认先按 A 通道核查代码。

---

## 6. 登记操作清单（逐通道）

**A 通道（Spring 配置）**
1. 打开目标服务工程的部署目录 `bemp_home/env.properties`（或工程 `application.properties`，遵循"部署级覆盖工程级"原则）；
2. 追加 `键=值`（键与代码占位符逐字符一致）；
3. 重启该服务（走 startserver 技能通道，勿手工杀进程）；
4. 观察启动日志无 `${键}` 未解析告警。

**B 通道（参数表）**
1. 确认取参代码的 legalNo 传参语义（法人级查询/全局兜底/可空全局分支）；
2. `TM_BUSINESS_PARAMETER` 插入对应记录：法人级 `LEGAL_NO=<法人号>`，全局级 `LEGAL_NO='000000'`；
3. 运行时验证（重跑对应交易/任务即可，无需重启）；
4. 法人级与全局级同时存在时，确认"法人优先"语义是否为预期行为。

**C 通道（技能/脚本环境）**
1. 真值登记 `_shared/env-config.json` → `environmentDefaults`（唯一入口；换机器/换银行只改此文件）；
2. 技能自身 config 一律用 `${ENV:VAR}` 占位符引用，**禁止回写真值**；
3. 临时覆盖用同名环境变量（解析链最高优先级）；
4. 解析报错时运行 `doctor-config.ps1`，按 FAIL 清单修复；
5. 新增端口类键命名对齐既有惯例 `BEMP_<服务>_PORT`（键名为约定，不含端口字面量）。

---

## 7. 关联文档

| 文档 | 关联点 |
|------|--------|
| [config-loading-guide.md](../../_shared/config-loading-guide.md) | C 通道占位符解析链完整约定 |
| [../OPERATIONS.md](../OPERATIONS.md) | 启动前置检查与诊断流程 |
| [../scripts/precheck-services.ps1](../scripts/precheck-services.ps1) | C 通道消费方实例（端口/路径全部经 Get-EffectiveValue 动态解析） |
| [RETROSPECTIVE.md](./RETROSPECTIVE.md) | 启动服务四维度复盘 |
