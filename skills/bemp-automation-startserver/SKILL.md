---
name: "bemp-automation-startserver"
description: "BEMP项目开发环境启动Skill。配置驱动、零硬编码、WMI脱离式启动Redis/ZooKeeper/Served/Adapter/Frontend，含拓扑排序、依赖就绪等待、健康检查（404即存活）、致命日志扫描、可选Maven编译。支持多银行profile切换与机器路径local覆盖，泛化适配不同业务场景。"
whenToUse: "需要启动BEMP项目开发环境（Redis、ZooKeeper、Served后端、Adapter适配器、前端开发服务器），执行测试用例/功能验证/回归测试前拉起服务，或查询BEMP服务状态时调用。Windows + PowerShell 5.1 环境优先使用。"
triggers:
    - "启动/快速启动/重启/检查 环境/Redis/ZooKeeper/Served/SpringBoot/Adapter/适配器/前端/服务/所有服务"
    - "查询服务状态"
    - "编译并启动 BEMP 服务"
    - "切换银行 profile 启动"
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

# BEMP 开发环境启动 Skill

配置驱动、零硬编码、WMI 脱离式启动 BEMP 全套开发服务。**所有参数（路径/端口/模块/MainClass/JVM/编译）均来自配置文件，脚本不含任何字面绝对路径或端口数字**，可泛化到不同银行与不同机器。

## 核心脚本（双通道）

`scripts/start-bemp-env.ps1` —— **工作区门禁指定通道**（流程规则强制：PreCheck 通过后必须走本脚本）。三层占位符解析（`${local:}` → `${ENV:}` → 字面量）+ profile 合并注入，IDE/外部终端双模式 + 实时流式日志。启动一个服务占一个终端。

`scripts/start-bemp.ps1` —— WMI 脱离式批量启动器（拓扑排序 + 依赖等待 + 健康检查一条龙），适合一次性拉起全套服务，无需逐个开终端。

## 服务列表（默认值，可经 profile 覆盖）

| 服务 | type | 默认端口 | -Service 参数 | 依赖 |
|------|------|---------|---------------|------|
| Redis | redis | 6379 | `redis` | 无 |
| ZooKeeper | zookeeper | **21811** | `zookeeper` | 无 |
| Served | springboot | 8010 | `served` | redis, zookeeper |
| Adapter | springboot | 8090 | `adapter` | redis, zookeeper |
| Frontend | frontend | 8091 | `frontend` | 无（需 Node.js 14） |

> ⚠️ ZK 端口为 **21811**（非默认 2181）：因当前银行工程（ext-hnnxbank）的 `application.properties` 中 `app.registry.address=127.0.0.1:21811`，注册中心端口必须一致，否则 dubbo `ConnectionLoss`。端口在 config.json services 段按服务配置，切换银行时同步核对目标银行注册中心端口。

## 配置文件（单一事实来源）

| 文件 | 作用 | 是否含机器路径 |
|------|------|---------------|
| `config/config.json` | 业务参数：服务定义、type、端口、依赖、JVM、编译模块、健康检查、启动方式、profile 列表 | 否（路径用 `${ENV:...}` 引用 _shared） |
| `_shared/env-config.json` | **全技能库唯一配置入口**：机器路径（BEMP_WORKSPACE_ROOT/JAVA_HOME/NODE_PATH/MAVEN_*/REDIS_*/ZOOKEEPER_EXE）+ 银行参数（BANK_CODE/BANK_*）+ 数据库连接（ORACLE_*/MYSQL_*）。换电脑/银行/配置只改此文件 | 是（集中承载） |
| `config/health-check.json` | 健康检查默认值、byType、启动分组、`services` 级覆盖、诊断关键字 | 否 |

**占位符语法**（两套方言，按脚本通道区分）：
- `start-bemp-env.ps1`：`${ENV:VAR}` → 环境变量，fallback `_shared/env-config.json` 的 `environmentDefaults`（唯一入口）。解析失败**硬失败**，防止未解析串流入 `Test-Path` 产生误导诊断。递归解析时跳过 `_doc` 文档字段。
- `start-bemp.ps1`：`${ENV:VAR}`（scope 大小写不敏感，fallback `_shared/env-config.json` 的 `environmentDefaults`）、`${local:x.y}`、`${global.x}`/`${profiles.x.y}`，最多 6 轮递归防环；`defaultProfile` 与 global 路径解析失败**硬失败 exit 2**，避免残留字面量流入 `Test-Path` 产生误导诊断。

