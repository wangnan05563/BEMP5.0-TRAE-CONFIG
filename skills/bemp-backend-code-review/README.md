# bemp-backend-code-review v3.1.0

BEMP 银行个性化后端代码审查技能。配置驱动，支持多银行切换，整合 java-code-review、concurrency-review、api-contract-review、architecture-review 四项技能及票据系统问题汇总，覆盖 22 个审查维度。

> **v3.1.0 知识点整合**：整合票据系统知识点检查清单，新增维度22（BEMP项目规范），扩展维度7（@Autowired）、9（AOP日志）、13（Redis锁事务外/MVCC/死锁顺序）、15（toMap merge）、16（BigDecimal.divide/ThreadLocal/子票区间Long）、20（空判断防全表/mybatis jdbcType/updateByIdSelective）、21（分录配置/流水号/客户账号唯一性），自动扫描13→16项。

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

## 审查维度（22 项）

| # | 维度 | 核心规则 |
|:--|:---|:---|
| 1 | 目录与包结构 | 代码在 `{sourceDir}` 下，包路径 `{packagePath}.{module}.{layer}` |
| 2 | 个性化类开发 | Service/Atom 加 `@CustomizedBean`，Controller 不加 |
| 3 | Controller 规范与API设计 | `@RestController`、HTTP动词语义、分页、DTO响应、错误格式 |
| 4 | Service 规范 | `@CloudComponent` / `@CloudService` / `@CloudFunction` |
| 5 | 参数传递 | 新功能→DTO 对象，兼容旧代码→BaseRequest，禁止布尔参数，API输入校验 |
| 6 | DTO 设计 | `{dtoPrefix}功能名Req/Resp` + `implements Serializable` |
| 7 | 依赖注入 | `@CloudReference`(远程) / `@Autowired`(本地，禁止`@Resource`) |
| 8 | 服务调用 | 调用前设置所有必需字段（userNo、brchNo、legalNo等） |
| 9 | 日志记录与异常处理 | 四级日志、禁止吞异常、保留原始堆栈、自定义领域异常 |
| 10 | 代码质量与Null安全 | 中文注释、链式调用判空、Optional正确使用、禁止返回null |
| 11 | 安全性 | 参数化查询、敏感信息保护、权限校验 |
| 12 | 性能与资源管理 | N+1查询、StringBuilder、正则预编译、try-with-resources |
| 13 | 事务、并发与异步 | `@Transactional`、ConcurrentHashMap、@Async正确调用、CompletableFuture异常处理 |
| 14 | 国际化与 Maven | API 路径一致性、Java 1.8 语法、pom.xml 版本 |
| 15 | 集合与流 | 遍历中不修改、Stream合理用、不可变集合、防御性拷贝 |
| 16 | Java惯用法 | equals/hashCode配对、toString无敏感信息、Builder模式 |
| 17 | 测试建议 | null输入/空集合/边界值/异常分支/并发场景覆盖 |
| 18 | API设计规范 | HTTP语义、版本化、向后兼容、URL名词、错误格式、分页 |
| 19 | 架构与分层 | 包组织策略、无跨层调用、领域纯净性、无循环依赖、DTO边界转换 |
| 20 | SQL与数据库专项 | 索引优化、SQL兼容性、拼接正确性、查询性能、分页排序规范、空判断防全表、mybatis jdbcType |
| 21 | 票据业务专项 | 金额计算规则、保证金/扣款/利率、日终任务分页、流水号唯一性、分录配置、客户账号唯一性 |
| 22 | BEMP项目规范 🆕 | @CloudComponent继承顺序、@Autowired(禁@Resource)、StringUtils lang3、PageInfo默认10、dataprovide排序、第三方依赖冲突 |

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

自动检查 16 项：`@CustomizedBean` 注解、请求路径前缀、`@RestController`、DTO Serializable、DTO 命名前缀、Controller 返回值类型、`e.printStackTrace()`、BigDecimal 比较方式、Integer/Long == 比较、时间格式 hh/HH、SQL 字符串拼接、硬编码机构号/产品代码、`@Resource`注入(应用`@Autowired`)、StringUtils lang3、Collectors.toMap merge。

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
| `SKILL.md` | 审查规则与流程定义（含 22 维度 + 附录 A/B） | 技能调用时自动加载 |
| `config/bank-config.json` | 多银行参数配置 + 切换指南 | 脚本运行时读取 |
| `scripts/auto-scan.ps1` | Windows 16 项阻塞级自动扫描 | 手动执行 |
| `scripts/auto-scan.sh` | Unix/Linux/Mac 16 项阻塞级自动扫描 | 手动执行 |
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
| v3.1.0 | 2026-05-22 | 知识点整合：整合票据系统知识点检查清单，新增维度22(BEMP项目规范)，扩展维度7/9/13/15/16/20/21，自动扫描13→16项，21→22维度 |
| v3.0.0 | 2026-05-22 | 票据业务专项整合：整合票据系统问题分享汇总(2023.06-2026.05)，新增维度20(SQL与数据库专项)和维度21(票据业务专项)，扩展维度10(数值比较)、12(分页排序/批量插入/大文件)、13(大事务拆分/Redis锁/死锁)、16(时间格式/double精度)，自动扫描7→13项，19→21维度 |
| v2.9.0 | 2026-05-22 | 多技能整合：融合concurrency-review(@Async/CompletableFuture/Executor)、api-contract-review(HTTP语义/分页/错误格式)、architecture-review(分层架构/领域纯净性/循环依赖)，17→19维度 |
| v2.8.0 | 2026-05-22 | 整合 java-code-review 技能：新增Null Safety、异常处理、集合与流、Java惯用法、测试建议维度（14→17项），审查流程/判断标准同步增强，删除冗余审查示例节省token |
| v2.7.0 | 2026-05-21 | 逻辑修复：SH DTO前缀检查(grep -v→basename)、PS1 -Include路径、SH补齐URL前缀+Controller返回值检查、hook增量传参、JSON -Encoding UTF8、版本号统一 |
| v2.2.0 | 2026-05-16 | Token 优化：代码示例精简、脚本外置、占位符体系、去重合并（SKILL.md 缩减 76%） |
| v2.1.0 | 2026-05-16 | 多银行可配置化：bank-config.json + 占位符体系 + 切换指南 |
| v2.0.0 | 2026-05-16 | 结构重组 14 维度；新增安全性/性能/事务并发；自动扫描脚本；增量审查 |
| v1.0.0 | 初始版本 | 13 项审查维度的知识型审查手册 |