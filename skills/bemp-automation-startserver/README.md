# BEMP 开发环境启动工具

BEMP 项目开发环境自动化启动工具，用于在 IDE 终端中一键启动和管理 Redis、ZooKeeper、SpringBoot 后端及前端开发服务器。

## 目录结构

```
bemp-automation-startserver/
├── SKILL.md                 # Skill 定义（触发词、核心说明）
├── README.md                # 本文档 - 完整使用指南
├── config/
│   └── config.json          # 服务配置文件
├── scripts/
│   ├── start-bemp-env.ps1   # 主启动脚本
│   └── demo-check.ps1       # 环境检查演示脚本
└── docs/
    └── troubleshooting.md    # 故障排查指南
```

## 快速开始

### 前置环境要求

| 组件 | 版本要求 |
|------|----------|
| JDK | 1.8+ |
| Node.js | 14.x+（推荐） |
| Maven | 3.6+ |
| PowerShell | 5.1+ |

### 核心规则（必读）

> **每个服务必须在独立的 IDE 终端中启动**，服务运行后不要在该终端执行其他命令。

### 一、查看服务状态

```powershell
cd d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-automation-startserver\scripts
.\start-bemp-env.ps1 -Status
```

### 二、启动服务

按推荐顺序，在每个服务中使用**独立的 IDE 终端**依次执行：

```powershell
# 终端 1 - Redis
.\start-bemp-env.ps1 -Service redis

# 终端 2 - ZooKeeper
.\start-bemp-env.ps1 -Service zookeeper

# 终端 3 - SpringBoot（F5 Debug 模式）
.\start-bemp-env.ps1 -Service springboot

# 终端 4 - 前端
.\start-bemp-env.ps1 -Service frontend
```

### 三、强制重启

当端口被占用时：
```powershell
.\start-bemp-env.ps1 -Service redis -ForceRestart
```

### 四、环境检查（不启动服务）

```powershell
.\demo-check.ps1
```

## 服务说明

| 服务 | 端口 | 说明 | 启动方式 |
|------|------|------|----------|
| **Redis** | 6379 | 缓存数据库 | 直接启动 redis-server.exe |
| **ZooKeeper** | 2181 | 分布式协调服务 | 直接启动 zkServer.cmd |
| **SpringBoot** | 8010 / Debug:5005 | Java 后端应用 | Trae IDE F5 Debug 模式 |
| **Frontend** | 8091 | 前端开发服务器 | npm run dev |

## 配置文件详解

位置：`config/config.json`

```json
{
  "services": {
    "redis": {
      "enabled": true,
      "name": "Redis",
      "executable": "D:\\code\\Redis-x64-5.0.14.1\\redis-server.exe",
      "port": 6379
    },
    "zookeeper": {
      "enabled": true,
      "name": "ZooKeeper",
      "executable": "D:\\code\\apache-zookeeper-3.8.3-bin\\bin\\zkServer.cmd",
      "port": 2181
    },
    "springboot": {
      "enabled": true,
      "name": "SpringBoot",
      "mainClass": "com.hundsun.bemp.BempServedAppStarter",
      "projectPath": "d:\\code\\QJ\\BEMP5.0DEV\\banks\\ext-hnnxbank",
      "workspaceRoot": "d:\\code\\QJ\\BEMP5.0DEV",
      "traePath": "F:\\Program Files\\Trae CN\\Trae CN.exe",
      "modulePath": "hnnxbank-served-deploy",
      "warFile": "bemp-served.war",
      "port": 8010,
      "debugPort": 5005,
      "jvmOptions": "-server -Xms2048m -Xmx4096m"
    },
    "frontend": {
      "enabled": true,
      "name": "Frontend",
      "projectPath": "d:\\code\\QJ\\BEMP5.0DEV\\frontend",
      "startCommand": "npm run dev",
      "port": 8091,
      "nodePath": "D:\\code\\nodejs14\\node.exe"
    }
  }
}
```

### 关键配置项说明

| 字段 | 说明 |
|------|------|
| `enabled` | 是否启用该服务 |
| `executable` | 可执行文件完整路径（Redis/ZooKeeper） |
| `port` | 服务监听端口 |
| `projectPath` | 项目根目录（SpringBoot/前端） |
| `traePath` | Trae IDE 可执行文件路径（SpringBoot必需） |
| `nodePath` | Node.js 可执行文件路径（前端，可选） |
| `jvmOptions` | JVM 启动参数 |
| `warFile` | WAR 文件名（SpringBoot编译产物） |

