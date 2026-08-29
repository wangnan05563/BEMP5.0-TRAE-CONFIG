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
- `start-bemp.ps1`：`${local:x.y}`、`${env:VAR}`、`${global.x}`、`${profiles.x.y}`，6 层上限防环。

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
- **WMI 脱离式启动**：`Win32_Process.Create` 使服务进程脱离启动会话存活（规避 PS5.1 `Start-Process` 的 `Path/PATH` 环境块冲突与回合结束被杀）；用 `.cmd` wrapper 内部 `>> log 2>&1` 重定向绕开 cmd 引号坑。

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

## 适用 / 不适用

- ✅ 适用：BEMP 多银行切换、服务需脱离启动进程存活、Windows PS5.1（无可靠 `Start-Process` 环境块）、外置/内嵌 Tomcat 的 `java -cp` 启动、开发环境可复现拉起。
- ❌ 不适用：容器化/k8s（用 Docker Compose/Deployment）、需崩溃自拉起看门狗（用 supervisor/RestartPolicy）、非 Windows 无 WMI（用 systemd/nohup）、强一致跨服务事务、超大规模编排、需 stdin 交互的服务。

## 详细文档（渐进式披露）

| 文档 | 内容 | 何时查阅 |
|------|------|---------|
| [docs/RETROSPECTIVE.md](./docs/RETROSPECTIVE.md) | **四维度复盘**：成功步骤 / 失败点 / 可抽象流程与判断逻辑 / 适用与不适用场景 | 理解设计动机、排查同类问题、做泛化改造时 |
| [OPERATIONS.md](./OPERATIONS.md) | 前置环境检查、两阶段并行启动、健康检查配置、诊断流程、日志文件、Node.js 版本控制、故障排查 | 需要了解运维细节、排查启动问题 |
| [COMPILE-GUIDE.md](./COMPILE-GUIDE.md) | 编译前置检查、编译后自动部署、增量编译模式、编译产物验证 | Java 代码修改后需要编译验证时 |
| [AGENT-GUIDE.md](./AGENT-GUIDE.md) | 推荐启动流程、IDE 终端模式注意事项、常见错误及避免 | 智能体执行启动操作前 |
| [README.md](./README.md) | 技能总览 | 首次了解技能时 |
