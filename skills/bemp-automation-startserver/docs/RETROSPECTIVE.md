# BEMP 服务启动完整过程复盘

> 来源：BEMP 5.0 开发环境（河南农信 hnnxxbank）全套服务启动实战。
> 适用技能：`bemp-automation-startserver`（核心脚本 `scripts/start-bemp.ps1`，配置驱动、零硬编码、WMI 脱离式启动）。
> 本文档是技能知识库的一部分，沉淀「可复用的流程 + 判断逻辑」，避免重复踩坑。

---

## 维度〇：双配置体系并存根因分析（为何曾有 globalPaths 与硬编码）

> 复盘问题：`config.json` 的 global 配置明明可在 `_shared/env-config.json` 中获取，为何历史上还要添加 `globalPaths` 节点和大量硬编码值？

### 根因（三层）

1. **占位符方言不匹配（直接原因）**
   `_shared/Resolve-EnvConfig.ps1` 的解析器只认 `${ENV:VAR}` 语法；而 config.json 需要引用「本机绝对路径」（redis exe、ZK home、JDK 等），当时没有 local 机器层机制。
   占位符写进去也无法解析 → 只能把真实路径**内联**成字面量 → config.json 出现"占位符示例 + 硬编码真实值"的第二事实来源。`globalPaths` 就是这一妥协的产物。

2. **职责未分层（结构原因）**
   服务编排属性（type/port/dependencies/healthCheck，与银行无关）和银行业务参数（modulePath/mainClass/JVM/redis 路径）混在 `services` 一层。
   换银行或换机器都要改 config.json 多处内联值，无法做到"脚本零改动"。

3. **派生值被内联固化（漂移原因）**
   `banksProjectPath` 等可由 `workspaceRoot + banksDirName` 派生，却被固化为独立节点；派生关系一旦变化（如 banks 目录改名）就产生配置漂移。

### 修复决策（v2 优化，2026-08-29 落地）

| 决策 | 内容 | 消除的问题 |
|------|------|-----------|
| 新增机器层 | `config/local.json`（可 gitignore）+ `${local:dotted.path}` 占位符，本脚本补齐解析，`_shared` 只认 `${ENV:}` 的边界不动 | 根因 1：机器路径有了正确归宿，无需内联 |
| 废除 globalPaths | 路径统一由 `config.global`（`${local:}` 引用）+ `Get-GlobalPaths` 派生：`mavenHome`→`bin\mvn.cmd`，`nodePath` 归一化为 exe | 根因 3：派生关系收拢到代码单点 |
| services 减负 | 只保留编排属性与银行无关参数；银行业务参数进 `profiles`，启动时 `Merge-ProfileIntoServices` 按名注入（含别名映射 module→modulePath、warDir→warFile、nodeMemoryLimitMb→nodeMemoryLimit） | 根因 2：换银行 = 改 profile，services 无残留值可覆盖 |

**解析优先级**：`${local:x.y}`（local.json，机器层）→ `${ENV:VAR}`（环境变量，fallback 至 `_shared/env-config.json` 的 `environmentDefaults`）→ 字面量。

### 实机验证记录（2026-08-29）

- Redis 单服务 `-ForceRestart -ExternalTerminal` 重拉成功：`${ENV:REDIS_EXE}` 解析、profile 激活、外部终端进程隔离均正常。
- 全量 `-Status` 与完整启动流程幂等重跑：`[OK] Active profile: hnnxxbank`，5 服务全 UP，已运行服务正确 SKIP。

---

## 维度一：成功执行任务的完整步骤

一次完整的「BEMP 全套服务启动」链路（已验证全绿）：

1. **前置确认（Preflight）**
   - 确认本机工具链可用：Java 8（`java -version`）、Node.js 14、Maven、`redis-server`/`redis-cli`、ZooKeeper 目录。
   - 确认工作区根目录与各服务 `target` 产物存在。
   - 确认关键端口未被意外占用（Redis 6379 / ZK 21811 / Served 8010 / Adapter 8090 / Frontend 8091）。

