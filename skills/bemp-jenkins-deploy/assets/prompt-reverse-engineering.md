# BEMP Jenkins Pipeline Skill创建提示词

请根据以下规格说明，创建Skill，用于生成两个Jenkins Declarative Pipeline脚本：`Jenkinsfile-served`（后端）和`Jenkinsfile-frontend`（前端），用于BEMP银行电子票据管理平台在Windows环境下的自动化部署。

---

## 一、全局架构规范

### 1.1 Pipeline结构

两个脚本均采用`pipeline { agent environment parameters options stages post }`声明式语法。

### 1.2 Agent配置

空label + customWorkspace，**禁止**使用不存在的节点标签：
- 后端：`customWorkspace 'D:/code/QJ/BEMP5.0DEV/banks/ext-hnnxbank'`
- 前端：`customWorkspace 'D:/code/QJ/BEMP5.0DEV/frontend'`

### 1.3 Options块

```groovy
options {
    timeout(time: 1800, unit: 'SECONDS')
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
    retry(1)
}
```

### 1.4 编码规范

- environment块路径统一正斜杠，bat脚本中`replace('/', '\\')`转反斜杠
- bat脚本开头`chcp 65001 > nul`
- environment设置`JAVA_TOOL_OPTIONS='-Dfile.encoding=UTF-8'`、`LANG='zh_CN.UTF-8'`
- 服务启动bat块必须`set JENKINS_NODE_COOKIE=dontKillMe`（防Jenkins杀子进程）

### 1.5 阶段跳过机制

`when { expression { return !params.SKIP_XXX } }`，每个阶段对应一个`booleanParam`。阶段编号用数字前缀（如`1. 代码拉取`）。

### 1.6 日志格式

每个阶段开头输出`==========================================`分隔线 + 阶段描述 + 关键参数。

---

## 二、后端流水线（Jenkinsfile-served）- 8个阶段

### 2.1 Parameters

GIT_BRANCH(string,feature/hnnxbank/dev)、FORCE_OVERWRITE(boolean,true)、SKIP_SONAR(boolean,true)、SKIP_TESTS(boolean,true)、SKIP_CODE_PULL(boolean,true)、SKIP_MAVEN_BUILD(boolean,false)、SKIP_CONFIG_REPLACE(boolean,true)、SKIP_BACKUP(boolean,false)、SKIP_UPLOAD(boolean,false)、SKIP_REDIS(boolean,false)、SKIP_ZOOKEEPER(boolean,false)、SKIP_BEMP_SERVED(boolean,false)、DEPLOY_ENVIRONMENT(choice,dev/test/staging/prod)、NOTIFY_EMAIL(string,wangnan@hundsun.com)、BUILD_THREADS(string,4)

### 2.2 Environment分组

- 编码：JAVA_TOOL_OPTIONS, LANG
- Git：GIT_REPO_URL=https://gitlab.hundsun.com/bemp/banks.git, GIT_CREDENTIALS_ID, GIT_RETRY_COUNT=3
- Maven：JAVA_HOME_BUILD=D:/code/Java/jdk1.8.0_341, MAVEN_HOME, MAVEN_SETTINGS, POM_PATH
- SonarQube：JAVA_HOME_SONAR=D:/code/Java/jdk-25.0.1, SONAR_SCANNER_HOME, SONAR_SERVER_URL, SONAR_PROJECT_KEY=bemp-ext-hnnxbank, SONAR_TOKEN
- 部署：CURRENT_WAR=D:/code/QJ/bempDeploy/bemp-served, SOURCE_WAR=hnnxbank-served-deploy/target/bemp-served, TARGET_DIR, BACKUP_DIR, MAX_BACKUPS=3
- 配置替换：CONFIG_REPLACE_WORKSPACE, CONFIG_REPLACE_TARGET_DIR, CONFIG_REPLACE_FILES=application.properties
- 依赖服务：REDIS_EXE, REDIS_PORT=6379, REDIS_TIMEOUT=30, ZOOKEEPER_EXE, ZOOKEEPER_PORT=2181, ZOOKEEPER_TIMEOUT=60
- bemp-served：BEMP_SERVED_HOME, BEMP_SERVED_PORT=8010, HEALTH_CHECK_URL, BEMP_SERVED_TIMEOUT=600, JVM_OPTS(-Xms2048m -Xmx4096m等)
- 元数据：BUILD_TIMESTAMP='', BUILD_VERSION='', GIT_COMMIT_ID=''

### 2.3 阶段1: 代码拉取

