# Jenkins Pipeline 语法参考

## 基本结构

```groovy
pipeline {
    agent {
        node {
            label ''
            customWorkspace 'D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank'
        }
    }

    environment { /* 配置内联 */ }

    parameters { /* 构建参数 */ }

    options { /* 全局选项 */ }

    stages { /* 构建阶段 */ }

    post { /* 构建后处理 */ }
}
```

---

## agent 配置

### 推荐方式 - 空label + customWorkspace

```groovy
agent {
    node {
        label ''
        customWorkspace 'D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank'
    }
}
```

> **注意**: 不要使用 `label 'windows-agent'` 等不存在的标签，会导致构建卡住。

---

## environment 块

所有配置直接定义在 environment 块中，不使用外部YAML文件加载：

```groovy
environment {
    JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
    LANG = 'zh_CN.UTF-8'

    JAVA_HOME_BUILD = 'D:/code/Java/jdk1.8.0_341'
    MAVEN_HOME = 'D:/code/apache-maven-3.6.3'

    BEMP_SERVED_HOME = 'D:/code/QJ/bempDeploy/bemp-served/WEB-INF/classes'
    BEMP_SERVED_PORT = '8010'
    JVM_OPTS = '-server -Xms2048m -Xmx4096m ...'
}
```

### 路径规范

| 场景 | 使用格式 | 示例 |
|------|---------|------|
| environment块定义 | 正斜杠 | `D:/code/QJ/bempDeploy` |
| bat脚本执行 | 反斜杠 | `D:\code\QJ\bempDeploy` |
| 路径转换 | `replace('/', '\\')` | 在bat块前转换 |

---

## parameters 块

### 后端参数

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

### 参数命名规范

| 前缀 | 含义 | 示例 |
|------|------|------|
| `SKIP_` | 跳过某阶段 | `SKIP_SONAR`, `SKIP_BEMP_SERVED` |
| 其他 | 功能参数 | `GIT_BRANCH`, `FORCE_OVERWRITE` |

---

## options 块

```groovy
options {
    timeout(time: 1800, unit: 'SECONDS')
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
    retry(1)
}
```

---

## when 条件

```groovy
stage('3. SonarQube扫描') {
    when { expression { !params.SKIP_SONAR } }
    steps { script { /* ... */ } }
}
```

---

## bat 命令规范

### 编码设置

```groovy
bat "chcp 65001 > nul && your_command"
```

### 进程隔离

```groovy
bat """
    set JENKINS_NODE_COOKIE=dontKillMe
    start "Service" "path/to/service.exe"
"""
```

### 端口检测

```groovy
def output = bat(
    script: "netstat -ano | findstr :${port} | findstr LISTENING || exit /b 0",
    returnStdout: true
).trim()
```

### 返回值获取

```groovy
def output = bat(script: "your_command", returnStdout: true).trim()
```

---

## 常见陷阱

### 1. 不要使用 sh() 命令

Windows环境必须使用 `bat()`，不能用 `sh()`。

### 2. 路径中的反斜杠

Groovy字符串中反斜杠需要转义，推荐使用正斜杠定义，执行前转换。

### 3. findstr 退出码

`findstr` 未找到匹配时返回退出码1，会导致Jenkins构建失败。添加 `|| exit /b 0`。

### 4. start 命令参数

`start` 命令的第一个引号参数是窗口标题，不是命令：
```batch
start "窗口标题" "可执行文件路径"
```

### 5. 环境变量不继承

Jenkins服务账户不继承用户环境变量，必须在bat块中显式设置JAVA_HOME等。

---

*相关文档: [错误处理规范](error-handling-rollback.md) | [服务启动模板](service-startup-templates.md)*
