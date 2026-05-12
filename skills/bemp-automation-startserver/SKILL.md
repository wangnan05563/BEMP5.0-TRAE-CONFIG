---
name: bemp-automation-startserver
description: BEMP项目开发环境启动Skill，用于在IDE终端中启动Redis、ZooKeeper、SpringBoot后端及前端开发服务器。所有服务进程以前台方式运行，日志直接显示在终端控制台
---

---
name: "bemp-automation-startserver"
description: "BEMP项目开发环境启动Skill，用于在IDE终端中启动Redis、ZooKeeper、SpringBoot后端及前端开发服务器。所有服务进程以前台方式运行，日志直接显示在终端控制台。"

**触发关键词**：启动bemp服务、启动前端服务、启动后端服务、启动所有服务、启动redis、启动zk"
triggers:
  - "启动bemp服务"
  - "启动前端服务"
  - "启动后端服务"
  - "启动所有服务"
  - "启动redis"
  - "启动zk"
  - "启动redis服务"
  - "启动zookeeper服务"
  - "启动springboot"
  - "启动后端"
  - "启动前端"
---

# BEMP 开发环境启动 Skill

## Skill 职责

本 Skill 用于在 IDE 终端中启动 BEMP 项目开发环境所需的各类基础服务，包括 Redis、ZooKeeper、SpringBoot 后端和前端开发服务器。

## 核心特性

- **独立终端运行**：每个服务在独立的 IDE 终端中以前台方式运行,日志直接可见
- **状态检测**：自动检测各服务端口占用情况
- **强制重启**：支持 `-ForceRestart` 参数停止冲突进程并重启
- **快速启动**：支持 `-QuickStart` 参数跳过 Maven 编译或 npm 依赖检查,直接启动服务
- **配置化**：所有路径和参数通过 `config.json` 统一管理

## 支持的服务

| 服务 | 端口 | 说明 |
|------|------|------|
| Redis | 6379 | 缓存数据库 |
| ZooKeeper | 2181 | 分布式协调服务 |
| SpringBoot | 8010 / Debug:5005 | Java 后端应用（支持终端模式/F5 Debug 模式） |
| Frontend | 8091 | Node.js 前端开发服务器（支持内存限制配置） |

## 后端启动模式

SpringBoot 服务支持两种启动模式，通过 `config.json` 中的 `launchMode` 配置：

### 1. Terminal 模式（推荐）
- **配置**: `"launchMode": "terminal"`
- **特点**: 
  - 在 IDE 终端中直接启动，日志实时可见
  - 与 ZooKeeper 启动方式一致
  - 前台运行，占用当前终端
  - 适合日常开发和调试

### 2. Debug 模式
- **配置**: `"launchMode": "debug"`(或不配置,默认模式)
- **特点**:
  - 在 Trae IDE 中以 F5 Debug 模式启动
  - 支持断点调试、热重载
  - 自动打开 IDE 工作区
  - 适合需要调试的场景

## 快速启动模式

SpringBoot 和前端服务均支持快速启动模式,通过 `-QuickStart` 参数启用:

### 使用场景
- 近期已编译/安装过项目,代码无变化
- 需要快速重启后端或前端服务
- 节省编译/安装时间,提高开发效率

### 使用方法

```powershell
# SpringBoot: 正常启动(会执行 Maven 编译)
.\start-bemp-env.ps1 -Service springboot

# SpringBoot: 快速启动(跳过 Maven 编译)
.\start-bemp-env.ps1 -Service springboot -QuickStart

# 前端: 正常启动(会检查 npm 依赖)
.\start-bemp-env.ps1 -Service frontend

# 前端: 快速启动(跳过 npm 依赖检查)
.\start-bemp-env.ps1 -Service frontend -QuickStart
```

### 注意事项
- SpringBoot QuickStart: 确保 WAR 文件已编译存在
- 前端 QuickStart: 确保 `node_modules` 目录已存在
- 如果代码/依赖有变更,请使用正常启动模式或手动执行编译/安装

## 快速使用

### 重要规则

1. **每个服务必须在独立的 IDE 终端中启动**
2. **服务启动后，不要在该终端执行其他命令**
3. **使用 `-Status` 参数时，使用独立的终端**

### 启动单个服务(每个服务在新终端执行)

```powershell
cd d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts

# 终端 1 - 启动 Redis
.\start-bemp-env.ps1 -Service redis

# 终端 2 - 启动 ZooKeeper
.\start-bemp-env.ps1 -Service zookeeper

# 终端 3 - 启动 SpringBoot(Debug 模式)
.\start-bemp-env.ps1 -Service springboot

# 终端 3 - 启动 SpringBoot(快速启动模式,跳过编译)
.\start-bemp-env.ps1 -Service springboot -QuickStart

# 终端 4 - 启动前端
.\start-bemp-env.ps1 -Service frontend

# 终端 4 - 启动前端(快速启动模式,跳过依赖检查)
.\start-bemp-env.ps1 -Service frontend -QuickStart
```

### 查看服务状态

```powershell
cd d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts
.\start-bemp-env.ps1 -Status
```

### 强制重启服务

```powershell
.\start-bemp-env.ps1 -Service redis -ForceRestart
```

## 推荐启动顺序

```
后端：Redis (6379) → ZooKeeper (2181) → SpringBoot (8010) 
前端：Frontend (8091)
```

## 配置文件

位置：`config/config.json`

可配置项：服务路径、项目路径、端口、JVM参数、Node.js路径、Node内存限制、Trae IDE路径等。

### 前端内存配置

前端服务支持通过 `nodeMemoryLimit` 配置 Node.js 内存上限,与 `package.json` 中 `--max_old_space_size` 保持一致:

```json
"frontend": {
  "nodeMemoryLimit": 6096
}
```

- **默认值**: 6096 (MB),与项目 `package.json` 中 build 脚本的内存配置一致
- **作用**: 启动时自动设置 `NODE_OPTIONS=--max_old_space_size=6096`,避免 webpack-dev-server 编译大型项目时内存溢出
- **调整**: 根据机器内存情况可适当增减,设为 0 或删除该配置则不设置内存限制

### 前端启动加速

脚本已内置以下加速策略（无需手动配置）:

| 策略 | 说明 | 节省时间 |
|------|------|----------|
| `--no-audit` | 跳过 npm 安全审计 | ~5-15 秒 |
| `--no-fund` | 跳过赞助信息输出 | ~2 秒 |
| `--prefer-offline` | 优先使用本地缓存的包 | ~5-30 秒（网络慢时） |
| `PUPPETEER_SKIP_DOWNLOAD` | 跳过 Chromium 二进制下载 | ~30-120 秒 |
| `ELECTRON_SKIP_BINARY_DOWNLOAD` | 跳过 Electron 二进制下载 | ~30-120 秒 |
| `-QuickStart` | 跳过依赖安装检查 | ~10-150 秒（首次跳过整个 install） |

详细配置说明和完整使用指南请参阅 [README.md](./README.md),故障排查请参阅 [docs/troubleshooting.md](./docs/troubleshooting.md)。