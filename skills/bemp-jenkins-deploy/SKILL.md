---
name: "bemp-jenkins-deploy"
description: "为BEMP后端和前端项目生成可直接使用的Jenkins Pipeline自动化部署脚本。支持Jenkins MCP集成，实现构建触发、状态监控、日志查看和CI/CD操作管理。当用户需要CI/CD流水线配置、Jenkinsfile创建、自动化部署配置、构建触发或BEMP项目DevOps自动化时调用。"
---

# BEMP Jenkins Pipeline Deployer

## 技能概述

本技能专门用于为BEMP后端和前端项目生成可直接使用的Jenkins Pipeline自动化部署脚本，并集成Jenkins MCP接口实现自动化构建触发、状态监控、日志查看等CI/CD操作。

**核心特性**:
- ✅ 前后端分离部署（Maven + Node.js）
- ✅ 配置内联（environment块直接定义，YAML仅作参考文档）
- ✅ 阶段独立跳过（每个阶段均有SKIP参数）
- ✅ 自动备份与历史清理（zip压缩）
- ✅ SonarQube代码质量门禁
- ✅ Nginx内置工具检测（nginx -t + 进程验证）
- ✅ 全面UTF-8编码支持

---

## 触发场景

| 场景 | 说明 |
|------|------|
| 创建Jenkins Pipeline脚本 | 生成完整的Jenkinsfile |
| 配置自动化部署流水线 | 后端或前端部署流程 |
| CI/CD流水线模板 | 标准化的部署模板 |
| DevOps自动化方案 | 完整的DevOps工作流 |
| SonarQube质量门禁 | 代码质量扫描配置 |
| 服务自动启动 | Redis/Zookeeper/bemp-served |
| Jenkins MCP操作 | 构建触发、状态监控 |

---

## 快速开始

### 1. 修改配置

直接编辑 `assets/Jenkinsfile-served` 或 `assets/Jenkinsfile-frontend` 中的 `environment` 块：

```groovy
environment {
    JAVA_HOME_BUILD = 'D:/code/Java/jdk1.8.0_341'
    MAVEN_HOME = 'D:/code/apache-maven-3.6.3'
    REDIS_EXE = 'D:/code/Redis-x64-5.0.14.1/redis-server.exe'
    // ... 其他配置
}
```

> 配置参考文档：[config/bemp-deploy.yml](config/bemp-deploy.yml)

### 2. 创建Jenkins任务

复制 `assets/Jenkinsfile-served`（后端）或 `assets/Jenkinsfile-frontend`（前端）到Jenkins Pipeline任务中。

### 3. 触发构建

```python
# 使用MCP接口自动触发
mcp_jenkins_triggerBuild(
    jobFullName="BEMP-Backend-Deploy",
    parameters={"GIT_BRANCH": "main"}
)
```

---

## 执行流程

### 后端流水线（8个阶段）

| 阶段 | 名称 | 说明 | 可跳过参数 |
|------|------|------|-----------|
| 1 | 代码拉取 | Git checkout + 浅克隆 + 完整性校验 | SKIP_CODE_PULL |
| 2 | Maven编译打包 | mvn clean install | SKIP_MAVEN_BUILD |
| 3 | SonarQube扫描 | 代码质量分析 | SKIP_SONAR |
| 4 | 应用备份 | xcopy目录备份 + 历史清理 | SKIP_BACKUP |
| 5 | 部署包上传 | xcopy复制到目标目录 | SKIP_UPLOAD |
| 6 | 配置文件替换 | 按列表逐个替换配置文件 | SKIP_CONFIG_REPLACE |
| 8 | Redis启动 | 端口监听检测 | SKIP_REDIS |
| 9 | Zookeeper启动 | 端口监听检测 | SKIP_ZOOKEEPER |
| 10 | bemp-served启动 | Java直接启动 + 端口检测 | SKIP_BEMP_SERVED |

> 注：阶段7已跳过（原Tomcat阶段已移除），阶段编号直接从6跳到8

### 前端流水线（6个阶段）

| 阶段 | 名称 | 说明 | 可跳过参数 |
|------|------|------|-----------|
| 1 | 代码拉取 | Git checkout + customWorkspace | SKIP_CODE_PULL |
| 2 | 前端编译打包 | npm install + npm run dll + npm run build | SKIP_NPM_BUILD |
| 3 | SonarQube扫描 | 前端代码质量 | SKIP_SONAR |
| 4 | 应用备份 | zip压缩备份 + 历史清理 | SKIP_BACKUP |
| 5 | 部署包上传 | xcopy复制到Nginx目录 | SKIP_UPLOAD |
| 6 | Nginx启动 | nginx -t配置测试→停止旧进程→启动新→进程验证 | SKIP_NGINX |

---

## 目录结构

