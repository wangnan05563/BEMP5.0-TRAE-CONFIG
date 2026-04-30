# 故障排查指南

本文档汇总了 BEMP 开发环境启动过程中常见的问题及其解决方案。

---

## 1. ZooKeeper 启动报文件访问错误

**错误信息**：`java.io.FileNotFoundException: \tmp\zookeeper\...`

**原因**：ZooKeeper 默认使用 `/tmp/zookeeper` 作为数据目录，Windows 上可能无权限访问。

**解决方案**：
1. 打开文件 `D:\code\apache-zookeeper-3.8.3-bin\conf\zoo.cfg`
2. 找到 `dataDir=/tmp/zookeeper`
3. 修改为 `dataDir=D:\\code\\zookeeper-data`
4. 保存并重启 ZooKeeper

## 2. ZooKeeper AdminServer 端口冲突（8080）

**现象**：ZooKeeper 3.8.3 默认启用 AdminServer 占用 8080 端口，与 SpringBoot 冲突。

**解决方案**（推荐）：在 `zoo.cfg` 中添加：
```properties
admin.enableServer=false
```

或修改 AdminServer 端口：
```properties
admin.serverPort=8088
```

## 3. SpringBoot WAR 文件不存在

**错误信息**：`WAR file not found`

**原因**：项目未编译。

**解决方案**：预先编译项目
```powershell
cd d:\code\QJ\BEMP5.0DEV\banks\ext-hnnxbank
mvn clean install -DskipTests=true -pl hnnxbank-served-deploy -am
```

## 4. 前端启动报 OpenSSL 错误

**错误信息**：`Error: error:0308010C:digital envelope routines::unsupported`

**原因**：Node.js 版本过高与旧版 webpack 不兼容。

**解决方案**：在 `config.json` 中配置 Node.js 14.x 路径：
```json
{
  "services": {
    "frontend": {
      "nodePath": "D:\\code\\nodejs14\\node.exe"
    }
  }
}
```

脚本会直接使用指定的 Node.js 执行 npm 命令，不修改系统环境变量。

## 5. 端口被占用

**现象**：启动服务时提示端口已被占用。

**解决方案 1 - 强制重启（推荐）**：
```powershell
.\start-bemp-env.ps1 -Service <服务名> -ForceRestart
```

**解决方案 2 - 手动停止**：
```powershell
netstat -ano | findstr :<端口号>
taskkill /PID <PID> /F
```

**解决方案 3 - 修改端口**：编辑 `config.json` 中对应服务的 `port` 或 `ports` 字段。

## 6. 服务被意外关闭

**原因**：在同一个终端中启动了多个服务，导致之前的进程被终止。

**解决方案**：
1. 确保每个服务在独立的 IDE 终端中启动
2. 不要在服务运行的终端中执行其他命令
3. 使用 `-Status` 参数检查状态时，使用独立的终端

## 7. 脚本执行失败提示权限不足

**解决方案**：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 8. 内存不足

**解决方案**：修改 `config.json` 中的 JVM 参数：
```json
{
  "services": {
    "springboot": {
      "jvmOptions": "-Xmx512m -Xms256m"
    }
  }
}
```

---

## 环境要求

| 组件 | 要求 |
|------|------|
| JDK | 1.8+ |
| Node.js | 14.x+（推荐） |
| Maven | 3.6+ |
| PowerShell | 5.1+ |

## SpringBoot 启动说明（F5 Debug 模式）

SpringBoot 使用 Trae IDE 的 Debug 模式启动：

1. 运行脚本后，Trae IDE 会自动打开工作区
2. 切换到 Trae IDE 窗口
3. 打开 Debug 面板 (Ctrl+Shift+D)
4. 选择 "Spring Boot-后端调试" 配置
5. 按 F5 启动调试

所需 VSCode/Trae 扩展：
- Language Support for Java(TM) by Red Hat
- Debugger for Java
- Spring Boot Extension Pack
