# bemp-backend-code-review v2.2.0

BEMP 银行个性化后端代码审查技能。配置驱动，支持多银行切换，覆盖目录结构、注解、参数传递、安全性、性能等 14 个审查维度。

> **v2.2.0 Token 优化**：代码示例精简、脚本外置、占位符体系 + 配置分离，SKILL.md 缩减 76% 同时保持功能完整。

## 目录结构

```
bemp-backend-code-review/
├── SKILL.md                      技能定义与审查规则（AI Agent 入口）
├── README.md                     本文件（开发者入口）
├── config/
│   └── bank-config.json          多银行参数配置（currentBank 切换银行）
├── scripts/
│   ├── auto-scan.ps1             Windows PowerShell 阻塞级问题自动扫描
│   └── auto-scan.sh              Unix/Linux/Mac Bash 阻塞级问题自动扫描
├── templates/
│   └── report-template.md        审查报告模板
└── reports/                      审查报告存档（首次审查时自动创建）
    └── {bankCode}_YYYY-MM-DD_HHmmss_[full|incremental]_report.md
```

## 功能矩阵

| 功能 | 说明 | 触发方式 |
|:---|:---|:---|
| **全量审查** | 对整个银行目录下所有 `.java` 文件审查 | 直接调用技能 |
| **增量审查** | 仅审查 `git diff --name-only` 变更文件 | 粘贴变更文件列表 |
| **快速自检** | 7 项阻塞级问题自动扫描，提交前必做 | `pwsh scripts/auto-scan.ps1` |
| **多银行切换** | 修改 `currentBank` 即可，审查规则不变 | 编辑 `config/bank-config.json` |
| **版本化报告** | 按银行+时间戳归档，支持历史对比 | 审查完成后自动生成 |

## 审查维度（14 项）

| # | 维度 | 核心规则 |
|:--|:---|:---|
| 1 | 目录与包结构 | 代码在 `{sourceDir}` 下，包路径 `{packagePath}.{module}.{layer}` |
| 2 | 个性化类开发 | Service/Atom 加 `@CustomizedBean`，Controller 不加 |
| 3 | Controller 规范 | `@RestController` + 路径以 `{urlPrefixes}` 开头 |
| 4 | Service 规范 | `@CloudComponent` / `@CloudService` / `@CloudFunction` |
| 5 | 参数传递 | 新功能→DTO 对象，兼容旧代码→BaseRequest，少用 @RequestBody |
| 6 | DTO 设计 | `{dtoPrefix}功能名Req/Resp` + `implements Serializable` |
| 7 | 依赖注入 | `@CloudReference`(远程) / `@Resource`(本地) |
| 8 | 服务调用 | 调用前设置所有必需字段（userNo、brchNo、legalNo等） |
| 9 | 日志记录 | 四级日志，禁止记录敏感信息 |
| 10 | 代码质量 | 中文注释、`BempRuntimeException`、空值边界处理 |
| 11 | 安全性 | 参数化查询、敏感信息保护、权限校验 |
| 12 | 性能 | N+1 查询检查、批量操作、资源管理 |
| 13 | 事务与并发 | `@Transactional` 配置、线程安全、竞态条件 |
| 14 | 国际化与 Maven | API 路径一致性、Java 1.8 语法、pom.xml 版本 |

## 严重程度分级

| 级别 | 说明 | 处理 |
|:---|:---|:---|
| 🔴 阻塞 | 违反强制规范（如缺注解、路径错、硬编码密钥） | **不通过**，必须修复 |
| 🟠 严重 | 可能导致问题（如缺字段、N+1 查询、资源未关） | **不通过**，强烈建议修复 |
| 🟡 警告 | 代码风格问题（如缺注释、命名不规范） | 有条件通过 |
| 🟢 提示 | 优化建议（如冗余代码、可读性改进） | 通过 |

## 多银行配置

### 当前支持银行

| 银行代码 | 名称 | 状态 |
|:---|:---|:---|
| `hnnxbank` | 河南农信 | ✅ 当前活跃 |
| `example` | 示例模板 | 📋 仅供参照 |

### 切换银行

编辑 `config/bank-config.json`，修改 `currentBank` 为目标银行代码：

```json
{ "currentBank": "hnnxbank" }
```

### 添加新银行

在 `banks` 节点中添加配置项即可，审查规则无需修改：

```json
{
  "bankName": "新银行名称",
  "bankCode": "newbank",
  "bankCodeShort": "nb",
  "sourceDir": "banks/ext-newbank",
  "packagePath": "com.hundsun.bemp.newbank",
  "classPrefix": "NewBank",
  "dtoPrefix": "Nb",
  "urlPrefixes": ["/nb/", "/newbank/"],
  "dtoSourceDir": "banks/ext-newbank/newbank-biz-api/src/main/java",
  "enableAutoScan": true
}
```

