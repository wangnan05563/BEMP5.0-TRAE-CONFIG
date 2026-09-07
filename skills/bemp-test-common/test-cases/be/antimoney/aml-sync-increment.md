# 反洗钱名单校验 - v3.6.0~v3.9.0 抽数链路增量用例（TC-AML-P0-035~ / P1-039~ / P2-033~）

> **需求基线**：PRD《HNNS-EB-STD-REQ-002-反洗钱功能优化-v3.md》（v3.9.0，2026-09-02）
> **复用策略**：名单校验核心（5角色/两轮匹配/双层防御/开关降级）、四阶段、⑤⑥收票/背书待签收、名单页面查询导出、定时任务基础链路均已由既有用例覆盖（TC-AML-P0-001~034、P1-011~038、P2-026~032、TC-AML-DATA-V1，口径 v3.5.0），本文件仅覆盖 **v3.6.0 手动抽取按钮 / v3.7.0 INCR 口径变更 / v3.8.0 抽数逻辑分层与文件名前缀参数化 / v3.8.1 前缀默认值变更 / v3.9.0 手动抽取下线+导出模板代码内置** 增量缺口，编号从既有最大序号顺延（P0 最大 034、P1 最大 038、P2 最大 032），无场景重复。
> **修订记录**：v1.2（2026-09-06）v3.9.0 增量修订：M-1 手动抽取文件按钮整体下线（PRD §3.1.2 移除说明 + HnnxAntiMoneyListController.java L65/L71 @modify 记录——2026-09-03 BUG-AML-002 误还原后再次下线，func_importFile 接口已删除）——P0-035/P0-036/P1-041 标注**作废（功能下线）**；P1-040 前端 loading 部分作废、SYNC_LOCK 断言并入 P0-039；P0-037/038/P1-039/P1-042 触发方式由"手动抽取"修订为"定时任务 HNNXTK020113"（本文档所有"触发抽取"步骤自 v1.2 起均指定时任务触发，测试环境通过调整任务调度时间窗口或管理端立即执行触发）；P1-043 修订为定时任务抽取留痕口径；新增 P0-040（手动抽取入口下线回归，防入口残留越权写库）。M-2 清单导出实现口径变更（PRD §3.1 v3.9.0：导出模板由 downLoadInfo XML 配置改为 Controller 代码内置 ExcelBuildReq，22 列固定）——新增 P1-048（代码内置模板构建审查）；配套 P1-012（名单导出码值转中文）前置条件与名单类型断言同步修订（名单类型保留原始编码，锚点 HnnxAntiMoneyListController.java L257-258）。v1.1（2026-09-02）用例评审修订：M-1 代码锚点行号对齐当前实现（importEcifList 方法签名 L136、synchronized(SYNC_LOCK) L139、fileName 拼装 L162），断言语义不变；M-2 P1-042 预期 1 由"启动/注入失败或运行时抛异常"收紧为确定口径——运行时 doImportEcifList L157-161 显式抛 BempRuntimeException"中互金名单抽取失败：未配置文件根目录 ecifFile.ecifFilePath"（DG-006 不允许静默成功）。v1.0（2026-09-02）初版。

## 一、增量范围与覆盖度映射

| PRD 增量点 | 章节 | 已有用例覆盖状态 | 本次动作 |
|-----------|------|----------------|---------|
| 手动抽取文件按钮（触发/反馈/防重/权限/留痕） | §3.1.2（v3.6.0） | 未覆盖 | 新增 P0-035/036 + P1-039~043 |
| INCR 增量口径变更（OBJ_ID 删除-重插） | §3.1（v3.7.0） | 未覆盖（旧口径 upsert 用例不存在） | 新增 P0-037/038 + P1-044~046 |
| 抽数逻辑分层（Job 层抽数/Service 层落库） | §3.1/§3.1.1（v3.8.0） | 未覆盖 | 新增 P0-039 + P1-047 |
| 抽数文件名前缀参数化（默认值 v3.8.1 变更） | §3.1（v3.8.0/v3.8.1） | 未覆盖 | 新增 P2-033/034 |
| **手动抽取文件按钮整体下线** | §3.1.2 移除说明（v3.9.0） | P0-035/036/P1-041 按旧口径覆盖（功能已下线失效） | **作废 P0-035/036/P1-041 + 修订 P0-037/038/039/P1-039/040/042/043 + 新增 P0-040 下线回归** |
| **清单导出模板代码内置（downLoadInfo 依赖移除）** | §3.1 查询与导出（v3.9.0） | P1-012 按旧 XML 模板口径覆盖（见 P1 文档修订） | **新增 P1-048 代码内置模板审查 + P1-012 配套修订** |

## 二、测试数据准备（三重校准）

