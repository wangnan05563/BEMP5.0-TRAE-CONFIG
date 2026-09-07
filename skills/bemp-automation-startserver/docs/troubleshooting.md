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
cd d:\code\QJ\BEMP5.0DEV\banks\ext-${ENV:BANK_PROJECT_DIR}
mvn clean install -DskipTests=true -pl ${ENV:BANK_MODULE_PREFIX}served-deploy -am
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

## 8. 前端启动慢 / npm install 耗时长

**原因**：首次启动时 `npm install` 需要下载大量依赖包。

**解决方案 1 - 使用 QuickStart 跳过依赖检查（日常启动推荐）**：
```powershell
.\start-bemp-env.ps1 -Service frontend -QuickStart
```

**解决方案 2 - 脚本内置优化**（v6.1.0+ 已自动生效）：
- `--prefer-offline`：优先使用本地 npm 缓存
- `--no-audit`：跳过安全审计（节省 5-15 秒）
- `--no-fund`：跳过赞助信息（节省 ~2 秒）
- `PUPPETEER_SKIP_DOWNLOAD=true`：跳过 Chromium 下载
- `ELECTRON_SKIP_BINARY_DOWNLOAD=true`：跳过 Electron 下载

**解决方案 3 - 手动操作**：
```powershell
cd d:\code\QJ\BEMP5.0DEV\frontend

# 使用快速 install
npm install --prefer-offline --no-audit --no-fund

# 然后启动 dev server
npm run dev
```

**首次启动预估时间对比**：

| 场景 | 优化前 | 优化后 | 节省 |
|------|--------|--------|------|
| node_modules 已存在 | ~30 秒 | ~3 秒 | ~90% |
| node_modules 不存在(npm install) | ~150-300 秒 | ~40-120 秒 | ~50-70% |
| QuickStart(有 node_modules) | - | ~1 秒 | ~97% |

## 9. 前端首次启动 npm install 执行两次

**现象**（v6.0.0 及之前版本）：首次启动前端时 `npm install` 日志出现两次。

**原因**：脚本中存在重复的 `node_modules` 检查代码块（Bug）。

**解决方案**：升级到 v6.1.0+，脚本已修复此问题。第二次 `npm install` 将被跳过所以不影响最终结果, 但会多等待 1-2 秒的诊断输出。

---

## 10.5 启动失败：Result Maps collection already contains value（mapper XML 重复注册）

**现象**：Served 启动即退出，日志报 `Result Maps collection already contains value for ...BaseResultMap`（MyBatis 解析器重复注册同一 mapper）。

**根因**：增量覆盖部署使 `WEB-INF/classes`（新编译产物）与 `WEB-INF/lib` 旧 jar 内存在**双份同名 mapper XML**，异步加载竞态重复注册（W12-07）。classes 优先级高于 jar（W8-09 同源），但双份并存时注册顺序不确定。

**处置方案**：①定位重复资源——比对 classes 与 lib jar 内同路径 XML 清单；②哈希比对：内容一致（仅旧版本冗余）→ 备份后删除 classes 侧冗余文件再重启；内容不一致（真增量覆盖）→ 保留 classes 侧删除 jar 侧或走全量重部署；③**根治**：全量重新部署使 jar 与 classes 同版本，消除增量覆盖的双份资源形态。

**预防措施**：增量覆盖部署后启动失败优先排查双份资源，勿先怀疑代码；执行 `check-artifact-freshness.ps1` 顺带确认产物形态一致性。

## 10.6 服务启动成功但加载旧代码（进程新鲜度失配）

**现象**：启动流程全部健康检查通过，但测试发现已下线接口仍可达（200）、新校验文案不生效。

**根因**：进程启动时间早于本次编译/部署产物时间——启动动作发生在编译之前，或启动的是旧进程未真正重启（W12-01，与 W9-01"jar 旧包"是两道独立检查）。

**处置方案**：按 P17 三重链核对——进程启动时间 ≥ 部署产物 mtime ≥ 最新源码修改时间；任一倒挂→走门禁通道重启目标服务→重启后重检；铁证=已删除接口可达性差异（旧 200/新 404）。配套运行时验证：`check-artifact-freshness.ps1 -CheckType bean-verify`（bean 顶替日志核对）。

**预防措施**：重启完成后在启动报告中报告"新进程启动时间 vs 本次编译时间"供测试侧核验；测试侧执行前过 runtime-code-version-check（bemp-webapp-testing config/data-readiness-check.json）。

## 10. 内存不足

JVM 内存不足时,修改 `config.json` 中的参数：
```json
{
  "services": {
    "served": {
      "jvmOptions": "-Xmx512m -Xms256m"
    }
  }
}
```

前端 Node 内存不足时,修改 `config.json` 中的 `nodeMemoryLimit`：
```json
{
  "services": {
    "frontend": {
      "nodeMemoryLimit": 4096
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