2. **编译（Compile，按需）**
   - 当源码或 `pom.xml` 有变更（如修复 `javax.servlet.Filter` 缺失）时，用 Maven 精准编译受影响模块：
     `mvn install -DskipTests -am -pl hnnxbank-served-deploy,hnnxbank-adapter-deploy`。
   - 编出 `target/bemp-served`、`target/bemp-adapter`（含 `WEB-INF/lib/*`）。

3. **基础设施层启动（Infrastructure）**
   - Redis（6379）：`redis-server --dir <dataDir>`，启动后执行 `CONFIG SET stop-writes-on-bgsave-error no` 等 postStart。
   - ZooKeeper（**21811**，非默认 2181）：`zkServer.cmd`，等待端口监听（默认 readinessWaitSec=45）。

4. **依赖就绪等待（Dependency Readiness）**
   - SpringBoot 应用（Served/Adapter）在启动前必须等待 Redis + ZK 端口已 `Listen`，否则 dubbo 注册中心连接直接 `ConnectionLoss`。

5. **应用层启动（Application）**
   - Served（8010）/ Adapter（8090）走 **外置/内嵌 Tomcat 统一 `java -cp` 启动**：
     `java -cp WEB-INF\classes;WEB-INF\lib\* com.hundsun.bemp.BempServedAppStarter`
     （关键：修复 servlet 后 `WEB-INF/lib` 必须含 `tomcat-embed-core-9.0.70.jar`，否则 `NoClassDefFoundError: javax.servlet.Filter`）。
   - Frontend（8091）：`npm run dev`（webpack-dev-server），需 Node 14 + `--max_old_space_size=8192`。

6. **健康检查（Health Check）**
   - 端口监听（`Get-NetTCPConnection -State Listen`）。
   - HTTP 探活：`/` 返回 **404 即视为存活**（BEMP API 无根路由），所以 `expectedStatus=[200,404]`。
   - 致命日志关键字扫描：`ClassNotFoundException` / `APPLICATION FAILED TO START` / `BUILD FAILED` / `javax.servlet.Filter`。

**成功判据**：5 个服务全部 `UP`、日志零报错、健康检查全绿。

---

## 维度二：任务执行过程中的不确定性与失败点

| # | 失败点 | 现象 | 根因 | 处理 |
|---|--------|------|------|------|
| F1 | 增量构建静默跳过 | 改了 pom 却「0 synced」、未重编 | `bemp-git-maven-automation` 增量模式因 `banks` 仓库离线 `git pull` 失败 → 判定「无源码变更」→ 跳过；整 reactor 后台构建在回合结束被回收 | 改用 `-pl` 精准模块构建绕过增量判定 |
| F2 | 整 reactor 后台构建被杀 | 后台 `mvn install` 进程消失 | 启动 supervisor 的回合结束，孤儿进程被回收 | 前台等待构建完成，或拆成精准 `-pl` 模块构建 |
| F3 | `Path`/`PATH` 环境块冲突 | `Start-Process` 报「已添加项。字典中的关键字:"Path"所添加的关键字:"PATH"」 | PS5.1 `Start-Process -Environment` 同时写 `Path` 与 `PATH` 键冲突 | 改用 **WMI `Win32_Process.Create` 脱离式启动**，进程归属 WmiPrvSE，脱离启动会话存活 |
| F4 | ZK 端口错配 | dubbo `ConnectionLoss`、应用起不来 | `application.properties` 的 `app.registry.address=127.0.0.1:21811`，但本机 ZK 跑在 2181 | 将 `zoo.cfg` 的 `clientPort` 改为 **21811**（配置/POM 与注册中心必须一致） |
| F5 | supervisor 无限循环被杀 | 看门狗反复拉起服务、终被回收 | 启动逻辑写成「永远重启」的死循环 | 改为一次性启动器 + 端口跳过逻辑，不做崩溃自拉起 |
| F6 | frontend「超时」实为已编译 | 等了很久仍报超时，其实已在跑 | 误用「进程退出」判存活；前端是长期进程，不会退出 | 改以**端口监听**判存活，超时只是等待策略问题 |
| F7 | servlet 缺失 | `NoClassDefFoundError: javax.servlet.Filter` | `pom.xml` 排除了 `spring-boot-starter-tomcat`（servlet API 丢失） | 注释掉该 exclusion 并重编译，使 `WEB-INF/lib` 含 `tomcat-embed-core-9.0.70.jar` |
| F8 | `_doc` 文档字段被误解析 | `_doc` 中的 `${local:...}` 示例文本被当作真占位符解析报错 | `Resolve-ConfigFull` 未区分文档性字段 | 解析时跳过 `_doc` 属性原样保留 |
| F9 | ZK 环境变量硬编码在脚本 | `JAVA_TOOL_OPTIONS` 固定值写在编排代码里 | 编排层内联了本属 profile 的业务值 | `env` 由 `profile.zookeeper.env` 注入，缺省回退 UTF-8 编码 |
| F10 | `nodePath` 语义二义 | local 层有时存目录有时存 exe，`Test-Path`/`Join-Path` 行为不一致 | 机器层字段语义未约定 | `Get-GlobalPaths` 归一化：目录则追加 `node.exe` |
| F11 | profile 修改被 services 残留值覆盖 | 改了 profile 却不生效，排查困难 | services 仍内联同名业务参数，注入顺序含糊 | services 清空业务参数，profile 注入成为唯一来源 |
| F12 | 占位符解析失败静默流入下游 | 未解析串被当作路径做 `Test-Path`，产生误导性诊断 | 解析失败只告警不阻断 | 解析失败硬失败（Write-Error + 返回 null），宁可启动报错 |

