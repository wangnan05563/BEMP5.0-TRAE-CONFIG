---
name: "bemp-git-maven-automation"
description: "自动同步工作空间中的Git仓库并执行Maven构建，支持Banks个性化工程增量编译。"
whenToUse: "当用户需要更新 所有/全部/全量/增量 仓库代码/编译项目/maven构建/构建时调用"
triggers: 
  - "同步/编译 代码/仓库/项目"
  - "全量/增量/maven构建/编译"
  - "git 同步/拉取/pull/fetch/抓取"
---

## 配置

修改 `config/config.properties`，环境变量可覆盖同名配置项。

| 配置项 | 说明 |
|--------|------|
| BUILD_TYPE | full=全量 / incremental=增量 |
| BANKS_BUILD_DIRS | Banks子目录（逗号分隔，空=全部） |
| BANKS_BUILD_DEPENDENCIES | 是否构建依赖模块 |
| MAVEN_OPTS | Maven JVM 参数 |
| SKIP_DIRS | 跳过的目录 |
| SKIP_BUILD_EXTENSIONS | 增量构建跳过的文件后缀 |
| CONFLICT_ACTION | stop / warn / skip |
| PARALLEL_BUILD | 并行构建（可能引发模块依赖问题） |
| BUILD_THREADS | 并行线程数 |
| BUILD_ORDER | 构建顺序（逗号分隔） |
| GIT_RETRY_COUNT | Git操作重试次数 |
| ENABLE_BUILD_REPORT | true=详细报告 / false=精简输出 |

## 执行步骤

### 1. 加载配置与预检查

```powershell
$env:BEMP_SKILL_ROOT="D:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-git-maven-automation"; . "$env:BEMP_SKILL_ROOT\scripts\config-reader.ps1"; $c=Get-BuildConfig; if(!$c){exit 1}; $e=Test-BuildConfig $c; if($e){Write-Error($e -join "`n");exit 1}else{$c|ConvertTo-Json -Compress}
```

```powershell
$gitCmd=Find-GitCmd; Test-EnvPrerequisites $c $gitCmd
```

### 2. 发现Git仓库

```powershell
$repoList=Find-GitRepos $c $gitCmd
```

### 3. 同步Git仓库

```powershell
$syncResults=Sync-GitRepos $c $gitCmd $repoList
```

- 自动处理：stash保护→fetch重试→pull重试→diff过滤→stash恢复
- 幂等性：检测残留stash自动恢复
- CONFLICT_ACTION=stop 时冲突即停止

### 4. Maven构建

**仅同步模式**：用户说"同步代码"→ 跳过本步骤

```powershell
Invoke-MavenBuild $c $syncResults
```

- BUILD_TYPE=incremental 时仅构建 syncResults 中标记为 "src" 的模块
- Banks 特殊处理：仅在 BANKS_BUILD_DIRS 子目录下执行，BANKS_BUILD_DEPENDENCIES=true 加 `-am`
- 构建成功输出 `模块名|SUCCESS`，失败输出最后20行错误 + `模块名|FAILED`

### 5. 构建报告
- **ENABLE_BUILD_REPORT=true**：汇总成功/失败/跳过模块数、构建耗时，失败时分析错误并提供建议
- **ENABLE_BUILD_REPORT=false**：仅输出 `构建完成: X/Y 成功`
- **仅同步模式**：输出 `同步完成: N 个仓库, X 个有变更`

## 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| Git冲突 | pull 非零退出码 → 按 CONFLICT_ACTION 处理 |
| 网络超时 | 按 GIT_RETRY_COUNT 重试，超限跳过 |
| stash冲突 | 提示手动处理，不丢弃修改 |
| stash残留 | 执行前自动检测并 pop |
| Maven内存不足 | 调大 MAVEN_OPTS -Xmx 重试 |
| 构建中断 | 重新执行即可 |
| 环境不满足 | 预检查阶段停止 |
| git不在PATH | Find-GitCmd 自动搜索常见路径 |

## 版本

v4.4.0: Token优化 — 命令逻辑封装为PS函数、Maven输出截断、SKILL.md精简、配置表去默认值列、仓库列表动态获取、REPORT模式精简输出