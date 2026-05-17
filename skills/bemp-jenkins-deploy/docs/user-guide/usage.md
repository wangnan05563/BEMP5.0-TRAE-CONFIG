# 使用指南

## 快速开始

### 1. 修改配置

直接编辑 `assets/Jenkinsfile-served` 或 `assets/Jenkinsfile-frontend` 的 `environment` 块：

```groovy
environment {
    JAVA_HOME_BUILD = 'D:/code/Java/jdk1.8.0_341'
    MAVEN_HOME = 'D:/code/apache-maven-3.6.3'
    REDIS_EXE = 'D:/code/Redis-x64-5.0.14.1/redis-server.exe'
    BEMP_SERVED_HOME = 'D:/code/QJ/bempDeploy/bemp-served/WEB-INF/classes'
    BEMP_SERVED_PORT = '8010'
}
```

> 配置参考：[config/bemp-deploy.yml](../../config/bemp-deploy.yml)

### 2. 创建Jenkins项目

1. 新建Pipeline任务
2. 选择 **Pipeline script** 方式
3. 复制 `assets/Jenkinsfile-served`（后端）或 `assets/Jenkinsfile-frontend`（前端）内容
4. 保存

### 3. 触发构建

手动：进入项目 → **立即构建** / **带参数构建**

MCP自动化：
```python
mcp_jenkins_triggerBuild(
    jobFullName="BEMP-Backend-Deploy",
    parameters={"GIT_BRANCH": "main", "SKIP_SONAR": True}
)
```

### 4. 验证部署

```bash
netstat -ano | findstr :8010 | findstr LISTENING   # bemp-served
netstat -ano | findstr :6379 | findstr LISTENING   # Redis
netstat -ano | findstr :8091 | findstr LISTENING   # Nginx
```

---

## 环境要求

| 软件 | 版本 | 用途 |
|------|------|------|
| Jenkins | 2.x+ | CI/CD平台 |
| Java JDK | 8+ | 后端运行时 |
| Apache Maven | 3.6+ | 后端构建 |
| Node.js | 14+ | 前端构建 |
| Git | 2.x+ | 版本控制 |

可选：SonarQube、Redis、Zookeeper、Nginx

---

## 构建参数

### 后端参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| GIT_BRANCH | string | feature/hnnxbank/dev | 目标分支 |
| FORCE_OVERWRITE | boolean | true | 强制覆盖部署包 |
| SKIP_SONAR | boolean | true | 跳过SonarQube扫描 |
| SKIP_TESTS | boolean | true | 跳过单元测试 |
| SKIP_CODE_PULL | boolean | true | 跳过代码拉取 |
| SKIP_MAVEN_BUILD | boolean | false | 跳过Maven编译打包 |
| SKIP_CONFIG_REPLACE | boolean | true | 跳过配置文件替换 |
| SKIP_BACKUP | boolean | false | 跳过应用备份 |
| SKIP_UPLOAD | boolean | false | 跳过部署包上传 |
| SKIP_REDIS | boolean | false | 跳过Redis启动 |
| SKIP_ZOOKEEPER | boolean | false | 跳过Zookeeper启动 |
| SKIP_BEMP_SERVED | boolean | false | 跳过bemp-served启动 |
| DEPLOY_ENVIRONMENT | choice | dev | 部署环境(dev/test/staging/prod) |
| NOTIFY_EMAIL | string | wangnan@hundsun.com | 通知邮箱 |
| BUILD_THREADS | string | 4 | Maven构建线程数 |

### 前端参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| GIT_BRANCH | string | feature/hnnxbank/dev | 目标分支 |
| FORCE_OVERWRITE | boolean | true | 强制覆盖 |
| SKIP_CODE_PULL | boolean | true | 跳过代码拉取 |
| SKIP_NPM_BUILD | boolean | false | 跳过前端编译打包 |
| SKIP_SONAR | boolean | true | 跳过扫描 |
| SKIP_BACKUP | boolean | false | 跳过备份 |
| SKIP_UPLOAD | boolean | false | 跳过上传 |
| SKIP_NGINX | boolean | false | 跳过Nginx启动 |
| DEPLOY_ENVIRONMENT | choice | dev | 部署环境 |
| NOTIFY_EMAIL | string | wangnan@hundsun.com | 通知邮箱 |

---

## MCP自动化操作

```python
mcp_jenkins_getStatus()                                          # 检查Jenkins状态
mcp_jenkins_triggerBuild(jobFullName="BEMP-Backend-Deploy", ...) # 触发构建
mcp_jenkins_getBuild(jobFullName="BEMP-Backend-Deploy")          # 查看构建状态
mcp_jenkins_getBuildLog(jobFullName="BEMP-Backend-Deploy", limit=-100)  # 查看日志
mcp_jenkins_searchBuildLog(jobFullName="BEMP-Backend-Deploy", pattern="ERROR")  # 搜索错误
```

> 完整MCP接口：[jenkins-mcp-guide.md](../references/jenkins-mcp-guide.md)

---

## 高级配置

### 自定义阶段跳过

在 parameters 块添加参数，在 stages 中用 `when { expression { !params.SKIP_XXX } }` 控制。

### 多环境部署

创建不同环境的 Jenkinsfile 副本，修改 environment 块中对应的配置值。

### 自定义备份策略

修改 environment 块中的 `BACKUP_DIR` 和 `MAX_BACKUPS`。

### 扩展服务启动

在 environment 块添加新服务配置，在 parameters 块添加 SKIP 参数，添加新 stage。

---

*相关文档: [故障排查](../troubleshooting/faq.md) | [架构说明](../architecture/overview.md) | [Pipeline语法](../references/jenkins-pipeline-syntax.md)*