- while重试(maxRetries=GIT_RETRY_COUNT, sleep(5)间隔)
- GitSCM浅克隆(depth:1,shallow:true,noTags:true,honorRefspec:true,timeout:900)+CleanBeforeCheckout
- withEnv网络优化：GIT_HTTP_LOW_SPEED_LIMIT=1000, GIT_HTTP_LOW_SPEED_TIME=60, http.postBuffer=524288000
- `git rev-parse HEAD`获取commitId赋值env.GIT_COMMIT_ID
- **后端特有**：输出Git调试信息(dir /s /b, git status, git remote -v, git branch -a, git log -1)
- 完整性校验：pom.xml、hnnxbank-served-deploy/pom.xml、hnnxbank-biz-as/pom.xml

### 2.4 阶段2: Maven编译打包

- 生成BUILD_TIMESTAMP和BUILD_VERSION(1.0.0-时间戳)
- `mvn clean install -DskipTests -T${BUILD_THREADS} -s ${MAVEN_SETTINGS} -f ${POM_PATH}`
- bat块显式set JAVA_HOME、PATH(JAVA_HOME_BUILD/bin+MAVEN_HOME/bin)、MAVEN_OPTS=-Xmx2048m
- 构建后验证SOURCE_WAR目录存在

### 2.5 阶段3: SonarQube扫描

- withEnv(JAVA_HOME_SONAR, PATH+SONAR)，bat中再次显式set
- sonar-scanner用`^`续行，参数：host.url, projectKey, projectName(英文避乱码), projectVersion, sources=., java.binaries(多模块逗号分隔), sourceEncoding=UTF-8, qualitygate.wait=true, login
- returnStatus:true，退出码非0则error

### 2.6 阶段4: 应用备份

- BUILD_TIMESTAMP空值保护：`env.BUILD_TIMESTAMP ? env.BUILD_TIMESTAMP : new Date().format('yyyyMMddHHmmss')`
- 路径replace('/','\\')，`chcp 65001 > nul && if not exist mkdir`
- **zip压缩备份**：PowerShell Compress-Archive，变量转义`\$`，先Remove-Item再-Force压缩
- 文件名：`bemp-served_时间戳.zip`，验证压缩包存在
- 历史清理：`dir /b /o-d`倒序+`call :check_delete`子程序，count>MAX_BACKUPS删除

### 2.7 阶段5: 部署包上传

- 验证SOURCE_WAR存在→FORCE_OVERWRITE判断(否则return)→rmdir /s /q→mkdir→xcopy /E /I /H /Y→验证目标目录

### 2.8 阶段6: 配置文件替换（仅后端）

- CONFIG_REPLACE_FILES按逗号split遍历，源=CONFIG_REPLACE_WORKSPACE/relativePath
- 目标路径：含`src/main/java/`或`src/main/resources/`则截取其后部分
- mkdir+copy /Y替换，统计replaceCount和skipCount

### 2.9 阶段8: Redis启动（编号跳过7）

- `start "Redis Server"` + JENKINS_NODE_COOKIE=dontKillMe，sleep(3)
- 端口检测循环：`netstat -ano | findstr :${PORT} | findstr LISTENING || exit /b 0`，sleep(2)间隔，超时error

### 2.10 阶段9: Zookeeper启动

- 同Redis模式，`start "Zookeeper Server"`

### 2.11 阶段10: bemp-served启动

- **先检测端口占用终止旧进程**：`setlocal enabledelayedexpansion`，for /f遍历netstat取PID，PID非0则taskkill /F
- **启动**：`start /b java %JVM_OPTS% -cp ../classes;../lib/* com.hundsun.bemp.BempServedAppStarter`
- 必须显式set JAVA_HOME和PATH（Jenkins服务账户不继承用户环境变量）
- cd /d切换BEMP_SERVED_HOME，端口检测循环sleep(5)间隔

### 2.12 Post块

- success：输出版本/时间/CommitID+通知
- failure：失败信息+通知
- always：archiveArtifacts(artifacts:'logs/**/*', allowEmptyArchive:true)

---

## 三、前端流水线（Jenkinsfile-frontend）- 6个阶段

### 3.1 Parameters

GIT_BRANCH(string,feature/hnnxbank/dev)、FORCE_OVERWRITE(boolean,true)、SKIP_CODE_PULL(boolean,true)、SKIP_NPM_BUILD(boolean,false)、SKIP_SONAR(boolean,true)、SKIP_BACKUP(boolean,false)、SKIP_UPLOAD(boolean,false)、SKIP_NGINX(boolean,false)、DEPLOY_ENVIRONMENT(choice,dev/test/staging/prod)、NOTIFY_EMAIL(string,wangnan@hundsun.com)

