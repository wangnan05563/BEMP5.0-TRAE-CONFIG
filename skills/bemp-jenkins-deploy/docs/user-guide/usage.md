# 用户使用指南

## 完整的使用说明和高级配置

---

## 目录

1. [功能概述](#1-功能概述)
2. [环境要求](#2-环境要求)
3. [配置详解](#3-配置详解)
4. [Jenkins项目创建](#4-jenkins项目创建)
5. [执行构建](#5-执行构建)
6. [MCP自动化操作](#6-mcp自动化操作)
7. [高级配置](#7-高级配置)

---

## 1. 功能概述

### 核心能力

| 功能 | 说明 |
|------|------|
| **后端部署** | 8阶段完整流水线（Git→Maven→Sonar→备份→部署→配置替换→启动服务）|
| **前端部署** | 6阶段流水线（Git→npm build→Sonar→备份→Nginx）|
| **配置内联** | 所有参数直接定义在Jenkinsfile environment块，无需外部配置文件 |
| **阶段跳过** | 支持跳过任意阶段，灵活组合 |
| **自动备份** | 部署前自动备份，支持历史清理 |
| **健康检查** | 服务启动后验证端口监听 |
| **编码安全** | 全面UTF-8支持，解决Windows中文乱码 |

### 适用场景

- 本地开发环境的快速部署
- CI/CD流水线自动化
- 多环境切换（dev/test/prod）
- 前后端分离部署

---

## 2. 环境要求

### 必需软件

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| Jenkins | 2.x+ | CI/CD平台 |
| Java JDK | 8+ (推荐8u341) | 后端运行时 |
| Apache Maven | 3.6+ | 后端构建工具 |
| Node.js | 14+ | 前端构建工具 |
| Git | 2.x+ | 版本控制 |

### 可选软件

| 软件 | 用途 | 说明 |
|------|------|------|
| SonarQube | 代码质量分析 | 可通过参数跳过 |
| Redis | 缓存服务 | 后端依赖 |
| Zookeeper | 注册中心 | 后端依赖 |
| Nginx | Web服务器 | 前端依赖 |

---

## 3. 配置详解

### 3.1 配置方式 - Jenkinsfile environment块

所有配置直接定义在 Jenkinsfile 的 `environment` 块中：

```groovy
environment {
    // ---- 编码设置 ----
    JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
    LANG = 'zh_CN.UTF-8'

    // ---- Git配置 ----
    GIT_REPO_URL = 'https://gitlab.hundsun.com/bemp/banks.git'
    GIT_CREDENTIALS_ID = 'gitlab-credentials'
    GIT_RETRY_COUNT = '3'

    // ---- Maven构建配置 ----
    JAVA_HOME_BUILD = 'D:/code/Java/jdk1.8.0_341'
    MAVEN_HOME = 'D:/code/apache-maven-3.6.3'
    MAVEN_SETTINGS = 'D:/code/apache-maven-3.6.3/conf/settings-Artifactory.xml'
    POM_PATH = 'pom.xml'

    // ---- 部署配置 ----
    CURRENT_WAR = 'D:/code/QJ/bempDeploy/bemp-served'
    SOURCE_WAR = 'hnnxbank-served-deploy/target/bemp-served'
    TARGET_DIR = 'D:/code/QJ/bempDeploy'
    BACKUP_DIR = 'D:/code/QJ/bempDeploy/backup'
    MAX_BACKUPS = '3'

    // ---- 配置文件替换 ----
    CONFIG_REPLACE_WORKSPACE = 'D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank'
    CONFIG_REPLACE_TARGET_DIR = 'D:/code/QJ/bempDeploy/bemp-served/WEB-INF/classes'
    CONFIG_REPLACE_FILES = 'application.properties'

    // ---- bemp-served服务 ----
    BEMP_SERVED_HOME = 'D:/code/QJ/bempDeploy/bemp-served/WEB-INF/classes'
    BEMP_SERVED_PORT = '8010'
    BEMP_SERVED_TIMEOUT = '600'
    JVM_OPTS = '-server -Xms2048m -Xmx4096m ...'
}
```

### 3.2 构建参数 - parameters块

```groovy
parameters {
    string(name: 'GIT_BRANCH', defaultValue: 'feature/hnnxbank/dev', description: 'Git仓库目标分支')
    booleanParam(name: 'FORCE_OVERWRITE', defaultValue: true, description: '是否强制覆盖')
    booleanParam(name: 'SKIP_SONAR', defaultValue: true, description: '是否跳过SonarQube扫描')
    booleanParam(name: 'SKIP_TESTS', defaultValue: true, description: '是否跳过单元测试')
    booleanParam(name: 'SKIP_CODE_PULL', defaultValue: true, description: '是否跳过代码拉取')
    booleanParam(name: 'SKIP_MAVEN_BUILD', defaultValue: false, description: '是否跳过Maven编译打包')
    booleanParam(name: 'SKIP_CONFIG_REPLACE', defaultValue: true, description: '是否跳过配置文件替换')
    booleanParam(name: 'SKIP_BACKUP', defaultValue: false, description: '是否跳过应用备份')
    booleanParam(name: 'SKIP_UPLOAD', defaultValue: false, description: '是否跳过部署包上传')
    booleanParam(name: 'SKIP_REDIS', defaultValue: false, description: '是否跳过Redis服务启动')
    booleanParam(name: 'SKIP_ZOOKEEPER', defaultValue: false, description: '是否跳过Zookeeper服务启动')
    booleanParam(name: 'SKIP_BEMP_SERVED', defaultValue: false, description: '是否跳过bemp-served服务启动')
    choice(name: 'DEPLOY_ENVIRONMENT', choices: ['dev', 'test', 'staging', 'prod'], description: '部署目标环境')
    string(name: 'NOTIFY_EMAIL', defaultValue: 'wangnan@hundsun.com', description: '构建通知邮箱')
    string(name: 'BUILD_THREADS', defaultValue: '4', description: 'Maven构建线程数')
}
```

> 详细配置说明请参考 [config/README.md](../config/README.md)

---

## 4. Jenkins项目创建

### 方式一：Pipeline脚本方式（推荐）

#### 后端部署任务

1. 进入Jenkins → 新建Item → 输入名称 `BEMP-Backend-Deploy`
2. 选择 **Pipeline** → 确定
3. 在 **Pipeline** 区域选择 **Pipeline script**
4. 复制 `assets/Jenkinsfile-served` 的全部内容粘贴到脚本框
5. 点击 **保存**

#### 前端部署任务

1. 新建Item → 输入名称 `BEMP-Frontend-Deploy`
2. 选择 **Pipeline** → 确定
3. 复制 `assets/Jenkinsfile-frontend` 的内容
4. 点击 **保存**

### 方式二：SCM方式（适合团队协作）

1. 将Jenkinsfile推送到Git仓库
2. Jenkins Pipeline配置选择 **Pipeline script from SCM**
3. 配置仓库地址和脚本路径

---

## 5. 执行构建

### 手动触发

1. 进入项目页面
2. 点击 **立即构建**
3. 如需修改参数，点击 **带参数构建**

### 参数说明

#### 后端构建参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| GIT_BRANCH | string | feature/hnnxbank/dev | 目标Git分支 |
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

#### 前端构建参数

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

### 构建日志查看

点击构建号 → **Console Output** 查看实时日志。

关键日志标记：
- `==========================================` - 阶段分隔符
- `成功` / `完成` - 正常完成
- `失败` / `超时` - 错误信息

---

## 6. MCP自动化操作

### 6.1 基本操作

```python
# 1. 检查Jenkins状态
mcp_jenkins_getStatus()

# 2. 触发构建
mcp_jenkins_triggerBuild(
    jobFullName="BEMP-Backend-Deploy",
    parameters={
        "GIT_BRANCH": "main",
        "SKIP_SONAR": True,
        "FORCE_OVERWRITE": True
    }
)

# 3. 查看构建状态
mcp_jenkins_getBuild(jobFullName="BEMP-Backend-Deploy")

# 4. 查看最新日志
mcp_jenkins_getBuildLog(
    jobFullName="BEMP-Backend-Deploy",
    limit=-100  # 最后100行
)
```

### 6.2 问题排查工作流

```python
# 步骤1: 查看构建是否成功
build = mcp_jenkins_getBuild("BEMP-Backend-Deploy")
print(build['result'])  # SUCCESS / FAILURE / UNSTABLE

# 步骤2: 如果失败，搜索错误日志
if build['result'] != 'SUCCESS':
    errors = mcp_jenkins_searchBuildLog(
        jobFullName="BEMP-Backend-Deploy",
        pattern="ERROR",
        useRegex=False
    )
    print(errors)

# 步骤3: 查看测试结果（如果有）
tests = mcp_jenkins_getTestResults(
    jobFullName="BEMP-Backend-Deploy",
    onlyFailingTests=True
)
```

### 6.3 自动化部署脚本示例

```python
def deploy_backend(branch, skip_sonar=True):
    """一键部署后端"""
    # 检查Jenkins可用性
    status = mcp_jenkins_getStatus()
    if not status.get('ready', False):
        raise Exception("Jenkins不可用")

    # 触发构建
    result = mcp_jenkins_triggerBuild(
        jobFullName="BEMP-Backend-Deploy",
        parameters={
            "GIT_BRANCH": branch,
            "SKIP_SONAR": str(skip_sonar).lower(),
            "FORCE_OVERWRITE": "true"
        }
    )

    queue_id = result.get('queueId')
    print(f"构建已加入队列，ID: {queue_id}")

    return queue_id
```

> 完整MCP接口文档请参考 [jenkins-mcp-guide.md](../references/jenkins-mcp-guide.md)

---

## 7. 高级配置

### 7.1 自定义阶段跳过

在 Jenkinsfile 的 parameters 块中添加新参数：

```groovy
booleanParam(name: 'SKIP_CUSTOM_STAGE', defaultValue: false, description: '跳过自定义阶段')
```

在stages中使用：

```groovy
stage('自定义阶段') {
    when { expression { !params.SKIP_CUSTOM_STAGE } }
    steps {
        // ...
    }
}
```

### 7.2 多环境配置

创建不同环境的 Jenkinsfile 副本：

```bash
# 开发环境
cp assets/Jenkinsfile-served assets/Jenkinsfile-served-dev

# 生产环境
cp assets/Jenkinsfile-served assets/Jenkinsfile-served-prod
```

每个副本修改 environment 块中对应的配置值。

### 7.3 自定义备份策略

修改 Jenkinsfile environment 块：

```groovy
environment {
    BACKUP_DIR = 'D:/backups'
    MAX_BACKUPS = '5'
}
```

### 7.4 扩展服务启动

在 environment 块添加新服务配置：

```groovy
environment {
    MYSQL_EXE = 'D:/MySQL/bin/mysqld.exe'
    MYSQL_PORT = '3306'
    MYSQL_TIMEOUT = '60'
}
```

在 parameters 块添加跳过参数：

```groovy
booleanParam(name: 'SKIP_MYSQL', defaultValue: false, description: '是否跳过MySQL服务启动')
```

---

## 下一步

- [快速开始](../getting-started/quick-start.md) - 5分钟上手
- [故障排查](../troubleshooting/index.md) - 解决常见问题
- [架构文档](../architecture/overview.md) - 了解系统设计

---

*最后更新: 2026-04-26*
