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

## IDE终端模式注意事项

| 操作 | 终端策略 | 原因 |
|------|---------|------|
| 启动服务 | `target_terminal: "new"` | 服务独占终端 |
| 检查状态 | `target_terminal: "new"` | 复用会杀死服务 |
| 查看日志 | `CheckCommandStatus` | 只读，安全 |

**致命错误**：在已运行服务的终端执行新命令会终止服务进程。

## 常见错误及避免

| 错误行为 | 后果 | 正确做法 |
|---------|------|---------|
| 不指定 `-ExternalTerminal` 且终端已满 | 无法启动更多服务 | 优先使用 `-ExternalTerminal` |
| 状态检查复用服务终端 | 杀死服务 | 始终用新终端或外部终端模式 |
| 不加 `-WaitForDeps` 直接启动Served | 基础设施未就绪导致启动失败 | 使用 `-WaitForDeps` |
| 多服务用同一终端 | 后启动杀死先启动 | 每服务独立终端 |
