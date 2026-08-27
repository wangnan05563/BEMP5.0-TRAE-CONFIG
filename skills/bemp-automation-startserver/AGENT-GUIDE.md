# BEMP 智能体操作指南

> 本文档为 bemp-automation-startserver 技能的智能体操作指南，由 SKILL.md 渐进式披露拆分而来。

## 推荐启动流程（外部PowerShell终端模式）

### 第零步：前置环境检查（G-02，推荐）

```
RunCommand: cd "scripts" ; .\start-bemp-env.ps1 -Service "served,frontend" -PreCheck
→ target_terminal: "new", blocking: true
```

> 验证 JAVA_HOME、Node.js、数据库连通性、依赖端口等。数据库连通性失败（Oracle/MySQL超时）是常见问题，通常为VPN未连接或数据库服务未启动。

### 第一步：状态检查

```
RunCommand: cd "scripts" ; .\start-bemp-env.ps1 -Status
→ target_terminal: "new"（或复用空闲终端）, blocking: true
```

### 第二步：分批启动（按startupGroups配置）

```
# 基础设施层
RunCommand: -Service "redis,zookeeper" -ExternalTerminal → blocking: true

# 应用层（待基础设施就绪后）
RunCommand: -Service "served,adapter,frontend" -QuickStart -ExternalTerminal -WaitForDeps → blocking: true
```

### 第三步：确认状态

```
RunCommand: cd "scripts" ; .\start-bemp-env.ps1 -Status
→ target_terminal: 任意空闲终端, blocking: true
```

## 代码修改后编译验证流程

> 详见 [COMPILE-GUIDE.md](./COMPILE-GUIDE.md) 的"代码修改后编译验证流程"章节

简要流程：编译前置检查(F-01) → 增量编译(F-03) → 编译产物验证(BUG-005) → 启动服务

## 实时观察运行日志（推荐）

服务启动后，运行日志会在启动它的终端实时滚动（覆盖启动/请求/错误/调试）。除了直接看启动终端外，还可用 `-Follow` 在任意空闲终端附加观察，避免切窗口：

```
# 在外部 PowerShell 窗口启动后，于空闲终端持续观察某个服务的实时日志
RunCommand: cd "scripts" ; .\start-bemp-env.ps1 -Service served -Follow
→ target_terminal: "new", blocking: false

# 先看最近 200 行历史，再跟随新增（服务已运行很久、日志很长时很有用）
RunCommand: cd "scripts" ; .\start-bemp-env.ps1 -Service adapter -Follow -Tail 200
→ target_terminal: "new", blocking: false
```

- `-Follow` 不启动服务，只跟随其最新 run-log（含 `.stderr`）；`-Tail N` 先回看末尾 N 行。
- 着色规则：ERROR/异常/堆栈→红，WARN→黄，DEBUG→灰，INFO→青；被捕获到文件时自动关闭着色。
- 排查问题时优先看实时滚动日志，`-Status` 仅看端口级状态。

## IDE终端模式注意事项

| 操作 | 终端策略 | 原因 |
|------|---------|------|
| 启动服务 | `target_terminal: "new"` | 服务独占终端，前台实时滚动日志 |
| 检查状态 | `target_terminal: "new"` | 复用会杀死服务 |
| 查看日志 | `-Follow`（空闲终端）或 `CheckCommandStatus` | 只读，安全，且不干扰运行服务的终端 |

**致命错误**：在已运行服务的终端执行新命令会终止服务进程。

## 常见错误及避免

| 错误行为 | 后果 | 正确做法 |
|---------|------|---------|
| 不指定 `-ExternalTerminal` 且终端已满 | 无法启动更多服务 | 优先使用 `-ExternalTerminal` |
| 状态检查复用服务终端 | 杀死服务 | 始终用新终端或外部终端模式 |
| 不加 `-WaitForDeps` 直接启动Served | 基础设施未就绪导致启动失败 | 使用 `-WaitForDeps` |
| 多服务用同一终端 | 后启动杀死先启动 | 每服务独立终端 |
