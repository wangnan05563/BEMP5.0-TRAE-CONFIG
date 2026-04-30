# 服务启动模板

本文件提供 Redis、Zookeeper 和 bemp-served 服务的标准启动模板，适用于 Jenkins Pipeline 和 Windows 环境。

## 核心原则

### 防止 Jenkins 构建结束后杀死进程

Jenkins 默认会在构建结束后杀死所有子进程。必须设置 `JENKINS_NODE_COOKIE=dontKillMe` 环境变量：

```groovy
bat """
    set JENKINS_NODE_COOKIE=dontKillMe
    start "窗口标题" "可执行文件路径"
"""
```

### 启动方式对比

| 方式 | 弹出窗口 | 进程独立 | 适用场景 |
|------|----------|----------|----------|
| `start /b` | 否 | 是（配合 dontKillMe） | Java应用后台运行 |
| `start "标题"` | 是 | 是（配合 dontKillMe） | 需要查看日志窗口的exe |
| `PowerShell Start-Process` | 是 | 部分 | 需要更多控制 |

**推荐方案**：
- Redis/Zookeeper：`start "标题"` + `JENKINS_NODE_COOKIE=dontKillMe`
- bemp-served：`start /b java` + `JENKINS_NODE_COOKIE=dontKillMe` + 显式设置JAVA_HOME

---

## Redis 服务启动

### 环境变量配置

```groovy
environment {
    REDIS_EXE = 'D:/code/Redis-x64-5.0.14.1/redis-server.exe'
    REDIS_PORT = '6379'
    REDIS_TIMEOUT = '30'
}
```

### Jenkins Pipeline 启动代码

```groovy
stage('8. Redis服务启动') {
    when {
        expression { !params.SKIP_REDIS }
    }
    steps {
        script {
            echo "=========================================="
            echo "启动 Redis 服务 | 端口: ${env.REDIS_PORT} | 超时: ${env.REDIS_TIMEOUT}秒"
            echo "=========================================="

            bat """
                set JENKINS_NODE_COOKIE=dontKillMe
                start "Redis Server" "${env.REDIS_EXE}"
            """
            sleep(3)

            def redisStartTime = System.currentTimeMillis()
            def redisRunning = false
            def redisTimeoutMs = (env.REDIS_TIMEOUT as int) * 1000

            while ((System.currentTimeMillis() - redisStartTime) < redisTimeoutMs) {
                sleep(2)
                def netstatOutput = bat(script: "netstat -ano | findstr :${env.REDIS_PORT} | findstr LISTENING || exit /b 0", returnStdout: true).trim()
                if (netstatOutput && netstatOutput.contains("LISTENING")) {
                    redisRunning = true
                    echo "Redis 服务已在端口 ${env.REDIS_PORT} 上启动"
                    break
                }
                echo "等待 Redis 服务启动..."
            }

            if (!redisRunning) {
                error("Redis 服务启动超时（${env.REDIS_TIMEOUT}秒），端口 ${env.REDIS_PORT} 未监听")
            }

            echo "Redis 服务启动完成"
        }
    }
}
```

### Windows 手动启动

```batch
cd /d D:\code\Redis-x64-5.0.14.1
redis-server.exe
```

---

## Zookeeper 服务启动

### 环境变量配置

```groovy
environment {
    ZOOKEEPER_EXE = 'D:/code/apache-zookeeper-3.8.3-bin/bin/zkServer.cmd'
    ZOOKEEPER_PORT = '2181'
    ZOOKEEPER_TIMEOUT = '60'
}
```

### Jenkins Pipeline 启动代码

```groovy
stage('9. Zookeeper服务启动') {
    when {
        expression { !params.SKIP_ZOOKEEPER }
    }
    steps {
        script {
            echo "=========================================="
            echo "启动 Zookeeper 服务 | 端口: ${env.ZOOKEEPER_PORT} | 超时: ${env.ZOOKEEPER_TIMEOUT}秒"
            echo "=========================================="

            bat """
                set JENKINS_NODE_COOKIE=dontKillMe
                start "Zookeeper Server" "${env.ZOOKEEPER_EXE}"
            """
            sleep(3)

            def zkStartTime = System.currentTimeMillis()
            def zkRunning = false
            def zkTimeoutMs = (env.ZOOKEEPER_TIMEOUT as int) * 1000

            while ((System.currentTimeMillis() - zkStartTime) < zkTimeoutMs) {
                sleep(3)
                def netstatOutput = bat(script: "netstat -ano | findstr :${env.ZOOKEEPER_PORT} | findstr LISTENING || exit /b 0", returnStdout: true).trim()
                if (netstatOutput && netstatOutput.contains("LISTENING")) {
                    zkRunning = true
                    echo "Zookeeper 服务已在端口 ${env.ZOOKEEPER_PORT} 上启动"
                    break
                }
                echo "等待 Zookeeper 服务启动..."
            }

            if (!zkRunning) {
                error("Zookeeper 服务启动超时（${env.ZOOKEEPER_TIMEOUT}秒），端口 ${env.ZOOKEEPER_PORT} 未监听")
            }

            echo "Zookeeper 服务启动完成"
        }
    }
}
```

