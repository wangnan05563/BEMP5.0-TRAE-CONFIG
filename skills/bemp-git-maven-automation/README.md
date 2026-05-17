# BEMP Git Maven 自动化构建技能

为 Trae IDE 提供工作空间 Git 仓库批量同步 + Maven 智能构建能力，支持 Banks 个性化工程增量编译。

## 触发词

`同步代码 | 同步仓库 | 全量/增量构建 | 编译项目 | git 同步/拉取/pull | maven 构建`

## 功能特性

| 功能 | 描述 |
|------|------|
| **环境预检查** | 执行前检查 Java 8+、Maven 3.6+、磁盘空间 > 2GB |
| **Git 仓库发现** | 递归扫描项目根目录，自动发现所有 `.git` 仓库，排除 `node_modules/target` 等无关目录 |
| **批量 Git 同步** | 逐个仓库 fetch → pull，含重试机制（网络抖动自动恢复）、冲突策略处理 |
| **本地修改保护** | pull 前自动 `git stash` 暂存未提交修改，构建后 `git stash pop` 恢复 |
| **增量变更过滤** | 对比 pull 前后 commit hash，按 `SKIP_BUILD_EXTENSIONS` 过滤文档类变更，仅源码变更触发构建 |
| **Maven 智能构建** | 全量/增量两种模式，按 BUILD_ORDER 依赖顺序构建；Banks 工程支持子目录选择 + `-am` 自动依赖 |
| **构建报告** | 详细模式汇总成功/失败/跳过模块与耗时；精简模式仅输出一行摘要 |
| **配置驱动** | 12 项配置项统一在 `config.properties` 管理，环境变量可覆盖 |

## 目录结构

```
bemp-git-maven-automation/
├── SKILL.md                              # 技能规范 — 完整执行步骤与错误处理
├── README.md                             # 使用说明（本文件）
├── config/
│   └── config.properties                 # 统一配置文件（构建参数、Git 策略、构建顺序）
└── scripts/
    └── config-reader.ps1                 # 配置读取/验证工具（AI 一行命令加载，无需手动读取）
```

## 快速开始

### 1. 配置

编辑 [`config/config.properties`](config/config.properties)，修改 Banks 目标：

```properties
# Banks 个性化工程构建目录（河南农信）
BANKS_BUILD_DIRS=ext-hnnxbank

# 构建类型：incremental=增量 / full=全量
BUILD_TYPE=incremental
```

### 2. 使用

**方式 A — 自然语言描述**（推荐）：

> "同步代码"
> "全量编译项目"
> "增量构建"

技能自动完成：环境预检 → 发现仓库 → 同步 Git → Maven 构建 → 构建报告。

**方式 B — 指定场景**：

| 指令 | 效果 |
|------|------|
| `同步代码` | 仅同步所有 Git 仓库，不构建 |
| `全量构建` / `完整编译` | BUILD_TYPE=full，构建全部模块 |
| `增量构建` / `增量编译` | 仅构建有源码变更的模块 |

## 执行流程

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│ 1.配置与预检查 │ → │ 2.发现Git仓库 │ → │ 3.同步Git仓库 │ → │ 4.Maven构建  │ → │ 5.构建报告 │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘
```

| 步骤 | 关键操作 | 输出 |
|------|---------|------|
| 1. 配置与预检查 | 一行命令加载 config-reader.ps1 → JSON 解析配置 → 验证 Java/Maven/磁盘 | go/no-go 信号 + 配置摘要 |
| 2. 发现仓库 | 递归查找 `.git`（排除 SKIP_DIRS）→ 获取分支/远程/状态 | 仓库清单 |
| 3. 同步仓库 | stash → fetch(重试) → pull(重试) → 冲突检测 → diff 变更过滤 → stash pop | 变更状态（需构建/跳过/无变更） |
| 4. Maven 构建 | 按 BUILD_ORDER 顺序 `mvn clean install -DskipTests` ；Banks 加 `-am` | 构建日志 |
| 5. 构建报告 | 详细模式：成功/失败/跳过汇总 + 错误分析；精简模式：一行摘要 | 构建结果 |

## Git 同步详解

同步每个仓库时的完整操作序列：

```
git status --porcelain         ← 检测本地修改
    ↓ 有修改 →