> 名单表=应用读取表 `HNNX_M_CUST_SPECIAL_INFO`（直插一律落该表，22列含 RECORD_ID 主键，锚点：TC-AML-DATA-V1 §9.2 v3.4.10 口径）；执行前由 bemp-implementation-engineer 通过 Oracle MCP 跑就绪检查。

### D1 名单表 OBJ_ID 对照数据（P0-037/038、P1-044）

```sql
-- 校准1-列宽：OBJ_ID ≤ VARCHAR2(32)、CUST_NM ≤ VARCHAR2(2000)、DATA_SRC='18'、VLD_ST='1'
-- 校准2-关联字段与业务主档对照：预置 OBJ_ID 旧记录供删除-重插对照
SELECT RECORD_ID, OBJ_ID, CUST_NM, DATA_SRC, VLD_ST FROM HNNX_M_CUST_SPECIAL_INFO
 WHERE OBJ_ID IN ('INCROBJ01') ;   -- 预置 INCROBJ01 旧记录 CUST_NM='旧名单主体'，供同步后验证被物理删除
-- 清理模板（按业务键精确删除，禁止 TRUNCATE）：
-- DELETE FROM HNNX_M_CUST_SPECIAL_INFO WHERE OBJ_ID IN ('INCROBJ01') AND INFO_SRC='TEST';
```

### D2 ECIF 抽数文件与日期目录（P0-035/036/037/038、P2-033）

- 文件路径：`{ecifFile.ecifFilePath}/{营业日前一天}/{ecifFile.ecifFilePrefix}{日期}.txt`（锚点：SyncAntiMoneyListJobServiceImpl.java L163 拼装）
- **校准3-业务日期基准**：日期目录=营业日前一天（preWorkday 优先，回退自然日-1），文件名日期与目录日期同源；构造文件前先以 `DateUtils+DateTimeUtil` 同口径取值（锚点：SyncAntiMoneyListJobServiceImpl.java L61 @modify 记录"营业日计算对齐SyncPjgcs"）
- 文件编码 GBK、字段分隔符 0x03（ETX）；构造记录覆盖：DATA_SRC=18/VLD_ST=1（应入库）、DATA_SRC=18/VLD_ST=0（应过滤）、DATA_SRC≠18（应过滤）、OBJ_ID 为空（应跳过留痕）、同 OBJ_ID=INCROBJ01 两条不同 CUST_NM（应全部插入）

### D3 参数就绪检查

```sql
-- 反洗钱同步模式独立参数（默认 INCR）：hnnx.market.antimoney.sync.mode
SELECT * FROM TM_BUSINESS_PARAMETER WHERE PARAM_KEY = 'hnnx.market.antimoney.sync.mode';
-- 注意：反洗钱同步模式不读取 branch_sync_mode（锚点：SyncAntiMoneyListJobServiceImpl.java L227）
```

## 三、用例明细

### TC-AML-P0-035 【作废-功能下线】手动抽取按钮-点击触发抽取成功名单更新

> **⚠ 作废（v1.2，v3.9.0 功能下线）**："手动抽取文件按钮"经 PRD v3.9.0 整体下线（§3.1.2 移除说明），名单文件抽取统一由定时任务 HNNXTK020113 承载；实现侧 func_importFile 接口已删除（HnnxAntiMoneyListController.java L65/L71 @modify 记录：2026-09-03 BUG-AML-002 误还原后再次下线）。本用例不再执行，下线回归验证以 **P0-040** 为准；原"抽取成功名单更新"业务断言由定时任务触发路径（P0-037/038 修订版）承接。

<details><summary>历史版本用例内容（仅作版本溯源，禁止执行）</summary>

| 项 | 内容 |
|---|---|
| 用例名称 | 名单管理页"手动抽取文件"按钮触发一次成功抽取，名单表按文件数据更新 |
| 优先级/测试方式 | P0 / Playwright + 数据库查询（RULE-09/RULE-06） |
| 跨模块标注 | 需专项数据（D1/D2 文件与对照数据） |
| 前置条件 | 1. 以具备名单页权限（TM_AUTHORITY 30308）账号登录；2. 按 D2 构造合法名单文件（含≥3条 DATA_SRC=18/VLD_ST=1 记录）；3. 同步模式参数=INCR |
| 步骤 | 1. 进入【市场交易】-【中互金关注名单】页（路由 `/banks/hnnxbank/pc/antimoney/antiMoneyList`）；2. 点击"手动抽取文件"按钮；3. 等待同步 HTTP 响应；4. 数据库查询名单表记录 |
| 预期结果 | 1. 请求为 POST `/hnnxbank/antimoney/func_importFile`（锚点：HnnxAntiMoneyListController.java L72 `@RequestMapping("/hnnxbank/antimoney")` + L122 `method = RequestMethod.POST`）；2. 页面提示抽取成功及批次统计（读取/入库/跳过条数，Q-14-C 口径）；3. 名单表出现文件中合法记录（SELECT COUNT 增量吻合），非法记录（VLD_ST=0/非18）未入库；4. 请求经 Job 层统一入口 `importEcifList`（锚点：SyncAntiMoneyListJobServiceImpl.java L136 方法签名，L139 synchronized(SYNC_LOCK) 串行），与定时任务 HNNXTK020113 同链路（定时入口 syncAntiMoneyList L113-118 委托 importEcifList） |