**profile 合并机制**（`start-bemp-env.ps1`）：启动时按 `-ProfileName` > `defaultProfile`（=${ENV:BANK_CODE}）激活 profile，`Merge-ProfileIntoServices` 将 `profiles.<active>` 下各服务节点的业务参数（modulePath/mainClass/jvmOptions/startCommand 等）注入 `services` 同名服务（别名映射 module→modulePath、warDir→warFile、nodeMemoryLimitMb→nodeMemoryLimit）。**services 只保留编排属性（type/port/dependencies/healthCheck）与银行无关参数，不得内联业务参数**——profile 是业务参数唯一来源，防止换银行时被残留值覆盖。

**泛化规则**：
- 新增银行 = 在 `config.json` 的 `profiles` 下加一个 profile（key=BANK_CODE；模块名用 `${ENV:BANK_MODULE_PREFIX}` 派生），脚本零改动。
- 新增机器/换电脑 = 只改 `_shared/env-config.json` 的 `environmentDefaults`（机器路径），脚本零改动。
- 新增服务 = `services` 加编排条目 +（如属银行业务）profile 加对应节点，脚本零改动。

## 启动流程（固定链路）

```
前置确认 → (按需 -Compile) → 基础设施层(redis,zookeeper 并行) → 依赖就绪等待
        → 应用层(served,adapter,frontend) → 健康检查(端口+HTTP+日志) → 汇总 _launch_summary_<ts>.txt
```

- **拓扑排序**：按 `dependencies` 生成启动顺序（DFS 后序），基础设施必先于应用层。
- **端口跳过 / 强制重启**：端口已 `Listen` 且非 `-ForceRestart` → SKIP；`-ForceRestart` → 杀占用进程后重拉。
- **依赖就绪等待**：应用层启动前 `Wait-Port` 等 Redis+ZK 端口就绪，避免 dubbo 注册失败。
- **健康探活**：端口 `Listen` + HTTP 探活（**`/` 返回 404 即视为存活**，BEMP API 无根路由，`expectedStatus=[200,404]`）+ 致命日志关键字扫描（`ClassNotFoundException`/`APPLICATION FAILED TO START`/`javax.servlet.Filter` 等）。
- **进程新鲜度核验（P17）**：本轮存在代码变更（编译/修复）时，重启完成后必须在启动报告中报告"新进程启动时间 vs 本次编译/产物时间"——进程启动时间早于产物时间=加载旧代码（健康检查全绿也无法发现），由测试侧 runtime-code-version-check 复核；详见 docs/troubleshooting.md §10.6。
- **WMI 脱离式启动**：`Win32_Process.Create` 使服务进程脱离启动会话存活（规避 PS5.1 `Start-Process` 的 `Path/PATH` 环境块冲突与回合结束被杀）；用 `.cmd` wrapper 内部 `>> log 2>&1` 重定向绕开 cmd 引号坑。脱离存活判定与日志目录约定见下文《脱离式启动（detached）》。

## 命令模板

```powershell
# ── 通道一：start-bemp-env.ps1（门禁指定，外部终端实时日志） ──
.\start-bemp-env.ps1 -Status                          # 只查状态
.\start-bemp-env.ps1 -Service redis -ExternalTerminal # 外部终端启动单服务
.\start-bemp-env.ps1 -Service served -ExternalTerminal -WaitForDeps
.\start-bemp-env.ps1 -Service served -ForceRestart    # IDE 终端前台重启
.\start-bemp-env.ps1 -Service served -Follow -Tail 100  # 跟随已运行服务日志
.\start-bemp-env.ps1 -Service redis -ExternalTerminal   # profile 缺省取 defaultProfile=${ENV:BANK_CODE}（_shared/env-config.json environmentDefaults），单点切换
.\start-bemp-env.ps1 -ProfileName ${BANK_CODE} -Service redis -ExternalTerminal   # 显式指定银行（值为 BANK_CODE，如 hnnxbank）

# ── 通道二：start-bemp.ps1（WMI 批量，一条命令拉全套） ──
# 启动全部（默认 profile = config.json 的 defaultProfile）
.\start-bemp.ps1

# 指定 profile（多银行切换；值为 BANK_CODE，缺省同 defaultProfile=${ENV:BANK_CODE}）
.\start-bemp.ps1 -Profile ${BANK_CODE}

# 启动子集（逗号分隔，自动拓扑排序）
.\start-bemp.ps1 -Service "redis,zookeeper"
.\start-bemp.ps1 -Service served,adapter -ForceRestart

# 启动前先编译受影响模块（Maven -pl 精准构建，绕过离线增量判定）
.\start-bemp.ps1 -Compile
.\start-bemp.ps1 -Service served,adapter -Compile -ForceRestart

# 仅查看状态，不启动
.\start-bemp.ps1 -Status

# 自定义配置文件位置
.\start-bemp.ps1 -ConfigPath "..\config\config.json"
```