git stash push -m "bemp-auto-build-stash"   ← 暂存保护
    ↓
git fetch --all                ← 重试 GIT_RETRY_COUNT 次（间隔 3s）
    ↓
git rev-parse HEAD → beforeHash
    ↓
git pull                       ← 重试 GIT_RETRY_COUNT 次（间隔 5s）
    ↓ 冲突 → 按 CONFLICT_ACTION 处理
git rev-parse HEAD → afterHash
    ↓ beforeHash ≠ afterHash →
git diff --name-only           ← 获取变更文件列表
    ↓ 过滤 SKIP_BUILD_EXTENSIONS
git stash pop                  ← 恢复本地修改
```

### 冲突处理策略

| CONFLICT_ACTION | 行为 |
|-----------------|------|
| `stop`（默认） | 遇到冲突立即停止，等待手动解决 |
| `warn` | 输出警告，跳过该仓库继续处理 |
| `skip` | 自动跳过冲突仓库，继续下一个 |

## Maven 构建详解

### 构建模式

| BUILD_TYPE | 触发条件 | 行为 |
|------------|---------|------|
| `full` | 始终 | 按 BUILD_ORDER 构建所有模块 |
| `incremental` | 仅源码变更的仓库 | 跳过无变更和仅文档变更的模块 |

### 构建顺序

按 `BUILD_ORDER` 配置（默认：`bom,framework,adapter,banks,served`），在 PROJECT_ROOT 下按目录名匹配依次执行 `mvn clean install -DskipTests=true`。

Banks 工程特殊处理：
- 仅在 `BANKS_BUILD_DIRS`（如 `ext-hnnxbank`）子目录下执行
- `BANKS_BUILD_DEPENDENCIES=true` 时自动追加 `-am`（also-make）参数，先构建依赖模块

## 配置全览

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `BUILD_TYPE` | `incremental` | 构建类型：`full` / `incremental` |
| `BANKS_BUILD_DIRS` | `ext-hnnxbank` | Banks 构建子目录（逗号分隔，空=全部） |
| `BANKS_BUILD_DEPENDENCIES` | `true` | 是否加 `-am` 构建依赖模块 |
| `MAVEN_OPTS` | `-Xmx2048m -XX:MaxPermSize=512m` | Maven JVM 参数 |
| `SKIP_DIRS` | `node_modules,target,.idea,log,logs` | 扫描时跳过的目录 |
| `SKIP_BUILD_EXTENSIONS` | `.md,.txt,.gitignore,.gitattributes,.properties` | 增量构建跳过的文件后缀 |
| `CONFLICT_ACTION` | `stop` | Git 冲突策略：`stop` / `warn` / `skip` |
| `PARALLEL_BUILD` | `false` | 是否开启 Maven 并行构建 |
| `BUILD_THREADS` | `4` | 并行构建线程数 |
| `BUILD_ORDER` | `bom,framework,adapter,banks,served` | Maven 构建顺序 |
| `GIT_RETRY_COUNT` | `3` | Git 操作失败重试次数 |
| `ENABLE_BUILD_REPORT` | `true` | `true`=详细报告 / `false`=精简输出 |

> 环境变量可覆盖同名配置项，例如 `$env:BUILD_TYPE="full"` 临时切换全量构建。

## 增量构建文件过滤

当 `BUILD_TYPE=incremental` 时，`git pull` 拉取到新提交后，通过 `git diff --name-only` 获取变更文件列表，按 `SKIP_BUILD_EXTENSIONS` 过滤：

| 场景 | 示例 | 结果 |
|------|------|------|
| 只改了 `README.md` | 全部文件被过滤 | 跳过构建（仅文档变更） |
| 改了 `UserController.java` + `README.md` | `.md` 被过滤，`.java` 保留 | 触发构建 |
| 改了 `application.properties` | `.properties` 被过滤 | 跳过构建（默认配置） |

## 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| **Git 冲突** | 按 `CONFLICT_ACTION` 处理，默认 `stop` 停止 |
| **网络超时/抖动** | 按 `GIT_RETRY_COUNT` 自动重试（fetch 间隔 3s，pull 间隔 5s），超限后跳过该仓库 |
| **Git stash 冲突** | 报告冲突提示用户手动处理，不自动丢弃本地修改 |
| **Maven 内存不足** | 自动调大 `MAVEN_OPTS` 中的 `-Xmx` 参数并重试 |
| **编码错误** | 跳过非当前开发的银行工程 |
| **构建中断** | 使用 `StopCommand` 终止残留进程后重新执行 |
| **环境不满足** | 预检查阶段报告缺失项（Java/Maven/磁盘）并停止 |

## 使用场景

| 场景 | 指令示例 | 技能行为 |
|------|---------|---------|
| **日常同步** | "同步代码" | 仅 Git 同步，不触发 Maven 构建 |
| **全量构建** | "全量编译" | 按 BUILD_ORDER 构建所有模块 |
| **增量构建** | "增量构建" | 仅构建有源码变更的模块 |
| **换银行构建** | "切换 BANKS_BUILD_DIRS 到 ext-sample，全量构建" | 修改配置后重新全量编译 |
| **CI 同步** | 设置 `ENABLE_BUILD_REPORT=false` | 精简输出，仅关键信息和异常 |

## 约束等级

| 等级 | 效力 | 说明 |
|------|------|------|
| **【强制】** | 严重缺陷 | 必须遵守 |
| **【推荐】** | 轻微缺陷 | 根据场景选择性遵守 |
| **【参考】** | 优化空间 | 参考使用 |

## 与其他技能集成

| 技能 | 触发时机 | 集成方式 |
|------|---------|---------|
| **bemp-implementation-engineer** | 开发前置 | 同步代码 → 启动服务 → 进入开发 |
| **bemp-personalized-developer** | 编码完成 | 同步代码 → 编译验证 → 代码走查 |
| **bemp-auto-tester** | 构建完成 | 构建成功 → 启动服务 → 自动化测试 |

## 常见问题

### Q1: 首次使用需要做什么？

**A**: 确认 `config/config.properties` 中 `BANKS_BUILD_DIRS` 指向正确的银行目录，首次建议 `BUILD_TYPE=full`。

### Q2: 只想同步代码，不想构建？

**A**: 说"同步代码"即可，技能在步骤 3 完成后发现无变更时自动跳过步骤 4。或者在步骤 4 开始时按确认前中止。

### Q3: 如何只构建某个银行？

**A**: 编辑 `config.properties`，设置 `BANKS_BUILD_DIRS=ext-hnnxbank`（单个银行），然后执行构建。

### Q4: 构建时内存不足怎么办？

**A**: 增大 `MAVEN_OPTS` 中的 `-Xmx` 值，如改为 `-Xmx4096m`。技能也会在 OOM 时自动调大重试。

### Q5: Git pull 一直失败？

**A**: 检查网络连通性，技能已内置 `GIT_RETRY_COUNT=3` 次重试。如果 GitHub 仓库无法访问，可能需要配置代理。

## 参考文档

- [SKILL.md](SKILL.md) — 技能完整规范（执行步骤 + 错误处理）
- [config/config.properties](config/config.properties) — 配置文件（含中文注释）
- [scripts/config-reader.ps1](scripts/config-reader.ps1) — 配置读取与验证脚本

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| **v4.2.0** | 2026-05 | Token 友好优化 — 配置加载改为一行命令免读脚本；`ENABLE_BUILD_REPORT` 控制输出详细度 |
| **v4.1.0** | 2026-05 | 鲁棒性增强 — Git 重试机制、增量文件过滤、环境预检查、stash 保护、`BUILD_ORDER` 配置化 |
| **v4.0.0** | 2026-05 | 全面简化重构 — 单配置文件、项目根目录自动检测、配置验证机制、SKILL.md 指导执行范式 |
| **v3.1.0** | — | 路径集中化管理 |
| **v3.0.0** | — | Banks 可配置化增量编译 |
| **v2.0.0** | — | Banks 仓库构建流程优化 |
| **v1.0.0** | — | 初始版本 |