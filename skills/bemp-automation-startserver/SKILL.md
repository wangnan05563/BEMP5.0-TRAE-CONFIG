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
2. **推荐启动顺序**：Redis → ZooKeeper → SpringBoot → Frontend
3. **状态检查使用独立终端**

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

## 配置文件

位置：`config/config.json`，可配置服务路径、端口、JVM 参数、Node.js 路径等。

> 详细配置说明、启动模式选择、故障排查请参阅 [README.md](./README.md) 和 [docs/troubleshooting.md](./docs/troubleshooting.md)。