---
name: "bemp-git-maven-automation"
description: "自动同步工作空间中的Git仓库并执行Maven构建，支持Banks个性化工程增量编译。"
whenToUse: "当用户需要更新 所有/全部/全量/增量 仓库代码/编译项目/maven构建/构建时调用"
triggers: 
  - "同步/编译 代码/仓库/项目"
  - "全量/增量/maven构建/编译/打包"
  - "git 同步/拉取/pull/fetch/抓取"
---

## 配置加载铁律（取参前必读）

本技能 config 下 JSON 中的 `${ENV:VAR}` 是占位符，直接读文件得到的是字面量，不是参数值。取参数值必须先解析：

```powershell
# 解析整个配置 / 取单键（以解析结果为参数值，禁止拿 ${ENV:XXX} 字面量当值用）
python  "..\_shared\load_config.py"  --file "<本技能配置路径>"  --get <a.b.c>
node    "..\_shared\load-config.js"  --file "<本技能配置路径>"  --get <a.b.c>
```

- 解析链：环境变量 > `_shared/env-config.json` environmentDefaults（唯一配置入口）> `${ENV:VAR:默认值}` 内联默认值
- 解析报错 → 跑 `powershell -File "<skills根>\_shared\doctor-config.ps1"`，按 FAIL 清单修复（改 _shared 或设环境变量，禁止把真值回写技能 config）
- 完整约定见 [_shared/config-loading-guide.md](../_shared/config-loading-guide.md)

## 配置

修改 `config/config.properties`，环境变量可覆盖同名配置项。

| 配置项 | 说明 |
|--------|------|
| PROJECT_ROOT | 项目根目录（留空自动推断） |
| BUILD_TYPE | full=全量 / incremental=增量 |
| BANKS_BUILD_DIRS | Banks子目录（逗号分隔，留空自动发现ext-*） |
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
| BUILD_LOG_LEVEL | verbose=全部 / normal=关键行 / quiet=仅摘要 |
| SKIP_CLEAN_ON_LOCK | target被锁定时自动跳过clean |

## 执行命令

根据用户意图选择对应的 Mode 执行**一条命令**，无需分步执行：

| 用户意图 | Mode | 命令 |
|---------|------|------|
| 同步代码 | sync | `& ".\scripts/run-build.ps1" -Mode sync` |
| 增量打包/增量编译 | incremental | `& ".\scripts/run-build.ps1" -Mode incremental` |
| 全量打包/全量编译 | full | `& ".\scripts/run-build.ps1" -Mode full` |
| 同步代码并增量打包 | incremental | `& ".\scripts/run-build.ps1" -Mode incremental` |
| 同步代码并全量打包 | full | `& ".\scripts/run-build.ps1" -Mode full` |

**【强制】** 必须使用 `run-build.ps1` 统一入口，禁止手动分步调用或直接执行 `mvn` 命令，否则增量构建逻辑不会生效。

## 增量构建逻辑

`-Mode incremental` 时的完整判断流程：

1. Git同步：fetch → pull → 对比 beforeHash/afterHash
2. 变更检测：`git diff --name-only` 获取变更文件，按 `SKIP_BUILD_EXTENSIONS` 过滤
3. 本地修改：`git status --porcelain` 中的源码文件也标记为需要构建
4. 模块筛选：仅构建有源码变更的 BUILD_ORDER 模块
5. 跳过clean：增量模式执行 `mvn install`（不clean），保留已有编译产物
6. 无变更跳过：所有模块均无源码变更时，输出提示并跳过构建

## 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| Git冲突 | pull 非零退出码 → 按 CONFLICT_ACTION 处理 |
| 网络超时 | 按 GIT_RETRY_COUNT 重试，超限跳过 |
| stash冲突 | 提示手动处理，不丢弃修改 |
| stash残留 | 执行前自动检测并 pop |
| Maven内存不足 | 调大 MAVEN_OPTS -Xmx 重试 |
| 构建中断 | 重新执行即可 |
| target目录锁定 | SKIP_CLEAN_ON_LOCK=true 时自动跳过clean阶段 |
| 终端乱码 | 自动追加 -Dfile.encoding=UTF-8 等JVM参数 + [Console]::OutputEncoding=UTF8 |
| Git中文路径 | diff 时使用 -c core.quotepath=false 避免转义 |
| 环境不满足 | 预检查阶段停止 |
| git不在PATH | Find-GitCmd 自动搜索常见路径 |

## 版本

v5.0.0: 统一入口 — 新增run-build.ps1一条命令完成全流程、本地未提交源码修改也触发增量构建、增量变更摘要输出
v4.7.1: 编码修复 — Maven JVM强制UTF-8输出(-Dfile.encoding等)、[Console]::OutputEncoding=UTF8、git diff中文路径(core.quotepath=false)、增量跳过提示优化
v4.7.0: 增量构建修复 — beforeHash/afterHash替代HEAD@{1}、增量模式跳过clean、流式日志输出(BUILD_LOG_LEVEL)、target锁定自动跳过clean(SKIP_CLEAN_ON_LOCK)、模块耗时统计与颜色标记
v4.6.0: 路径通用化 — 移除所有绝对路径硬编码、SKILL.md动态推断skillRoot、config-reader.ps1从$PWD搜索、新增PROJECT_ROOT配置项