</details>

### TC-AML-P0-036 【作废-功能下线】手动抽取接口仅接受 POST-GET 请求被拒

> **⚠ 作废（v1.2，v3.9.0 功能下线）**：func_importFile 接口已随手动抽取功能整体删除（HnnxAntiMoneyListController.java L71 @modify 记录），无 POST-only 语义可验证；同名接口若意外重现（误还原）由 **P0-040** 断言 3 捕获（接口不可达）。本用例不再执行。

<details><summary>历史版本用例内容（仅作版本溯源，禁止执行）</summary>

| 项 | 内容 |
|---|---|
| 用例名称 | func_importFile 仅接受 POST，GET 触发被拒绝（防预取/CSRF 意外写库） |
| 优先级/测试方式 | P0 / 接口测试 + 代码审查（RULE-05） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 后端服务可用；已获取登录会话 |
| 步骤 | 1. 代码审查 Controller 注解（L122）；2. 以 GET 发起 `/hnnxbank/antimoney/func_importFile`；3. 以 POST 发起对照请求 |
| 预期结果 | 1. 注解 `method = RequestMethod.POST`（HnnxAntiMoneyListController.java L122），无 GET；2. GET 返回 405/拒绝，名单表无任何写库变化；3. POST 正常进入抽取流程 |

</details>

### TC-AML-P0-037 INCR 增量-按 OBJ_ID 物理删除后直接插入（局部替换）

| 项 | 内容 |
|---|---|
| 用例名称 | INCR 模式以文件 OBJ_ID 为基础先物理删除本地相关记录（含多条）再直接插入文件数据 |
| 优先级/测试方式 | P0 / 数据库查询 + 代码审查（RULE-06/RULE-01） |
| 跨模块标注 | 需专项数据（D1 预置 INCROBJ01 旧记录 + D2 文件含同 OBJ_ID） |
| 前置条件 | 1. 按 D1 预置 INCROBJ01 旧记录（CUST_NM='旧名单主体'）；2. 同 OBJ_ID 在本地存在 2 条旧记录；3. D2 文件含 OBJ_ID=INCROBJ01 新记录（CUST_NM='新名单主体'）；4. 模式=INCR |
| 步骤 | 1. 【v1.2 修订】触发定时任务 HNNXTK020113 执行抽取（原"手动抽取"随 v3.9.0 下线，测试环境通过调整任务调度时间窗口或管理端立即执行触发）；2. 查询 OBJ_ID='INCROBJ01' 全部记录 |
| 预期结果 | 1. 旧 2 条记录全部被物理删除（物理删除非逻辑删除，锚点：HnnxAntiMoneyListServiceImpl.java L176 syncIncrementalData + L207-208 分片循环调用 deleteByObjIds + PRD §3.1 v3.7.0 口径）；2. 文件中该 OBJ_ID 新记录插入成功（CUST_NM='新名单主体'）；3. 不存在 upsert 残留（旧 CUST_NM 无法查到）；4. 未受文件涉及的其他 OBJ_ID 存量记录保留不动（局部替换语义） |

### TC-AML-P0-038 INCR-同 OBJ_ID 多条记录全部插入且重跑幂等

| 项 | 内容 |
|---|---|
| 用例名称 | INCR 模式文件内同 OBJ_ID 多条记录全部直接插入（不再按主键去重），重跑结果幂等 |
| 优先级/测试方式 | P0 / 数据库查询 + 运行时测试 |
| 跨模块标注 | 需专项数据 |
| 前置条件 | D2 文件含 OBJ_ID=INCROBJ01 的 2 条不同 CUST_NM 记录；模式=INCR |
| 步骤 | 1. 【v1.2 修订】第一次触发定时任务 HNNXTK020113 执行抽取；2. 记录名单表 INCROBJ01 记录数与内容；3. 第二次触发抽取（重跑）；4. 再次查询对比 |
| 预期结果 | 1. 第一次：2 条记录全部插入（v3.7.0："文件内同 OBJ_ID 多条记录均为合法数据，全部直接插入"，锚点：PRD §3.1，旧"按主键去重"口径作废）；2. 第二次重跑：先按 OBJ_ID 删除本批 2 条再重插 2 条，总量与内容一致（删除-重插天然幂等，锚点：PRD §3.1.1 异常表"重复抽取"行） |

