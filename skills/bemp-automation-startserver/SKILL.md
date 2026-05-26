---
name: "bemp-automation-startserver"
description: "BEMP项目开发环境启动Skill，用于在IDE终端中启动Redis、ZooKeeper、SpringBoot后端及前端开发服务器。所有服务进程以前台方式运行，日志直接显示在终端控制台"
whenToUse: "需要启动BEMP项目开发环境，包括Redis、ZooKeeper、SpringBoot后端及前端开发服务器，执行测试用例、功能验证、回归测试前启动服务时，查询BEMP服务状态时调用"
triggers: 
    - "启动/快速启动/重启/检查 环境/Redis/ZooKeeper/SpringBoot/前端/服务/所有服务"
    - "查询服务状态"
---

# BEMP 开发环境启动 Skill

在 IDE 终端中启动 BEMP 项目所需的 Redis、ZooKeeper、SpringBoot 后端和前端开发服务器。

## 服务列表

| 服务 | 端口 | -Service 参数 |
|------|------|---------------|
| Redis | 6379 | `redis` |
| ZooKeeper | 2181 | `zookeeper` |
| SpringBoot | 8010 | `springboot` |
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
         ↓ (SpringBoot 依赖 Redis + ZK 就绪)
┌─ 应用层（并行启动，无需等待彼此） ────┐
│  终端3: SpringBoot 后端 (8010)         │
│  终端4: Frontend 前端 (8091)           │
└────────────────────────────────────────┘
```

**依赖说明**：
- Redis 和 ZooKeeper 之间无依赖，可并行启动
- SpringBoot 依赖 Redis 和 ZooKeeper 就绪，需等待基础设施层启动完成
- Frontend 与后端无启动依赖，可与 SpringBoot 并行启动

## 推荐启动方式

### 方式一：全量并行启动（推荐，节省约50%等待时间）

同时启动4个终端，基础设施层先就绪后应用层自动连接：

```powershell
# 终端1: Redis
.\start-bemp-env.ps1 -Service redis

# 终端2: ZooKeeper（与Redis同时启动）
.\start-bemp-env.ps1 -Service zookeeper

# 终端3: SpringBoot（Redis/ZK启动后立即启动）
.\start-bemp-env.ps1 -Service springboot -QuickStart

# 终端4: Frontend（与SpringBoot同时启动）
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
.\start-bemp-env.ps1 -Service springboot -QuickStart   # 终端3
.\start-bemp-env.ps1 -Service frontend -QuickStart      # 终端4
```

## 命令模板

脚本路径：`d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts\start-bemp-env.ps1`

```powershell
# 启动服务（每个在新终端执行）
.\start-bemp-env.ps1 -Service <redis|zookeeper|springboot|frontend>

# 快速启动（跳过编译/依赖检查，日常推荐）
.\start-bemp-env.ps1 -Service <springboot|frontend> -QuickStart

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
| `-QuickStart` | springboot, frontend | 跳过编译/依赖检查，直接启动 |
| `-ForceRestart` | 全部 | 强制停止占用端口的进程后重启 |
| `-AutoRestart` | 全部 | 智能模式：检测服务是否运行，运行中则自动停止后重启，未运行则正常启动 |

## 配置文件

位置：`config/config.json`，可配置服务路径、端口、JVM 参数、Node.js 路径等。

> 详细配置说明、启动模式选择、故障排查请参阅 [README.md](./README.md) 和 [docs/troubleshooting.md](./docs/troubleshooting.md)。