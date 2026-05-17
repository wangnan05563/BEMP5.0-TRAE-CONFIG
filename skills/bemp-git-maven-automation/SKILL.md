---
name: "bemp-git-maven-automation"
description: "自动同步工作空间中的Git仓库并执行Maven构建，支持Banks个性化工程增量编译。"
whenToUse: "当用户需要更新 所有/全部/全量/增量 仓库代码/编译项目/maven构建/构建时调用"
triggers: 
  - "同步/编译 代码/仓库/项目"
  - "全量/增量/maven构建/编译"
  - "git 同步/拉取/pull/fetch/抓取"
---

## 配置说明

配置文件 `config/config.properties`，修改后重新调用技能即可生效，环境变量可覆盖同名配置项。

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| BUILD_TYPE | full=全量 / incremental=增量 | incremental |
| BANKS_BUILD_DIRS | Banks子目录（逗号分隔，空=全部） | ext-hnnxbank |
| BANKS_BUILD_DEPENDENCIES | 是否构建依赖模块 | true |
| MAVEN_OPTS | Maven内存参数 | -Xmx2048m -XX:MaxPermSize=512m |
| SKIP_DIRS | 跳过的目录 | node_modules,target,.idea,log,logs |
| SKIP_BUILD_EXTENSIONS | 增量构建跳过的文件后缀 | .md,.txt,.gitignore,.gitattributes,.properties |
| CONFLICT_ACTION | stop / warn / skip | stop |
| PARALLEL_BUILD | 并行构建 | false |
| BUILD_THREADS | 并行线程数 | 4 |
| BUILD_ORDER | 构建顺序（逗号分隔） | bom,framework,adapter,banks,served |
| GIT_RETRY_COUNT | Git操作重试次数 | 3 |
| ENABLE_BUILD_REPORT | 详细报告 / 精简输出 | true |

## 执行步骤

### 1. 加载配置与预检查
用以下一行命令完成配置加载和验证（无需单独读取脚本文件）：

```powershell
. ".trae\skills\bemp-git-maven-automation\scripts\config-reader.ps1"; $c=Get-BuildConfig; $e=Test-BuildConfig $c; if($e){Write-Error($e -join "`n");exit 1}else{$c|ConvertTo-Json -Compress}
```

- 解析 JSON 输出获取全部配置（含 PROJECT_ROOT、BANKS_ROOT_DIR）
- 命令返回非零则报告错误并停止
- **环境预检查**（任一项不通过则停止）：
  - `java -version` — 确认 Java 8+
  - `mvn -version` — 确认 Maven 3.6+
  - 磁盘剩余空间 > 2GB

### 2. 发现Git仓库
- 在 PROJECT_ROOT 下递归查找 `.git` 目录，排除 SKIP_DIRS 中的目录
- 获取每个仓库：当前分支、远程URL、仓库状态
- **ENABLE_BUILD_REPORT=true**：生成仓库清单表格
- **ENABLE_BUILD_REPORT=false**：仅输出 `发现 N 个Git仓库`

### 3. 同步Git仓库
对每个仓库依次执行：
1. `git status --porcelain` — 如有未提交修改，先 `git stash push -m "bemp-auto-build-stash"`
2. `git fetch --all` — 最多重试 GIT_RETRY_COUNT 次（间隔3秒）
3. `git rev-parse HEAD` → beforeHash
4. `git pull` — 最多重试 GIT_RETRY_COUNT 次（间隔5秒）
5. 检测冲突关键字（CONFLICT/merge conflict），按 CONFLICT_ACTION 处理
6. `git rev-parse HEAD` → afterHash，对比检测变更
7. 如果步骤1执行了 stash → `git stash pop`
8. 仅当 beforeHash≠afterHash 且 BUILD_TYPE=incremental 时：
   - `git diff --name-only beforeHash afterHash`
   - 过滤 SKIP_BUILD_EXTENSIONS 后缀的文件
   - 过滤后无源码变更 → 标记"跳过（仅文档变更）"
   - 过滤后有源码变更 → 标记"需要构建"
- **ENABLE_BUILD_REPORT=true**：输出每个仓库的同步状态和变更详情
- **ENABLE_BUILD_REPORT=false**：仅输出异常/冲突信息

### 4. Maven构建

**决策**：BUILD_TYPE=full 构建所有模块；incremental 仅构建有源码变更的模块

**顺序**：按 BUILD_ORDER 在 PROJECT_ROOT 下匹配目录依次构建

**Banks特殊处理**（仓库路径含 `banks`）：仅在 BANKS_BUILD_DIRS 指定的子目录下执行；BANKS_BUILD_DEPENDENCIES=true 时加 `-am` 参数

**其他仓库**：有 pom.xml 则执行 `mvn clean install -DskipTests=true`；PARALLEL_BUILD=true 时追加 `-T BUILD_THREADS`

### 5. 构建报告
- **ENABLE_BUILD_REPORT=true**：汇总成功/失败/跳过模块数、构建耗时，失败时分析错误并提供建议
- **ENABLE_BUILD_REPORT=false**：仅输出 `构建完成: X/Y 成功, 耗时 Zs`，有失败时列出失败模块名

## 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| Git冲突 | 按 CONFLICT_ACTION 处理，默认停止 |
| 网络超时/抖动 | 按 GIT_RETRY_COUNT 自动重试，超限后记录并跳过 |
| Git stash冲突 | 提示用户手动处理，不丢弃本地修改 |
| Maven内存不足 | 自动调大 MAVEN_OPTS -Xmx 并重试 |
| 编码错误 | 跳过非当前开发的银行工程 |
| 构建中断 | StopCommand 终止进程后重新执行 |
| 环境不满足 | 预检查阶段报告并停止 |

## 版本历史

- v4.2.0: Token友好优化 — 配置加载改为一行命令免读脚本；ENABLE_BUILD_REPORT控制输出详细度；内容精简
- v4.1.0: 鲁棒性增强 — GIT重试、增量文件过滤、环境预检查、stash保护、BUILD_ORDER配置化
- v4.0.0: 全面简化重构 — 单配置文件、项目根目录自动检测、配置验证机制、移除PS1主脚本