### TC-AML-P0-039 抽数统一入口-定时任务收敛同一抽数逻辑与互斥锁（v1.2 修订：手动入口已下线）

| 项 | 内容 |
|---|---|
| 用例名称 | 定时任务 HNNXTK020113 经 Job 层 importEcifList 统一入口抽数（含 SYNC_LOCK 互斥），Service 层不承载抽数，手动抽取入口已下线无残留（代码审查） |
| 优先级/测试方式 | P0 / 代码审查（RULE-01 逻辑验证） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取到本地工作区 |
| 步骤 | 1. Read `SyncAntiMoneyListJobServiceImpl.java`：L136 importEcifList 方法签名、L139 synchronized(SYNC_LOCK)、L81 SYNC_LOCK 定义；2. 【v1.2 修订】Read `HnnxAntiMoneyListController.java` 确认 func_importFile 接口已删除（L65/L71 @modify 记录"再次下线手动抽取入口"，类注释 L49-51"页面不提供手动触发入口"），Grep 全文件无 func_importFile 与 syncAntiMoneyListJobService 注入残留；3. Read `HnnxAntiMoneyListService.java` 接口方法清单；4. Grep 确认 Service 层无 fileImportEcifList 残留 |
| 预期结果 | 1. 【v1.2 修订】手动入口 `HnnxAntiMoneyListController.func_importFile` 已删除（v3.9.0 下线，锚点：Controller L65/L71 @modify + PRD §3.1.2 移除说明），抽取统一由定时任务 HNNXTK020113 承载（定时入口 syncAntiMoneyList L113-118 委托 importEcifList），不存另建服务复制抽数逻辑；2. 抽数（GBK 读取/ETX 解析/DATA_SRC=18 且 VLD_ST=1 过滤/sync mode 分发/SYNC_LOCK）全部位于 Job 层 `importEcifList`，SYNC_LOCK 互斥保持（原 P1-040 的锁断言并入本条）；3. `HnnxAntiMoneyListService` 仅公开 `syncFullData`/`syncIncrementalData` 落库方法与 `pageQuery`（锚点：HnnxAntiMoneyListServiceImpl.java L140/L176/L86），`fileImportEcifList` 两重载已删除；4. 抽数逻辑与互斥锁与下线前完全一致（下线仅移除触发入口，不改抽数语义） |

### TC-AML-P0-040 手动抽取入口下线回归-页面无按钮+接口不可达+定时任务承载（v1.2 新增）

| 项 | 内容 |
|---|---|
| 用例名称 | 手动抽取文件入口下线回归：名单页无"手动抽取文件"按钮、func_importFile 接口不可达、名单数据仍经定时任务正常抽取 |
| 优先级/测试方式 | P0 / Playwright + 接口测试 + 代码审查（RULE-09/RULE-05） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 1. 以具备名单页权限（TM_AUTHORITY 30308）账号登录 hnnxbank 前端；2. 服务已启动；3. 源代码已拉取 |
| 步骤 | 1. 进入【市场交易】-【中互金关注名单】页（路由 `/banks/hnnxbank/pc/antimoney/antiMoneyList`），快照核对页面按钮区；2. 全页检索"抽取/importFile"相关按钮或入口；3. 以已登录会话直接 POST `/hnnxbank/antimoney/func_importFile`（模拟残留入口或收藏夹旧请求）；4. 代码审查 Controller（Grep func_importFile）与前端 antiMoneyList.vue（Grep importFile 按钮及方法）；5. 按定时任务口径触发一次抽取（调整任务调度窗口），查询名单表确认抽取链路不受下线影响 |
| 预期结果 | 1. 名单页不出现"手动抽取文件"按钮（页面仅保留查询/导出/重置类操作，锚点：Controller 类注释 L49-51"页面不提供手动触发入口"+ PRD §3.1.2 移除说明）；2. POST func_importFile 返回 404/无对应资源类错误（接口已删除，锚点：Controller L65/L71 @modify 记录），且名单表无任何写库变化（防残留入口越权触发抽取）；3. 代码审查：Controller 无 func_importFile 映射与 Job 服务注入、前端无抽取按钮绑定方法（v1.1 记录的 BUG-AML-002 误还原已修正，本次为终态断言）；4. 定时任务抽取链路正常（名单表按文件数据更新，抽样 1 条 DATA_SRC=18/VLD_ST=1 记录落库），证明下线未影响唯一抽取通道 |

### TC-AML-P1-039 手动抽取-文件缺失业务失败三路反馈【v1.2 修订：定时任务口径】