## 参数说明

| 参数 | 作用 |
|------|------|
| `-Profile <name>` | 指定银行 profile（默认取 `config.json` 的 `defaultProfile`=${ENV:BANK_CODE}） |
| `-Service <a,b,c>` | 仅启动指定服务（逗号分隔），自动拓扑排序；省略则启动全部 enabled 服务 |
| `-Compile` | 启动前用 Maven 精准编译各服务的 `compileModules`（绕开离线增量静默跳过问题） |
| `-SkipCompile` | 强制跳过编译（即使 `compile.enabled=true`） |
| `-ForceRestart` | 端口已占用时先杀占用进程再重拉；否则跳过 |
| `-Status` | 只读报告各服务 UP/DOWN 与 HTTP 状态码，不启动任何服务 |
| `-ConfigPath <path>` | 覆盖 `config.json` 位置 |

## 关键设计原则（零硬编码 / 泛化）

1. **脚本不含字面路径或端口**：所有值经 `config.json` + `${ENV:...}` 占位符解析注入，真值统一在 `_shared/env-config.json`。
2. **类型分派启动器**：`Start-Wrapped` 统一 WMI detached + wrapper 重定向；按 `type` 调 redis / zookeeper / springboot / frontend / cmd。
3. **SpringBoot 统一 `java -cp` 启动**：`java -cp WEB-INF\classes;WEB-INF\lib\* <mainClass>`（修复 servlet 后 `WEB-INF/lib` 须含 `tomcat-embed-core-*.jar`）。
4. **Frontend**：`npm run dev` + `NODE_OPTIONS=--max_old_space_size=8192` + 注入 Node 14 到 PATH。
5. **PS5.1 坑规避**：脚本 ASCII 注释（防 GBK 解码乱码）；`Get-Content -Encoding UTF8`（防中文 JSON 乱码）；`$ProgressPreference='SilentlyContinue'`（消 `Invoke-WebRequest` 进度噪声）；`Get-ByPath` 兼容 hashtable 与 PSCustomObject；HTTP 探活对 4xx/5xx 从 `Exception.Response.StatusCode` 取码。

## 脱离式启动（detached）

长驻服务必须与发起启动的 shell 会话解耦，否则父会话结束（回合结束/终端关闭/会话中断）会连带杀死全部子服务。行为约定（模式由 `config.json` → `launch.launch_mode` 控制，`detached` 为默认值）：

- **父进程判据**：脱离式启动成功后，服务进程的父进程必须为 `WmiPrvSE`（WMI 提供程序宿主），与发起 shell 无父子关系；可用 `Get-CimInstance Win32_Process` 比对 `ParentProcessId` 验证。
- **存活双复验**：启动后按 `launch.double_check_intervals_sec` 配置的间隔序列执行两次**独立**端口复验，两次全通才判 detached 存活——仅第一次通过可能是端口释放竞态，不作数。间隔值一律读配置，不得写死。
- **禁止前台直跑**：禁止在会话内前台 RunCommand 直跑长驻进程——该方式进程随会话存亡，会话中断即服务全掉；仅 `launch_mode=attached`（临时诊断模式，会话结束进程退出）例外。
- **日志重定向**：启动输出重定向到 `launch.detached_log_dir` 指定目录下的按服务命名日志文件（目录真值走配置解析，默认引用 `logDir` 同源环境变量），诊断以日志文件为准，不依赖控制台回显。
- **PreCheck 失败处理（既有规则保持不变）**：PreCheck 失败 → 列失败项 + 修复建议，不跳过启动。

## 组件级 JAVA_HOME 覆盖（PreCheck）