| 参数 | 必填 | 说明 |
|:---|:---|:---|
| `bankName` | 是 | 中文名称 |
| `bankCode` | 是 | 目录名/包名 |
| `bankCodeShort` | 是 | URL 前缀简码 |
| `sourceDir` | 是 | 源码根目录 |
| `packagePath` | 是 | Java 包路径 |
| `classPrefix` | 是 | 类名前缀（如 `HnnxBank`） |
| `dtoPrefix` | 是 | DTO 前缀（如 `Hnnx`） |
| `urlPrefixes` | 是 | URL 前缀数组（至少两个：短+完整） |
| `dtoSourceDir` | 是 | DTO 源码目录 |
| `enableAutoScan` | 是 | 是否启用自动扫描 |

## 快速开始

### 1. 快速自检（提交前必做）

```powershell
# Windows
pwsh .trae/skills/bemp-backend-code-review/scripts/auto-scan.ps1

# Unix/Linux/Mac
bash .trae/skills/bemp-backend-code-review/scripts/auto-scan.sh
```

自动检查 7 项：`@CustomizedBean` 注解、请求路径前缀、`@RestController`、DTO Serializable、DTO 命名前缀、Controller 返回值类型。

### 2. 增量审查（迭代开发）

```bash
git diff --name-only HEAD~1 -- 'banks/ext-hnnxbank/**/*.java'
```

将输出文件列表粘贴给 AI，触发增量审查。

### 3. 全量审查（新模块/定期审查）

直接调用技能，默认对整个 `{sourceDir}` 目录进行全量审查。

## 审查流程

```
快速自检(auto-scan) → 前置检查(位置/注解/路径) → 代码规范(Controller/参数/服务调用)
→ 质量与安全(日志/安全/性能/异常) → Maven编译验证 → 输出审查报告(按模板)
```

## 审查报告

按 `templates/report-template.md` 生成，包含：

- 审查版本、模式、目标银行、文件数、时间戳
- 与上次对比（🆕新增 / ✅已修复 / ⚠️仍存在）
- 四级问题汇总与详细列表（含代码对比）
- 审查结论与修复验证指引

报告保存至 `reports/{bankCode}_YYYY-MM-DD_HHmmss_[full|incremental]_report.md`（首次审查时自动创建目录）。

## 快速问题定位

| 现象 | 原因 | 方案 |
|:---|:---|:---|
| "法人编号和机构号都不能为空" | 调用服务未设 brchNo | `userDto.setBrchNo(...)` |
| "用户名或密码错误" | 前后端参数格式不匹配 | 对齐 DTO / requestDto / JSON 格式 |
| 参数为 null | 参数名不一致 | 确保大小写一致、DTO 有 setter |
| Content type not supported | @RequestBody vs form-data 冲突 | 去 @RequestBody(推荐) 或前端改 JSON |
| 类型转换异常 | 前后端参数结构不一致 | DTO→传对象，BaseRequest→requestDto |
| Maven 编译失败 | Java 版本/依赖/缺少 import | `mvn compile -DskipTests`；检查 pom.xml |
| DTO 前缀不符 | 切换银行后未更新命名 | 改为 `{dtoPrefix}`+功能名 |

## 文件说明

| 文件 | 用途 | 加载方式 |
|:---|:---|:---|
| `SKILL.md` | 审查规则与流程定义（含 14 维度 + 附录 A/B） | 技能调用时自动加载 |
| `config/bank-config.json` | 多银行参数配置 + 切换指南 | 脚本运行时读取 |
| `scripts/auto-scan.ps1` | Windows 7 项阻塞级自动扫描 | 手动执行 |
| `scripts/auto-scan.sh` | Unix/Linux/Mac 7 项阻塞级自动扫描 | 手动执行 |
| `templates/report-template.md` | 审查报告模板（含历史对比） | 审查输出时按需引用 |
| `reports/` | 历史审查报告归档 | 首次审查时自动创建 |

## 典型使用场景

### 场景 1：日常开发提交流程

```
编写代码 → 运行 auto-scan.ps1 自检 → 修复阻塞问题
→ 调用技能增量审查 → 修复严重问题 → Maven 编译 → 提交代码
```

### 场景 2：新银行接入

```
1. 创建 banks/ext-newbank 目录结构
2. 在 bank-config.json 中添加新银行配置
3. 修改 currentBank 为新银行代码
4. 运行 auto-scan.ps1 验证配置路径
5. 编写代码后调用技能审查
```

### 场景 3：定期质量审查

```
调用技能全量审查 → 获取审查报告 → 按优先级修复
→ 再次审查验证修复 → 对比两次报告追踪改进
```

## 版本历史

| 版本 | 日期 | 变更 |
|:---|:---|:---|
| v2.2.0 | 2026-05-16 | Token 优化：代码示例精简、脚本外置、占位符体系、去重合并（SKILL.md 缩减 76%） |
| v2.1.0 | 2026-05-16 | 多银行可配置化：bank-config.json + 占位符体系 + 切换指南 |
| v2.0.0 | 2026-05-16 | 结构重组 14 维度；新增安全性/性能/事务并发；自动扫描脚本；增量审查 |
| v1.0.0 | 初始版本 | 13 项审查维度的知识型审查手册 |