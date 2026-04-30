# 快速开始指南

## 5分钟上手BEMP Jenkins Pipeline部署

---

## 前置条件

- Jenkins 2.x+ 已安装并运行
- Git凭据已配置（ID: `gitlab-credentials`）
- SonarQube服务已启动（可选）

---

## 第一步：修改配置

直接编辑 `assets/Jenkinsfile-served` 或 `assets/Jenkinsfile-frontend` 中的 `environment` 块：

```groovy
environment {
    // ---- Maven构建配置 ----
    JAVA_HOME_BUILD = 'D:/code/Java/jdk1.8.0_341'
    MAVEN_HOME = 'D:/code/apache-maven-3.6.3'

    // ---- 依赖服务 ----
    REDIS_EXE = 'D:/code/Redis-x64-5.0.14.1/redis-server.exe'
    ZOOKEEPER_EXE = 'D:/code/apache-zookeeper-3.8.3-bin/bin/zkServer.cmd'

    // ---- bemp-served服务 ----
    BEMP_SERVED_HOME = 'D:/code/QJ/bempDeploy/bemp-served/WEB-INF/classes'
    BEMP_SERVED_PORT = '8010'
}
```

> 详细配置说明请参考 [config/README.md](../config/README.md)

---

## 第二步：创建Jenkins项目

### 后端部署

1. 新建Pipeline任务：`BEMP-Backend-Deploy`
2. 选择 **Pipeline script** 方式
3. 复制 `assets/Jenkinsfile-served` 内容到脚本框
4. 点击 **保存**

### 前端部署

1. 新建Pipeline任务：`BEMP-Frontend-Deploy`
2. 选择 **Pipeline script** 方式
3. 复制 `assets/Jenkinsfile-frontend` 内容到脚本框
4. 点击 **保存**

---

## 第三步：触发构建

### 方式一：手动构建

1. 进入项目页面
2. 点击 **立即构建**
3. 如需修改参数，点击 **带参数构建**

### 方式二：使用MCP自动化

```python
# 检查Jenkins状态
mcp_jenkins_getStatus()

# 触发后端构建
mcp_jenkins_triggerBuild(
    jobFullName="BEMP-Backend-Deploy",
    parameters={
        "GIT_BRANCH": "feature/hnnxbank/dev",
        "SKIP_SONAR": True,
        "FORCE_OVERWRITE": True
    }
)

# 查看构建日志
mcp_jenkins_getBuildLog(
    jobFullName="BEMP-Backend-Deploy",
    limit=100
)
```

> 完整MCP操作指南请参考 [jenkins-mcp-guide.md](../references/jenkins-mcp-guide.md)

---

## 第四步：验证部署

### 后端服务检查

```bash
# 检查Redis（端口6379）
netstat -ano | findstr :6379 | findstr LISTENING

# 检查Zookeeper（端口2181）
netstat -ano | findstr :2181 | findstr LISTENING

# 检查bemp-served（端口8010）
netstat -ano | findstr :8010 | findstr LISTENING
```

### 前端服务检查

```bash
# 检查Nginx（端口8091）
netstat -ano | findstr :8091 | findstr LISTENING

# HTTP访问测试
curl http://localhost:8091
```

---

## 构建阶段说明

### 后端流水线（8个阶段）

| 阶段 | 说明 | 可跳过参数 | 预计时间 |
|------|------|-----------|---------|
| 1. 代码拉取 | Git浅克隆+完整性校验 | SKIP_CODE_PULL | 1-3分钟 |
| 2. Maven编译打包 | mvn clean install | SKIP_MAVEN_BUILD | 5-15分钟 |
| 3. SonarQube扫描 | 代码质量扫描 | SKIP_SONAR | 3-10分钟 |
| 4. 应用备份 | xcopy目录备份+历史清理 | SKIP_BACKUP | <30秒 |
| 5. 部署包上传 | xcopy复制到目标目录 | SKIP_UPLOAD | <15秒 |
| 6. 配置文件替换 | 按列表逐个替换 | SKIP_CONFIG_REPLACE | <10秒 |
| 8. Redis启动 | 端口监听检测 | SKIP_REDIS | <30秒 |
| 9. Zookeeper启动 | 端口监听检测 | SKIP_ZOOKEEPER | <60秒 |
| 10. bemp-served启动 | Java直接启动+端口检测 | SKIP_BEMP_SERVED | 3-5分钟 |

> 注：阶段7已跳过（原Tomcat阶段已移除）

### 前端流水线（6个阶段）

| 阶段 | 说明 | 预计时间 |
|------|------|---------|
| 1. 代码拉取 | Git克隆+customWorkspace | 1-3分钟 |
| 2. 前端编译打包 | npm install + npm run dll + npm run build | 3-10分钟 |
| 3. SonarQube扫描 | 前端代码质量扫描 | 2-5分钟 |
| 4. 应用备份 | zip压缩备份+历史清理 | <30秒 |
| 5. 部署包上传 | xcopy复制到Nginx目录 | <15秒 |
| 6. Nginx启动 | nginx -t配置测试→停止旧进程→启动新→进程验证 | <30秒 |

---

## 常用参数

#### 后端构建参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `GIT_BRANCH` | feature/hnnxbank/dev | 目标分支 |
| `FORCE_OVERWRITE` | true | 强制覆盖部署包 |
| `SKIP_SONAR` | true | 跳过SonarQube扫描 |
| `SKIP_TESTS` | true | 跳过单元测试 |
| `SKIP_CODE_PULL` | true | 跳过代码拉取 |
| `SKIP_MAVEN_BUILD` | false | 跳过Maven编译打包 |
| `SKIP_CONFIG_REPLACE` | true | 跳过配置文件替换 |
| `SKIP_REDIS` | false | 跳过Redis启动 |
| `SKIP_ZOOKEEPER` | false | 跳过ZK启动 |
| `SKIP_BEMP_SERVED` | false | 跳过bemp-served启动 |
| `DEPLOY_ENVIRONMENT` | dev | 部署环境 |

#### 前端构建参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `GIT_BRANCH` | feature/hnnxbank/dev | 目标分支 |
| `FORCE_OVERWRITE` | true | 强制覆盖部署包 |
| `SKIP_CODE_PULL` | true | 跳过代码拉取 |
| `SKIP_NPM_BUILD` | false | 跳过前端编译打包 |
| `SKIP_SONAR` | true | 跳过SonarQube扫描 |
| `SKIP_BACKUP` | false | 跳过应用备份 |
| `SKIP_UPLOAD` | false | 跳过部署包上传 |
| `SKIP_NGINX` | false | 跳过Nginx启动 |
| `DEPLOY_ENVIRONMENT` | dev | 部署环境 |

---

## 下一步

- [完整使用说明](../user-guide/usage.md) - 了解所有功能和高级配置
- [故障排查](../troubleshooting/index.md) - 解决常见问题
- [架构文档](../architecture/overview.md) - 了解系统设计

---

*需要更多帮助？查看 [常见问题](../troubleshooting/faq.md)*
