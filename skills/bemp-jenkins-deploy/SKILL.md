---
name: "bemp-jenkins-deploy"
description: "为BEMP后端和前端项目生成可直接使用的Jenkins Pipeline自动化部署脚本。支持Jenkins MCP集成，实现构建触发、状态监控、日志查看和CI/CD操作管理。"
whenToUse: "当用户需要CI/CD流水线配置、Jenkinsfile创建、自动化部署配置、构建触发或BEMP项目DevOps自动化时调用。"
triggers: "Jenkins/CD/CI/DevOps/自动化/部署/构建/触发"
---

# BEMP Jenkins Pipeline Deployer

## 核心特性

- 前后端分离部署（Maven + Node.js）
- 配置内联（environment块直接定义，YAML仅作参考文档）
- 阶段独立跳过（每个阶段均有SKIP参数）
- 自动备份与失败自动回滚
- SonarQube代码质量门禁（凭据外部化）
- Redis & Zookeeper并行启动
- 统一健康检查（health-check.ps1 TCP/HTTP/Nginx三模式）

## 触发场景

| 场景 | 说明 |
|------|------|
| 创建Jenkins Pipeline脚本 | 生成完整的Jenkinsfile |
| 配置自动化部署流水线 | 后端或前端部署流程 |
| CI/CD流水线模板 | 标准化的部署模板 |
| DevOps自动化方案 | 完整的DevOps工作流 |
| Jenkins MCP操作 | 构建触发、状态监控 |

## 信息获取指引

| 需求 | 读取文件 |
|------|---------|
| 修改Jenkinsfile/配置 | 直接读取 `assets/Jenkinsfile-served` 或 `assets/Jenkinsfile-frontend` 的 environment 块 |
| 配置参考清单 | `config/bemp-deploy.yml` |
| 完整使用说明 | `docs/user-guide/usage.md` |
| 故障排查 | `docs/references/error-handling-rollback.md` |
| MCP自动化操作 | `docs/references/jenkins-mcp-guide.md` |
| 服务启动问题 | `docs/references/service-startup-templates.md` |
| Pipeline语法参考 | `docs/references/jenkins-pipeline-syntax.md` |
| 常见问题 | `docs/troubleshooting/faq.md` |

## 快速开始

### 修改配置

直接编辑 Jenkinsfile 的 `environment` 块：

```groovy
environment {
    JAVA_HOME_BUILD = 'D:/code/Java/jdk1.8.0_341'
    MAVEN_HOME = 'D:/code/apache-maven-3.6.3'
    REDIS_EXE = 'D:/code/Redis-x64-5.0.14.1/redis-server.exe'
    // ... 其他配置
}
```

> 配置参考：[config/bemp-deploy.yml](config/bemp-deploy.yml)

### 触发构建

```python
mcp_jenkins_triggerBuild(
    jobFullName="BEMP-Backend-Deploy",
    parameters={"GIT_BRANCH": "main"}
)
```

> 完整MCP操作：[docs/references/jenkins-mcp-guide.md](docs/references/jenkins-mcp-guide.md)

## 执行流程

### 后端流水线（8个阶段）

| # | 阶段 | 跳过参数 |
|---|------|---------|
| 1 | 代码拉取（Git浅克隆+校验） | SKIP_CODE_PULL |
| 2 | Maven编译打包 | SKIP_MAVEN_BUILD |
| 3 | SonarQube扫描 | SKIP_SONAR |
| 4 | 应用备份（zip+历史清理） | SKIP_BACKUP |
| 5 | 部署包上传 | SKIP_UPLOAD |
| 6 | 配置文件替换 | SKIP_CONFIG_REPLACE |
| 8-9 | Redis & Zookeeper并行启动 | SKIP_REDIS / SKIP_ZOOKEEPER |
| 10 | bemp-served启动（Java+健康检查） | SKIP_BEMP_SERVED |

### 前端流水线（6个阶段）

| # | 阶段 | 跳过参数 |
|---|------|---------|
| 1 | 代码拉取 | SKIP_CODE_PULL |
| 2 | 前端编译打包（npm install+dll+build） | SKIP_NPM_BUILD |
| 3 | SonarQube扫描 | SKIP_SONAR |
| 4 | 应用备份（zip+历史清理） | SKIP_BACKUP |
| 5 | 部署包上传 | SKIP_UPLOAD |
| 6 | Nginx启动（nginx -t+进程验证） | SKIP_NGINX |

## 关键技术约束

> 详细代码示例见 [docs/references/jenkins-pipeline-syntax.md](docs/references/jenkins-pipeline-syntax.md)

- **Windows编码**: bat开头 `chcp 65001 > nul`，environment设 `JAVA_TOOL_OPTIONS='-Dfile.encoding=UTF-8'`
- **进程隔离**: 服务启动必须 `set JENKINS_NODE_COOKIE=dontKillMe`
- **路径规范**: environment用正斜杠，bat执行前 `replace('/', '\\')`
- **端口检测容错**: findstr后加 `|| exit /b 0`
- **bemp-served启动**: `start /b java` + 显式set JAVA_HOME/PATH

## 版本信息

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v6.0.0 | 2026-05-17 | SONAR_TOKEN凭据外部化；health-check.ps1/cleanup-backups.ps1集成；Redis+ZK并行；失败自动回滚 |
| v5.0.0 | 2026-04-27 | 配置内联版；参数名统一；阶段编号对齐 |

详细变更：[CHANGELOG.md](CHANGELOG.md)

---

*技能版本: v6.0.0 | 最后更新: 2026-05-17*
