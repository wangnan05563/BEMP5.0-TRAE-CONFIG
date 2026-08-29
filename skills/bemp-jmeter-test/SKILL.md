---
name: "bemp-jmeter-test"
description: "BEMP JMeter性能测试技能，支持测试脚本管理、命令行执行、结果分析和报告生成。集成JMeter CLI实现非GUI模式压测，提供完整的性能测试工作流。"
whenToUse: "需要对BEMP系统进行JMeter性能测试，评估系统在不同负载下的响应时间和稳定性。"
triggers:
  - "性能/压力/JMeter/负载/并发/ 测试"
  - "执行JMX"
  - "生成测试报告"
  - "接口压测/性能分析"
  - "benchmark"
  - "load/stresstest"
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

# JMeter 性能测试技能

## 技能概述

本技能为 Trae IDE 提供完整的 JMeter 性能测试能力，支持：

1. **测试脚本管理**: 创建、编辑、管理 JMX 测试计划
2. **命令行执行**: 非 GUI 模式执行压测，支持参数化配置
3. **结果分析**: 解析 JTL 结果文件，计算关键性能指标
4. **报告生成**: 自动生成 HTML/Markdown 格式的性能测试报告

### 约束等级定义

| 约束等级 | 约束效力 | 强制性 |
|---------|---------|--------|
| 【强制】 | 违反该项将被认为代码存在严重缺陷 | 必须遵守 |
| 【推荐】 | 违反该项即被认为代码存在轻微缺陷 | 根据具体场景选择性遵守 |
| 【参考】 | 违反该项可被认为代码存在优化空间 | 参考使用 |

## 触发场景

| 场景 | 触发示例 | 技能行为 |
|------|---------|---------|
| 接口性能测试 | "对 /api/user/login 压测，100并发，5分钟" | 解析需求 → 生成JMX → 执行 → 报告 |
| 执行已有脚本 | "执行 api-test.jmx" | 定位JMX文件 → 环境检查 → 执行 → 分析 |
| 性能对比分析 | "对比两次压测结果" | 加载两份JTL → 计算指标差异(TPS/响应/错误率) → 对比报告 |
| 性能优化建议 | "分析接口性能瓶颈" | 解析结果 → 识别瓶颈(响应时间/错误率/资源) → 优化建议 |

## 执行流程

执行链路：**环境检查 → 创建测试计划 → 执行压测 → 结果分析 → 报告生成**，详见下方步骤 1-5。

### 步骤 1: 环境检查

**【强制】** 执行测试前必须按以下顺序完成环境检查：

**1.1 读取配置获取 JMeter 路径**

首先读取技能根目录下的 `config/jmeter-config.yml`，从 `jmeter.path` 字段获取 JMeter 可执行文件路径（由 _shared/env-config.json 的 `paths.jmeterPath`（即 `${ENV:JMETER_PATH}`）提供，或通过环境变量 `JMETER_PATH` 指定）。后续所有 JMeter 命令均使用该路径（而非依赖系统 PATH）。

> JMeter 路径由 _shared/env-config.json 的 environmentDefaults 提供 fallback 值。

若配置文件中的路径不存在，按优先级降级搜索：PATH → 常见安装目录（`D:\apache-jmeter-*`、`C:\apache-jmeter-*`）→ 提示用户手动安装。

**1.2 环境验证**

```bash
java -version
<配置文件中的 jmeter.path 值> --version
```

**1.3 推荐的执行方式**

优先使用技能自带的封装脚本（自动读取配置、处理 CSV 格式、生成报告）：

```powershell
.\scripts\run-jmeter.ps1 -TestPlan "path\to\test.jmx" -Threads 20 -Duration 20
```

#### 1.1 运行时安全校验

**【强制】** 在发起任何压测请求前，必须通过以下安全检查，任一校验不通过应中止执行：

**目标地址安全校验**:

