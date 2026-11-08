# 批量执行形态与容错模式库（Batch Fault-Tolerance Patterns）

> **触发场景**：①编写/改造**定时任务、日终批量、日间配套批量**处理多条数据 ②页面**批量导入/批量提交**多条数据 ③批处理服务、批量补全/批量同步 ④需要判断"单条失败该跳过还是该整批回滚"时。案例溯源：贴现企业名单日终批量任务（`@CloudFunction` 定时任务逐条 upsert、单条失败跳过）+ 其日间配套批量导入（编程式事务整批原子、失败整批回滚），两者共用同一 upsert 业务逻辑（沉淀 B1-B7）。
>
> 文中 `{placeholder}` 均为占位符（`{批量入口方法}`、`{取数语句}`、`{业务键}`、`{批内条目}`、`{业务日期}`、`{事务模板}`、`{失败明细}`、`{结果状态}` 等），实际值按目标环境源码/配置解析，禁止硬编码；"本次实例"栏引用的真实类名/表名仅为本行案例记录，**不构成通用规则，复用时必须替换为目标环境真实值**。
>
> **配置单一数据源**：[config/batch-execution-policy.json](../config/batch-execution-policy.json) —— 形态枚举、判定规则、观测字段、反模式、风险清单、验证注入方法全部在该配置中管理；本流程文档只引用配置键名，禁止复述硬编码清单。
>
> **适用边界**：
> ✅ 定时任务/日终批量处理、页面批量导入/批量提交、批处理服务、批量补全或批量同步（多条数据逐条或整批处理）。
> ❌ 单条数据的常规增删改查（走常规开发流程）；**单点异常时钩子/切面该放行还是拦截**的决策（走 hook-diagnosis-patterns D6c fail-open/fail-close 决策树）；**批量查询的 N+1 性能优化与空值回填**（走 backend-guide §11.4 batchFillPattern）；共享行为语义变更的影响面（走 semantic-change-patterns C2）。

## 快速决策树（先走此树，只读命中分支）

```
任务涉及多条数据逐条/整批处理？
├─ 否（单条 CRUD）→ 不适用本文档，走常规开发流程
└─ 是 → B1 形态定性（按配置 modeSelection.rules）
    ├─ 批内条目互不依赖 + 允许部分成功 + 失败可事后补做 → batch-tolerant（B3）
    ├─ 同一业务动作不可分割 + 要求全有或全无 + 失败需用户修正重试 → atomic（B4）
    └─ 两类判据冲突/都不满足 → 升级裁决（onAmbiguous=escalate），禁止静默选边
        ↓
两形态都必须满足 B5 观测要求（三态结果 + 失败明细 + error 留痕 + 批次日期）
        ↓
B6 边界风险自检 → B7 按形态选验证注入方式
```

## 一、B1 形态定性：由业务语义决定，不由技术偏好决定

**通用化表述**：进入批量开发前，先按配置 `modeSelection.rules` 判定执行形态。两类形态是**默认机制**，命中即照办：

| 形态 | 命中判据（配置 `modeSelection.rules[].when`） | 一句话本质 |
|:---|:---|:---|
| `batch-tolerant` | 批内条目互不依赖；允许部分成功；失败条目可事后补做或下个批次重跑；单条脏数据不应阻断整批 | **单条失败隔离**（一粒老鼠屎不坏一锅汤） |
| `atomic` | 同一业务动作不可分割（要么全成要么全不成）；要求全有或全无；失败必须由用户修正输入后整批重试 | **整批同生共死**（全有或全无） |

**定性错误的代价**：把"允许部分成功"的批量任务包进整批事务 → 一条脏数据导致整批回滚，已成功的也白做；把"全有或全无"的导入做成逐条容错 → 脏数据静默入库、用户以为全部成功。方向选错后验证也很难发现（都能跑通，只是语义不对）。

**本次实例**：日终批量任务命中 `batch-tolerant`（逐条采集、单条脏数据不应阻断整批）；其日间配套的页面批量导入命中 `atomic`（用户一次提交视为一个不可分割的动作，失败需修正后整批重试）。同一业务两种入口、两种形态——**形态由入口的业务语义决定，不由"同一个模块"决定**。

**附加约束**：同一业务若同时存在批量入口与单条入口，两入口应**共用同一业务逻辑**（单条入口作为批量的退化形态委托同一实现），禁止各写一份（见配置 `modeSelection.crossCheck`）。

