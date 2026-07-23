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
| Frontend | frontend | 8091 | `frontend` | 无（需Node.js 14） |

## 核心规则

1. **外部终端优先**：使用 `-ExternalTerminal` 在独立PowerShell窗口启动服务，释放IDE终端用于诊断
2. **终端隔离**：IDE模式下每个服务独占终端，严禁复用运行中服务的终端
3. **依赖等待**：使用 `-WaitForDeps` 让SpringBoot服务自动等待基础设施就绪
4. **启动前检测**：启动前自动检测端口，已运行则跳过（除非 -ForceRestart）
5. **重启即强制**："重启"等价于 `-ForceRestart`
6. **两阶段启动**：多服务逗号分隔时，先全部启动进程，再统一并行健康检查
7. **Node.js版本锁定**：前端通过 `_shared/env-config.json` 的 `NODE_PATH` 配置指定 Node 14 路径
8. **前置环境检查（G-02）**：启动服务前应执行前置环境检查（`-PreCheck`），验证环境变量、可执行文件、端口可用性、数据库连通性。检查失败时输出明确修复建议，不强行启动

## 启动模式

### 模式A：外部PowerShell终端（推荐）

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
- 自动健康检查和诊断（启动日志+应用日志双扫描）
- 多服务并行健康检查，不叠加等待时间

### 模式B：IDE终端（传统模式）

服务在IDE终端前台运行，每个终端被独占：

```powershell
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

脚本路径：`{bemp-automation-startserver}/scripts/start-bemp-env.ps1`

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
| `-PreCheck` | 全部 | 启动前执行前置环境检查（G-02），验证环境变量/可执行文件/端口/数据库连通性。可单独使用：`-PreCheck -Service served` 仅检查不启动 |

## 配置文件

| 配置文件 | 用途 |
|---------|------|
| `config/config.json` | 服务定义、类型、端口、依赖、JVM参数等 |
| `config/health-check.json` | 健康检查默认值、byType、startupGroups、服务级覆盖、诊断策略 |
| `config/pre-check.json` | 前置环境检查规则（G-02）：检查项定义、严重度、超时、跳过策略 |
| `config/compile-deploy.json` | Java单文件编译后自动部署配置 |
| `config/compile-options.json` | 增量编译模式配置（F-03）：编译模式、模块映射、自动模式选择 |
| `config/compile-verification.json` | 编译产物验证配置（BUG-005）：javap验证类与方法 |
| `config/pre-compile-check.json` | 编译前置检查配置（F-01）：大括号匹配、文件完整性 |
| `_shared/env-config.json` | 全局环境变量默认值 |

## 详细文档（渐进式披露）

以下文档包含详细的操作指南，按需查阅：

| 文档 | 内容 | 何时查阅 |
|------|------|---------|
| [OPERATIONS.md](./OPERATIONS.md) | 前置环境检查、两阶段并行启动、健康检查配置、诊断流程、折叠式进度条、日志文件、Node.js版本控制、故障排查、复盘经验 | 需要了解运维细节、排查启动问题、理解健康检查配置时 |
| [COMPILE-GUIDE.md](./COMPILE-GUIDE.md) | 编译前置检查(F-01)、编译后自动部署、增量编译模式(F-03)、编译产物验证(BUG-005)、代码修改后编译验证流程 | Java代码修改后需要编译验证时 |
| [AGENT-GUIDE.md](./AGENT-GUIDE.md) | 推荐启动流程、IDE终端模式注意事项、常见错误及避免 | 智能体执行启动操作前 |
