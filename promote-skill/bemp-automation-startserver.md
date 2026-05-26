# bemp-automation-startserver 反向构建提示词

## 核心功能
BEMP项目开发环境启动技能，在IDE终端中启动Redis、ZooKeeper、SpringBoot后端及前端开发服务器。所有服务以前台方式运行，日志直接显示在终端。支持状态检查、强制重启、快速启动模式。

## 关键实现逻辑
- 核心脚本：`scripts/start-bemp-env.ps1`（PowerShell），参数化启动
- 配置文件：`config/config.json` 管理服务路径、端口、JVM参数、Node.js路径
- 启动前检测：端口监听检测服务是否已运行，已运行且未要求重启则跳过
- 分层依赖：基础设施层(Redis:6379 + ZooKeeper:2181并行) → 应用层(SpringBoot:8010 + Frontend:8091并行)
- SpringBoot依赖Redis+ZK就绪，Frontend与后端无启动依赖
- 每个服务在独立IDE终端启动，服务运行后不在该终端执行其他命令

## 输入输出参数
| 参数 | 适用服务 | 作用 |
|------|---------|------|
| -Service | 全部 | redis/zookeeper/springboot/frontend |
| -Status | 全部 | 查看所有服务运行状态 |
| -QuickStart | springboot,frontend | 跳过编译/依赖检查直接启动 |
| -ForceRestart | 全部 | 强制停止占用端口进程后重启 |
| -AutoRestart | 全部 | 智能模式：运行中自动停止后重启 |

## 主要业务流程
1. 解析-Service参数确定目标服务
2. 检测端口是否已监听（非ForceRestart则跳过）
3. 基础设施层：Redis和ZK并行启动（各自独立终端）
4. 应用层：SpringBoot等待Redis+ZK就绪后启动，Frontend与SpringBoot并行
5. -QuickStart模式跳过mvn compile/npm install直接启动
6. -Status模式遍历4个端口输出运行状态

## 技术特性
- PowerShell实现，适配Windows环境
- 端口检测：`Get-NetTCPConnection` 或 `Test-NetConnection`
- 进程管理：`Stop-Process` 强制终止占用端口的进程
- 前台运行：`Start-Process` 不加 `-NoNewWindow` 保持日志可见
- 故障排查文档：`docs/troubleshooting.md`