## 二、B2 双形态对照矩阵

| 维度 | `batch-tolerant`（批量容错） | `atomic`（整批原子） |
|:---|:---|:---|
| 事务边界 | 无外层整批事务，或每条独立事务 | 整批一个事务（编程式事务包裹整个循环，或声明式事务） |
| 单条失败处置 | catch → 计数 + 明细 + error 留痕 → **不 throw，继续下一条** | catch → 带定位信息**抛出** → 整批回滚 |
| 成功条命运 | **不回滚**（部分成功可接受） | 一并回滚 |
| 失败可见性 | 统计报告 + 失败明细 + error 日志 | 异常原样返回前端（用户可见） |
| 幂等要求 | **必须幂等**（重跑整批不得产生重复数据） | 天然幂等（回滚后库无变更） |
| 典型场景 | 定时任务/日终采集、批量补全、对账 | 页面批量导入、批量提交 |

## 三、B3 批量容错骨架（batch-tolerant）

```java
public void {批量入口方法}(BaseRequest<TaskParamDto> request) {
    long startTime = System.currentTimeMillis();
    String batchDate = resolveBatchDate();        // 批次日期取【业务日期】，不取系统日期
    List<{批内条目}> candidates = dao.{取数语句}(batchDate);
    if (CollectionUtils.isEmpty(candidates)) {
        // 零条也是一次完整执行：同样输出报告，避免监控按关键字采集时漏掉空跑记录
        LOGGER.info("...统计报告：日期{}，处理总数0，成功0，失败0，耗时{}ms，结果状态：{}",
                batchDate, System.currentTimeMillis() - startTime, "success");
        return;
    }
    int successCount = 0;
    int failCount = 0;
    StringBuilder failDetails = new StringBuilder();
    for ({批内条目} candidate : candidates) {
        try {
            // 单条独立处理；内部必须自带匹配/去重（upsert），保证重跑幂等
            upsert(candidate);
            successCount++;
        } catch (Exception e) {
            failCount++;
            String detail = buildDetail(candidate, e);     // {业务键} + 异常原因
            failDetails.append(detail).append("；");
            LOGGER.error("批量处理：单条失败，继续下一条：{}", detail, e);   // error 留痕
            // 不 throw —— 单条脏数据不应阻断整批
        }
    }
    LOGGER.info("...统计报告：日期{}，处理总数{}，成功{}，失败{}，耗时{}ms，结果状态：{}；失败明细：{}",
            batchDate, candidates.size(), successCount, failCount,
            System.currentTimeMillis() - startTime,
            resultState(successCount, failCount),               // 三态见 B5
            failDetails.length() > 0 ? failDetails : "无");
}
```

**要点**：①循环体内**无整批事务**；②单条失败**只记账、不中断**；③单条处理**必须幂等**（无事务意味着回滚不存在，重跑整批必须能覆盖而非重复追加）。

## 四、B4 整批原子骨架（atomic）

```java
public void {批量入口方法}(BaseRequest<QueryReq> req) {
    List<{批内条目}> items = req.getRequestDto().getItems();
    if (CollectionUtils.isEmpty(items)) {
        return;
    }
    // lambda 内只能改写 effectively final 的容器，统计走数组中转
    int[] counts = new int[2];
    {事务模板}.execute(status -> {                 // 整批一个事务
        for (int i = 0; i < items.size(); i++) {
            {批内条目} item = items.get(i);
            int rowNo = resolveRowNo(i);            // 定位信息（行号/业务键）
            try {
                // 业务逻辑与单条入口共用同一实现，避免口径漂移
                counts[classify(upsert(item))]++;
            } catch (Exception e) {
                LOGGER.error("批量提交：第{}行【{}】处理失败，整批回滚", rowNo, keyOf(item), e);
                // 带定位信息抛出 → 触发整批回滚，错误信息原样返回前端
                throw new BempRuntimeException("第" + rowNo + "行【" + keyOf(item)
                        + "】写入失败：" + e.getMessage());
            }
        }
        return null;                                 // 事务体必须被真正执行（模板调用不得漏括号）
    });
}
```

