---
name: "bemp-git-maven-automation"
description: "自动化同步所有Git仓库并执行Maven构建。当用户需要更新所有仓库代码并编译项目时调用。"
---

# Git Maven 自动化构建技能

自动同步工作空间中的Git仓库并执行Maven构建，支持Banks个性化工程增量编译。

## 触发关键词

同步代码、同步仓库、全量构建、增量构建、构建项目、编译项目、git同步、maven构建

## 配置说明

配置文件：`config/config.properties`，修改后重新调用技能即可生效。

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| BUILD_TYPE | 构建类型：full/incremental | incremental |
| BANKS_BUILD_DIRS | Banks构建子目录（逗号分隔，空=全部） | ext-hnnxbank |
| BANKS_BUILD_DEPENDENCIES | 是否构建依赖模块 | true |
| MAVEN_OPTS | Maven内存参数 | -Xmx2048m -XX:MaxPermSize=512m |
| SKIP_DIRS | 跳过的目录 | node_modules,target,.idea,log,logs |
| CONFLICT_ACTION | 冲突处理：stop/warn/skip | stop |
| PARALLEL_BUILD | 并行构建 | false |
| BUILD_THREADS | 并行线程数 | 4 |

环境变量可覆盖同名配置项。项目根目录自动检测，无需手动配置。

## 执行步骤

### 1. 加载配置
- 加载 `scripts/config-reader.ps1` 工具脚本
- 调用 `Get-BuildConfig` 读取 `config/config.properties` 配置
- 调用 `Test-BuildConfig` 验证配置有效性，如有错误则报告并停止
- 输出关键配置信息：PROJECT_ROOT、BANKS_BUILD_DIRS、BUILD_TYPE

### 2. 发现Git仓库
- 在项目根目录下递归查找 `.git` 目录
- 排除 SKIP_DIRS 中配置的目录
- 对每个仓库获取：当前分支、远程URL、上次提交时间、仓库状态
- 生成仓库清单表格并输出

### 3. 同步Git仓库
对每个仓库依次执行：
1. `git fetch --all` 获取远程更新
2. `git rev-parse HEAD` 记录拉取前提交哈希
3. `git pull` 拉取代码
4. 检测冲突关键字（CONFLICT/冲突/merge conflict），冲突时按 CONFLICT_ACTION 配置处理
5. `git rev-parse HEAD` 记录拉取后提交哈希，对比检测代码变更

### 4. Maven构建

#### 构建决策
- BUILD_TYPE=full：直接构建所有模块
- BUILD_TYPE=incremental：仅构建有代码变更的模块，无变更则跳过

#### 构建顺序（按依赖关系）
bom → framework → adapter → banks → served

#### Banks仓库特殊处理
当仓库路径包含 `banks` 时：
1. 解析 BANKS_BUILD_DIRS 获取需要构建的子目录列表
2. 仅在指定子目录下执行构建，跳过其他银行工程
3. BANKS_BUILD_DEPENDENCIES=true 时使用 `-am` 参数自动构建依赖
4. 命令示例：`cd {PROJECT_ROOT}/banks/ext-hnnxbank && mvn clean install -am -DskipTests=true`

#### 其他仓库
- 存在 pom.xml 的仓库执行 `mvn clean install -DskipTests=true`
- PARALLEL_BUILD=true 时追加 `-T {BUILD_THREADS}` 参数

### 5. 构建报告
- 汇总构建结果：成功/失败/跳过模块数、构建耗时
- 构建失败时分析错误类型并提供解决建议

## 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| Git冲突 | 按 CONFLICT_ACTION 配置处理，默认停止 |
| 网络超时 | 记录错误，继续处理其他仓库 |
| Maven内存不足 | 自动调整 MAVEN_OPTS 并重试 |
| 编码错误 | 跳过非当前开发的银行工程 |
| 构建中断 | 使用 StopCommand 终止进程后重新执行 |

## 注意事项

- 首次构建建议使用全量构建（BUILD_TYPE=full）
- 增量构建需确保依赖模块已构建完成
- 并行构建会增加系统资源消耗，按需开启
- Maven构建中断后需先终止进程再重新执行

## 版本历史

- v4.0.0: 全面简化重构
  - 合并两个配置文件为一个 config.properties，只保留用户需要修改的配置项
  - 项目根目录自动检测，无需手动配置路径
  - 新增配置验证机制 Test-BuildConfig
  - 精简SKILL.md文档，突出核心信息
  - 移除无法运行的PS1主脚本，执行逻辑统一由SKILL.md指导
- v3.1.0: 路径集中化管理
- v3.0.0: Banks可配置化增量编译
- v2.0.0: Banks仓库构建流程优化
- v1.0.0: 初始版本
