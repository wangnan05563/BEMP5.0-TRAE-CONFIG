# BEMP 服务运维操作指南

> 本文档为 bemp-automation-startserver 技能的运维操作详细指南，由 SKILL.md 渐进式披露拆分而来。

## 前置环境检查（Pre-flight Check，G-02）

> **设计动机**：Oracle数据库连接超时和前端webpack OOM问题在启动阶段才暴露，前置检查在启动前验证必要条件。

### 检查项清单（按服务类型分组）

| 服务类型 | 检查项 | 检查方式 | 失败修复建议 |
|---------|--------|---------|------------|
| **通用** | 环境变量加载 | `_shared/env-config.json` 解析无异常 | 检查JSON格式与`${ENV:VAR}`占位符 |
| **通用** | 工作空间目录 | `${BEMP_WORKSPACE_ROOT}` 存在且可读 | 确认项目根路径配置正确 |
| **redis** | 可执行文件 | `${REDIS_EXE}` 文件存在 | 检查 `environmentDefaults.REDIS_EXE` 路径 |
| **redis** | 端口可用 | 6379端口未被占用（除非ForceRestart） | 使用 `-ForceRestart` 或释放端口 |
| **zookeeper** | 可执行文件 | `${ZOOKEEPER_EXE}` 文件存在 | 检查 `environmentDefaults.ZOOKEEPER_EXE` 路径 |
| **zookeeper** | JAVA_HOME | `${JAVA_HOME}\bin\java.exe` 存在 | 配置 `JAVA_HOME` 环境变量 |
| **zookeeper** | 端口可用 | 2181端口未被占用 | 使用 `-ForceRestart` 或释放端口 |
| **springboot** | JAVA_HOME | `${JAVA_HOME}\bin\java.exe` 存在且可执行 | 配置 `JAVA_HOME` 环境变量 |
| **springboot** | Maven | `${MAVEN_PATH}` 存在（非QuickStart时） | 配置 `MAVEN_PATH` 或使用 `-QuickStart` |
| **springboot** | 依赖服务端口 | Redis(6379)+ZK(2181)已监听（除非-WaitForDeps） | 先启动基础设施或使用 `-WaitForDeps` |
| **springboot** | 数据库连通性 | Oracle/MySQL 端口可达（TCP探测，默认3秒超时） | 检查VPN/网络/数据库服务状态 |
| **springboot** | WAR包存在 | served.war/adapter.war 文件存在 | 先执行Maven打包或使用 `-QuickStart` |
| **frontend** | Node.js | `${NODE_PATH}` 存在且版本为v14.x | 安装Node.js 14或修正 `NODE_PATH` |
| **frontend** | npm | `${NODE_HOME}\npm.cmd` 存在 | 重新安装Node.js 14 |
| **frontend** | package.json | `${frontendProjectPath}\package.json` 存在 | 确认前端项目路径正确 |
| **frontend** | node_modules | `${frontendProjectPath}\node_modules` 存在 | 执行 `npm install` |
| **frontend** | 堆内存配置 | `config.json` 中 `nodeMemoryLimit` ≥ 8192 | 调整 `nodeMemoryLimit` 防止OOM |

### 检查执行流程

```
[1] 解析 -Service 参数，确定待启动服务列表
[2] 加载 _shared/env-config.json，解析环境变量占位符
[3] 按服务类型执行对应检查项（上表）
[4] 汇总检查结果：
    - 全部通过 → [OK] Pre-check passed，继续启动
    - 存在失败 → [FAIL] Pre-check failed，输出失败项+修复建议，中止启动
    - 存在警告（如数据库探测超时但非阻断）→ [WARN] 输出警告，询问是否继续
```

### 使用方式

```powershell
# 仅执行前置检查，不启动服务
.\start-bemp-env.ps1 -Service served -PreCheck

# 启动前自动执行前置检查（默认行为）
.\start-bemp-env.ps1 -Service served -QuickStart -ExternalTerminal -WaitForDeps

# 跳过前置检查强制启动（不推荐）
.\start-bemp-env.ps1 -Service served -QuickStart -ExternalTerminal -ForceStart
```

### 配置化设计

检查项规则集中管理在 `config/pre-check.json`，支持：

