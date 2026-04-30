# 错误处理与回滚机制

## 概述

BEMP Jenkins Pipeline 采用多层错误处理策略，确保部署过程的可靠性和可回滚性。

---

## 错误处理层级

### 1. Pipeline级别 - 全局控制

```groovy
options {
    timeout(time: 1800, unit: 'SECONDS')
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '10'))
}

post {
    success {
        echo "=========================================="
        echo "构建成功"
        echo "=========================================="
    }
    failure {
        echo "=========================================="
        echo "构建失败"
        echo "=========================================="
    }
    always {
        cleanWs()
    }
}
```

### 2. 阶段级别 - 条件执行

每个阶段通过 `when` 条件控制是否执行：

```groovy
stage('3. SonarQube扫描') {
    when { expression { !params.SKIP_SONAR } }
    steps { script { /* ... */ } }
}
```

### 3. 操作级别 - 容错处理

#### 端口检测容错

```groovy
def netstatOutput = bat(
    script: "netstat -ano | findstr :${port} | findstr LISTENING || exit /b 0",
    returnStdout: true
).trim()
```

`|| exit /b 0` 确保 findstr 未找到匹配时不会导致构建失败。

#### MD5校验容错

```groovy
def output = bat(script: "certutil -hashfile \"${filePath}\" MD5", returnStdout: true)
def md5Match = output =~ /([a-fA-F0-9]{32})/
def md5 = md5Match ? md5Match[0][1] : "unknown"
```

使用正则表达式精确提取，避免命令回显干扰。

---

## 备份与回滚机制

### 后端备份策略

使用 xcopy 目录备份，保留历史版本：

```groovy
stage('4. 应用备份') {
    when { expression { !params.SKIP_BACKUP } }
    steps {
        script {
            def backupName = "bemp-served_${timestamp}"
            def backupPath = "${BACKUP_DIR}\\${backupName}"

            bat """
                chcp 65001 > nul
                mkdir "${BACKUP_DIR}" 2>nul
                xcopy "${currentDir}" "${backupPath}\\" /E /I /H /Y
            """

            // 清理历史备份
            bat """
                chcp 65001 > nul
                for /f "skip=${MAX_BACKUPS} delims=" %%d in (
                    'dir /b /ad /o-d "${BACKUP_DIR}\\bemp-served_*" 2^>nul'
                ) do (
                    rd /s /q "${BACKUP_DIR}\\%%d"
                )
            """
        }
    }
}
```

### 前端备份策略

使用 zip 压缩包备份：

```groovy
stage('4. 应用备份') {
    when { expression { return !params.SKIP_BACKUP } }
    steps {
        script {
            def timestamp = env.BUILD_TIMESTAMP ?: new Date().format('yyyyMMddHHmmss')
            def backupName = "bemp-web_${timestamp}.zip"
            def backupPath = "${BACKUP_DIR}\\${backupName}"

            // 使用 PowerShell 压缩目录
            powershell """
                \$source = '${currentWar}'
                \$destination = '${backupPath}'
                if (Test-Path \$destination) { Remove-Item \$destination -Force }
                Compress-Archive -Path \$source -DestinationPath \$destination -CompressionLevel Optimal -Force
            """

            // 清理历史备份
            bat """
                @echo off
                chcp 65001 > nul
                set BACKUP_DIR=${backupDir}
                set MAX_BACKUPS=${MAX_BACKUPS}
                set count=0
                for /f "delims=" %%f in ('dir /b /o-d "%BACKUP_DIR%\\bemp-web_*.zip" 2^>nul') do (
                    set /a count+=1
                    call :check_delete "%%f"
                )
                exit /b 0
                :check_delete
                if %count% gtr %MAX_BACKUPS% del /f /q "%BACKUP_DIR%\\%~1"
                exit /b 0
            """
        }
    }
}
```

### 手动回滚步骤

1. **停止当前服务**：
```batch
taskkill /PID <PID> /F
```

2. **恢复备份**：
```batch
:: 后端回滚
rd /s /q "D:\code\QJ\bempDeploy\bemp-served"
xcopy "D:\code\QJ\bempDeploy\backup\bemp-served_20260426_143000" "D:\code\QJ\bempDeploy\bemp-served\" /E /I /H /Y

:: 前端回滚（解压zip备份）
rd /s /q "D:\code\nginx-1.12.2\html\bemp-web"
powershell -Command "Expand-Archive -Path 'D:\code\nginx-1.12.2\html\backup\bemp-web_20260426_143000.zip' -DestinationPath 'D:\code\nginx-1.12.2\html' -Force"
```

3. **重启服务**：参考 [服务启动模板](service-startup-templates.md)

---

## 常见错误及处理

### 构建超时

| 阶段 | 默认超时 | 处理方式 |
|------|---------|---------|
| 全局 | 1800秒 | 增大options.timeout |
| Git拉取 | 900秒 | 增大CloneOption.timeout |
| 服务启动 | 可配置 | 增大*_TIMEOUT环境变量 |

### 服务启动失败

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| 端口未监听 | 启动超时 | 增大超时时间 |
| ExceptionInInitializerError | JAVA_HOME缺失 | 显式设置JAVA_HOME |
| 找不到类 | classpath错误 | 检查BEMP_SERVED_HOME |
| 进程被杀 | Jenkins杀死子进程 | 设置JENKINS_NODE_COOKIE |

### 编码错误

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| 中文乱码 | GBK编码 | bat开头加 `chcp 65001 > nul` |
| 日志乱码 | JVM编码 | 设置 `-Dfile.encoding=UTF-8` |
| 文件名乱码 | 系统编码 | 设置 `LANG=zh_CN.UTF-8` |

---

*相关文档: [服务启动模板](service-startup-templates.md) | [FAQ](../troubleshooting/faq.md)*