```yaml
# 生产环境域名/IP 黑名单（正则匹配）
production_blacklist:
  - "*.prod.example.com"
  - "*.production.example.com"
  - "10\\.0\\..*"           # 内网生产网段
  - "api.example.com"       # 生产 API 网关
```

校验逻辑：目标地址匹配黑名单任一规则时，**拒绝执行并向用户发出高风险警告**。

**JMeter 版本兼容性检查**:

| JMeter 版本 | 最低 Java 版本 | 关键特性 | 兼容状态 |
|------------|--------------|---------|---------|
| 5.6.x | Java 8+ | 最新稳定版，推荐使用 | ✅ 完全兼容 |
| 5.5.x | Java 8+ | 稳定版 | ✅ 兼容 |
| 5.4.x | Java 8+ | 稳定版 | ✅ 兼容 |
| 5.3 及以下 | Java 8+ | 部分插件不兼容 | ⚠️ 建议升级 |
| 3.x | Java 7+ | 已停止维护 | ❌ 不推荐 |

**错误处理指引**:

| 错误场景 | 错误信息特征 | 处理策略 |
|---------|------------|---------|
| Java 未安装 | `java: command not found` | 提示安装 JDK 8+，并设置 JAVA_HOME |
| JMeter 未安装 | `jmeter: command not found` | 提示安装路径（见 Q1），或使用配置路径 |
| 端口被占用 | `Address already in use` | 检查是否已有 JMeter 实例在运行，提示 `kill` 或更换端口 |
| 内存不足(OOM) | `OutOfMemoryError` | 建议调整 JMeter HEAP 参数：`-Xms512m -Xmx2048m` |
| CSV 格式错误 | HTML 报告生成失败 | 检查 `jmeter.save.saveservice.output_format=csv` 配置 |
| 目标服务不可达 | `Connection refused` / `timeout` | 确认目标服务已启动且端口正确；压测前先执行单次 curl 验证 |

### 步骤 2: 创建测试计划

**【强制】** 测试计划必须包含以下组件：

| 组件 | 用途 | 配置要点 |
|------|------|---------|
| Thread Group | 定义并发用户数、Ramp-Up 时间、循环次数 | threads, rampUp, loops |
| HTTP Request Defaults | 默认服务器配置 | protocol, host, port |
| HTTP Request | 具体请求配置 | method, path, headers, body |
| Response Assertion | 断言响应是否符合预期 | pattern, testField |
| View Results Tree | 调试用（压测时禁用） | 仅调试模式启用 |
| Summary Report | 汇总统计 | 压测时必须启用 |
| Aggregate Report | 聚合报告 | 压测时必须启用 |
| Backend Listener | 后端监听器（可选） | 用于实时监控 |

### 步骤 3: 执行测试

**【强制】** 使用非 GUI 模式，命令模板：

```bash
jmeter -n -t test.jmx -l results.jtl [-e -o reports/] [-Jkey=value...]
```

| 参数 | 说明 | 何时使用 |
|------|------|---------|
| `-n` | 非GUI模式 | 强制 |
| `-t` | 测试计划文件 | 强制 |
| `-l` | 结果输出文件(.jtl) | 强制 |
| `-e -o` | 生成HTML报告到指定目录 | 需要HTML报告时 |
| `-Jkey=value` | 覆盖JMeter属性（threads/rampUp/duration等） | 参数化执行时 |
| `-p` | 指定jmeter.properties（含`output_format=csv`） | HTML报告生成失败时 |

**【强制】** 执行前确保 `jmeter.properties` 含 `jmeter.save.saveservice.output_format=csv`（否则 HTML 报告生成失败）。

### 步骤 4: 结果分析

**【强制】** 必须计算以下指标：

| 指标 | 计算方法 | 参考标准 |
|------|---------|---------|
| TPS/QPS | 总请求数 / 总时间 | >1000 为优秀 |
| 平均响应时间 | sum(responseTime) / count | <200ms 为优秀 |
| P90 响应时间 | 90% 请求的响应时间上限 | <500ms 为良好 |
| P95 响应时间 | 95% 请求的响应时间上限 | <1000ms 为可接受 |
| P99 响应时间 | 99% 请求的响应时间上限 | <2000ms 为可接受 |
| 错误率 | errorCount / totalCount * 100% | <1% 为优秀 |
| 吞吐量 | 总数据量 / 总时间 | 根据业务场景定 |

