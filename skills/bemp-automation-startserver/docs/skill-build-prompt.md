# BEMP 开发环境启动 Skill 构建提示词

> 本文档用于指导开发人员在任何环境下复现相同功能和质量的 `bemp-automation-startserver` Skill。

---

## 一、Skill 概述

### 1.1 核心功能需求

创建一个名为 `bemp-automation-startserver` 的 Trae IDE Skill，用于在 IDE 终端中自动化启动和管理 BEMP 项目开发环境所需的各类基础服务。

**核心功能**：
- 在独立 IDE 终端中启动 Redis、ZooKeeper、SpringBoot 后端、前端开发服务器
- 所有服务进程以前台方式运行，日志直接显示在终端控制台
- 支持服务状态检测、端口冲突检测、强制重启
- 配置化管理所有服务路径和参数

### 1.2 支持的服务

| 服务 | 端口 | 说明 |
|------|------|------|
| Redis | 6379 | 缓存数据库 |
| ZooKeeper | 2181 | 分布式协调服务 |
| SpringBoot | 8010 / Debug:5005 | Java 后端应用 |
| Frontend | 8091 | Node.js 前端开发服务器 |

---

## 二、技术架构规范

### 2.1 目录结构

```
bemp-automation-startserver/
├── SKILL.md                 # Skill 定义（触发词、核心说明）
├── README.md                # 完整使用指南
├── config/
│   └── config.json          # 服务配置文件
├── scripts/
│   ├── start-bemp-env.ps1   # 主启动脚本
│   └── demo-check.ps1       # 环境检查演示脚本
└── docs/
    └── troubleshooting.md    # 故障排查指南
```

### 2.2 配置文件规范

```json
{
  "globalPaths": {
    "workspaceRoot": "工作区根目录",
    "banksProjectPath": "后端项目路径",
    "frontendProjectPath": "前端项目路径",
    "traePath": "Trae IDE 可执行文件路径",
    "javaHome": "JDK 安装路径",
    "nodePath": "Node.js 可执行文件路径",
    "mavenPath": "Maven 可执行文件路径"
  },
  "services": {
    "redis": {
      "enabled": true,
      "name": "Redis",
      "executable": "redis-server.exe 完整路径",
      "port": 6379
    },
    "zookeeper": {
      "enabled": true,
      "name": "ZooKeeper",
      "executable": "zkServer.cmd 完整路径",
      "port": 2181
    },
    "springboot": {
      "enabled": true,
      "name": "SpringBoot",
      "mainClass": "主类全限定名",
      "modulePath": "模块路径",
      "warFile": "WAR 文件名",
      "port": 8010,
      "debugPort": 5005,
      "jvmOptions": "JVM 启动参数",
      "launchMode": "terminal 或 debug",
      "autoCompile": true,
      "mavenCommand": "Maven 编译命令"
    },
    "frontend": {
      "enabled": true,
      "name": "Frontend",
      "startCommand": "npm run dev",
      "port": 8091
    }
  }
}
```

---

## 三、PowerShell 脚本实现规范

### 3.1 脚本参数

```powershell
param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\config.json",
    [string]$Service = "",
    [switch]$Status,
    [switch]$ForceRestart
)
```

### 3.2 核心函数要求

#### 3.2.1 端口检测函数

```powershell
function Test-PortListening {
    param([int]$port)
    # 使用 Get-NetTCPConnection 检测端口
    # 支持 IPv4 和 IPv6
    # 回退到 netstat 命令
}
```

#### 3.2.2 进程停止函数

```powershell
function Stop-ServiceByPort {
    param([int]$port, [string]$serviceName)
    # 根据端口查找进程并强制停止
    # 支持 ForceRestart 参数
}
```

#### 3.2.3 端口冲突检测函数

```powershell
function Test-PortConflict {
    param([int]$port, [string]$serviceName)
    # 检测端口是否被非预期进程占用
    # 返回冲突信息（进程名、PID）
}
```

#### 3.2.4 服务状态获取函数

```powershell
function Get-ServiceStatus {
    param([object]$config)
    # 支持单端口和多端口配置
    # 返回运行状态和端口信息
}
```

### 3.3 各服务启动函数实现

#### 3.3.1 Redis 启动

```powershell
function Start-RedisService {
    param([object]$config)
    
    # 1. 设置终端窗口标题
    $host.UI.RawUI.WindowTitle = "Redis"
    
    # 2. 显示终端占用警告
    Show-TerminalWarning
    
    # 3. 检查服务状态
    # 4. 处理 ForceRestart
    # 5. 验证可执行文件存在
    # 6. 切换到 Redis 目录并前台启动
}
```

#### 3.3.2 ZooKeeper 启动

```powershell
function Start-ZooKeeperService {
    param([object]$config)
    
    # 与 Redis 类似的前台启动方式
    # 切换到 ZooKeeper bin 目录
    # 执行 zkServer.cmd
}
```

#### 3.3.3 SpringBoot 启动

```powershell
function Start-SpringBootService {
    param([object]$config, [object]$globalPaths)
    
    # 1. 检查端口冲突
    # 2. 自动编译（如果启用）
    # 3. 验证 WAR 文件存在
    # 4. 根据 launchMode 选择启动方式：
    #    - terminal: 直接在终端启动 Java 进程
    #    - debug: 打开 Trae IDE 进行 F5 调试
}
```

