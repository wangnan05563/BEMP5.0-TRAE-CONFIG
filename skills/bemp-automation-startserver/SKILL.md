---
name: "bemp-automation-startserver"
description: "BEMP项目开发环境启动Skill，用于在IDE终端中启动Redis、ZooKeeper、Served后端、Adapter适配器及前端开发服务器。所有服务进程以前台方式运行，日志直接显示在终端控制台"
whenToUse: "需要启动BEMP项目开发环境，包括Redis、ZooKeeper、Served后端、Adapter适配器及前端开发服务器，执行测试用例、功能验证、回归测试前启动服务时，查询BEMP服务状态时调用"
triggers: 
    - "启动/快速启动/重启/检查 环境/Redis/ZooKeeper/Served/SpringBoot/Adapter/适配器/前端/服务/所有服务"
    - "查询服务状态"
---

# BEMP 开发环境启动 Skill

在 IDE 终端中启动 BEMP 项目所需的 Redis、ZooKeeper、Served 后端、Adapter 适配器和前端开发服务器。

## 服务列表

| 服务 | 端口 | -Service 参数 |
|------|------|---------------|
| Redis | 6379 | `redis` |
| ZooKeeper | 2181 | `zookeeper` |
| Served | 8010 | `served` |
| Adapter | 8090 | `adapter` |
| Frontend | 8091 | `frontend` |

## 核心规则（必须遵守）

1. **每个服务必须在独立的 IDE 终端中启动**，服务运行后不要在该终端执行其他命令
2. **并行启动**：前端与后端无启动依赖，应同时启动以节省等待时间
3. **状态检查使用独立终端**
4. **启动前必须检测**：启动任何服务前，必须先检测该服务是否已在运行。若已运行且用户未要求重启，则跳过启动并报告状态
5. **重启即强制**：当用户要求"重启"或"重新启动"时，等价于 `-ForceRestart`，自动停止旧进程后重新启动

## 启动分组与依赖关系

```
┌─ 基础设施层（并行启动） ─────────────┐
│  终端1: Redis (6379)                   │
│  终端2: ZooKeeper (2181)               │
└────────────────────────────────────────┘
         ↓ (Served/Adapter 依赖 Redis + ZK 就绪)
┌─ 应用层（并行启动，无需等待彼此） ────┐
│  终端3: Served 后端 (8010)          │
│  终端4: Adapter 适配器 (8090)          │
│  终端5: Frontend 前端 (8091)           │
└────────────────────────────────────────┘
```

**依赖说明**：
- Redis 和 ZooKeeper 之间无依赖，可并行启动
- Served 依赖 Redis 和 ZooKeeper 就绪，需等待基础设施层启动完成
- Adapter 依赖 ZooKeeper 就绪（注册中心），需等待基础设施层启动完成
- Frontend 与后端无启动依赖，可与 Served/Adapter 并行启动

## 推荐启动方式

### 方式一：全量并行启动（推荐，节省约50%等待时间）

同时启动5个终端，基础设施层先就绪后应用层自动连接：

```powershell
# 终端1: Redis
.\start-bemp-env.ps1 -Service redis

# 终端2: ZooKeeper（与Redis同时启动）
.\start-bemp-env.ps1 -Service zookeeper

# 终端3: Served（Redis/ZK启动后立即启动）
.\start-bemp-env.ps1 -Service served -QuickStart

# 终端4: Adapter（与Served同时启动）
.\start-bemp-env.ps1 -Service adapter -QuickStart

# 终端5: Frontend（与Served同时启动）
.\start-bemp-env.ps1 -Service frontend -QuickStart
```

### 方式二：分层启动（稳妥，适合首次启动）

先启动基础设施层，确认就绪后再启动应用层：

```powershell
# 第一步：基础设施层（并行）
.\start-bemp-env.ps1 -Service redis        # 终端1
.\start-bemp-env.ps1 -Service zookeeper     # 终端2

# 第二步：确认基础设施就绪
.\start-bemp-env.ps1 -Status

# 第三步：应用层（并行）
.\start-bemp-env.ps1 -Service served -QuickStart   # 终端3
.\start-bemp-env.ps1 -Service adapter -QuickStart       # 终端4
.\start-bemp-env.ps1 -Service frontend -QuickStart      # 终端5
```

## 命令模板

脚本路径：`d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\start-bemp-env.ps1`

```powershell
# 启动服务（每个在新终端执行）
.\start-bemp-env.ps1 -Service <redis|zookeeper|served|adapter|frontend>

# 快速启动（跳过编译/依赖检查，日常推荐）
.\start-bemp-env.ps1 -Service <served|adapter|frontend> -QuickStart

# 查看状态
.\start-bemp-env.ps1 -Status

# 强制重启（端口被占用时）
.\start-bemp-env.ps1 -Service <服务名> -ForceRestart
```

## 参数说明

