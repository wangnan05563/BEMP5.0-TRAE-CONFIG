---
name: "bemp-automation-startserver"
description: "BEMP项目开发环境启动Skill，支持IDE终端和外部PowerShell终端两种模式，统一服务生命周期管理，含依赖等待、健康检查、自动诊断、日志并行输出、两阶段并行启动"
whenToUse: "需要启动BEMP项目开发环境，包括Redis、ZooKeeper、Served后端、Adapter适配器及前端开发服务器，执行测试用例、功能验证、回归测试前启动服务时，查询BEMP服务状态时调用"
triggers:
    - "启动/快速启动/重启/检查 环境/Redis/ZooKeeper/Served/SpringBoot/Adapter/适配器/前端/服务/所有服务"
    - "查询服务状态"
    - "外部终端启动"
---

# BEMP 开发环境启动 Skill

支持 IDE 终端和外部 PowerShell 终端两种模式启动 BEMP 项目所需服务，统一服务生命周期管理。

## 服务列表

| 服务 | 类型 | 端口 | -Service 参数 | 依赖 |
|------|------|------|---------------|------|
| Redis | redis | 6379 | `redis` | 无 |
| ZooKeeper | zookeeper | 2181 | `zookeeper` | 无 |
| Served | springboot | 8010 | `served` | redis, zookeeper |
| Adapter | springboot | 8090 | `adapter` | redis, zookeeper |
| Frontend | frontend | 8091 | `frontend` | 无 |

## 核心规则

1. **外部终端优先**：使用 `-ExternalTerminal` 在独立PowerShell窗口启动服务，释放IDE终端用于诊断
2. **终端隔离**：IDE模式下每个服务独占终端，严禁复用运行中服务的终端
3. **依赖等待**：使用 `-WaitForDeps` 让SpringBoot服务自动等待基础设施就绪
4. **启动前检测**：启动前自动检测端口，已运行则跳过（除非 -ForceRestart）
5. **重启即强制**："重启"等价于 `-ForceRestart`
6. **两阶段启动**：多服务逗号分隔时，先全部启动进程，再统一并行健康检查

## 启动模式

### 模式A：外部PowerShell终端（推荐，解决终端数量限制）

服务在独立PowerShell窗口运行，终端实时显示服务日志，IDE终端完全空闲：

```powershell
.\start-bemp-env.ps1 -Service redis -ExternalTerminal
.\start-bemp-env.ps1 -Service zookeeper -ExternalTerminal
.\start-bemp-env.ps1 -Service served -QuickStart -ExternalTerminal -WaitForDeps
.\start-bemp-env.ps1 -Service adapter -QuickStart -ExternalTerminal -WaitForDeps
.\start-bemp-env.ps1 -Service frontend -QuickStart -ExternalTerminal
```

或一次性启动（两阶段：先启进程，再并行等健康检查）：

```powershell
.\start-bemp-env.ps1 -Service "redis,zookeeper" -ExternalTerminal
.\start-bemp-env.ps1 -Service "served,adapter,frontend" -QuickStart -ExternalTerminal -WaitForDeps
```

优势：
- 不受IDE终端数量（5个）限制
- IDE终端完全空闲，可随时执行 `-Status` 诊断
- PowerShell原生支持Tee-Object，终端实时显示服务日志
- 自动健康检查和诊断（启动日志+应用日志双扫描）
- 外部窗口独立运行，IDE断连不影响服务
- 多服务并行健康检查，不叠加等待时间

### 模式B：IDE终端（传统模式）

服务在IDE终端前台运行，每个终端被独占：

```powershell
# 每个服务需独立终端：target_terminal: "new", blocking: false
.\start-bemp-env.ps1 -Service redis
.\start-bemp-env.ps1 -Service zookeeper
.\start-bemp-env.ps1 -Service served -QuickStart
.\start-bemp-env.ps1 -Service adapter -QuickStart
.\start-bemp-env.ps1 -Service frontend -QuickStart
```

## 启动分组与依赖关系