```
bemp-jenkins-deploy/
├── SKILL.md                    # 技能主文档（本文档）
├── CHANGELOG.md                # 版本变更记录
├── config/                     # 配置文件
│   ├── bemp-deploy.yml        # 配置参考文档（记录所有内联配置项）
│   ├── pipeline-parameters.yml# 构建参数定义
│   └── README.md              # 配置使用说明
├── assets/                     # 核心资源
│   ├── Jenkinsfile-served     # 后端Pipeline脚本（v5.0.0 配置内联版）
│   ├── Jenkinsfile-frontend   # 前端Pipeline脚本（v5.0.0 配置内联版）
│   └── sonar-project.properties # SonarQube模板
├── scripts/                    # 辅助脚本
│   ├── validate-file.ps1      # 文件完整性验证
│   ├── cleanup-backups.ps1    # 备份清理
│   └── health-check.ps1       # 服务健康检查
└── docs/                       # 详细文档
    ├── index.md               # 文档导航索引 ⭐
    ├── getting-started/        # 快速入门
    │   └── quick-start.md     # 5分钟上手指南
    ├── user-guide/             # 用户指南
    │   └── usage.md           # 完整使用说明
    ├── troubleshooting/        # 故障排查
    │   ├── index.md           # 问题快速定位
    │   ├── faq.md            # 常见问题与解决方案
    │   └── known-issues.md    # 已知问题记录
    ├── architecture/           # 架构文档
    │   └── overview.md        # 系统架构设计
    └── references/             # 技术参考
        ├── jenkins-pipeline-syntax.md  # Pipeline语法
        ├── error-handling-rollback.md  # 错误处理规范
        ├── service-startup-templates.md # 服务启动模板
        └── jenkins-mcp-guide.md        # MCP接口指南
```

---

## 文档导航

| 需求 | 推荐阅读 |
|------|---------|
| **第一次使用？** | [快速开始](docs/getting-started/quick-start.md) |
| **配置环境** | [配置说明](config/README.md) |
| **完整使用手册** | [用户指南](docs/user-guide/usage.md) |
| **遇到问题** | [故障排查](docs/troubleshooting/index.md) |
| **了解架构** | [架构文档](docs/architecture/overview.md) |
| **技术参考** | [参考文档](docs/references/) |

---

## 关键技术要点

### Windows编码处理

全面解决Windows环境下中文乱码问题：

```groovy
// bat脚本开头设置UTF-8代码页
bat "chcp 65001 > nul && copy ..."

// environment块设置编码
environment {
    JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
    LANG = 'zh_CN.UTF-8'
}

// JVM参数确保Java程序编码正确
JVM_OPTS = '-server -Xms2048m -Xmx4096m ... -Dfile.encoding=UTF-8'
```

### 进程隔离

防止Jenkins杀死子进程：

```groovy
bat """
    set JENKINS_NODE_COOKIE=dontKillMe
    start "Service Name" "path/to/service.exe"
"""
```

### 路径标准化

统一使用正斜杠（配置）和反斜杠（执行）：

```groovy
// environment块中使用正斜杠
TARGET_DIR = 'D:/code/QJ/bempDeploy'

// 执行前转换为反斜杠
def normalizedTargetDir = env.TARGET_DIR.replace('/', '\\')
bat "chcp 65001 > nul & xcopy \"${source}\" \"${targetDirPath}\\\" /E /I /H /Y"
```

### bemp-served启动模式

使用 `start /b` 后台启动 + 显式设置JAVA_HOME：

```groovy
bat """
    set JENKINS_NODE_COOKIE=dontKillMe
    set JAVA_HOME=${env.JAVA_HOME_BUILD}
    set PATH=%JAVA_HOME%\\bin;%PATH%
    cd /d "${env.BEMP_SERVED_HOME}"
    start /b java %JVM_OPTS% -cp ../classes;../lib/* com.hundsun.bemp.BempServedAppStarter
"""
```

---

## 版本信息

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v5.0.0 | 2026-04-27 | 配置内联版：移除YAML加载机制，所有配置直接定义在environment块；参数名统一(SKIP_BEMP_SERVED)；阶段编号与实际脚本对齐；前端备份改为zip压缩；Nginx检测改为内置工具验证 |
| v4.0.0 | 2026-04-26 | 目录结构重组、文档整合、FAQ精简 |
| v3.0.0 | 2026-04-25 | 前端参数提取、配置校验增强 |
| v2.0.0 | 2026-04-24 | 配置外部化、MD5校验优化 |
| v1.0.0 | 2026-04-23 | 初始版本 |

详细变更记录：[CHANGELOG.md](CHANGELOG.md)

---

## 相关技能

- **bemp-personalized-dev**: BEM个性化开发技能
- **bemp-backend-code-review**: 后端代码审查
- **bemp-frontend-code-review**: 前端代码审查

---

*技能版本: v5.0.0 | 最后更新: 2026-04-27*
