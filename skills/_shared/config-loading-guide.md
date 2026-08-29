# BEMP 技能配置加载约定（唯一权威文档）

> 所有技能 SKILL.md 的「配置加载铁律」均指向本文件。本文是配置加载的唯一约定来源，修改约定只改这里。

## 1. 核心问题（为什么有这套约定）

技能 `config/*.json` 中的 `${ENV:VAR}` 是**占位符**——直接读 JSON 拿到的是字面量字符串，不是参数值。
这是"技能调用时找不到配置参数"的根因。**任何取值必须先解析。**

## 2. 解析链（三层，与所有加载器实现对齐）

```
${ENV:VAR} 的取值顺序：
  1. 环境变量 $env:VAR          （会话级临时覆盖）
  2. _shared/env-config.json 的 environmentDefaults.VAR   （唯一配置入口，永久真值）
  3. ${ENV:VAR:默认值} 内联默认值                          （仅适合端口等低频变更项）
三层均无值 → 报错（strict），绝不把字面量当值用。
```

嵌套引用支持：值本身可再含 `${ENV:...}`（如 `banksProjectPath` 引用 `BEMP_WORKSPACE_ROOT`+`BANK_PROJECT_DIR`），加载器递归解析至不动点，上限 6 层防循环。

## 3. 权威加载器（禁止各技能手写解析逻辑）

| 语言 | 入口 | 用法 |
|------|------|------|
| Python | `_shared/load_config.py` | `from load_config import load_resolved, resolve_value`；CLI: `python load_config.py --file <cfg> [--get a.b.c]` |
| Node.js | `_shared/load-config.js` | `require('../../_shared/load-config')` → `loadResolved(path)` / `getValue(path, 'a.b.c')`；CLI: `node load-config.js --file <cfg> [--get a.b.c]` |
| PowerShell | `_shared/Resolve-EnvConfig.ps1` | `. Resolve-EnvConfig.ps1` 后用 `Resolve-EnvPlaceholder` / `Resolve-AllConfigPlaceholders` |

CLI 输出即解析后的完整 JSON / 单值，AI 取参数一律以该输出为准。

## 4. AI 调用技能时的标准动作（铁律）

1. **读 SKILL.md 后、使用任何配置参数前**：先用加载器 CLI 把目标 config 解析一遍（或 `--get` 单键），以解析结果为参数值。
2. **看到 `${ENV:XXX}` 字样** = 配置未解析，禁止把它当路径/端口/用户名使用。
3. **解析报错**：执行 `_shared/doctor-config.ps1` 看全量 FAIL 清单，按修复指引补值（改 _shared 或设环境变量），**不要**把真值回写进技能 config。
4. **需要新增参数**：真值写 `_shared/env-config.json` 的 `environmentDefaults`，技能 config 中用 `${ENV:VAR}` 引用——保持"换电脑/银行只改 _shared"的单入口承诺。

## 5. 自检（doctor）

```powershell
# 一键扫描全部技能配置占位符可解析性（exit 0 = 全 PASS）
powershell -ExecutionPolicy Bypass -File .trae\skills\_shared\doctor-config.ps1
```

输出每个含占位符配置文件的 PASS/FAIL；FAIL 项附"三层链均无值"的变量名与修复指引。
建议时机：新会话首次调用 BEMP 技能前；改动 env-config.json 后；新增银行/换机部署后。

## 6. 语义对齐承诺

三个加载器（py/js/ps1）+ doctor 对同一占位符必须给出相同结果。任何解析语义变更（如新增方言、改默认值语义）必须四处同步并在本文档记录。