### Windows 手动启动

```batch
cd /d D:\code\apache-zookeeper-3.8.3-bin\bin
zkServer.cmd
```

---

## bemp-served 服务启动

### 环境变量配置

```groovy
environment {
    JAVA_HOME_BUILD = 'D:/code/Java/jdk1.8.0_341'
    BEMP_SERVED_HOME = 'D:/code/QJ/bempDeploy/bemp-served/WEB-INF/classes'
    BEMP_SERVED_PORT = '8010'
    BEMP_SERVED_TIMEOUT = '600'
    HEALTH_CHECK_URL = 'http://localhost:8010/bemp-served/health'
    JVM_OPTS = '-server -Xms2048m -Xmx4096m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=../tmp/heap.dump'
}
```

### Jenkins Pipeline 启动代码

```groovy
stage('10. bemp-served服务启动') {
    when {
        expression { !params.SKIP_BEMP_SERVED }
    }
    steps {
        script {
            echo "=========================================="
            echo "启动 bemp-served 服务 | 端口: ${env.BEMP_SERVED_PORT} | 超时: ${env.BEMP_SERVED_TIMEOUT}秒"
            echo "=========================================="

            def port = env.BEMP_SERVED_PORT

            // 先检测并终止占用端口的旧进程
            bat """
                @echo off
                setlocal enabledelayedexpansion
                set FOUND_PID=
                for /f "tokens=5" %%a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do (
                    set FOUND_PID=%%a
                )
                if defined FOUND_PID (
                    echo 检测到端口 ${port} 已被占用，PID=!FOUND_PID!
                    if not "!FOUND_PID!"=="0" (
                        echo 正在终止进程 PID=!FOUND_PID!...
                        taskkill /PID !FOUND_PID! /F
                        timeout /t 3 /nobreak >nul
                        echo 旧服务已停止
                    ) else (
                        echo PID=0 为系统进程，跳过终止
                    )
                ) else (
                    echo 端口 ${port} 未被占用，可直接启动
                )
            """

            // 使用 start /b 后台启动，显式设置 JAVA_HOME 和 PATH
            bat """
                set JENKINS_NODE_COOKIE=dontKillMe
                set JAVA_HOME=${env.JAVA_HOME_BUILD}
                set PATH=%JAVA_HOME%\\bin;%PATH%
                cd /d "${env.BEMP_SERVED_HOME}"
                start /b java %JVM_OPTS% -cp ../classes;../lib/* com.hundsun.bemp.BempServedAppStarter
            """

            // 等待服务启动并验证端口
            def startTime = System.currentTimeMillis()
            def running = false
            def timeoutMs = (env.BEMP_SERVED_TIMEOUT as int) * 1000

            echo "开始监控 bemp-served 端口 ${port}..."

            while ((System.currentTimeMillis() - startTime) < timeoutMs) {
                sleep(5)
                def netstatOutput = bat(script: "netstat -ano | findstr :${port} | findstr LISTENING || exit /b 0", returnStdout: true).trim()
                if (netstatOutput && netstatOutput.contains("LISTENING")) {
                    running = true
                    echo "bemp-served 服务已在端口 ${port} 上监听，启动成功"
                    break
                }
                echo "等待端口监听... (${(System.currentTimeMillis() - startTime) / 1000}秒)"
            }

            if (!running) {
                error("bemp-served 服务启动超时（${env.BEMP_SERVED_TIMEOUT}秒），端口 ${port} 未监听")
            }

            echo "bemp-served 服务启动完成"
        }
    }
}
```

### Windows 手动启动

```batch
cd /d D:\code\QJ\bempDeploy\bemp-served\WEB-INF\classes
set JAVA_HOME=D:\code\Java\jdk1.8.0_341
set PATH=%JAVA_HOME%\bin;%PATH%
set JVM_OPTS=-server -Xms2048m -Xmx4096m -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=../tmp/heap.dump
java %JVM_OPTS% -cp ../classes;../lib/* com.hundsun.bemp.BempServedAppStarter
```

---

## Nginx 服务启动

### 环境变量配置