系统默认 JDK 与某组件要求的 JDK 版本不一致时（实证：高版本 JDK 启动组件引发 dubbo `InaccessibleObjectException`，特征与解法登记于 docs/troubleshooting.md §10.7），按 `config.json` → `global.java_home_override` 做组件级覆盖：

- 配置结构：key=服务名，值=`${ENV:VAR}` 占位符（真值在 `_shared/env-config.json`）；未列出的组件沿用 `global.javaHome`。
- **PreCheck 新增校验项**：组件级 JAVA_HOME 与配置一致——实际解析出的 JAVA_HOME 与 `global.java_home_override.<服务名>`（未配置时为 `global.javaHome`）比对，不一致即 PreCheck FAIL，列失败项 + 修复建议，不跳过启动。
- 换机器/升级系统 JDK 后必须重跑 PreCheck，不得直接启动。

## 代码新鲜度三点核验（freshness_check）

`launch.freshness_check=on`（默认）时，每次启动/重启完成后执行三点核验，防止"健康检查全绿但跑的是旧代码"（与 P17 进程新鲜度核验同链，见 docs/troubleshooting.md §10.6）：

```
artifact_mtime < process_start_time   （产物先于进程启动 → 进程加载的是该产物）
artifact_mtime ≥ source_mtime         （产物不旧于源码 → 产物含最新修复）
```

- 任一不等式不成立 → 判定旧代码风险 → 走门禁通道重启目标服务 → 重启后复验。
- **跨提交等价性验证（可选）**：产物与源码分属不同提交时 mtime 比对可能失真，可改用 patch-id 等价性验证（对产物对应提交与最新源码提交做补丁等价比对，等价即视为新鲜）。
- **重启拓扑连带行为**：`-ForceRestart` 重启某服务时会按 `dependencies` 拓扑**连带重启其依赖**（实证：对应用层服务执行 -ForceRestart 连带重启了 redis/zookeeper）。规避：①依赖已健康且无需变更时，先 `-Status` 确认再决策，避免误连带；②确需连带重启时，依赖就绪等待与复验机制自动兜底，接受额外等待；③连带重启完成后必须重跑三点核验。

## 适用与不适用场景

✅ 适用：
- 需要在长会话工具链中拉起多个相互依赖的长驻服务，且服务必须脱离发起会话存活（会话中断不拖垮服务）
- 运行环境为 Windows PowerShell 5.x，缺乏可靠的 `Start-Process` 环境块隔离
- 服务可用 `java -cp`（外置/内嵌容器）或 npm dev 命令直接拉起，参数可完全配置化表达
- 同一套编排需在多套业务 profile / 多台机器间切换，要求路径与端口零脚本硬编码
- 组件间 JDK 版本要求不一致，需按组件覆盖运行时（`java_home_override`）

❌ 不适用：
- 容器化/k8s 编排（应使用 Compose/Deployment 及其探针体系）
- 需要崩溃后自动拉起的看门狗语义（应使用 supervisor/RestartPolicy 类机制）
- 非 Windows 且无 WMI 的环境（应使用 systemd/nohup 等会话脱离原语）
- 需 stdin 交互的服务、强一致跨服务分布式事务、超大规模服务编排
- 要求"启动后零等待即刻可用"的场景——本技能的存活判定含双间隔复验与新鲜度核验，调用方需接受复验等待

## 详细文档（渐进式披露）

| 文档 | 内容 | 何时查阅 |
|------|------|---------|
| [docs/RETROSPECTIVE.md](./docs/RETROSPECTIVE.md) | **四维度复盘**：成功步骤 / 失败点 / 可抽象流程与判断逻辑 / 适用与不适用场景 | 理解设计动机、排查同类问题、做泛化改造时 |
| [OPERATIONS.md](./OPERATIONS.md) | 前置环境检查、两阶段并行启动、健康检查配置、诊断流程、日志文件、Node.js 版本控制、故障排查 | 需要了解运维细节、排查启动问题 |
| [COMPILE-GUIDE.md](./COMPILE-GUIDE.md) | 编译前置检查、编译后自动部署、增量编译模式、编译产物验证 | Java 代码修改后需要编译验证时 |
| [AGENT-GUIDE.md](./AGENT-GUIDE.md) | 推荐启动流程、IDE 终端模式注意事项、常见错误及避免 | 智能体执行启动操作前 |
| [README.md](./README.md) | 技能总览 | 首次了解技能时 |