#### 4.1 连接与延迟时间拆解

**【推荐】** 从 JTL 结果文件中拆解以下时间维度，精准定位瓶颈：

| 时间维度 | JTL 字段 | 含义 | 优化方向 |
|---------|---------|------|---------|
| 连接时间 (Connect) | `Connect` | TCP 三次握手耗时 | 如偏高：检查网络延迟、DNS解析、负载均衡器 |
| 延迟时间 (Latency) | `Latency` | 请求发出到收到第一个响应字节 | 如偏高：检查服务端处理能力 |
| 响应时间 (Elapsed) | `elapsed` | 完整请求耗时 = 连接+发送+等待+接收 | 综合指标 |
| 服务端处理时间 | `elapsed - Connect - Latency` | 服务端纯计算 + 数据接收耗时 | 如偏高：检查业务逻辑、数据库查询 |
| 空闲时间 (IdleTime) | `IdleTime` | 请求在 JMeter 端等待发送的时间 | 如偏高：JMeter 自身线程调度瓶颈 |

分析优先级：

```
Connect 时间高 → 网络层问题（带宽/DNS/负载均衡）
Latency 高、Connect 低 → 服务端请求排队或处理慢
Latency 低、Elapsed 高 → 响应体过大，需检查数据传输
IdleTime 高 → JMeter 线程不足或 Ramp-Up 过慢
```

#### 4.2 事务级独立统计

**【推荐】** 对于包含 Transaction Controller 的测试计划，必须对每个事务（子请求）和整体事务分别统计：

```markdown
| 事务名称 | 请求数 | 平均响应(ms) | P95(ms) | P99(ms) | 错误率 | TPS | 占比 |
|---------|-------|-------------|---------|---------|-------|-----|------|
| 完整业务流程 | 10000 | 650 | 890 | 1200 | 0.1% | 33.3 | 100% |
| ├ 01-登录 | 10000 | 120 | 180 | 250 | 0.0% | 33.3 | 18% |
| ├ 02-业务查询 | 10000 | 210 | 350 | 480 | 0.05% | 33.3 | 32% |
| └ 03-业务操作 | 10000 | 320 | 450 | 620 | 0.05% | 33.3 | 50% |
```

**【强制】** 如果某个子步骤耗时占比超过 50%，标记为重点优化目标。

#### 4.3 服务器资源指标采集

**【推荐】** 压测时同步采集以下服务器资源指标：

| 指标 | 采集方式 | 正常范围 | 告警阈值 |
|------|---------|---------|---------|
| CPU 使用率 | JMeter PerfMon 插件 或 `top`/`htop` | <70% | >85% 持续 1 分钟 |
| 内存使用率 | PerfMon / `free -m` | <80% | >90% 或持续增长（泄漏） |
| 磁盘 I/O | PerfMon / `iostat` | <70% util | >85% util |
| 网络带宽 | PerfMon / `iftop` | < 带宽的 70% | >85% |
| 数据库连接数 | 数据库监控 / `SHOW PROCESSLIST` | < 连接池 80% | >90% 连接池 |

JMeter PerfMon 插件集成方式：

```xml
<!-- 需安装 PerfMon Metrics Collector 插件，目标服务器运行 ServerAgent -->
<!-- 更多指标（Memory/Network/Disk）按相同 pattern 扩展 -->
<kg.apc.jmeter.vizualizers.PerfMonCollector guiclass="kg.apc.jmeter.vizualizers.PerfMonCollectorGui" testclass="PerfMonCollector" testname="服务器资源监控">
  <collectionProp name="metricConnections">
    <collectionProp>
      <stringProp name="0">localhost</stringProp>
      <stringProp name="1">4444</stringProp>
      <stringProp name="2">CPU</stringProp>
      <stringProp name="3">combined</stringProp>
    </collectionProp>
  </collectionProp>
</kg.apc.jmeter.vizualizers.PerfMonCollector>
```