| 参数 | 适用服务 | 作用 |
|------|---------|------|
| `-Service` | 全部 | 指定要启动的服务 |
| `-Status` | 全部 | 查看所有服务运行状态 |
| `-QuickStart` | served, adapter, frontend | 跳过编译/依赖检查，直接启动 |
| `-ForceRestart` | 全部 | 强制停止占用端口的进程后重启 |
| `-AutoRestart` | 全部 | 智能模式：检测服务是否运行，运行中则自动停止后重启，未运行则正常启动 |

## 编译后自动部署（Java代码修改后必执行）

当修改Java源代码后，需要执行以下3步才能使修改生效。**跳过任何一步都会导致旧代码仍在运行。**

### 步骤1：编译

```powershell
cd "{moduleDir}"
& "{javacPath}" -encoding UTF-8 -cp "{warClassesDir};{warLibDir}*" -d "{warClassesDir}" "{sourceFile}"
```

- `-cp` 指向WAR包的classes和lib目录，确保编译时能找到所有依赖
- `-d` 直接输出到WAR的classes目录，避免后续复制步骤（当编译目录与WAR目录相同时）
- `{sourceFile}` 为被修改的Java源文件相对于 `sourceDir` 的完整路径

### 步骤2：复制class到WAR（仅当编译输出目录与WAR classes目录不同时）

```powershell
Copy-Item "{targetClassesDir}/{packagePath}/{className}.class" "{warClassesDir}/{packagePath}/{className}.class" -Force
```

- 当步骤1的 `-d` 直接指向 `warClassesDir` 时，此步骤可跳过
- 当编译输出到 `targetClassesDir` 时，必须将class文件复制到WAR包中

### 步骤3：重启Served

```powershell
.\start-bemp-env.ps1 -Service served -QuickStart -ForceRestart
```

- `-QuickStart`：跳过Maven全量编译，仅使用步骤1的增量编译结果
- `-ForceRestart`：停止旧进程后重新启动，确保加载最新class

### 配置项

路径：`config/compile-deploy.json`

```json
{
  "javacPath": "${ENV:JAVA_HOME}\\bin\\javac",
  "modules": {
    "{modulePrefix}biz-as": {
      "sourceDir": "banks/ext-${ENV:BANK_PROJECT_DIR}/${ENV:BANK_MODULE_PREFIX}biz-as/src/main/java",
      "targetClassesDir": "banks/ext-${ENV:BANK_PROJECT_DIR}/${ENV:BANK_MODULE_PREFIX}biz-as/target/classes",
      "warClassesDir": "banks/ext-${ENV:BANK_PROJECT_DIR}/${ENV:BANK_MODULE_PREFIX}served-deploy/target/bemp-served/WEB-INF/classes",
      "warLibDir": "banks/ext-${ENV:BANK_PROJECT_DIR}/${ENV:BANK_MODULE_PREFIX}served-deploy/target/bemp-served/WEB-INF/lib"
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `javacPath` | javac编译器路径，支持 `${ENV:JAVA_HOME}` 占位符 |
| `modules.{name}.sourceDir` | 模块Java源码根目录（相对于workspaceRoot） |
| `modules.{name}.targetClassesDir` | 模块编译输出目录（相对于workspaceRoot） |
| `modules.{name}.warClassesDir` | WAR包WEB-INF/classes目录（相对于workspaceRoot） |
| `modules.{name}.warLibDir` | WAR包WEB-INF/lib目录（相对于workspaceRoot） |

### 失败处理

| 场景 | 处理策略 |
|------|---------|
| 编译失败（语法错误） | 输出javac错误信息，不执行后续步骤 |
| class文件复制失败 | 检查目标目录是否存在，提示用户确认WAR包是否已解压 |
| Served重启失败 | 执行健康检查诊断（见下一节），根据诊断结果修复后重试 |

## 服务启动后自动健康检查

服务启动后，自动轮询端口直到监听成功或超时。避免手动反复执行netstat检查。

### 端口轮询等待

在独立终端中执行等待脚本，监控服务端口状态：

```powershell
$port = {port}; $maxWait = {maxWaitSeconds}; $interval = {pollIntervalSeconds}
$elapsed = 0
while ($elapsed -lt $maxWait) {
    $result = netstat -ano | findstr ":$port " | findstr "LISTEN"
    if ($result) {
        Write-Output "[OK] Port $port is listening after ${elapsed}s"
        exit 0
    }
    Write-Output "[WAIT] Port $port not yet listening... (${elapsed}s/${maxWait}s)"
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}
Write-Output "[TIMEOUT] Port $port not listening after ${maxWait}s"
exit 1
```

### 健康检查配置

路径：`config/health-check.json`

```json
{
  "services": {
    "redis": {"port": 6379, "maxWaitSeconds": 30, "pollIntervalSeconds": 5},
    "zookeeper": {"port": 2181, "maxWaitSeconds": 60, "pollIntervalSeconds": 10},
    "served": {"port": 8010, "maxWaitSeconds": 600, "pollIntervalSeconds": 30},
    "adapter": {"port": 8090, "maxWaitSeconds": 300, "pollIntervalSeconds": 20},
    "frontend": {"port": 8091, "maxWaitSeconds": 600, "pollIntervalSeconds": 30}
  }
}
```

| 字段 | 说明 |
|------|------|
| `port` | 服务监听端口号 |
| `maxWaitSeconds` | 最大等待时间（秒），超时视为启动失败 |
| `pollIntervalSeconds` | 轮询间隔（秒），Served较长是因为启动耗时3~7分钟 |

### Served/Adapter启动失败自动诊断

当Served(8010)或Adapter(8090)启动超时时，按以下顺序自动检查：

1. **Redis是否运行**：检查6379端口，未运行则先启动Redis
2. **ZooKeeper是否运行**：检查2181端口，未运行则先启动ZooKeeper
3. **日志异常扫描**：在对应服务日志中搜索 `Exception`、`ERROR`、`SessionExpired`、`ConnectionLoss` 关键词
4. **ZK Session过期处理**：若日志包含 `SessionExpired` 或 `ConnectionLoss`，需先重启ZooKeeper，再重启对应服务

诊断执行流程：

```
Served/Adapter启动超时
  ├─ Redis未运行 → 启动Redis → 重启对应服务
  ├─ ZooKeeper未运行 → 启动ZK → 重启对应服务
  ├─ 日志含SessionExpired → 重启ZK → 重启对应服务
  ├─ 日志含其他ERROR → 输出错误摘要，由用户判断
  └─ 无明显错误 → 输出日志最后50行，由用户判断