**要点**：①**整批一个事务**；②单条失败**必须抛出**（禁止静默跳过——跳过会让用户误以为部分数据已入库）；③异常信息**必须带定位**（行号/业务键），否则用户无法定位脏数据；④事务内**禁止调用带独立事务传播或自带提交语义的方法**（会打破边界使回滚失效）。

> ⚠ 占位符陷阱：框架业务异常构造器内部使用 `MessageFormat.format`，**占位符必须 `{0}` 形式**；使用 `{}` 会在运行期抛 `can't parse argument number`，用户看到的是无意义的报错。骨架中用字符串拼接规避该陷阱。

## 五、B5 观测要求（两形态都必须满足）

**通用化表述**：批量任务的最小可运维要求 = **三态结果 + 失败明细 + error 留痕 + 批次日期**（字段与判定规则见配置 `observability`）：

| 项 | 要求 |
|:---|:---|
| 结果三态 | `success`（失败=0）/ `partial`（有失败也有成功）/ `failed`（全失败）——三态由成功数与失败数**推导**，报告须同时给出两者 |
| 失败明细 | 每条含 `{业务键}` + 失败原因；缺任一项人工无法定位与补做 |
| error 留痕 | 每条失败必须 `LOGGER.error`（含业务键+原因）——日志是失败明细的**唯一持久化通道** |
| 批次日期 | 统计报告必须带批次日期（监控按关键字采集时该行可能被单独摘出，缺日期无法定位批次） |
| 空跑也报告 | 零条数据同样输出报告，避免漏记空跑批次 |

**反面**：只报"失败 N 条"不报成功数 → 无法推导三态；失败只 `在报告里汇总` 不 `error 打日志` → 线上排障时日志里查不到。

## 六、B6 边界风险（配置 `riskChecklist` 的工程化解读）

1. **后置动作失败 → 部分状态**：主数据写入**之后**的动作（写日志/写快照/调下游）抛异常时，主数据已落库但该条计入失败数，形成"数据在、日志/快照缺"的部分状态。处置：后置动作失败必须 error 留痕且明细含业务键供人工补做；关键后置动作应前置或纳入同一事务。
   - 本次实例：维护日志快照写在主表写入之后；若日志表结构缺列导致写入抛异常，则主表已落库而该条计入失败、且缺快照——无事务形态下这是**必然代价**，故必须留痕可补做。
2. **无事务 + 非幂等 = 重跑重复**：容错形态失败条之前的成功条不回滚，重跑整批会产生重复数据。处置：新增路径必须带匹配去重（按业务键 upsert）。
3. **全量加载无分页 → OOM**：取数 SQL 一次全量加载，万级数据有内存风险。处置：按量级评估分片，分片时保持批间幂等。
4. **事务被打破 → 回滚失效**：原子形态事务内调用了独立提交语义的方法，回滚不生效。处置：事务内禁止此类调用。

## 七、B7 验证（按形态选注入方式）

| 形态 | 注入 | 断言 | 回归 |
|:---|:---|:---|:---|
| `batch-tolerant` | 构造一条必然失败的条目（脏数据/超长/空必填）混入正常条目 | 失败条被跳过且其余条落库成功；计数与三态（partial）正确；失败明细含业务键+原因；error 日志可见 | 重跑整批不产生重复数据（幂等） |
| `atomic` | 同左 | 整批回滚（库内变更数为 0）；错误信息含定位（行号/业务键）；异常原样返回前端可见 | 修正脏数据后整批重试成功 |

**验证等级**：命令层能闭环时优先端到端（真实触发批量入口 + 查库断言）；无运行环境时降级为"逻辑走查 + 关键分支断言"，并如实标注缺口（对照 semantic-change-patterns C7 验证等级决策树）。

## 与现有模式库的关系

| 场景 | 参照 |
|:---|:---|
| 单点异常时钩子/切面放行还是拦截（fail-open/fail-close） | hook-diagnosis-patterns D6c |
| 批量查询 N+1 防护、缺失项批量补全与空值回填 | backend-guide §11.4 batchFillPattern（config.json `developmentWorkflow.batchFillPattern`） |
| 加字段后批量写入链路的逐环节同步 | field-sync-patterns E2（config/field-sync-checklist.json） |
| 共享行为语义变更的影响面矩阵 | semantic-change-patterns C2 |
| **本库：批量执行形态定性 / 事务边界 / 失败策略 / 观测要求** | **B1-B7** |
