# JMeter 性能测试技能

为 Trae IDE 提供完整的 JMeter 性能测试自动化能力，覆盖：测试脚本管理 → 命令行执行 → 结果分析 → 报告生成 全链路。

## 功能特性

| 功能 | 描述 | 状态 |
|------|------|------|
| **环境检查** | 读取 `config/jmeter-config.yml` 获取 JMeter 路径，验证 Java/JMeter 环境 | ✅ |
| **安全校验** | 生产环境黑名单检查、JMeter 版本兼容性验证 | ✅ |
| **脚本管理** | 提供 API/Web/复杂事务（Transaction Controller + Header/Cookie/JSON 提取器）模板 | ✅ |
| **测试执行** | 非 GUI 模式命令行压测，支持 6 种预设模板与 `-J` 参数化覆盖 | ✅ |
| **结果分析** | 解析 JTL 计算 TPS/P90-P99/错误率，含 Connect/Latency/IdleTime 时间拆解 | ✅ |
| **报告生成** | HTML/Markdown 报告（含多级回退链），支持历史基线对比与 PDF 转换 | ✅ |
| **资源监控** | 集成 PerfMon 插件采集 CPU/内存/磁盘 I/O/网络/数据库连接数 | ✅ |

## 触发词

`性能/压力/JMeter/负载/并发/测试 | 执行JMX | 生成测试报告 | 接口压测 | benchmark | load/stress test`

## 目录结构

```
bemp-jmeter-test/
├── SKILL.md                              # 技能规范（完整工作流与约束定义）
├── README.md                             # 使用说明（本文件）
├── config/
│   ├── jmeter-config.yml                 # JMeter 路径、测试默认参数、报告/分布式/断言/集成配置
│   └── jmeter.properties                 # CSV 输出格式配置（HTML 报告生成必需）
├── references/
│   ├── jmeter-cli-guide.md               # JMeter CLI 命令行参数完整参考
│   └── best-practices.md                 # 测试策略、环境要求、脚本设计、结果分析、常见问题
├── scripts/
│   ├── run-jmeter.ps1                    # 一键压测执行（支持 TestPlan/Threads/Duration/Preset/GenerateReport）
│   ├── analyze-results.ps1               # CSV 格式 JTL 解析与指标计算（TPS/P90-P99/错误率）
│   └── analyze-xml-results.ps1           # XML 格式 JTL 解析（兼容旧版 JMeter 输出）
├── assets/
│   ├── templates/
│   │   ├── api-test.jmx                  # API 接口压测模板
│   │   ├── web-test.jmx                  # Web 页面压测模板
│   │   └── baidu-test.jmx                # 百度搜索压测示例
│   └── report-templates/
│       └── performance-report.md         # Markdown 性能报告结构模板
└── output/
    ├── results/                          # JTL 原始结果文件
    ├── reports/                          # JMeter HTML 仪表盘报告
    ├── bemp-test/                        # BEMP 系统压测专用输出（JTL + HTML + Markdown）
    └── baselines/                        # 历史基线 JSON 记录（用于趋势对比）
```

## 快速开始

### 1. 配置 JMeter 路径

编辑 [`config/jmeter-config.yml`](config/jmeter-config.yml)，填写本地实际路径：

```yaml
jmeter:
  path: "D:\\code\\Jmeter\\apache-jmeter-5.6.3\\bin\\jmeter.bat"
  java_home: "D:\\code\\Java\\jdk-25.0.1"
  jvm_args:
    - "-Xms512m"
    - "-Xmx2048m"
    - "-XX:MaxMetaspaceSize=256m"
```

### 2. 执行压测

**方式 A — 自然语言描述**（推荐，技能全自动编排）：

> "对 /api/user/login 接口进行压力测试，100 并发，持续 5 分钟"

技能自动完成：环境检查 → 选择/创建 JMX → 执行压测 → 分析结果 → 生成报告。

**方式 B — PowerShell 脚本**（精确控制每个参数）：