```

### 失败处理

| 场景 | 处理策略 |
|------|---------|
| 基础设施未就绪 | 先启动缺失的依赖服务（Redis/ZK），再重启Served |
| ZK Session过期 | 必须先重启ZooKeeper再重启Served，顺序不可颠倒 |
| 日志有ERROR但非Session相关 | 输出错误摘要，不自动重启，由用户判断 |
| 超时且无日志 | 提示检查JVM参数和磁盘空间，可能是OOM或磁盘满 |

## 前端编译断连自动恢复

### 问题

前端webpack编译过程中，IDE终端可能因超时断开连接，导致编译中断。表现为8091端口未监听但终端已无进程。

### 自动恢复逻辑

1. 前端启动命令执行后，在独立终端启动端口监控
2. 监控脚本检测到8091端口未监听时，检查是否有node进程在运行
3. 若无node进程（终端断连），自动重新启动前端服务
4. 最多重试 `maxRetries` 次，每次间隔 `retryDelaySeconds` 秒

### 监控脚本

```powershell
$maxRetries = {maxRetries}; $retryDelay = {retryDelaySeconds}; $port = {port}
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    $listening = netstat -ano | findstr ":$port " | findstr "LISTEN"
    if ($listening) {
        Write-Output "[OK] Frontend running on port $port"
        exit 0
    }
    $nodeProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if (-not $nodeProcess) {
        $retryCount++
        Write-Output "[RETRY] Frontend disconnected, restarting... ($retryCount/$maxRetries)"
        Start-Sleep -Seconds $retryDelay
        # 重新启动前端（在新的终端中执行）
        # .\start-bemp-env.ps1 -Service frontend -QuickStart
    } else {
        Write-Output "[WAIT] Frontend compiling... node process active"
        Start-Sleep -Seconds 30
    }
}
Write-Output "[FAIL] Frontend failed to start after $maxRetries retries"
exit 1
```

### 配置项

路径：`config/health-check.json` 中的 `frontend` 节点

```json
{
  "frontend": {
    "port": 8091,
    "maxWaitSeconds": 600,
    "pollIntervalSeconds": 30,
    "maxRetries": 3,
    "retryDelaySeconds": 10
  }
}
```

| 字段 | 说明 |
|------|------|
| `maxRetries` | 断连后最大重试次数 |
| `retryDelaySeconds` | 重试前等待时间（秒），给端口释放留出时间 |

### 失败处理

| 场景 | 处理策略 |
|------|---------|
| 重试次数耗尽 | 输出失败信息，提示用户手动检查npm缓存和node_modules |
| 端口被非node进程占用 | 提示端口冲突，建议使用 `-ForceRestart` |
| npm编译错误 | 检查终端输出的webpack错误信息，修复代码后重试 |

## 配置文件

位置：`config/config.json`，可配置服务路径、端口、JVM 参数、Node.js 路径等。

| 配置文件 | 用途 |
|---------|------|
| `config/config.json` | 服务路径、端口、JVM参数等基础配置 |
| `config/compile-deploy.json` | Java编译后自动部署的模块路径配置 |
| `config/health-check.json` | 健康检查端口轮询参数和诊断策略配置 |

> 详细配置说明、启动模式选择、故障排查请参阅 [README.md](./README.md) 和 [docs/troubleshooting.md](./docs/troubleshooting.md)。