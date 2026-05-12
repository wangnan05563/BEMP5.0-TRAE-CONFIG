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

按推荐顺序,在每个服务中使用**独立的 IDE 终端**依次执行:

```powershell
# 终端 1 - Redis
.\start-bemp-env.ps1 -Service redis

# 终端 2 - ZooKeeper
.\start-bemp-env.ps1 -Service zookeeper

# 终端 3 - SpringBoot(F5 Debug 模式)
.\start-bemp-env.ps1 -Service springboot

# 终端 3 - SpringBoot(快速启动模式,跳过编译)
.\start-bemp-env.ps1 -Service springboot -QuickStart

# 终端 4 - 前端
.\start-bemp-env.ps1 -Service frontend

# 终端 4 - 前端(快速启动模式,跳过依赖检查)
.\start-bemp-env.ps1 -Service frontend -QuickStart
```

### 快速启动模式

当项目近期已编译/安装且代码无变化时,可使用 `-QuickStart` 参数跳过编译或依赖检查:

```powershell
# 快速启动 SpringBoot(跳过 Maven 编译)
.\start-bemp-env.ps1 -Service springboot -QuickStart

# 快速启动前端(跳过 npm 依赖检查)
.\start-bemp-env.ps1 -Service frontend -QuickStart
```

**适用场景**:
- 近期已编译/安装过项目,代码无变化
- 需要快速重启后端或前端服务
- 节省编译/安装时间,提高开发效率

**注意事项**:
- SpringBoot: 确保 WAR 文件已编译存在
- 前端: 确保 `node_modules` 目录已存在
- 如果代码/依赖有变更,请使用正常启动模式或手动执行编译/安装

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

### v6.1.0 (2026-05-08)
- **前端启动速度全面优化**:
  - 修复 `node_modules` 重复检查 Bug（首次安装时 `npm install` 被执行两次）
  - 新增前端 `-QuickStart` 快速启动模式（跳过依赖检查,与 SpringBoot 对称）
  - `npm install` 命令优化: 添加 `--prefer-offline`、`--no-audit`、`--no-fund` 加速参数
  - 安装前设置 `PUPPETEER_SKIP_DOWNLOAD`、`ELECTRON_SKIP_BINARY_DOWNLOAD` 跳过无用二进制
  - `npm run dev` 显式设置 `NODE_ENV=development` 并添加 `--scripts-prepend-node-path`
  - 已有 `node_modules` 时显示 `skipping install` 提示,启动更快

### v6.0.0 (2026-05-09)
- 新增快速启动模式(-QuickStart 参数),支持跳过 Maven 编译直接启动后端服务
- 优化开发体验,节省重复编译时间

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