| 项 | 内容 |
|---|---|
| 用例名称 | 名单文件缺失时定时任务抽取返回业务失败，反馈文件缺失及日期目录，名单库存量不受影响 |
| 优先级/测试方式 | P1 / Playwright + 代码审查 |
| 跨模块标注 | 需专项数据（仅目录，不放文件） |
| 前置条件 | `{ecifFilePath}/{营业日前一天}/` 目录下无名单文件；名单表预置存量记录 |
| 步骤 | 1. 【v1.2 修订】触发定时任务 HNNXTK020113（原手动按钮随 v3.9.0 下线）；2. 观察任务执行结果与日志反馈；3. 查询名单表存量 |
| 预期结果 | 1. 任务结果提示文件缺失（含日期目录信息，PRD §7 异常表"文件缺失"行）；2. 抽取失败抛异常返回、不静默成功（PRD §3.1.1 异常表"批量抽取失败：任务失败并记录日志，支持重跑"）；3. 名单库存量记录保留不变（"名单数据为空/文件缺失保留历史"口径）；4. 失败后可重跑（放回文件后任务下次调度或立即执行可成功） |

### TC-AML-P1-040 【作废-功能下线，锁断言并入 P0-039】手动抽取防重-前端 loading 置灰 + 后端 SYNC_LOCK 串行

> **⚠ 作废（v1.2，v3.9.0 功能下线）**：前端 loading 置灰防重随"手动抽取文件"按钮一并下线，不再有前端触发通道可验证；后端 `synchronized (SYNC_LOCK)`（SyncAntiMoneyListJobServiceImpl.java L139/L140）互斥断言已并入 **P0-039 预期 2**（定时任务与唯一抽数入口的锁语义保持）。集群多实例限制（W-5）记录不变，多实例部署前改造 Redis 锁。

<details><summary>历史版本用例内容（仅作版本溯源，禁止执行）</summary>

| 项 | 内容 |
|---|---|
| 用例名称 | 抽取执行中按钮 loading 置灰防重复提交，后端并发请求在 SYNC_LOCK 上排队串行不产生数据交叉 |
| 优先级/测试方式 | P1 / 代码审查 + Playwright |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 前端 antiMoneyList.vue 的 importFile 方法可用 |
| 步骤 | 1. 代码审查前端按钮 loading 态实现与恢复时机；2. 代码审查 `synchronized (SYNC_LOCK)`（SyncAntiMoneyListJobServiceImpl.java L140）；3. 运行时：构造大文件拖长抽取耗时，抽取中快速二次点击按钮 |
| 预期结果 | 1. 按钮点击后置灰，请求返回（含失败）后恢复（Q-14-E 前端防重）；2. 二次点击不发出第二次请求或被禁用；3. 后端并发请求在锁上排队顺序执行，名单表无重复/交叉数据；4. 已知限制记录：集群多实例下类级锁不互斥（W-5，多实例部署前须改造 Redis 锁） |

</details>

### TC-AML-P1-041 【作废-功能下线】手动抽取权限-复用名单页菜单权限无独立按钮权限码

> **⚠ 作废（v1.2，v3.9.0 功能下线）**：手动抽取入口已删除，无按钮级权限场景；名单页菜单权限（TM_AUTHORITY 30308）与接口授权校验由既有用例 TC-AML-P1-019（权限控制）与 P0-040（接口不可达）覆盖。本用例不再执行。

<details><summary>历史版本用例内容（仅作版本溯源，禁止执行）</summary>

| 项 | 内容 |
|---|---|
| 用例名称 | 手动抽取复用中互金关注名单菜单权限（TM_AUTHORITY 30308），不新增按钮级权限码 |
| 优先级/测试方式 | P1 / 代码审查 + Playwright（RULE-01/RULE-09） |
| 跨模块标注 | 需跨模块操作（角色权限管理） |
| 前置条件 | 具备 30308 菜单权限账号 A 与不具备的账号 B |
| 步骤 | 1. 代码审查 func_importFile 权限校验逻辑（菜单权限复用）；2. 账号 A 进入名单页点击抽取；3. 账号 B 尝试访问名单页与直接 POST func_importFile |
| 预期结果 | 1. 账号 A 抽取成功；2. 账号 B 无菜单入口且接口被权限拦截；3. 权限体系无新增按钮权限码（Q-14-D 假设口径，锚点：PRD §3.1.2 权限控制） |

</details>

### TC-AML-P1-042 ecifFile.ecifFilePath 配置缺失-运行时失败不静默【v1.2 修订：定时任务口径】