资源指标采集应覆盖测试全程（含 Ramp-Up 阶段），并在报告中形成资源利用率趋势图，
与 TPS/响应时间趋势图叠加对比，以关联性能拐点与资源瓶颈。

### 步骤 5: 报告生成

**【推荐】** 报告应包含 6 部分：测试概述（目标/时间/环境/工具）、测试配置（threads/rampUp/duration/loops）、关键指标表（TPS/平均响应/P95/错误率 + 评级）、趋势分析图（响应时间/TPS/错误率）、性能瓶颈、优化建议。

> 完整报告模板参见 `assets/report-templates/performance-report.md`。

#### 5.1 历史基线对比报告

**【推荐】** 每次压测完成后将关键指标保存为基线记录，后续压测自动对比。基线文件存储于 `output/baselines/baseline-{date}-{time}.json`，指标字段与 §4 结果分析指标表对齐（test_target/test_env/timestamp/preset/metrics）。

**趋势判定规则**:
- TPS 变化 > ±10% 或响应时间变化 > ±20%，标记为 **显著变化**
- 错误率上升 > 0.1%，标记为 **需关注**

#### 5.2 报告生成回退策略

**【强制】** 报告生成必须遵循以下回退链，确保至少产出一份可用报告：

```
优先级 1: JMeter HTML 报告 (jmeter -e -o)
    ↓ 失败（CSV 格式错误/插件缺失）
优先级 2: Markdown 自定义报告（解析 JTL 计算指标）
    ↓ 失败（JTL 文件损坏/为空）
优先级 3: 原始数据报告（直接输出 JTL 文件关键行的 CSV 摘要）
    ↓ 失败（JTL 文件不存在）
优先级 4: 错误摘要（输出 JMeter 控制台日志 + 失败原因）
```

**【强制】** 回退失败时必须向用户明确报告：哪一级失败、失败原因、当前产出的报告类型和可用信息。

#### 5.3 PDF 报告生成方案

**【推荐】** Markdown 转 PDF 推荐方案（按优先级）：A. `pandoc --pdf-engine=wkhtmltopdf`（本地快速）；B. `npx mdpdf --style=github`（Node.js 自动化）；C. VS Code `markdown-pdf` 插件（手动导出）；D. Trae IDE 内置 `markdown-converter` 技能（无需额外安装）。

## 技术规范

### JMX 文件结构规范

**【强制】** JMX 测试计划采用 `jmeterTestPlan > hashTree > TestPlan + ThreadGroup + (Sampler + Assertion + Listener)` 的嵌套结构，关键节点：`TestPlan`（用户变量）、`ThreadGroup`（threads/ramp_time/duration/scheduler）、`HTTPSamplerProxy`（protocol/domain/port/path/method）、`ResponseAssertion`（响应码/内容断言）、`ResultCollector`（监听器/报告）。

> 完整 JMX 模板参见 `assets/templates/api-test.jmx`（含基础结构与断言示例），多步骤业务模板参见 `assets/templates/web-test.jmx`。

### 复杂业务场景组件

**【推荐】** 真实业务压测通常涉及多步骤事务流程（如登录→查询→操作），需使用以下扩展组件，详见 `assets/templates/web-test.jmx`：

| 组件 | 用途 | 关键属性 |
|------|------|---------|
| HTTP Header Manager | 全局请求头管理（Content-Type、Authorization） | `HeaderManager.headers` |
| HTTP Cookie Manager | 会话 Cookie 保持登录态 | `clearEachIteration=false` |
| Transaction Controller | 多步操作组合为逻辑事务，统计整体耗时 | `includeTimers=false`, `parent=true` |
| Constant Timer | 固定思考时间（500ms 典型 Web 间隔） | `delay=500`，置于 Sampler 子节点 |
| GaussianRandom Timer | 随机思考时间（更真实） | `delay=300, range=200`（正态分布） |
| JSON Extractor | 从 JSON 响应提取动态值（token、ID） | `referenceNames`, `jsonPathExprs` |