```
┌─ 基础设施层（并行启动，无依赖） ────────┐
│  Redis (6379)      type: redis           │
│  ZooKeeper (2181)  type: zookeeper       │
└──────────────────────────────────────────┘
         ↓ (-WaitForDeps 自动等待)
┌─ 应用层（可并行，依赖基础设施就绪） ────┐
│  Served (8010)     type: springboot      │
│  Adapter (8090)    type: springboot      │
│  Frontend (8091)   type: frontend        │
└──────────────────────────────────────────┘
```

分组编排可通过 `config/health-check.json` 的 `startupGroups` 配置。

## 命令模板

脚本路径：`d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\start-bemp-env.ps1`

```powershell
# 启动服务
.\start-bemp-env.ps1 -Service <redis|zookeeper|served|adapter|frontend>

# 外部终端启动（推荐）
.\start-bemp-env.ps1 -Service <name> -ExternalTerminal

# 快速启动 + 依赖等待 + 外部终端（日常推荐组合）
.\start-bemp-env.ps1 -Service served -QuickStart -ExternalTerminal -WaitForDeps

# 逗号分隔多服务启动（两阶段并行健康检查）
.\start-bemp-env.ps1 -Service "redis,zookeeper" -ExternalTerminal

# 查看状态
.\start-bemp-env.ps1 -Status

# 强制重启
.\start-bemp-env.ps1 -Service <name> -ForceRestart -ExternalTerminal
```

## 参数说明

| 参数 | 适用服务 | 作用 |
|------|---------|------|
| `-Service` | 全部 | 指定要启动的服务，支持逗号分隔多服务 |
| `-Status` | 全部 | 查看所有服务运行状态 |
| `-QuickStart` | springboot, frontend | 跳过编译/依赖检查，直接启动 |
| `-ForceRestart` | 全部 | 强制停止占用端口的进程后重启 |
| `-AutoRestart` | 全部 | 智能模式：运行中则停止后重启，未运行则正常启动 |
| `-ExternalTerminal` | 全部 | 在独立PowerShell窗口启动，释放IDE终端 |
| `-WaitForDeps` | springboot | 启动前自动等待依赖服务端口就绪 |
| `-LaunchMode` | springboot | 覆盖配置的launchMode（terminal/debug） |

## 两阶段并行启动（多服务逗号分隔时）

逗号分隔启动多服务时，脚本自动分两阶段执行：

**阶段1**：循环启动所有服务进程（仅Start-Process，不等待就绪）
**阶段2**：统一轮询所有服务端口，并行等待就绪

```
[INFO] Phase 2: Health check for 3 service(s)...
  [WAIT] Waiting for: Served:8010, Adapter:8090, Frontend:8091 (0/600s)
  [WAIT] Waiting for: Served:8010, Adapter:8090, Frontend:8091 (30/600s)
[OK]   Adapter is ready (port 8090)
[OK]   Frontend is ready (port 8091)
  [WAIT] Waiting for: Served:8010 (60/600s)
[OK]   Served is ready (port 8010)
```

优势：
- 多服务健康检查并行进行，总等待时间 = max(各服务超时)，而非 sum
- 快服务先就绪先输出，慢服务不阻塞其他服务
- 每个服务有独立的超时时间（个人超时后触发诊断）

## 启动后自动健康检查（外部终端模式）

使用 `-ExternalTerminal` 时，脚本启动服务后自动轮询端口等待就绪：

```
[INFO] Launching in external PowerShell: Served
[INFO] Log: scripts/../logs/Served_startup_20260717_093000.log
[INFO] Script: scripts/../logs/launcher_Served_20260717_093000.ps1
  [WAIT] Served port 8010 not ready... (0/600s)
  [WAIT] Served port 8010 not ready... (30/600s)
[OK]   Served is ready (port 8010)
```

超时后自动执行诊断（双日志扫描）：
- 检查依赖服务端口
- 扫描**启动日志**（控制台输出日志）
- 扫描**应用日志**（服务自身的log文件）
- 检测端口占用情况
- ZK Session过期时提示重启顺序