| 项 | 内容 |
|---|---|
| 用例名称 | ecifFile.ecifFilePath 未配置时定时任务抽取运行时抛异常失败，不静默成功（BUG-005 口径） |
| 优先级/测试方式 | P1 / 代码审查 + 运行时测试（RULE-04） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 临时移除/置空 ecifFile.ecifFilePath 配置（测试环境受控操作） |
| 步骤 | 1. 代码审查 @Value 注入（SyncAntiMoneyListJobServiceImpl.java L96，无默认值的强依赖注入）；2. 置空配置后重启或以配置缺失场景触发；3. 【v1.2 修订】以定时任务 HNNXTK020113 触发抽取（原手动通道随 v3.9.0 下线）；4. 观察返回与日志 |
| 预期结果 | 1. 运行时路径（确定口径）：@Value("${ecifFile.ecifFilePath}") 无默认值——配置项缺失时 Spring 注入阶段即失败；配置存在但为空串时，doImportEcifList L157-161 显式抛 BempRuntimeException"中互金名单抽取失败：未配置文件根目录 ecifFile.ecifFilePath"（DG-006：文件根目录为必填配置，缺失时抛异常令任务失败，杜绝"配置缺失却 return 0"的假成功）；两条路径均不静默成功；2. 任务结果提示抽取失败含未配置文件根目录类错误信息；3. 日志记录失败原因（定时任务留痕口径，v1.2 随 P1-043 修订） |

### TC-AML-P1-043 定时任务抽取操作留痕-触发模式/时间/结果统计【v1.2 修订：定时任务口径】

| 项 | 内容 |
|---|---|
| 用例名称 | 名单文件抽取留痕：记录抽取时间（批次）、触发模式（定时任务 HNNXTK020113）、抽取结果（批次统计或失败原因） |
| 优先级/测试方式 | P1 / 代码审查（RULE-03 错误文案/日志验证） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取 |
| 步骤 | 1. 【v1.2 修订】Read SyncAntiMoneyListJobServiceImpl 定时入口 syncAntiMoneyList 与 importEcifList 的留痕语句（原 Controller func_importFile 操作人留痕随手动下线作废）；2. Read Job 层抽数结果统计日志；3. 触发一次定时抽取核对日志输出 |
| 预期结果 | 1. 定时任务触发有触发模式留痕（HNNXTK020113 任务号，锚点：SyncAntiMoneyListJobServiceImpl.java L113-118 定时入口委托 importEcifList）；2. 抽取成功/失败均有结果留痕（成功=批次统计读取/入库/跳过条数，失败=失败原因，锚点：PRD §6.2 v3.9.0 操作审计"名单抽取（定时）、查询、导出及命中事件需留痕审计"）；3. 留痕载体=日志级（与 RK-011 一致，DB 级留痕表待确认，不新增断言） |

### TC-AML-P1-044 INCR-OBJ_ID 为空的记录跳过并留痕

| 项 | 内容 |
|---|---|
| 用例名称 | 增量文件中 OBJ_ID 为空的记录跳过入库且日志留痕（无法定位删除范围） |
| 优先级/测试方式 | P1 / 代码审查 + 数据库查询 |
| 跨模块标注 | 需专项数据（D2 文件含 OBJ_ID 空记录） |
| 前置条件 | D2 文件含 1 条 DATA_SRC=18/VLD_ST=1 但 OBJ_ID 为空的记录 |
| 步骤 | 1. 触发抽取；2. 查询名单表该 CUST_NM 记录；3. 检查日志 |
| 预期结果 | 1. OBJ_ID 空记录未入库（跳过）；2. 日志留痕跳过信息（延续既有口径，锚点：PRD §3.1 v3.7.0"OBJ_ID 为空的记录跳过并留痕"）；3. 其余合法记录正常处理不受影响 |

### TC-AML-P1-045 OBJ_ID 删除分片≤900 且 OBJ_ID 唯一约束已删除

| 项 | 内容 |
|---|---|
| 用例名称 | 增量删除按 OBJ_ID 分片≤900（ORA-01795 留余量），本地表无 UK_HNNX_M_CSI_OBJ 唯一约束 |
| 优先级/测试方式 | P1 / 代码审查 + 数据库查询（RULE-05/RULE-06） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取；可查询名单库表索引 |
| 步骤 | 1. 代码审查常量 `SYNC_OBJ_ID_DELETE_BATCH_SIZE = 900`（HnnxAntiMoneyListServiceImpl.java L63）与分片调用（L208 deleteByObjIds(batch)）；2. 数据库查询 HNNX_M_CUST_SPECIAL_INFO 索引清单 |
| 预期结果 | 1. 删除按 ≤900/片分批执行（配套设计决定③，锚点：PRD §3.1 v3.7.0）；2. 表上不存在名为 UK_HNNX_M_CSI_OBJ 的唯一约束（配套设计决定①：OBJ_ID 改普通索引或不建索引）；3. 插入沿用 500/批（既有语义不变） |

### TC-AML-P1-046 删除+插入整体事务原子-插入失败不丢失名单