## SpringBoot F5 Debug 模式详解

SpringBoot 不通过 Maven 直接启动，而是使用 Trae IDE 的 Java Debug 插件：

### 启动流程

1. 脚本检查 WAR 文件是否存在（验证项目已编译）
2. 自动打开 Trae IDE 工作区
3. 显示 Debug 启动指导信息
4. 用户在 Trae 中按 F5 启动调试会话

### 手动操作步骤

1. 运行 `.\start-bemp-env.ps1 -Service springboot`
2. 切换到 Trae IDE 窗口
3. 打开 Debug 面板 (Ctrl+Shift+D)
4. 选择 "Spring Boot-后端调试" 配置
5. 按 F5 启动调试

### 编译项目（WAR 文件不存在时）

```powershell
cd d:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank
mvn clean install -DskipTests=true -pl hnnxbank-served-deploy -am
```

## 后端启动模式

SpringBoot 服务支持两种启动模式，通过 `config.json` 中的 `launchMode` 配置：

### Terminal 模式（推荐）
- **配置**: `"launchMode": "terminal"`
- 在 IDE 终端中直接启动，日志实时可见，前台运行
- 适合日常开发和调试

### Debug 模式
- **配置**: `"launchMode": "debug"`（默认）
- 在 Trae IDE 中以 F5 Debug 模式启动，支持断点调试、热重载

## 快速启动模式（-QuickStart）

SpringBoot 和前端服务均支持快速启动模式，跳过编译/依赖检查：

```powershell
# SpringBoot: 跳过 Maven 编译
.\start-bemp-env.ps1 -Service springboot -QuickStart

# 前端: 跳过 npm 依赖检查
.\start-bemp-env.ps1 -Service frontend -QuickStart
```

> **注意**：SpringBoot QuickStart 需确保 WAR 文件已编译存在；前端 QuickStart 需确保 `node_modules` 目录已存在。代码/依赖有变更时请使用正常启动模式。

## 前端内存配置

前端服务通过 `config.json` 中 `frontend.nodeMemoryLimit` 配置 Node.js 内存上限：

```json
"frontend": {
  "nodeMemoryLimit": 6096
}
```

- **默认值**: 6096 (MB)，与项目 `package.json` 中 `--max_old_space_size` 一致
- **作用**: 启动时自动设置 `NODE_OPTIONS=--max_old_space_size=6096`，避免大型项目编译时内存溢出
- **调整**: 根据机器内存增减，设为 0 或删除则不限制

## 前端启动加速策略

脚本已内置以下加速策略（无需手动配置）：

| 策略 | 说明 | 节省时间 |
|------|------|----------|
| `--no-audit` | 跳过 npm 安全审计 | ~5-15 秒 |
| `--no-fund` | 跳过赞助信息输出 | ~2 秒 |
| `--prefer-offline` | 优先使用本地缓存的包 | ~5-30 秒 |
| `PUPPETEER_SKIP_DOWNLOAD` | 跳过 Chromium 二进制下载 | ~30-120 秒 |
| `ELECTRON_SKIP_BINARY_DOWNLOAD` | 跳过 Electron 二进制下载 | ~30-120 秒 |
| `-QuickStart` | 跳过依赖安装检查 | ~10-150 秒 |

## 输出示例

### 状态检查输出

```
========================================
     BEMP Dev Environment
========================================

[INFO] Loading config: ...\config\config.json
[OK] Config loaded

========================================
  Service Status
========================================

Service           Port Status
-------           ---- ------
Redis             6379 [OK] Running
ZooKeeper         2181 [--] Stopped
SpringBoot    8080, 8010 [--] Stopped
Frontend          8091 [--] Stopped
```

## 故障排查

常见问题及解决方案请参阅 [docs/troubleshooting.md](./docs/troubleshooting.md)，包括：

- ZooKeeper 文件访问错误 / AdminServer 端口冲突
- SpringBoot WAR 文件不存在
- 前端 OpenSSL 兼容性错误
- 端口占用问题
- 内存不足调整

## 更新日志

### v5.9.0 (2026-04-17)
- 新增终端窗口标题自动设置功能

### v5.7.0 (2026-04-17)
- 添加终端使用警告和最佳实践指导

### v5.6.0 (2026-04-17)
- 移除 Maven 直接启动方式，保留 F5 Debug 模式

### v5.5.0 (2026-04-17)
- 重大变更：SpringBoot 改为 Trae IDE Debug 模式

### v5.0.0 (2026-04-15)
- 重构为开发环境启动 Skill，移除测试功能
