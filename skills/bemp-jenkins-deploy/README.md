# BEMP Jenkins Pipeline Deployer

为 BEMP 后端和前端项目生成可直接使用的 Jenkins Pipeline 自动化部署脚本，支持构建触发、状态监控、日志查看和 CI/CD 操作管理。

## 功能特性

| 功能 | 描述 |
|------|------|
| **前后端分离部署** | 后端 Maven 8阶段 / 前端 Node.js 6阶段 |
| **配置内联** | environment 块直接定义，无外部 YAML 依赖 |
| **阶段独立跳过** | 每个阶段独立 `SKIP_XXX` 参数 |
| **自动备份与回滚** | zip 压缩备份 + 失败自动从最新备份恢复 |
| **并行启动** | Redis + Zookeeper parallel 并行块 |
| **健康检查** | health-check.ps1 TCP/HTTP/Nginx 三模式统一检测 |
| **凭据安全** | SonarQube Token 使用 Jenkins Credentials 外部化管理 |
| **MCP 集成** | 构建触发、状态监控、日志搜索 |

## 目录结构

```
bemp-jenkins-deploy/
├── SKILL.md                              # 技能主文档（AI 入口）
├── CHANGELOG.md                          # 版本变更记录
├── config/
│   ├── bemp-deploy.yml                  # 配置参考清单（非运行时加载）
│   └── README.md                        # 配置修改指引
├── assets/
│   ├── Jenkinsfile-served               # 后端 8阶段流水线脚本
│   ├── Jenkinsfile-frontend             # 前端 6阶段流水线脚本
│   ├── sonar-project.properties         # SonarQube 配置模板
│   └── prompt-reverse-engineering.md    # 设计约束参考
├── scripts/
│   ├── health-check.ps1                 # 服务健康检查（TCP/HTTP/Nginx）
│   ├── cleanup-backups.ps1              # 备份历史清理
│   └── validate-file.ps1                # 文件完整性校验
└── docs/
    ├── index.md                         # 文档导航
    ├── user-guide/usage.md              # 完整使用指南
    ├── troubleshooting/
    │   ├── faq.md                       # 常见问题
    │   └── known-issues.md              # 已知问题（历史修复）
    ├── architecture/overview.md         # 系统架构与模块设计
    └── references/
        ├── jenkins-pipeline-syntax.md   # Pipeline 语法参考
        ├── error-handling-rollback.md   # 错误处理与回滚机制
        ├── service-startup-templates.md # 服务启动模板
        └── jenkins-mcp-guide.md         # MCP 接口使用指南
```

## 快速开始

### 1. 修改配置

直接编辑 `assets/Jenkinsfile-served`（后端）或 `assets/Jenkinsfile-frontend`（前端）的 `environment` 块：

```groovy
environment {
    JAVA_HOME_BUILD = 'D:/code/Java/jdk1.8.0_341'
    MAVEN_HOME = 'D:/code/apache-maven-3.6.3'
    REDIS_EXE = 'D:/code/Redis-x64-5.0.14.1/redis-server.exe'
    BEMP_SERVED_PORT = '8010'
}
```

> 完整配置项：[config/bemp-deploy.yml](config/bemp-deploy.yml)

### 2. 创建 Jenkins 项目

1. Jenkins 新建 **Pipeline** 任务
2. 选择 **Pipeline script** 方式
3. 复制对应 Jenkinsfile 内容并粘贴
4. 保存 → **立即构建** / **带参数构建**

### 3. MCP 触发

```python
mcp_jenkins_triggerBuild(jobFullName="BEMP-Backend-Deploy", parameters={"GIT_BRANCH": "main"})
```

## 流水线阶段

### 后端（8阶段）

| # | 阶段 | 跳过参数 |
|---|------|---------|
| 1 | 代码拉取（Git浅克隆+校验） | `SKIP_CODE_PULL` |
| 2 | Maven 编译打包 | `SKIP_MAVEN_BUILD` |
| 3 | SonarQube 扫描 | `SKIP_SONAR` |
| 4 | 应用备份（zip+清理） | `SKIP_BACKUP` |
| 5 | 部署包上传 | `SKIP_UPLOAD` |
| 6 | 配置文件替换 | `SKIP_CONFIG_REPLACE` |
| 8-9 | Redis & ZK **并行**启动 | `SKIP_REDIS` / `SKIP_ZOOKEEPER` |
| 10 | bemp-served 启动（Java+健康检查） | `SKIP_BEMP_SERVED` |

### 前端（6阶段）

| # | 阶段 | 跳过参数 |
|---|------|---------|
| 1 | 代码拉取 | `SKIP_CODE_PULL` |
| 2 | 前端编译（npm install+dll+build） | `SKIP_NPM_BUILD` |
| 3 | SonarQube 扫描 | `SKIP_SONAR` |
| 4 | 应用备份（zip+清理） | `SKIP_BACKUP` |
| 5 | 部署包上传 | `SKIP_UPLOAD` |
| 6 | Nginx 启动（nginx -t+进程验证） | `SKIP_NGINX` |

## 关键技术约束

| 约束 | 实现 |
|------|------|
| **Windows 编码** | bat 开头 `chcp 65001 > nul`，environment 设 `JAVA_TOOL_OPTIONS` |
| **进程隔离** | `set JENKINS_NODE_COOKIE=dontKillMe` |
| **路径规范** | environment 用正斜杠，bat 执行前 `replace('/', '\\')` |
| **端口检测容错** | `findstr` 后加 `\|\| exit /b 0` |
| **bemp-served 启动** | `start /b java` + 显式 set JAVA_HOME/PATH |

## 环境要求

| 软件 | 版本 | 用途 |
|------|------|------|
| Jenkins | 2.x+ | CI/CD 平台 |
| Java JDK | 8+ | 后端运行时 |
| Maven | 3.6+ | 后端构建 |
| Node.js | 14+ | 前端构建 |
| Git | 2.x+ | 版本控制 |
| SonarQube | 可选 | 代码质量门禁 |
| Redis / Zookeeper / Nginx | 可选 | 依赖服务 |

## 版本

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v6.1.0 | 2026-05-17 | 文档精简（-32%行数），SKILL.md 瘦身至索引路由 |
| v6.0.0 | 2026-05-17 | 凭据外部化、健康检查脚本集成、并行启动、失败回滚 |
| v5.0.0 | 2026-04-27 | 配置内联、参数名统一、阶段编号对齐 |

> 完整历史：[CHANGELOG.md](CHANGELOG.md)

## 文档导航

| 需求 | 文档 |
|------|------|
| 技能入口（AI 触发） | [SKILL.md](SKILL.md) |
| 完整使用指南 | [docs/user-guide/usage.md](docs/user-guide/usage.md) |
| 配置修改 | [config/README.md](config/README.md) |
| 故障排查 | [docs/troubleshooting/faq.md](docs/troubleshooting/faq.md) |
| 架构说明 | [docs/architecture/overview.md](docs/architecture/overview.md) |
| MCP 操作 | [docs/references/jenkins-mcp-guide.md](docs/references/jenkins-mcp-guide.md) |
| Pipeline 语法 | [docs/references/jenkins-pipeline-syntax.md](docs/references/jenkins-pipeline-syntax.md) |
| 服务启动/回滚 | [docs/references/](docs/references/) |