| 项 | 内容 |
|---|---|
| 用例名称 | INCR 删除+插入在整体事务内原子执行，插入阶段失败时已删除名单回滚恢复 |
| 优先级/测试方式 | P1 / 代码审查（RULE-01） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取 |
| 步骤 | 1. Read syncIncrementalData 事务边界（TransactionTemplate 包裹删除+插入）；2. 核对异常回滚路径；3. 交叉核对 syncFullData 同样具备原子语义（L129 注释"INCR 模式不调用本方法、不执行 deleteAll"，L142 deleteAll） |
| 预期结果 | 1. 删除与插入同事务，插入失败整体回滚、已删除记录恢复（配套设计决定②"防止删除后插入失败导致名单丢失"，锚点：PRD §3.1 v3.7.0）；2. FULL 模式 deleteAll+insertBatch 原子性保持（L140~L142，锚点：HnnxAntiMoneyListServiceImpl.java） |

### TC-AML-P1-047 Service 层落库边界-HnnxMCustSpecialInfoDto RPC 序列化与两侧实体转换

| 项 | 内容 |
|---|---|
| 用例名称 | syncFullData/syncIncrementalData 入参为 RPC 序列化边界对象 HnnxMCustSpecialInfoDto，Job/Service 两侧各做一次实体-DTO 转换 |
| 优先级/测试方式 | P1 / 代码审查（RULE-01） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取 |
| 步骤 | 1. Read `HnnxAntiMoneyListService.java` 接口签名；2. Read Job 层实体→DTO 转换点与 Service 层 DTO→实体转换点；3. 核对字段映射完整性（RECORD_ID/CUST_NO/OBJ_ID/CUST_NM/CERT_TYPE/CERT_NO/DATA_SRC/VLD_ST 等核心列） |
| 预期结果 | 1. 接口方法入参类型=`List<HnnxMCustSpecialInfoDto>`（RPC 序列化边界对象，锚点：PRD §3.1 v3.8.0）；2. Job/Service 两侧各一次转换、无重复转换或字段丢失；3. TransactionTemplate 原子/取号/分批 500/900 语义不变 |

### TC-AML-P1-048 清单导出模板代码内置-22列固定+无 downLoadInfo 依赖（v1.2 新增，v3.9.0 导出实现变更）

| 项 | 内容 |
|---|---|
| 用例名称 | 清单导出模板由 HnnxAntiMoneyListController 代码内置构建 ExcelBuildReq（22 列固定字段映射），不再读取 downLoadInfo XML 配置模板 hnnxAntiMoneyListReportInfo（代码审查） |
| 优先级/测试方式 | P1 / 代码审查（RULE-01 逻辑验证 + RULE-04 配置验证） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取到本地工作区 |
| 步骤 | 1. Read `HnnxAntiMoneyListController.java` L46-73 类注释（L52-53"模板为代码内置构建，原 downLoadInfo.ext.xml 的 hnnxAntiMoneyListReportInfo 配置已下沉至代码，无需部署侧模板配置"）与 L67 @modify 记录（"清单导出模板改代码内置：删除 func_importFile 依赖的模板缓存查询，22列口径与原XML模板一致"）；2. Read L100-127 EXPORT_FIELD_TO_CELL_NAME_MAP 静态映射（LinkedHashMap 22 列，field_no 与 HnnxMCustSpecialInfoDto 属性名一一对应）；3. Read L240-252 getExcelBuildReq（VERSION_2003/showTitleName=TRUE 防 NPE/needSequence 默认 true 带序号列）；4. Grep 全工程确认无 downLoadInfo XML 按 excelName 解析 hnnxAntiMoneyListReportInfo 的残留调用路径；5. L264-285 convertAndBuildCellData 核对码值转中文集合 |
| 预期结果 | 1. 导出模板为代码内置：EXPORT_FIELD_TO_CELL_NAME_MAP 固定 22 列（名单编号/客户名称/证件类型/证件号码/账号/名单性质/名单类型/控制措施/生效时间/失效时间/数据来源/有效标志/数据日期/导入日/客户号/记录Id/备注/预留字段1~4/记录主键），列序经 LinkedHashMap 保持与原 XML 模板一致（锚点：Controller L100-127）；2. 不依赖 downLoadInfo XML 配置模板：无按 excelName 从缓存/XML 解析 hnnxAntiMoneyListReportInfo 的调用，部署侧未同步模板不再导致"未配置导出模板"失败（锚点：L228-232 getExcelBuildReq 注释，解决运行环境模板未配置问题）；3. 码值转中文集合=名单性质（1→黑名单/2→灰名单）+数据来源（18→中互金）+有效标志（1→有效/0→无效），名单类型（listType）保留原始编码不转中文（PRD 与码值字典均未定义其枚举，硬造映射会输出错误中文，锚点：L255-258 注释）；4. 同步/异步两条导出通路保留（L168-174 同步 max_excel_export_rows=2000/异步 jdbc.max_rows_in_page=60000，L180-209 两条分支） |

### TC-AML-P2-033 ecifFile.ecifFilePrefix 默认值变更与显式配置优先