**共性规律**：失败多来自「环境/配置错配」与「PowerShell 5.1 原生限制」，而非业务逻辑。

---

## 维度三：可抽象的固定流程与判断逻辑

### 固定流程（拓扑排序 + 分层启动）
```
前置确认 → (按需编译) → 基础设施层(redis,zookeeper 并行) → 依赖就绪等待
        → 应用层(served,adapter,frontend) → 健康检查(端口+HTTP+日志) → 汇总
```
- **拓扑排序**：按 `dependencies` 生成启动顺序（DFS 后序），保证基础设施先于应用层。
- **启动方式分派**：`type` ∈ {redis, zookeeper, springboot, frontend, cmd}，各类型独立启动逻辑。

### 关键判断逻辑（写成可复用的 if/else）
1. **端口跳过 / 强制重启**
   - `if (Test-PortListening(port))`：
     - 非 `-ForceRestart` → **SKIP**（不重复拉起）。
     - `-ForceRestart` → `Stop-PortOwner(port)` 杀占用进程 → 等待 → 重新拉起。
2. **依赖就绪等待**
   - 应用层启动前 `Wait-Port(infraPort, readinessWaitSec)`，端口未监听则阻塞等待，避免 dubbo 注册失败。
3. **健康探活**
   - 端口必须 `Listen`；HTTP 探活时 **404 合法**（`expectedStatus` 含 404 即 OK），避免把「无根路由」误判为宕机。
   - 致命日志关键字命中 → 标记 FAIL 并提示根因。
4. **编译必要性判断**
   - `-Compile` 显式触发；或 `compile.enabled=true` 且非 `-SkipCompile`；否则 `skipIfBuilt` 跳过（产物已存在则不重编）。
5. **零硬编码（核心设计原则）**
   - 所有路径/端口/模块名/MainClass/JVM 参数全部来自 `config.json`（含 `profiles`）+ `local.json`（机器相关，可 gitignore）。
   - 占位符解析：`${local:x.y}`（本机路径）、`${env:VAR}`、`${global.x}`、`${profiles.x.y}`。
   - 脚本体**不含任何字面绝对路径或端口数字**。
5a. **三层占位符解析（start-bemp-env.ps1 通道）**
   - 优先级：`${local:x.y}`（config/local.json 机器层）→ `${ENV:VAR}`（环境变量，fallback `_shared/env-config.json` 的 environmentDefaults）→ 字面量。
   - `Resolve-ConfigFull` 递归解析对象/数组/字符串，跳过 `_doc` 文档字段（其中的占位符写法只是示例）。
   - `${local:}` 解析失败 → **硬失败**，绝不让未解析串流入 `Test-Path` 产生误导诊断（对应 F12）。