### 健康检查配置

路径：`config/health-check.json`

**四级优先级**：服务级配置 > byType类型默认 > defaults节 > 代码默认值

| 字段 | 说明 |
|------|------|
| `defaults.maxWaitSeconds` | 全局默认端口就绪最大等待时间（秒） |
| `defaults.pollIntervalSeconds` | 全局默认轮询间隔（秒） |
| `defaults.logCleanupHours` | 日志文件清理时间（小时） |
| `byType.{type}.maxWaitSeconds` | 按服务类型的默认超时 |
| `byType.{type}.pollIntervalSeconds` | 按服务类型的默认轮询间隔 |
| `services.{name}.maxWaitSeconds` | 服务级覆盖 |
| `services.{name}.depWaitSeconds` | 服务级依赖等待覆盖 |

当前 byType 默认值：

| 类型 | maxWaitSeconds | pollIntervalSeconds |
|------|---------------|-------------------|
| redis | 30 | 5 |
| zookeeper | 60 | 10 |
| springboot | 600 | 30 |
| frontend | 600 | 30 |

### 启动分组编排（startupGroups）

`health-check.json` 中的 `startupGroups.groups` 定义了服务的分层启动策略：

| 字段 | 说明 |
|------|------|
| `name` | 分组名称 |
| `services` | 分组包含的服务列表 |
| `parallel` | 是否可并行启动 |
| `waitForDeps` | 是否等待依赖就绪 |
| `dependsOn` | 依赖的上游分组名称 |

### 诊断流程

```
Served/Adapter启动超时
  ├─ Redis未运行   → 提示先启动Redis
  ├─ ZK未运行      → 提示先启动ZK
  ├─ 启动日志含ERROR → 输出错误摘要
  ├─ 应用日志含SessionExpired → 提示重启ZK后再重启本服务
  └─ 无明显错误    → 输出端口占用信息
```

## 日志文件

启动日志自动写入 `scripts/../logs/` 目录：
- **启动日志**：`{ServiceName}_startup_{timestamp}.log` — 控制台输出
- **启动脚本**：`launcher_{ServiceName}_{timestamp}.ps1` — 外部终端启动脚本
- **自动清理**：超过 `logCleanupHours`（默认24小时）的日志和launcher脚本自动清理
- IDE模式：通过 Tee-Object 同时输出到终端和日志文件
- 外部模式：PowerShell窗口实时显示 + Tee-Object写入日志文件
- 诊断时扫描启动日志和应用日志双源

## 编译后自动部署

Java代码修改后三步生效：

```powershell
# 步骤1：增量编译
cd "{moduleDir}"
& "{javacPath}" -encoding UTF-8 -cp "{warClassesDir};{warLibDir}*" -d "{warClassesDir}" "{sourceFile}"

# 步骤2：跳过（当-d直接指向warClassesDir时）

# 步骤3：重启
.\start-bemp-env.ps1 -Service served -QuickStart -ForceRestart -ExternalTerminal
```

### 配置项

路径：`config/compile-deploy.json`

| 字段 | 说明 |
|------|------|
| `javacPath` | javac编译器路径 |
| `modules.{name}.sourceDir` | 模块Java源码根目录 |
| `modules.{name}.targetClassesDir` | 编译输出目录 |
| `modules.{name}.warClassesDir` | WAR包classes目录 |
| `modules.{name}.warLibDir` | WAR包lib目录 |

## 配置文件

| 配置文件 | 用途 |
|---------|------|
| `config/config.json` | 服务定义、类型、端口、依赖、JVM参数等 |
| `config/health-check.json` | 健康检查默认值、byType、startupGroups、服务级覆盖、诊断策略 |
| `config/compile-deploy.json` | Java编译后自动部署配置 |
| `_shared/env-config.json` | 全局环境变量默认值 |

## 智能体操作指南

### 推荐启动流程（外部PowerShell终端模式）

**第一步：状态检查**