| 项 | 内容 |
|---|---|
| 用例名称 | 文件名前缀配置项 ecifFile.ecifFilePrefix 默认值=ECF_M_CUST_SPECIAL_INFO_LIST_（v3.8.1 变更），配置中心显式配置优先于默认值 |
| 优先级/测试方式 | P2 / 代码审查 + 配置验证（RULE-04） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | 源代码已拉取；`banks/ext-hnnxbank/hnnxbank-served-deploy/src/main/resources/application.properties` 可读 |
| 步骤 | 1. 代码审查 @Value 默认值（SyncAntiMoneyListJobServiceImpl.java L103-104 `@Value("${ecifFile.ecifFilePrefix:ECF_M_CUST_SPECIAL_INFO_LIST_}")`）；2. 核对 application.properties 配置值；3. 构造环境变量/配置中心显式配置为其他前缀，验证文件拼装跟随（L162 fileName 拼装 + L163-164 路径拼装注释） |
| 预期结果 | 1. 未配置时按默认前缀 `ECF_M_CUST_SPECIAL_INFO_LIST_` 拼装 `{ecifFilePath}/{日期}/ECF_M_CUST_SPECIAL_INFO_LIST_{日期}.txt`（锚点：L162 `String fileName = ecifFilePrefix + dataDt + ".txt"` + L163-164 日期子目录注释）；2. 显式配置优先（v3.8.1 口径，历史默认值 ECF_M_CUST_SPECIAL_INFO_CBS_ 仅作溯源，锚点：L100-101 默认值变更注释）；3. 前缀变更仅需改配置不改代码 |

### TC-AML-P2-034 配套文件名前缀配置项默认值核对

| 项 | 内容 |
|---|---|
| 用例名称 | 同批参数化配套项：cbsFile.pjgcsFilePrefix 默认 CBS_PJGCS_、cbsFile.pjgxFilePrefix 默认 CBS_PJGGX_ |
| 优先级/测试方式 | P2 / 代码审查 + 配置验证（RULE-04） |
| 跨模块标注 | 独立可执行 |
| 前置条件 | application.properties 与 SyncPjgcsBranchParamJobServiceImpl/SyncPjgxBranchRelationJobServiceImpl 源码可读 |
| 步骤 | 1. 核对两 @Value 配置项默认值；2. 核对 application.properties 三项前缀配置同批落地；3. 未配置时文件拼装行为与改造前一致 |
| 预期结果 | 1. 默认值分别为 CBS_PJGCS_/CBS_PJGGX_（锚点：PRD §3.1 v3.8.0）；2. 三项前缀均带默认值，未配置行为不变；3. 生产配置中心需同步补录（风险项记录，配置验证通过即可） |

## 四、统计

| 优先级 | 有效数量 | 有效编号 | 作废数量 | 作废编号 |
|-------|------|------|------|------|
| P0 | 4 | TC-AML-P0-037~040 | 2 | P0-035/036（v3.9.0 功能下线） |
| P1 | 8 | TC-AML-P1-039、042~048 | 2 | P1-040/041（v3.9.0 功能下线） |
| P2 | 2 | TC-AML-P2-033~034 | 0 | — |
| 合计 | 14 | — | 4 | — |

> v1.2 统计口径：作废用例（P0-035/036、P1-040/041，共 4 条）保留在文档中仅作版本溯源，**不计入执行统计**；v1.2 新增 P0-040（下线回归）与 P1-048（导出模板内置）；v1.1 原 16 条中其余 12 条全部保留并按 v3.9.0 口径修订触发方式（手动→定时任务）。

## 五、遗留测试假设

| # | 假设项 | 影响 | 处理 |
|---|-------|------|------|
| H1 | 定时任务抽取成功反馈的批次统计字段（读取/入库/跳过条数）以日志实际输出为准（原 Q-14-C 手动三路反馈口径随下线转为定时任务日志口径） | P1-043/P0-040 步骤5 结果断言 | 执行时以实际日志核准，不一致按实现事实修订断言 |
| H2 | ~~名单页按钮文案未做页面预验证~~ | ~~P0-035/P1-039~~ | **假设随 v3.9.0 手动抽取下线作废**（无按钮可验证）；P0-040 断言 1 改为"页面无抽取按钮"，不受文案影响 |
| H3 | ⏸ 集群多实例部署场景（W-5 Redis 锁）不在本期单实例测试范围 | P0-039（原 P1-040 并入） | 已知限制记录，多实例部署前改造回归 |
| H4 | 定时任务 HNNXTK020113 测试环境触发方式（调整调度时间窗口 / 管理端立即执行）以测试环境任务管理能力为准 | P0-037/038/040、P1-039/042/043 触发步骤 | 执行前与运维确认测试环境触发机制；若管理端无立即执行功能，采用临时调整任务 cron 触发（执行后复位） |