| 配置节 | 字段 | 说明 |
|--------|------|------|
| `checks.{serviceType}.items` | `name`/`type`/`target`/`timeout`/`severity` | 检查项定义 |
| `checks.{serviceType}.items.type` | `file_exist`/`port_listen`/`tcp_reachable`/`version_match`/`dir_exist` | 检查类型 |
| `severity` | `block`/`warn` | 阻断或仅警告 |
| `timeout` | 秒数 | TCP探测/命令执行超时 |
| `defaults.tcpProbeTimeout` | 3 | 数据库连通性探测默认超时 |
| `skipFlags` | `ForceStart`/`QuickStart` | 哪些参数可跳过哪些检查项 |

**零硬编码原则**：所有路径、端口、版本号均从 `_shared/env-config.json` 动态解析。

## 两阶段并行启动（多服务逗号分隔时）

逗号分隔启动多服务时，脚本自动分两阶段执行：

**阶段1**：循环启动所有服务进程（仅Start-Process，不等待就绪）
**阶段2**：统一轮询所有服务端口，并行等待就绪

```
[INFO] Phase 2: Health check for 3 service(s)...
  [WAIT] Waiting for: Served:8010, Adapter:8090, Frontend:8091 (0/600s)
  [WAIT] Waiting for: Served:8010, Adapter:8090, Frontend:8091 (30/600s)
[OK]   Adapter is ready (port 8090)
[OK]   Frontend is ready (port 8091)
  [WAIT] Waiting for: Served:8010 (60/600s)
[OK]   Served is ready (port 8010)
```

优势：
- 多服务健康检查并行进行，总等待时间 = max(各服务超时)，而非 sum
- 快服务先就绪先输出，慢服务不阻塞其他服务
- 每个服务有独立的超时时间（个人超时后触发诊断）

## 健康检查配置

路径：`config/health-check.json`

**四级优先级**：服务级配置 > byType类型默认 > defaults节 > 代码默认值

| 字段 | 说明 |
|------|------|
| `defaults.maxWaitSeconds` | 全局默认端口就绪最大等待时间（秒） |
| `defaults.pollIntervalSeconds` | 全局默认轮询间隔（秒） |
| `defaults.logCleanupHours` | 日志文件清理时间（小时） |
| `byType.{type}.maxWaitSeconds` | 按服务类型的默认超时 |
| `byType.{type}.pollIntervalSeconds` | 按服务类型的默认轮询间隔 |
| `services.{name}.maxWaitSeconds` | 服务级覆盖 |
| `services.{name}.depWaitSeconds` | 服务级依赖等待覆盖 |

当前 byType 默认值：

| 类型 | maxWaitSeconds | pollIntervalSeconds |
|------|---------------|-------------------|
| redis | 30 | 5 |
| zookeeper | 60 | 10 |
| springboot | 600 | 30 |
| frontend | 600 | 30 |

### 启动分组编排（startupGroups）

`health-check.json` 中的 `startupGroups.groups` 定义了服务的分层启动策略：

| 字段 | 说明 |
|------|------|
| `name` | 分组名称 |
| `services` | 分组包含的服务列表 |
| `parallel` | 是否可并行启动 |
| `waitForDeps` | 是否等待依赖就绪 |
| `dependsOn` | 依赖的上游分组名称 |

### 诊断流程

```
Served/Adapter启动超时
  ├─ Redis未运行   → 提示先启动Redis
  ├─ ZK未运行      → 提示先启动ZK
  ├─ 启动日志含ERROR → 输出错误摘要
  ├─ 应用日志含SessionExpired → 提示重启ZK后再重启本服务
  └─ 无明显错误    → 输出端口占用信息
```

## 折叠式进度条

### 特性

- **单行动态更新**：进度信息在同一行更新，避免终端滚动
- **完成后折叠**：服务就绪后显示简洁的完成状态
- **进度条显示**：可视化进度条 + 百分比显示
- **ANSI颜色支持**：自动检测终端ANSI支持，降级到纯文本显示

### 样式配置

| 样式 | 说明 |
|------|------|
| `Bar`（默认） | 显示进度条 + 百分比：`[====----] 25%` |
| `Spinner` | 仅显示动画：`[|] Message (30/600s)` |
| `Minimal` | 简洁文本：`[Message] 25% (30/600s)` |