### 3.2 Environment分组

- 编码/Git：同后端，但GIT_REPO_URL=https://gitlab.hundsun.com/bemp/frontend.git
- Node.js：NODE_HOME=D:/code/nodejs14, NODE_EXE=D:/code/nodejs14/node.exe, WORK_DIR=.
- SonarQube：SONAR_PROJECT_KEY=bemp-frontend
- 部署：CURRENT_WAR=D:/code/nginx-1.12.2/html/bemp-web, SOURCE_WAR=bemp-web, TARGET_DIR=D:/code/nginx-1.12.2/html, BACKUP_DIR, MAX_BACKUPS=3
- Nginx：NGINX_EXE, NGINX_HOME, NGINX_PORT=8091, NGINX_TIMEOUT=60, HEALTH_CHECK_URL=http://localhost:8091
- 元数据：BUILD_TIMESTAMP, BUILD_VERSION, GIT_COMMIT_ID, ARTIFACT_MD5

### 3.3 阶段1: 代码拉取

- 与后端类似，但**无**Git调试信息，校验package.json/src/vue.config.js

### 3.4 阶段2: 前端编译打包

- withEnv(NODE_HOME, PATH+NODE)，dir(env.WORK_DIR)
- **三步编译**：npm install → npm run dll → npm run build，每步`set PATH=${NODE_HOME};%PATH% & npm xxx`，returnStatus:true检测退出码
- 验证bemp-web目录存在

### 3.5 阶段3: SonarQube扫描

- -Dsonar.sources=frontend/src，无-Dsonar.java.binaries

### 3.6 阶段4: 应用备份

- 同后端zip压缩逻辑，文件名前缀`bemp-web_`
- BUILD_TIMESTAMP三重空值保护：`timestamp == null || timestamp == 'null' || timestamp.trim().isEmpty()`

### 3.7 阶段5: 部署包上传

- 目标路径`${targetDir}\\bemp-web`，删除用`rd /s /q`

### 3.8 阶段6: Nginx服务启动（前端特有）

**使用Nginx内置工具检测，非端口监听**，在dir(nginxHome)中执行：
1. 配置测试：`"${nginxExe}" -t 2>&1`，检查含"successful"
2. 停止旧进程：`taskkill /F /IM nginx.exe 2>nul || echo Nginx未运行`，sleep(2)
3. 启动：`start "nginx" "${nginxExe}"`，sleep(3)
4. 进程验证：`tasklist | findstr nginx.exe || exit /b 0`，检查含"nginx.exe"
5. 失败诊断：输出logs\error.log内容

### 3.9 Post块

- success/failure用`?:`运算符提供默认值：`env.BUILD_VERSION ?: 'unknown'`
- always：archiveArtifacts + echo清理信息

---

## 四、关键技术要点

1. **进程隔离**：服务启动必须`set JENKINS_NODE_COOKIE=dontKillMe`
2. **端口检测容错**：findstr未匹配返回退出码1会致构建失败，必须`|| exit /b 0`
3. **bemp-served特殊性**：`start /b java`后台启动，显式set JAVA_HOME/PATH，先终止端口占用进程，classpath=`-cp ../classes;../lib/*`
4. **Nginx检测特殊性**：`nginx -t`内置工具验证配置+`tasklist | findstr nginx.exe`进程验证，在dir(nginxHome)上下文执行
5. **备份zip压缩**：PowerShell Compress-Archive，变量转义`\$`，先Remove-Item再-Force压缩
6. **BUILD_TIMESTAMP空值保护**：阶段可能被跳过导致为空，备份阶段必须null检查并赋默认值

---

## 五、后端与前端差异对照

| 维度 | 后端(served) | 前端(frontend) |
|------|-------------|---------------|
| 阶段数 | 8个(1-6,8-10) | 6个(1-6) |
| 构建工具 | Maven | Node.js(npm) |
| 编译步骤 | mvn clean install | npm install→dll→build |
| 特有阶段 | 配置替换(6)、Redis(8)、ZK(9)、bemp-served(10) | Nginx启动(6) |
| 服务检测 | 端口监听(netstat) | nginx -t + tasklist |
| Git调试 | 详细调试输出 | 无 |
| 校验文件 | pom.xml等3个 | package.json/src/vue.config.js |
| 备份前缀 | bemp-served_ | bemp-web_ |
| post块 | 直接引用env | ?:运算符提供默认值 |
| SonarQube | sources=. + java.binaries | sources=frontend/src |
