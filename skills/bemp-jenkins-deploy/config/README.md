# BEMP Jenkins Deploy 技能配置说明

## 目录结构

```
bemp-jenkins-deploy/
├── config/                    # 配置目录
│   ├── bemp-deploy.yml       # ✅ 配置参考文档（记录所有内联配置项）
│   └── pipeline-parameters.yml # 构建参数定义参考
├── assets/                   # 核心资源
│   ├── Jenkinsfile-served    # 后端部署流水线（v5.0.0 配置内联版）
│   └── Jenkinsfile-frontend  # 前端部署流水线（v5.0.0 配置内联版）
├── scripts/                  # 辅助脚本
└── docs/                     # 文档
```

## 配置方式说明

### v5.0.0 配置内联模式

**当前版本所有配置直接定义在 Jenkinsfile 的 `environment` 块中**，不再从外部YAML文件加载。

修改配置时，直接编辑对应的 Jenkinsfile：

- **后端配置**：编辑 `assets/Jenkinsfile-served` 的 `environment` 块
- **前端配置**：编辑 `assets/Jenkinsfile-frontend` 的 `environment` 块

### bemp-deploy.yml - 配置参考文档

**版本**: v5.0.0 | **状态**: 参考文档（非运行时加载）

本文件记录所有已内联到 Jenkinsfile 中的配置项，用途：
- 新环境部署时的配置清单
- 配置项变更时的参考对照
- 不参与流水线运行时加载

---

## 后端配置项 (Jenkinsfile-served)

### environment 块配置

| 配置分组 | 环境变量 | 说明 | 默认值 |
|----------|----------|------|--------|
| **编码** | JAVA_TOOL_OPTIONS | Java编码设置 | -Dfile.encoding=UTF-8 |
| | LANG | 系统语言编码 | zh_CN.UTF-8 |
| **Git** | GIT_REPO_URL | 仓库地址 | https://gitlab.hundsun.com/bemp/banks.git |
| | GIT_CREDENTIALS_ID | 凭据ID | gitlab-credentials |
| | GIT_RETRY_COUNT | 重试次数 | 3 |
| **Maven** | JAVA_HOME_BUILD | 构建用JDK路径 | D:/code/Java/jdk1.8.0_341 |
| | MAVEN_HOME | Maven安装路径 | D:/code/apache-maven-3.6.3 |
| | MAVEN_SETTINGS | settings文件路径 | D:/code/.../settings-Artifactory.xml |
| | POM_PATH | POM文件路径 | pom.xml |
| **SonarQube** | JAVA_HOME_SONAR | 扫描用JDK路径 | D:/code/Java/jdk-25.0.1 |
| | SONAR_SCANNER_HOME | Scanner安装路径 | D:/code/sonar/sonar-scanner-8.0.1... |
| | SONAR_SERVER_URL | 服务器地址 | http://localhost:9000 |
| | SONAR_PROJECT_KEY | 项目标识 | bemp-ext-hnnxbank |
| | SONAR_TOKEN | 认证Token | squ_xxx |
| **部署** | CURRENT_WAR | 当前部署目录 | D:/code/QJ/bempDeploy/bemp-served |
| | SOURCE_WAR | 构建产物路径 | hnnxbank-served-deploy/target/bemp-served |
| | TARGET_DIR | 部署目标根目录 | D:/code/QJ/bempDeploy |
| | BACKUP_DIR | 备份目录 | D:/code/QJ/bempDeploy/backup |
| | MAX_BACKUPS | 最大备份数 | 3 |
| **配置替换** | CONFIG_REPLACE_WORKSPACE | 替换源目录 | D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank |
| | CONFIG_REPLACE_TARGET_DIR | 替换目标目录 | D:/code/QJ/bempDeploy/bemp-served/WEB-INF/classes |
| | CONFIG_REPLACE_FILES | 替换文件列表 | application.properties |
| **依赖服务** | REDIS_EXE | Redis可执行文件 | D:/code/Redis-x64-5.0.14.1/redis-server.exe |
| | REDIS_PORT | Redis端口 | 6379 |
| | REDIS_TIMEOUT | 启动超时(秒) | 30 |
| | ZOOKEEPER_EXE | ZK可执行文件 | D:/code/.../zkServer.cmd |
| | ZOOKEEPER_PORT | ZK端口 | 2181 |
| | ZOOKEEPER_TIMEOUT | 启动超时(秒) | 60 |
| **bemp-served** | BEMP_SERVED_HOME | 应用工作目录 | D:/code/QJ/bempDeploy/bemp-served/WEB-INF/classes |
| | BEMP_SERVED_PORT | 服务端口 | 8010 |
| | HEALTH_CHECK_URL | 健康检查URL | http://localhost:8010/bemp-served/health |
| | BEMP_SERVED_TIMEOUT | 启动超时(秒) | 600 |
| | JVM_OPTS | JVM参数 | -server -Xms2048m -Xmx4096m ... |

