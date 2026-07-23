# BEMP 编译验证指南

> 本文档为 bemp-automation-startserver 技能的编译验证详细指南，由 SKILL.md 渐进式披露拆分而来。

## 编译前置检查（Pre-compile Check，F-01）

> **设计动机**：文件写入截断（大括号不匹配）问题在Maven编译时才暴露，浪费完整编译周期。编译前置检查在编译前扫描修改文件的完整性。

### 检查项

| 检查项 | 检查方式 | 严重度 | 说明 |
|--------|---------|--------|------|
| 大括号匹配 | 统计`{`和`}`数量，diff≠0则警告 | warn | 文件写入截断的典型特征 |
| 文件非空 | 检测0字节文件 | block | 明确的写入失败 |
| 圆括号匹配 | 统计`(`和`)`数量，diff≠0则警告 | warn | 可选，默认关闭 |
| 末尾换行 | 检测文件是否缺少末尾换行 | warn | 可选，默认关闭 |

### 检查范围

仅检查最近修改的文件，通过 `git diff --name-only HEAD` 获取：
- 已跟踪文件的改动（git diff）
- 未跟踪的新增文件（git status，includeUntracked=true）
- 排除 target/、test/、generated/ 等目录

### 执行命令

```powershell
# 编译前置检查（独立执行，不编译）
# 读取 config/pre-compile-check.json，检查git diff获取的Java文件大括号匹配
.\scripts\pre-compile-check.ps1
```

### 配置说明

路径：`config/pre-compile-check.json`

| 配置节 | 字段 | 说明 |
|--------|------|------|
| `defaults.gitPath` | `${ENV:GIT_PATH}` | git可执行文件路径 |
| `defaults.failOnWarning` | false | warn级是否阻断编译 |
| `checks.braceBalance` | enabled/severity/allowDiff | 大括号匹配检查规则 |
| `checks.fileNonEmpty` | enabled/severity/minSizeBytes | 空文件检查规则 |
| `fileFilter.extensions` | [".java"] | 检查的文件扩展名 |
| `fileFilter.excludes.patterns` | glob数组 | 排除的文件模式 |

### 失败处理

- **block级失败**（如空文件）：中止编译，提示用户检查文件写入过程
- **warn级警告**（如大括号不匹配）：默认不阻断，提示用户确认文件完整性后继续；配置 `failOnWarning=true` 可改为阻断

## 编译后自动部署

Java代码修改后三步生效：

```powershell
# 步骤1：增量编译
cd "{moduleDir}"
& "{javacPath}" -encoding UTF-8 -cp "{warClassesDir};{warLibDir}*" -d "{warClassesDir}" "{sourceFile}"

# 步骤2：跳过（当-d直接指向warClassesDir时）

# 步骤3：重启
.\start-bemp-env.ps1 -Service served -QuickStart -ForceRestart -ExternalTerminal
```

### 配置项

路径：`config/compile-deploy.json`

| 字段 | 说明 |
|------|------|
| `javacPath` | javac编译器路径 |
| `modules.{name}.sourceDir` | 模块Java源码根目录 |
| `modules.{name}.targetClassesDir` | 编译输出目录 |
| `modules.{name}.warClassesDir` | WAR包classes目录 |
| `modules.{name}.warLibDir` | WAR包lib目录 |

## 增量编译模式（Incremental Compile，F-03）

> **设计动机**：Served全量编译耗时14分钟，严重拖慢开发-测试反馈循环。增量编译通过 `git diff` 确定改动模块，仅编译相关模块及其上游依赖（`-am`），将编译时间降至2-4分钟。

### 三种编译模式

| 模式 | Maven命令 | 耗时 | 适用场景 |
|------|----------|------|---------|
| `full` | `clean install -DskipTests=true` | ~14分钟 | 首次构建/依赖变更/不确定改动范围 |
| `incremental` | `clean install -DskipTests=true -pl {modules} -am` | ~2-4分钟 | 日常开发，已知改动模块 |
| `skip` | 无（直接用已有WAR） | 0 | 仅前端改动/确认代码已编译 |

### 模块依赖映射

通过 `config/compile-options.json` 的 `moduleMapping.rules` 配置文件路径到Maven模块的映射：

| 修改文件路径模式 | 编译模块 | 目标WAR |
|----------------|---------|---------|
| `**/{modulePrefix}biz-as/**/*.java` | biz-as + served-deploy | served |
| `**/{modulePrefix}biz-bs/**/*.java` | biz-bs + served-deploy | served |
| `**/{modulePrefix}biz-cs/**/*.java` | biz-cs + served-deploy | served |
| `**/{modulePrefix}biz-ds/**/*.java` | biz-ds + served-deploy | served |
| `**/{modulePrefix}adapter-as/**/*.java` | adapter-as + adapter-deploy | adapter |
| `**/{modulePrefix}served-deploy/**/*.java` | served-deploy | served |
| `**/frontend/**` | 跳过Maven编译 | - |