## 日志文件

启动日志自动写入 `scripts/../logs/` 目录：
- **启动日志**：`{ServiceName}_startup_{timestamp}.log` — 控制台输出
- **启动脚本**：`launcher_{ServiceName}_{timestamp}.ps1` — 外部终端启动脚本
- **自动清理**：超过 `logCleanupHours`（默认24小时）的日志自动清理
- IDE模式：通过 Tee-Object 同时输出到终端和日志文件
- 外部模式：PowerShell窗口实时显示 + Tee-Object写入日志文件
- 诊断时扫描启动日志和应用日志双源

## Node.js 版本控制

BEMP 前端依赖 Node.js 14，通过三层保障确保使用正确版本：

| 保障层 | 机制 | 效果 |
|--------|------|------|
| **npm 路径** | `Build-FrontendCommand` 从 NODE_PATH 推导 npm.cmd 路径 | 直接调用 node14 的 npm |
| **PATH 注入** | Build-FrontendCommand 将 node14 目录注入 PATH 最前面 | npm 子进程（webpack等）使用 node14 |
| **版本诊断** | launcher 脚本启动前打印 node/npm 版本 | 外部终端可确认版本正确 |

配置路径：`_shared/env-config.json` → `environmentDefaults.NODE_PATH`

## 故障排查

| 场景 | 处理策略 |
|------|---------|
| 终端数量不足 | 使用 `-ExternalTerminal` 启动到PowerShell窗口 |
| 基础设施未就绪 | 使用 `-WaitForDeps`，或分层启动 |
| ZK Session过期 | 先重启ZK再重启Served/Adapter，顺序不可颠倒 |
| 日志有ERROR | 查看启动日志：`logs/{Service}_startup_*.log` 和应用日志 |
| 端口冲突（进程占用） | 使用 `-ForceRestart` 强制重启 |
| 端口冲突（Windows保留） | 诊断自动检测；需管理员执行 `netsh interface ipv4 set dynamicport tcp start=49152 num=16384` 后重启 |
| 旧日志堆积 | 自动清理 `logCleanupHours`（默认24小时）前的文件 |

## 复盘经验与陷阱

| 陷阱 | 后果 | 根因 | 防范 |
|------|------|------|------|
| JSON嵌套层级查找 | 配置值永远读不到 | `$HConfig.$ServiceKey` 未进入 `services` 嵌套节 | 使用 `$HConfig.services.$ServiceKey`，四级优先级链 |
| Spring Boot超时不足 | Served启动5-8分钟，120秒远不够 | 缺少byType默认值 | byType.springboot.maxWaitSeconds=600 |
| 逗号分隔多服务健康检查叠加 | 总等待=sum(各服务超时) | 健康检查顺序执行 | 两阶段启动：先启进程，再并行健康检查 |
| `$PID`只读变量冲突 | Stop-ServiceByPort报错 | PowerShell `$PID` 是只读自动变量 | 使用 `$procId` 替代 |
| `Get-NetTCPConnection`单对象Count | `Test-PortListening`始终返回False | 单对象`.Count`为`$null` | `@($conn).Count` 强制转数组 |
| Java参数中`;`和`=` | PowerShell解析为语句分隔符 | classpath含`;`，JVM参数含`=` | 使用`@cmdArgs`数组展开运算符 |
| ForceRestart后不检查健康 | 重启后不知道服务是否真的启动了 | 条件中排除ForceRestart | ForceRestart后也执行健康检查 |
| 原生命令stderr被当作错误 | ZK启动显示红色NativeCommandError | PowerShell `2>&1` 把stderr包装为ErrorRecord | launcher脚本中加 `Convert-NativeOutput` 过滤函数 |
| 双BOM导致param块解析失败 | 脚本无法加载 | 多次Set-Content -Encoding UTF8累积BOM | 用 `[System.IO.File]::WriteAllText` + `UTF8Encoding($false)` |
| 折叠式进度条完成消息残留 | 末尾残留进度条字符 | ANSI `$ESC[2K` 在某些终端不生效 | 完成时先输出 `` `r `` + 100空格 + `` `r `` 覆盖旧行 |