5b. **profile 合并（银行业务参数注入）**
   - 激活顺序：`-ProfileName` 参数 > `config.defaultProfile`。
   - `Merge-ProfileIntoServices`：遍历 `profiles.<active>` 下每个服务节点（跳过 `_doc`），按别名映射（module→modulePath、warDir→warFile、nodeMemoryLimitMb→nodeMemoryLimit）或同名注入 `services.<同名服务>`；已存在字段覆盖，不存在字段 Add-Member。
   - profile 服务在 services 中无对应条目 → Warning 跳过（不中止）；services 不内联业务参数 → profile 是唯一业务参数来源（对应 F11）。
6. **WMI 脱离式启动**
   - `Win32_Process.Create` 使服务进程脱离启动会话存活（规避 PS5.1 `Start-Process` 的 `Path/PATH` 冲突与回合结束被杀）。
   - 用 `.cmd` wrapper 内部 `>> log 2>&1` 重定向，绕开 cmd 引号重定向坑。

---

## 维度四：适用场景与不适用场景

### 适用（Use This）
- ✅ **BEMP 多银行切换**：通过 `config.json` 的 `profiles` 切换 hnnxxbank / 其他行，无需改脚本。
- ✅ **服务需脱离启动进程存活**：本机无系统级 supervisor，靠 WMI detached 让服务在会话结束后仍运行。
- ✅ **Windows + PowerShell 5.1 环境**：规避 `Start-Process` 的 `Path/PATH` 环境块冲突。
- ✅ **外置/内嵌 Tomcat 的 `java -cp` 启动**：统一 `java -cp WEB-INF/classes;WEB-INF/lib/* MainClass` 拉起 SpringBoot war 产物。
- ✅ **开发环境可复现启动**：编译→基础设施→依赖等待→应用→健康检查一条龙，适合执行用例/回归前快速拉起。

### 不适用（Do NOT Use This）
- ❌ **容器化 / Kubernetes**：应使用 Docker Compose / k8s Deployment / Helm，而非本机 WMI 拉起。
- ❌ **需要崩溃自拉起看门狗**：本技能是「一次性启动器」，不提供进程退出后自动重启（那是 supervisor/cron/RestartPolicy 的职责）。
- ❌ **非 Windows 且无 WMI**：Linux/macOS 应使用 `systemd` / `nohup` / `&` 后台，本脚本的 WMI 分支不可移植。
- ❌ **强一致跨服务事务编排**：启动器不保证业务层一致性，仅保证进程与端口就绪。
- ❌ **超大规模服务编排**：数十+ 服务、跨主机调度应使用 k8s / 服务网格，而非单机脚本。
- ❌ **需要 stdin / 交互式输入的服务**：WMI detached + 文件重定向模式不支持交互。

---

## 沉淀为技能的设计要点（落到 `start-bemp.ps1`）

1. **单一事实来源**：`config.json` 管业务参数（模块/端口/依赖/JVM/编译），`local.json` 管机器路径（可 gitignore），`health-check.json` 管探活策略。
2. **占位符解析器**：`Get-ByPath` + `Resolve-Value`/`Resolve-Object` 递归解析 `${...}`，6 层上限防环。
3. **类型分派启动器**：`Start-Wrapped` 统一 WMI detached + wrapper 重定向；按 `type` 调 redis/zk/springboot/frontend/cmd。
4. **健壮探活**：端口 + HTTP（404 合法）+ 致命日志扫描；`Invoke-WebRequest` 对 4xx/5xx 需从 `Exception.Response.StatusCode` 取码。
5. **PS5.1 坑规避**：脚本 ASCII 注释（防 GBK 解码乱码）；`Get-Content -Encoding UTF8`（防中文 JSON 乱码）；`$ProgressPreference='SilentlyContinue'`（消 `Invoke-WebRequest` 进度噪声）；`Get-ByPath` 同时兼容 hashtable 与 PSCustomObject。
6. **泛化自检**：任何新增银行 = 在 `config.json` 加一个 `profile`；任何新增机器 = 改 `local.json`；脚本体零改动。
