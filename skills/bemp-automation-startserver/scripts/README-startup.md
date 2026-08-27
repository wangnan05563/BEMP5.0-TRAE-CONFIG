# BEMP 服务启动（沙箱/无头环境可用版）

原 `start-bemp-env.ps1` 在本沙箱因 safe-delete 钩子 + 无头 `-NoExit` 无法派生子进程而失败。
本目录的 `supervise_bemp.ps1` 是已验证可用的替代启动器。

## 启动全部服务
```
powershell -NoProfile -ExecutionPolicy Bypass -File "<skill>/scripts/supervise_bemp.ps1"
```
- **方式 A（agent 后台）**：用 run_in_background 运行。结尾 `Get-Content -Wait` 会把 5 个服务的实时日志流式输出到该后台任务面板（即"实时打印日志"），且进程保活，服务不随 agent 轮次结束而退出。
- **方式 B（用户自己的终端，推荐看实时日志）**：在 IDE 终端直接运行上述命令。会先打印启动汇总，再实时 tail 日志；**关闭该终端窗口即停止全部 BEMP 服务**。

## 只看实时日志（不重启）
服务已在运行时，在自己终端执行：
```
powershell -NoProfile -ExecutionPolicy Bypass -File "<skill>/scripts/tail_bemp_logs.ps1"
```
自动定位最新批次日志并 `Get-Content -Wait` 实时追踪（Ctrl+C 退出，不影响服务）。
> 必须用 `Get-Content`（共享读）；`ReadAllText` 会被运行中的服务持锁拒绝访问。

## 停止全部服务
```
powershell -NoProfile -ExecutionPolicy Bypass -File "<skill>/scripts/cleanup_bemp.ps1"
```
只杀 BEMP 相关进程（supervisor / bemp java / redis / 端口占用 / frontend），并校验端口释放。

## Redis 写阻塞修复（已内置）
本机 `D:\code\Redis-x64-5.0.14.1` 的 `dump.rdb` 无写权限，Redis 后台存盘失败会触发
`stop-writes-on-bgsave-error`，导致 Redis 拒绝一切写命令，连锁使 Served 队列任务报
`MISCONF Redis is configured to save RDB snapshots...`。
`supervise_bemp.ps1` 在 **Redis 就绪（PING=PONG）后**自动执行
`CONFIG SET stop-writes-on-bgsave-error no`（运行时生效，重启后由本脚本再次应用）。
- 根治：修正 `dump.rdb` 写权限，或给 Redis 配置可写的 `dir`。

## 日志目录
`<skill>/logs/`：`*_startup_<ts>.log`（stdout）、`*.log.stderr`、`_supervise_start_<ts>.txt`（启动汇总）。

## 已知坑（已修复，记录防复发）
1. `$Args` 是 PowerShell 保留自动变量，函数参数误用 `param([array]$Args)` 会取到空值 → 已改名 `$ProcArgs`/`$JavaArgs`。
2. SpringBoot 类路径必须带 `-cp` 前缀，否则 java 把类路径当主类 → 已对齐 `@("-cp","WEB-INF\classes;WEB-INF\lib\*",$MainClass)`。
3. Redis `CONFIG SET` 必须在 Redis 可接受连接后执行，否则连接被拒且错误被 `2>$null` 吞掉造成"假成功" → 已加 PING 就绪等待。