### parameters 块配置

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
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

---

## 前端配置项 (Jenkinsfile-frontend)

### environment 块配置

| 配置分组 | 环境变量 | 说明 | 默认值 |
|----------|----------|------|--------|
| **Node.js** | NODE_HOME | Node安装路径 | D:/code/nodejs14 |
| | NODE_EXE | Node可执行文件 | D:/code/nodejs14/node.exe |
| | WORK_DIR | 前端工作目录 | . |
| **部署** | CURRENT_WAR | 当前部署目录 | D:/code/nginx-1.12.2/html/bemp-web |
| | SOURCE_WAR | 构建产物路径 | bemp-web |
| | TARGET_DIR | 部署目标目录 | D:/code/nginx-1.12.2/html |
| | BACKUP_DIR | 备份目录 | D:/code/nginx-1.12.2/html/backup |
| | MAX_BACKUPS | 最大备份数 | 3 |
| **Nginx** | NGINX_EXE | Nginx可执行文件 | D:/code/nginx-1.12.2/nginx.exe |
| | NGINX_HOME | Nginx安装目录 | D:/code/nginx-1.12.2 |
| | NGINX_PORT | Nginx端口 | 8091 |
| | NGINX_TIMEOUT | 启动超时(秒) | 60 |
| | HEALTH_CHECK_URL | 健康检查URL | http://localhost:8091 |

### parameters 块配置

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
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

## 配置修改指南

### 修改路径配置

直接编辑 Jenkinsfile 的 environment 块：

```groovy
environment {
    JAVA_HOME_BUILD = 'D:/new/path/to/jdk1.8.0_341'
    MAVEN_HOME = 'D:/new/path/to/apache-maven-3.6.3'
}
```

### 修改端口配置

```groovy
environment {
    REDIS_PORT = '6380'
    BEMP_SERVED_PORT = '8020'
}
```

### 新增配置文件替换项

```groovy
environment {
    CONFIG_REPLACE_FILES = 'application.properties,logback.xml,application-dev.properties'
}
```

---

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| **v5.0.0** | 2026-04-26 | ✨ 配置内联版：所有配置直接定义在Jenkinsfile environment块<br>📝 bemp-deploy.yml改为纯参考文档<br>🔄 参数名统一(SKIP_TOMCAT→SKIP_BEMP_SERVED, SKIP_CHECKOUT→SKIP_CODE_PULL)<br>🗑️ 移除env-config.yml和pipeline-config.yml引用 |
| v4.1.0 | 2026-04-26 | 合并配置文件为bemp-deploy.yml |
| v4.0.0 | 2026-04-25 | 目录结构重构 |

---

## 故障排查

### 常见问题

**Q: 修改了bemp-deploy.yml但配置未生效**
```
A: v5.0.0版本所有配置直接定义在Jenkinsfile的environment块中
   bemp-deploy.yml仅作为参考文档，不参与运行时加载
   请直接修改对应的Jenkinsfile文件
```

**Q: 配置值未生效**
```
A: 1. 确认修改的是正确的Jenkinsfile（served或frontend）
   2. 确认修改在environment块内
   3. 确认Groovy语法正确（字符串用单引号）
   4. 重新触发构建（参数变更需要新构建才能生效）
```

---

## 相关文档

- [SKILL.md](../SKILL.md) - 技能主文档
- [FAQ](../docs/troubleshooting/faq.md) - 常见问题解答
- [CHANGELOG](../CHANGELOG.md) - 版本变更记录
