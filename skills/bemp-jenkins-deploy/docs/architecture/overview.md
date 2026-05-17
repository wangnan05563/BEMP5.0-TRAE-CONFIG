# BEMP Jenkins Pipeline Deployer 架构说明

## 系统概述

BEMP Jenkins Pipeline Deployer 是一个专为河南农信BEMP项目设计的Jenkins部署自动化技能，支持前后端分离的CI/CD流水线，包含完整的构建、测试、扫描、备份、部署和服务启动流程。

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户交互层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ SKILL.md │  │ MCP接口   │  │ Jenkins UI│                │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      配置层                                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ bemp-deploy.yml │  │ pipeline-params  │                 │
│  │ (参考文档)       │  │ (参数定义参考)    │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  注: 实际配置直接定义在 Jenkinsfile environment 块中          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     流水线层                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Jenkinsfile-served  │  │ Jenkinsfile-frontend │         │
│  │    (后端8阶段)       │  │    (前端6阶段)        │         │
│  └─────────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     脚本工具层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │validate-file │  │cleanup-backup│  │ health-check │     │
│  │   .ps1       │  │    s.ps1     │  │    .ps1      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 目录结构（v6.0.0）

```
bemp-jenkins-deploy/
├── SKILL.md                    # 技能主文档（入口）
├── CHANGELOG.md                # 版本变更记录
│
├── config/                     # 配置目录
│   ├── bemp-deploy.yml        # 配置参考文档（非运行时加载）
│   └── README.md              # 配置使用说明
│
├── assets/                     # 核心资源
│   ├── Jenkinsfile-served     # 后端Pipeline脚本
│   ├── Jenkinsfile-frontend   # 前端Pipeline脚本
│   └── sonar-project.properties # SonarQube模板
│
├── scripts/                    # 辅助脚本
│   ├── validate-file.ps1      # 文件完整性验证
│   ├── cleanup-backups.ps1    # 备份清理
│   └── health-check.ps1       # 服务健康检查
│
└── docs/                       # 详细文档
    ├── index.md               # 文档导航索引
    ├── user-guide/             # 用户指南
    ├── troubleshooting/        # 故障排查
    ├── architecture/           # 架构文档（本文档）
    └── references/             # 技术参考
        ├── jenkins-pipeline-syntax.md
        ├── error-handling-rollback.md
        ├── service-startup-templates.md
        └── jenkins-mcp-guide.md
```

---

## 模块设计

### 1. 配置模块 (config/)

**职责**: 提供配置参考文档，实际配置直接定义在Jenkinsfile中

| 配置文件 | 职责 | 运行时加载 |
|----------|------|-----------|
| bemp-deploy.yml | 记录所有内联配置项，新环境部署参考 | 否 |

**设计原则**:
- 配置内联：所有配置直接定义在Jenkinsfile的environment块
- 参考文档：YAML文件仅作配置清单和变更参考
- 单一修改点：修改配置只需编辑Jenkinsfile

### 2. 流水线模块 (assets/)

**职责**: 定义CI/CD流程的核心逻辑

#### 后端流水线 (Jenkinsfile-served)

```
阶段 1: 代码拉取 ← Git checkout + 浅克隆 + 完整性校验
    ↓
阶段 2: Maven编译打包 ← mvn clean install
    ↓
阶段 3: SonarQube扫描 ← 代码质量分析
    ↓
阶段 4: 应用备份 ← xcopy目录备份 + 历史清理
    ↓
阶段 5: 部署包上传 ← xcopy复制到目标目录
    ↓
阶段 6: 配置文件替换 ← 按列表逐个替换
    ↓
阶段 8: Redis启动 ← start + dontKillMe + 端口检测
    ↓
阶段 9: Zookeeper启动 ← start + dontKillMe + 端口检测
    ↓
阶段 10: bemp-served启动 ← start /b java + 端口检测
```

#### 前端流水线 (Jenkinsfile-frontend)

```
阶段 1: 代码拉取 ← Git checkout + customWorkspace
    ↓
阶段 2: 前端编译打包 ← npm install + npm run dll + npm run build
    ↓
阶段 3: SonarQube扫描 ← 前端代码质量
    ↓
阶段 4: 应用备份 ← zip压缩备份 + 历史清理
    ↓
阶段 5: 部署包上传 ← xcopy复制到Nginx目录
    ↓
阶段 6: Nginx启动 ← nginx -t配置测试→停止旧进程→启动新→进程验证
```

### 3. 脚本模块 (scripts/)

**职责**: 提供可复用的辅助功能

| 脚本 | 功能 | 使用场景 |
|------|------|---------|
| validate-file.ps1 | 文件存在性、大小、MD5验证 | 部署前校验 |
| cleanup-backups.ps1 | 自动清理历史备份（支持目录和文件模式） | 备份策略执行 |
| health-check.ps1 | 端口监听检测、HTTP健康检查 | 服务启动验证 |

---

## 数据流图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Jenkinsfile │────▶│  environment │────▶│  执行引擎    │
│  -served     │     │   块(内联)    │     │  (Jenkins)   │
└──────────────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       ▼                                         ▼
┌──────────────┐                          ┌──────────────┐
│  parameters  │                          │  辅助脚本    │
│  块(内联)     │                          │  (.ps1)      │
└──────────────┘                          └──────────────┘
```

---

## 扩展点

### 1. 添加新的服务

在 Jenkinsfile 的 environment 块添加配置：
```groovy
environment {
    NEW_SERVICE_EXE = 'D:/path/to/service.exe'
    NEW_SERVICE_PORT = '9999'
    NEW_SERVICE_TIMEOUT = '60'
}
```

在 parameters 块添加跳过参数：
```groovy
parameters {
    booleanParam(name: 'SKIP_NEW_SERVICE', defaultValue: false, description: '是否跳过新服务启动')
}
```

添加新阶段：
```groovy
stage('新服务启动') {
    when { expression { !params.SKIP_NEW_SERVICE } }
    steps { script { /* 启动逻辑 */ } }
}
```

### 2. 支持多环境部署

创建不同环境的 Jenkinsfile 副本：
```bash
# 开发环境
cp assets/Jenkinsfile-served assets/Jenkinsfile-served-dev

# 生产环境
cp assets/Jenkinsfile-served assets/Jenkinsfile-served-prod
```

---

## 技术栈

| 组件 | 技术 | 版本要求 |
|------|------|---------|
| CI/CD | Jenkins | 2.x+ |
| 语言 | Groovy (Pipeline DSL) | 2.x+ |
| 后端构建 | Apache Maven | 3.6+ |
| 前端构建 | Node.js / npm | 22+ |
| 代码质量 | SonarQube | 9.x+ |
| 版本控制 | Git | 2.x+ |
| 操作系统 | Windows Server | 2016+ |
| 辅助脚本 | PowerShell | 5.1+ |

---

## 设计原则

1. **配置内联**: 所有配置直接定义在Jenkinsfile的environment块，减少外部依赖
2. **阶段独立**: 每个阶段可独立跳过，支持灵活组合
3. **容错优先**: 关键操作都有错误处理和重试机制
4. **日志完善**: 结构化日志输出，便于问题排查
5. **编码安全**: 全面UTF-8支持，解决Windows中文乱码问题

---

*最后更新: 2026-05-17*