```
RunCommand: cd "scripts" ; .\start-bemp-env.ps1 -Status
→ target_terminal: "new"（或复用空闲终端）, blocking: true
```

**第二步：分批启动（按startupGroups配置）**

```
# 基础设施层
RunCommand: -Service "redis,zookeeper" -ExternalTerminal → blocking: true

# 应用层（待基础设施就绪后）
RunCommand: -Service "served,adapter,frontend" -QuickStart -ExternalTerminal -WaitForDeps → blocking: true
```

**第三步：确认状态**

```
RunCommand: cd "scripts" ; .\start-bemp-env.ps1 -Status
→ target_terminal: 任意空闲终端, blocking: true
```

### IDE终端模式注意事项

| 操作 | 终端策略 | 原因 |
|------|---------|------|
| 启动服务 | `target_terminal: "new"` | 服务独占终端 |
| 检查状态 | `target_terminal: "new"` | 复用会杀死服务 |
| 查看日志 | `CheckCommandStatus` | 只读，安全 |

**致命错误**：在已运行服务的终端执行新命令会终止服务进程。

### 常见错误及避免

| 错误行为 | 后果 | 正确做法 |
|---------|------|---------|
| 不指定 `-ExternalTerminal` 且终端已满 | 无法启动更多服务 | 优先使用 `-ExternalTerminal` |
| 状态检查复用服务终端 | 杀死服务 | 始终用新终端或外部终端模式 |
| 不加 `-WaitForDeps` 直接启动Served | 基础设施未就绪导致启动失败 | 使用 `-WaitForDeps` |
| 多服务用同一终端 | 后启动杀死先启动 | 每服务独立终端 |

### 故障排查

| 场景 | 处理策略 |
|------|---------|
| 终端数量不足 | 使用 `-ExternalTerminal` 启动到PowerShell窗口 |
| 基础设施未就绪 | 使用 `-WaitForDeps`，或分层启动 |
| ZK Session过期 | 先重启ZK再重启Served/Adapter，顺序不可颠倒 |
| 日志有ERROR | 查看启动日志：`logs/{Service}_startup_*.log` 和应用日志 |
| 外部终端日志 | 查看PowerShell窗口或启动日志文件 |
| 端口冲突（进程占用） | 使用 `-ForceRestart` 强制重启 |
| 端口冲突（Windows保留） | 诊断自动检测 BindException+端口排除范围；需管理员执行 `netsh interface ipv4 set dynamicport tcp start=49152 num=16384` 后重启电脑 |
| 旧日志/launcher脚本堆积 | 自动清理 `logCleanupHours`（默认24小时）前的文件 |

### 复盘经验与陷阱

| 陷阱 | 后果 | 根因 | 防范 |
|------|------|------|------|
| JSON嵌套层级查找 | 配置值永远读不到，fallback到默认值 | `$HConfig.$ServiceKey` 未进入 `services` 嵌套节 | 使用 `$HConfig.services.$ServiceKey`，四级优先级链 |
| Spring Boot超时不足 | Served启动5-8分钟，120秒远不够 | 缺少byType默认值，新服务忘记配服务级超时 | byType.springboot.maxWaitSeconds=600 |
| 逗号分隔多服务健康检查叠加 | 总等待=sum(各服务超时)，可能超15分钟 | 健康检查顺序执行 | 两阶段启动：先启进程，再并行健康检查 |
| `$PID`只读变量冲突 | Stop-ServiceByPort报错 | PowerShell `$PID` 是只读自动变量 | 使用 `$procId` 替代 |
| `Get-NetTCPConnection`单对象Count | `Test-PortListening`始终返回False | 单对象`.Count`为`$null` | `@($conn).Count` 强制转数组 |
| Java参数中`;`和`=` | PowerShell解析为语句分隔符 | classpath含`;`，JVM参数含`=` | 使用`@cmdArgs`数组展开运算符 |
| ForceRestart后不检查健康 | 重启后不知道服务是否真的启动了 | 条件中排除ForceRestart | ForceRestart后也执行健康检查 |
