# bemp-git-maven-automation 反向构建提示词

## 核心功能
自动同步工作空间Git仓库并执行Maven构建，支持Banks个性化工程增量编译。统一入口`run-build.ps1`一条命令完成全流程：Git同步→变更检测→模块筛选→增量/全量构建。

## 关键实现逻辑
- 统一入口：`scripts/run-build.ps1`，-Mode参数选择sync/incremental/full，禁止手动分步调用
- 增量构建逻辑：git fetch→pull→对比beforeHash/afterHash→git diff --name-only获取变更→按SKIP_BUILD_EXTENSIONS过滤→git status --porcelain本地修改也标记→仅构建有源码变更的BUILD_ORDER模块→增量模式执行mvn install(不clean)
- 配置文件：`config/config.properties`，环境变量可覆盖同名配置项
- 关键配置：BUILD_TYPE(full/incremental)、BANKS_BUILD_DIRS、BUILD_ORDER、CONFLICT_ACTION(stop/warn/skip)、SKIP_CLEAN_ON_LOCK

## 输入输出参数
| Mode | 命令 | 说明 |
|------|------|------|
| sync | run-build.ps1 -Mode sync | 仅同步代码 |
| incremental | run-build.ps1 -Mode incremental | 同步+增量编译 |
| full | run-build.ps1 -Mode full | 同步+全量编译 |

## 主要业务流程
1. 读取config.properties配置
2. Git同步：fetch→pull(冲突按CONFLICT_ACTION处理)→记录beforeHash/afterHash
3. 变更检测：diff变更文件+本地未提交修改→按模块筛选
4. 无变更跳过构建(增量模式)
5. 按BUILD_ORDER顺序构建：增量模式mvn install(不clean)，全量模式mvn clean install
6. 输出构建结果摘要

## 技术特性
- 编码修复：Maven JVM强制UTF-8(-Dfile.encoding)、[Console]::OutputEncoding=UTF8、git diff中文路径(core.quotepath=false)
- target锁定处理：SKIP_CLEAN_ON_LOCK=true时自动跳过clean阶段
- Git中文路径：diff时-c core.quotepath=false避免转义
- stash冲突：提示手动处理不丢弃修改；stash残留自动检测并pop