> `{modulePrefix}` 由 `BANK_MODULE_PREFIX` 环境变量解析

### 自动模式选择逻辑

```
git diff --name-only HEAD
  ├─ 无Java文件改动 → skip（直接启动）
  ├─ 有Java改动且匹配moduleMapping → incremental（-pl 模块 -am）
  └─ 有Java改动但未匹配规则 → full（回退全量保证完整性）
```

### 执行命令

```powershell
# 增量编译：自动检测改动模块并编译（读取 config/compile-options.json）
.\scripts\incremental-compile.ps1              # 自动模式（推荐）
.\scripts\incremental-compile.ps1 -Mode full   # 强制全量编译
.\scripts\incremental-compile.ps1 -Mode skip   # 跳过编译
```

### 配置说明

路径：`config/compile-options.json`

| 配置节 | 字段 | 说明 |
|--------|------|------|
| `defaults.defaultMode` | incremental | 默认编译模式 |
| `defaults.modes.{mode}.command` | Maven命令模板 | 各模式的编译命令 |
| `defaults.modes.{mode}.timeoutSeconds` | 超时秒数 | 编译超时阈值 |
| `defaults.repoRoot` | `${ENV:...}` | Maven reactor根目录 |
| `moduleMapping.rules[].pattern` | glob模式 | 文件路径匹配模式 |
| `moduleMapping.rules[].modules` | 模块列表 | 命中后需编译的Maven模块 |
| `overrides.project` | 对象 | 项目级覆盖 |
| `overrides.banks.{bankCode}` | 对象 | 银行级覆盖 |

### 失败处理

- **增量编译失败**（如模块依赖缺失）：回退到 `full` 全量编译，输出失败原因
- **Maven超时**：输出超时提示，建议检查网络或增大 `timeoutSeconds`
- **git diff为空**：提示无代码改动，建议使用 `skip` 模式直接启动

## 编译产物验证（Compile Verification，BUG-005）

> **设计动机**：BUG-005修复后需确认新方法已编译进运行时jar，否则SpringBoot启动后仍调用旧class导致缺陷复现。javap验证在编译后、启动前执行。

### 验证流程

```
[1] 定位exploded WAR的WEB-INF/lib目录
[2] 按jarPattern匹配目标jar（如 {modulePrefix}biz-as-*.jar）
[3] 执行 javap -classpath {jarPath} {className}
[4] 检查输出是否包含方法名
[5] 汇总验证结果，失败则阻断启动
```

### 执行命令

```powershell
# 编译产物验证：检查新方法是否已编译进运行时jar（读取 config/compile-verification.json）
.\scripts\verify-compile.ps1
```

### 配置说明

路径：`config/compile-verification.json`

| 配置节 | 字段 | 说明 |
|--------|------|------|
| `defaults.javapPath` | `${ENV:JAVA_HOME}\bin\javap` | javap可执行文件路径 |
| `defaults.failSeverity` | block/warn | 验证失败的严重度 |
| `verificationTargets.targets[].warLibDir` | `${ENV:...}` | WAR的WEB-INF/lib目录 |
| `verificationTargets.targets[].jarPattern` | glob模式 | 目标jar匹配模式 |
| `verificationTargets.targets[].classes[].fullyQualifiedName` | 类全名 | 含包路径的类名 |
| `verificationTargets.targets[].classes[].methods` | 方法名数组 | 需验证的方法列表 |
| `overrides.banks.{bankCode}` | 对象 | 银行级覆盖验证类列表 |

### 失败处理

- **jar未找到**：提示先执行编译，检查 `warLibDir` 路径是否正确
- **类未找到**：提示检查类全名（`BANK_PACKAGE_PREFIX` 是否正确解析）
- **方法未找到**：提示方法名拼写错误、或编译未包含最新代码
- **failSeverity=block**：验证失败阻断启动，必须修复后重试

## 代码修改后编译验证流程（F-01→F-03→BUG-005）

Java代码修改后，按以下顺序执行编译验证，再启动服务：

**第一步：编译前置检查（F-01）**
```
RunCommand: 读取 config/pre-compile-check.json，对git diff获取的Java文件执行大括号匹配检查
→ target_terminal: "new", blocking: true
```

**第二步：增量编译（F-03）**
```
RunCommand: 读取 config/compile-options.json，自动检测改动模块并执行 mvn -pl 模块 -am
→ target_terminal: "new", blocking: true
```

**第三步：编译产物验证（BUG-005）**
```
RunCommand: 读取 config/compile-verification.json，执行javap验证新方法已编译进运行时jar
→ target_terminal: "new", blocking: true
```

**第四步：启动服务**
```
RunCommand: cd "scripts" ; .\start-bemp-env.ps1 -Service served -QuickStart -ForceRestart -ExternalTerminal -WaitForDeps
→ blocking: true
```