**【推荐】** 完整多步骤业务压测模板结构（从上到下）：

```
Test Plan
├── 用户自定义变量 (HOST, PORT, DURATION...)
├── HTTP Request Defaults (协议、服务器默认值)
├── HTTP Header Manager (Content-Type, Accept)
├── HTTP Cookie Manager (会话保持)
└── Thread Group
    └── Transaction Controller "完整业务流程"
        ├── 01-登录 (POST) → JSON Extractor (提取TOKEN)
        ├── Constant Timer (500ms)
        ├── 02-业务查询 (POST)
        ├── GaussianRandomTimer (300±200ms)
        └── 03-业务操作 (POST)
```

### 参数化配置规范

**【推荐】** 使用以下方式进行参数化：

1. **用户自定义变量**: 在 Test Plan 中定义全局变量
2. **CSV Data Set Config**: 从 CSV 文件读取测试数据
3. **函数助手**: 使用 `${__Random()}`, `${__time()}` 等函数
4. **正则表达式提取器**: 从响应中提取动态值
5. **JSON Extractor**: 从 JSON 响应中提取数据

### 断言规则规范

**【强制】** 必须配置 `ResponseAssertion` 验证测试结果：响应码断言（`Assertion.response_code`，匹配 200）参见基础 JMX 模板 `assets/templates/api-test.jmx`；响应内容断言（`Assertion.response_data`，`test_type=2`，匹配 `"success":true`）详见 `assets/templates/web-test.jmx`。

## 输出标准

### 结果文件格式

**【强制】** 测试结果必须保存为 JTL 格式（XML 或 CSV）：

```csv
# CSV 格式示例
timeStamp,elapsed,label,responseCode,responseMessage,threadName,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect
1633024800000,150,HTTP Request,200,OK,Thread Group 1-1,true,,1024,512,1,1,http://localhost:8080/api/test,145,0,10
```

### 报告输出格式

**【推荐】** 支持以下报告格式，按优先级链逐级回退：

| 优先级 | 格式 | 生成方式 | 依赖条件 |
|-------|------|---------|---------|
| 1 | HTML 报告 | JMeter `-e -o` 参数生成 | CSV 格式 JTL + JMeter 5.x |
| 2 | Markdown 报告 | 自定义解析 JTL 计算指标生成 | JTL 文件完整可读 |
| 3 | CSV 摘要报告 | 提取 JTL 关键统计行 | JTL 文件部分可读 |
| 4 | 错误摘要 | 输出 JMeter 控制台日志 | 仅需控制台输出 |

PDF 报告在 Markdown 报告生成成功后，通过 `pandoc`、`mdpdf` 或 Trae IDE 内置 `markdown-converter` 技能进行转换。
图表生成通过集成 `chart-visualization-expert` 技能来实现 TPS 趋势图、响应时间分布图等可视化内容。

## 最佳实践

### 1. 测试环境隔离

**【强制】** 压测必须在测试环境执行，禁止直接压测生产环境。

### 2. 渐进式压测

**【推荐】** 使用配置中的预设模板按小→大顺序执行：`smoke → baseline → load → stress → spike`。Quick check 可跳过 endurance。

### 3. 资源监控与数据准备

**【推荐】** 压测时同步监控 CPU/内存/磁盘I/O/网络/数据库连接数（详见 §4.3），并使用 CSV Data Set Config 准备充足参数化数据（数据量 > 预期请求数，覆盖边界情况）。

## 常见问题

### Q1: JMeter 未安装怎么办？

**A**: 通过包管理器安装或手动下载：<https://jmeter.apache.org/download_jmeter.cgi>。Windows 可用 `scoop install jmeter`，macOS 可用 `brew install jmeter`。