```groovy
environment {
    NGINX_EXE = 'D:/code/nginx-1.12.2/nginx.exe'
    NGINX_HOME = 'D:/code/nginx-1.12.2'
    NGINX_PORT = '8091'
    NGINX_TIMEOUT = '60'
    HEALTH_CHECK_URL = 'http://localhost:8091'
}
```

### Jenkins Pipeline 启动代码

```groovy
stage('6. Nginx服务启动') {
    when {
        expression { return !params.SKIP_NGINX }
    }
    steps {
        script {
            echo "=========================================="
            echo "启动 Nginx 服务"
            echo "=========================================="

            def nginxExe = env.NGINX_EXE.replace('/', '\\')
            def nginxHome = env.NGINX_HOME.replace('/', '\\')

            dir(nginxHome) {
                // 1. 测试配置文件
                echo "测试Nginx配置..."
                def testResult = bat(script: "\"${nginxExe}\" -t 2>&1", returnStdout: true).trim()
                echo testResult
                if (!testResult.contains("successful")) {
                    error("Nginx配置测试失败")
                }

                // 2. 停止旧进程
                echo "停止现有Nginx进程..."
                bat "taskkill /F /IM nginx.exe 2>nul || echo Nginx未运行"
                sleep(2)

                // 3. 启动 Nginx
                echo "启动Nginx..."
                bat "start \"nginx\" \"${nginxExe}\""
                sleep(3)

                // 4. 检测进程是否存在
                def processCheck = bat(script: "tasklist | findstr nginx.exe || exit /b 0", returnStdout: true).trim()
                if (processCheck && processCheck.contains("nginx.exe")) {
                    echo "Nginx启动成功 | 访问地址: ${env.HEALTH_CHECK_URL}"
                } else {
                    // 输出错误日志
                    def errorLog = "logs\\error.log"
                    if (fileExists(errorLog)) {
                        echo "Nginx错误日志:"
                        bat "type \"${errorLog}\""
                    }
                    error("Nginx启动失败，未检测到nginx进程")
                }
            }
        }
    }
}
```

### Windows 手动启动

```batch
cd /d D:\code\nginx-1.12.2

:: 测试配置
nginx -t

:: 启动
start nginx

:: 停止
nginx -s stop

:: 重新加载配置
nginx -s reload
```

### Nginx 检测方式说明

| 检测方式 | 命令 | 说明 |
|----------|------|------|
| 配置测试 | `nginx -t` | 验证nginx.conf语法，输出successful表示通过 |
| 进程检测 | `tasklist \| findstr nginx.exe` | 检查nginx进程是否存在 |
| 错误日志 | `type logs\error.log` | 启动失败时查看错误原因 |

> **注意**: Nginx使用内置工具检测（nginx -t + 进程验证），而非端口监听检测。这是因为Nginx启动速度快，进程存在即表示服务正常。

---

## 关键注意事项

### bemp-served 启动必须显式设置 JAVA_HOME

Jenkins 以 Windows 服务账户运行，不继承交互式用户的环境变量。必须在 bat 块中显式设置：

```groovy
bat """
    set JAVA_HOME=${env.JAVA_HOME_BUILD}
    set PATH=%JAVA_HOME%\\bin;%PATH%
    cd /d "${env.BEMP_SERVED_HOME}"
    start /b java %JVM_OPTS% -cp ../classes;../lib/* com.hundsun.bemp.BempServedAppStarter
"""
```

### 端口检测使用 `|| exit /b 0`

`netstat | findstr | findstr` 命令链中 findstr 未找到匹配时返回退出码1，会导致 Jenkins 构建失败。添加 `|| exit /b 0` 确保命令总是返回0：

```groovy
def netstatOutput = bat(
    script: "netstat -ano | findstr :${port} | findstr LISTENING || exit /b 0",
    returnStdout: true
).trim()
```

---

## 常见问题

### Q1: 服务启动后自动关闭

**原因**：Jenkins 构建结束后会杀死所有子进程。

**解决**：设置 `JENKINS_NODE_COOKIE=dontKillMe` 环境变量。

### Q2: bemp-served 启动失败 - ExceptionInInitializerError

**原因**：Jenkins 服务账户不继承用户环境变量，导致 JAVA_HOME 缺失。

**解决**：在 bat 块中显式设置 `JAVA_HOME` 和 `PATH`。

### Q3: 端口验证失败但服务已启动

**原因**：服务启动较慢，端口尚未监听。

**解决**：增加超时时间或使用循环验证。

### Q4: bemp-served 启动失败 - 找不到类

**原因**：工作目录不正确或 classpath 配置错误。

**解决**：
1. 确保 `cd /d` 切换到正确的目录
2. 验证 `../classes` 和 `../lib/*` 路径存在
3. 确保 `JAVA_HOME` 已正确设置