```powershell
# 基础压测（输出 JTL + HTML 报告）
.\scripts\run-jmeter.ps1 -TestPlan "assets\templates\api-test.jmx" -Threads 100 -Duration 300

# 完整参数
.\scripts\run-jmeter.ps1 -TestPlan "assets\templates\api-test.jmx" `
  -Threads 200 -RampUp 30 -Duration 600 `
  -JMeterPath "D:\code\Jmeter\apache-jmeter-5.6.3\bin\jmeter.bat" `
  -GenerateReport

# 结果分析
.\scripts\analyze-results.ps1 -ResultFile "output\results\xxx.jtl" -Detailed
.\scripts\analyze-xml-results.ps1 -ResultFile "output\results\xxx.jtl"
```

### 3. 查看结果

| 产物 | 路径 | 说明 |
|------|------|------|
| **JTL 结果** | `output/results/*.jtl` | 原始性能数据（CSV/XML） |
| **HTML 报告** | `output/reports/*/index.html` | JMeter 自带可视化报告 |
| **Markdown 报告** | `output/results/*-report.md` | 脚本自动生成的分析报告 |
| **BEMP 专用报告** | `output/bemp-test/bemp-report.md` | BEMP 项目压测结果 |

## 执行流程

```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 1.环境检查 │ → │ 2.创建测试计划 │ → │ 3.执行压测 │ → │ 4.结果分析 │ → │ 5.报告生成 │
└──────────┘    └──────────────┘    └──────────┘    └──────────┘    └──────────┘
```

| 步骤 | 关键操作 | 输出 | 工具/脚本 |
|------|---------|------|-----------|
| 1. 环境检查 | 读取 `jmeter-config.yml` → 验证 Java/JMeter → 安全校验（黑名单） | go/no-go 信号 | `run-jmeter.ps1` |
| 2. 创建计划 | 选择模板（api/web/baidu） → 填充参数 → 添加断言 | `.jmx` 文件 | `assets/templates/` |
| 3. 执行压测 | `jmeter -n -t .jmx -l .jtl -e -o reports/` | JTL + HTML | `run-jmeter.ps1` |
| 4. 结果分析 | 解析 JTL → 计算 TPS/P90-P99/错误率 → 连接时间拆解 | 指标数据 | `analyze-results.ps1` / `analyze-xml-results.ps1` |
| 5. 报告生成 | HTML → Markdown → CSV摘要 → 错误摘要 四级回退 | 报告文件 | 脚本自动 + 模板 |

## 结果分析指标

### 核心指标（强制计算）

| 指标 | 计算方法 | 优秀 | 良好 | 一般 | 较差 |
|------|---------|------|------|------|------|
| **TPS** | 总请求数 / 总时间 | >1000 | 500-1000 | 100-500 | <100 |
| **平均响应时间** | sum(elapsed) / count | <200ms | 200-500ms | 500-1000ms | >1000ms |
| **P90 响应时间** | 90%分位 | <500ms | 500-1000ms | 1000-2000ms | >2000ms |
| **P95 响应时间** | 95%分位 | <500ms | 500-1000ms | 1000-2000ms | >2000ms |
| **P99 响应时间** | 99%分位 | <1000ms | 1000-2000ms | 2000-5000ms | >5000ms |
| **错误率** | failCount / total * 100% | <1% | 1-5% | 5-10% | >10% |
| **吞吐量** | 总字节数 / 总时间 | 按业务场景定 | | | |

### 连接与延迟时间拆解

从 JTL 字段定位瓶颈层级：

| 时间维度 | JTL 字段 | 含义 | 偏高时的原因 |
|---------|---------|------|------------|
| Connect | `Connect` | TCP 三次握手 | 网络延迟、DNS、负载均衡器 |
| Latency | `Latency` | 首个响应字节到达 | 服务端请求排队/处理慢 |
| Elapsed | `elapsed` | 完整请求耗时 | 综合指标 |
| 服务端处理 | `elapsed - Connect - Latency` | 纯计算+数据接收 | 业务逻辑、数据库查询 |
| IdleTime | `IdleTime` | JMeter 端等待发送 | JMeter 线程不足 |

## 测试预设模板

配置文件 `jmeter-config.yml` 中预定义 6 种测试类型，按渐进顺序使用：

| 预设 | 线程 | Ramp-Up | 持续 | 用途 |
|------|------|---------|------|------|
| **smoke** | 10 | 5s | 1min | 冒烟测试 — 验证接口基本可用 |
| **baseline** | 50 | 10s | 5min | 基准测试 — 建立性能基线值 |
| **load** | 100 | 30s | 10min | 负载测试 — 模拟正常峰值业务 |
| **stress** | 200 | 60s | 15min | 压力测试 — 寻找吞吐量拐点 |
| **endurance** | 150 | 60s | 1h | 稳定性测试 — 验证长时间无泄漏 |
| **spike** | 500 | 5s | 2min | 峰值测试 — 模拟突发流量冲击 |

渐进式执行顺序：`smoke → baseline → load → stress → spike`，快速检查可跳过 `endurance`。

## 报告生成回退策略

四级回退链，确保至少产出一份可用报告：

```
优先级 1: JMeter HTML 报告 (jmeter -e -o)
    ↓ 失败（CSV 格式错误/插件缺失）
优先级 2: Markdown 自定义报告（解析 JTL 计算指标）
    ↓ 失败（JTL 文件损坏/为空）
优先级 3: CSV 摘要报告（提取 JTL 关键统计行）
    ↓ 失败（JTL 文件不存在）
优先级 4: 错误摘要（JMeter 控制台日志 + 失败原因）
```

Markdown 报告支持转换为 PDF（通过 `pandoc` + `wkhtmltopdf`、`npx mdpdf` 或 Trae 内置 `markdown-converter` 技能）。

## 历史基线对比

每次压测完成后自动保存指标为基线 JSON（`output/baselines/baseline-{date}-{time}.json`），后续压测自动与最近 5 条基线对比：

```json
{
  "test_target": "/api/business/*",
  "test_env": "staging",
  "timestamp": "2026-05-17T14:30:00",
  "preset": "load",
  "metrics": { "tps": 850, "avg_ms": 115, "p95_ms": 380, "p99_ms": 520, "error_pct": 0.05 }
}
```

判定规则：TPS 变化 >±10% 或响应时间变化 >±20% → 标记为"显著变化"；错误率上升 >0.1% → 标记为"需关注"。

## 服务器资源监控

| 指标 | 采集方式 | 正常范围 | 告警阈值 |
|------|---------|---------|---------|
| CPU 使用率 | PerfMon 插件 或 `top`/`htop` | <70% | >85% 持续1分钟 |
| 内存使用率 | PerfMon 或 `free -m` | <80% | >90% 或持续增长（泄漏） |
| 磁盘 I/O | PerfMon 或 `iostat` | <70% util | >85% util |
| 网络带宽 | PerfMon 或 `iftop` | <70% 带宽 | >85% 带宽 |
| 数据库连接数 | DB监控 或 `SHOW PROCESSLIST` | <80% 连接池 | >90% 连接池 |

采集需覆盖测试全程（含 Ramp-Up），并在报告中与 TPS/响应时间趋势图叠加对比，以关联性能拐点与资源瓶颈。

## 复杂业务场景支持

支持多步骤事务流程压测，通过以下组件实现：

| 组件 | 用途 | 关键配置 |
|------|------|---------|
| **Transaction Controller** | 组合多步操作为一个逻辑事务，统计整体耗时 | `includeTimers: false`, `parent: true` |
| **HTTP Header Manager** | 管理全局请求头（Content-Type, Authorization） | 放在 Thread Group 级别 |
| **HTTP Cookie Manager** | 自动管理会话 Cookie，保持登录态 | `clearEachIteration: false` |
| **JSON Extractor** | 从 JSON 响应提取动态值（token, ID）传给后续请求 | `$.data.accessToken`, `$.data.userId` |
| **Constant Timer** | 模拟用户思考间隔（500ms 典型值） | 放在 HTTP Request 的 hashTree 中 |
| **GaussianRandomTimer** | 正态分布随机间隔，更真实 | `delay ± range` |

## JMX 模板说明

| 模板 | 适用场景 | 包含组件 |
|------|---------|---------|
| `api-test.jmx` | 通用 API 接口测试 | Thread Group + HTTP Request + Response Assertion + 汇总/聚合报告 |
| `web-test.jmx` | Web 页面性能测试 | 额外包含 HTTP Header Manager + Cookie Manager |
| `baidu-test.jmx` | 搜索类 GET 请求示例 | Cookie 管理器 + 参数化搜索词 + 断言 |

## 安全性

- **生产环境黑名单**：目标地址匹配黑名单规则（`*.prod.*`、`api.example.com`、内网生产网段）时拒绝执行
- **版本兼容性检查**：JMeter 5.3 以下建议升级，3.x 不推荐使用
- **环境隔离**：强制在测试环境执行，禁止直接压测生产

## 错误处理指引

| 错误场景 | 错误特征 | 处理策略 |
|---------|---------|---------|
| Java 未安装 | `java: command not found` | 安装 JDK 8+，设置 `JAVA_HOME` |
| JMeter 未找到 | `jmeter: command not found` | 编辑 `jmeter-config.yml` 路径，或设置 `JMETER_HOME` |
| 端口占用 | `Address already in use` | 检查是否有 JMeter 实例残留，结束后重试 |
| 内存不足 | `OutOfMemoryError` | 增大 `jvm_args` 中的 `-Xmx` 值 |
| HTML 报告失败 | 报告生成异常 | 确保 `jmeter.properties` 含 `output_format=csv` |
| 目标不可达 | `Connection refused` / `timeout` | 确认服务已启动；压测前先 curl 验证连通性 |

## 与其他技能集成

| 技能 | 触发时机 | 集成方式 |
|------|---------|---------|
| **bemp-automation-test** | 环境准备后 | 环境启动 → 触发 JMeter 性能测试 |
| **bemp-jenkins-deploy** | CI/CD 流水线 | `build → test → deploy → perf-test(JMeter) → report` |
| **chart-visualization-expert** | 报告生成阶段 | TPS趋势图 / 响应时间分布图 / 错误率饼图 / 资源仪表盘 |

## 约束等级

| 等级 | 效力 | 说明 |
|------|------|------|
| **【强制】** | 严重缺陷 | 必须遵守 |
| **【推荐】** | 轻微缺陷 | 根据场景选择性遵守 |
| **【参考】** | 优化空间 | 参考使用 |

## 参考文档

| 文档 | 内容 |
|------|------|
| [SKILL.md](SKILL.md) | 技能完整规范（748行，含完整 JMX 模板、安全规则、断言规范） |
| [references/jmeter-cli-guide.md](references/jmeter-cli-guide.md) | JMeter CLI 命令行参数详解、JTL 字段说明、常见错误码 |
| [references/best-practices.md](references/best-practices.md) | 压测策略（渐进式/测试类型）、脚本设计规范、瓶颈分析与优化方法 |
| [JMeter 官方文档](https://jmeter.apache.org/usermanual/index.html) | 官方用户手册 |

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| **v2.1.0** | 2026-05 | 目录结构补充 `baselines/`、`bemp-test/`；新增 `analyze-xml-results.ps1`；README 全面重构（执行流程表格化、时间拆解分析、历史基线对比） |
| **v2.0.0** | 2026-05 | 配置文件升级为 `jmeter-config.yml`（多环境、6种预设模板、安全检查）；SKILL.md 全面重构为748行规范 |
| **v1.0.0** | 2026-05 | 初始版本，基础压测执行（`run-jmeter.ps1`）与结果分析（`analyze-results.ps1`） |