**Terminal 模式实现要点**：
- 支持 exploded WAR 和标准 WAR 结构
- 自动检测 WEB-INF/classes 和 WEB-INF/lib 目录
- 设置正确的 classpath
- 前台运行 Java 进程

**Debug 模式实现要点**：
- 使用 Trae IDE CLI 打开工作区
- 显示调试配置信息
- 指导用户按 F5 启动调试

#### 3.3.4 前端启动

```powershell
function Start-FrontendService {
    param([object]$config, [object]$globalPaths)
    
    # 1. 验证端口是否被 Node.js 进程占用
    # 2. 检查项目路径
    # 3. 使用配置的 Node.js 路径
    # 4. 自动安装依赖（首次运行）
    # 5. 执行 npm run dev
}
```

**关键实现**：
- 前端服务检测需验证进程名为 `node` 或 `node.exe`
- 临时将 Node.js 目录添加到 PATH
- 支持自定义 Node.js 版本

---

## 四、用户交互规范

### 4.1 终端警告信息

```
⚠️  IMPORTANT: This terminal will be occupied by the service.
   Do NOT run other commands in this terminal after starting the service.
   Use a separate terminal for status checks or other operations.
```

### 4.2 状态显示格式

```
========================================
  Service Status
========================================

Service    Port Status      
-------    ---- ------
Redis      6379 [OK] Running
ZooKeeper  2181 [--] Stopped
SpringBoot 8010 [--] Stopped
Frontend   8091 [--] Stopped
```

### 4.3 日志输出格式

```
========================================
  Service Log
========================================
Working Dir: <工作目录>
Command: <执行命令>

<服务日志输出...>
```

---

## 五、错误处理规范

### 5.1 常见错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 配置文件不存在 | 显示错误并退出 |
| 可执行文件不存在 | 显示完整路径并提示检查配置 |
| 端口被占用 | 显示占用进程信息，提供 ForceRestart 选项 |
| Maven 编译失败 | 显示错误并返回 |
| WAR 文件不存在 | 提示手动编译命令 |
| Node.js 版本不兼容 | 提示配置正确的 nodePath |

### 5.2 故障排查文档

需包含以下内容：
- ZooKeeper 文件访问错误解决方案
- ZooKeeper AdminServer 端口冲突解决方案
- SpringBoot WAR 文件不存在解决方案
- 前端 OpenSSL 错误解决方案
- 端口占用问题解决方案
- 内存不足调整方案

---

## 六、Skill 元数据

### 6.1 SKILL.md 内容

```yaml
---
name: bemp-automation-startserver
description: BEMP项目开发环境启动Skill，用于在IDE终端中启动Redis、ZooKeeper、SpringBoot后端及前端开发服务器。所有服务进程以前台方式运行，日志直接显示在终端控制台
---

**触发关键词**：启动bemp服务、启动前端服务、启动后端服务、启动所有服务、启动redis、启动zk
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
```

---

## 七、使用规范

### 7.1 核心规则

1. **每个服务必须在独立的 IDE 终端中启动**
2. **服务启动后，不要在该终端执行其他命令**
3. **使用 `-Status` 参数时，使用独立的终端**

### 7.2 推荐启动顺序

```
后端：Redis (6379) → ZooKeeper (2181) → SpringBoot (8010) 
前端：Frontend (8091)
```

### 7.3 命令示例

```powershell
# 查看状态
.\start-bemp-env.ps1 -Status

# 启动单个服务
.\start-bemp-env.ps1 -Service redis
.\start-bemp-env.ps1 -Service zookeeper
.\start-bemp-env.ps1 -Service springboot
.\start-bemp-env.ps1 -Service frontend

# 强制重启
.\start-bemp-env.ps1 -Service redis -ForceRestart
```

---

## 八、环境要求

| 组件 | 版本要求 |
|------|----------|
| JDK | 1.8+ |
| Node.js | 14.x+（推荐） |
| Maven | 3.6+ |
| PowerShell | 5.1+ |

---

## 九、交付物清单

1. `SKILL.md` - Skill 定义文件
2. `README.md` - 完整使用指南
3. `config/config.json` - 服务配置文件
4. `scripts/start-bemp-env.ps1` - 主启动脚本
5. `scripts/demo-check.ps1` - 环境检查脚本
6. `docs/troubleshooting.md` - 故障排查指南

---

## 十、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v5.9.0 | 2026-04-17 | 新增终端窗口标题自动设置功能 |
| v5.7.0 | 2026-04-17 | 添加终端使用警告和最佳实践指导 |
| v5.6.0 | 2026-04-17 | 移除 Maven 直接启动方式，保留 F5 Debug 模式 |
| v5.5.0 | 2026-04-17 | 重大变更：SpringBoot 改为 Trae IDE Debug 模式 |
| v5.0.0 | 2026-04-15 | 重构为开发环境启动 Skill，移除测试功能 |

---

> 此提示词包含了构建 `bemp-automation-startserver` Skill 所需的全部信息，可确保在任何开发环境中复现相同功能和质量的 Skill。