### Q2: 如何处理大规模并发？

**A**: 使用分布式压测：

1. 配置多台 Slave 机器
2. Master 分发测试计划
3. 汇总所有 Slave 的结果

### Q3: 如何分析性能瓶颈？

**A**: 从以下维度分析：

1. **应用层**: 代码逻辑、数据库查询、缓存使用
2. **中间件层**: 连接池配置、线程池配置
3. **系统层**: CPU、内存、磁盘、网络
4. **数据库层**: 慢查询、索引、锁竞争

## 与其他技能的集成

| 技能 | 触发时机 | 集成方式 |
|------|---------|---------|
| bemp-automation-test | 环境准备后 | 环境启动 → 触发 JMeter 性能测试 |
| bemp-jenkins-pipeline-deployer | CI/CD 流水线 | `build → unit-test → deploy → performance-test(JMeter) → report` |
| chart-visualization-expert | 报告生成阶段 | 生成 TPS趋势图 / 响应时间分布图 / 错误率饼图 / 资源仪表盘 |

## 参考文档

- [JMeter 官方文档](https://jmeter.apache.org/usermanual/index.html)
- [JMeter 命令行选项](https://jmeter.apache.org/usermanual/get-started.html#non_gui)
- [JMX 文件格式说明](https://jmeter.apache.org/usermanual/component_reference.html)
- [性能测试最佳实践](https://jmeter.apache.org/usermanual/best-practices.html)

## 配置管理

### jmeter-config.yml 字段说明

> 完整配置文件参见 `config/jmeter-config.json`，下表列出关键字段：

| 配置块 | 字段 | 用途 |
|-------|------|------|
| `jmeter` | `auto_detect` / `fallback_paths` / `java_home_*` | JMeter 与 JDK 路径自动检测与降级路径（Win/Mac/Linux） |
| `environments` | `dev` / `staging` / `prod-like` | 多环境 host/port/protocol，类生产环境必须与生产网络隔离 |
| `test_presets` | `smoke/baseline/load/stress/endurance/spike` | 测试类型预设，格式 `[threads, ramp_up, duration, desc]`，通过 `-Jpreset=<name>` 指定 |
| `report` | `format` / `output_dir` / `include_charts` / `baseline` | 报告格式（html+markdown）、输出目录、图表开关、基线存储与对比 |
| `safety` | `production_blacklist` / `allowed_targets` | 生产环境黑名单（匹配即拒绝）与白名单（空则用黑名单模式） |

**预设模板一览**（threads/ramp_up/duration）：

| 预设 | threads | ramp_up | duration | 说明 |
|------|---------|---------|----------|------|
| smoke | 10 | 5 | 60 | 冒烟测试 - 验证接口基本可用 |
| baseline | 50 | 10 | 300 | 基准测试 - 建立性能基线值 |
| load | 100 | 30 | 600 | 负载测试 - 模拟正常峰值业务 |
| stress | 200 | 60 | 900 | 压力测试 - 寻找系统吞吐量拐点 |
| endurance | 150 | 60 | 3600 | 稳定性测试 - 验证长时间运行资源泄漏 |
| spike | 500 | 5 | 120 | 峰值测试 - 模拟突发流量冲击 |

### 环境切换命令

```bash
# 使用 dev 环境 + 冒烟测试
jmeter -n -t test.jmx -Jenv=dev -Jpreset=smoke -l results.jtl

# 使用 staging 环境 + 负载测试
jmeter -n -t test.jmx -Jenv=staging -Jpreset=load -l results.jtl -e -o reports/

# 使用 prod-like 环境 + 压力测试
jmeter -n -t test.jmx -Jenv=prod-like -Jpreset=stress -l results.jtl -e -o reports/
```

### JMeter HOME 自动检测

**【推荐】** 自动检测优先级：`$JMETER_HOME/bin/jmeter`（或 `%JMETER_HOME%\bin\jmeter.bat`）→ PATH → fallback_paths（见配置文件）。全部失败则提示手动安装。
