---
name: "bemp-advanced-doc-generator"
description: "BEMP项目技术文档自动生成：基于.docx模板和代码扫描数据，填充生成概要设计说明书、详细设计文档。支持单元测试报告(xlsx/Word)、测试用例、测试报告的模板驱动生成。支持配置驱动的Excel从零生成（excel-custom）。触发时机：用户要求生成/编制/撰写BEMP项目的概要设计、详细设计、测试文档，或要求基于模板填充文档内容，或要求将MD/JSON数据源转为格式化Excel。"
---

# BEMP 高级文档生成器 v13.0

> **v13.0 变更（2026-07-22）**：新增3项能力——(1) 图表生成混合方案（drawio-skill + mcp-server-chart，12种图表类型，5级降级链）；(2) 交付文档质量审核清单（7类审核项）；(3) 测试报告版本迭代机制。全部参数配置化，支持三级配置继承。

## 触发条件

Use this skill when:
- 用户要求**基于模板生成/填充** BEMP 概要设计说明书或详细设计文档（核心场景）
- 用户要求生成 BEMP 单元测试报告（Word 或基于 xlsx 模板填充）
- 用户要求从需求文档生成 BEMP 测试用例或测试报告
- 用户要求将 MD/JSON 数据源转为格式化 Excel（`excel-custom` 类型）

Do NOT use this skill when:
- 用户仅要求阅读/查看已有文档
- 用户要求编写代码或修复 bug
- 用户要求生成 PRD/需求文档（应使用 `bemp-generate-prd`）

## 输入输出

Input:
- `--type` (string): 文档类型，必选一：`outline-design`|`design`|`unit-test-report`|`unit-test-report-xlsx`|`testcase`|`testreport`|`excel-custom`
- `--module` (string): 模块/银行名称，必填
- `--requirement` (string): 需求文档路径（Markdown）或项目根目录
- `--template` (string): 自定义 .docx 模板路径，可选
- `--bank` (string): 银行级配置代码，自动加载配置
- `--test-filter` (string): 测试类名过滤（逗号分隔）
- `--json` (bool): 是否输出 JSON 结构化结果

Output:
- `outputPath` (string): 生成的文件绝对路径
- `success` (bool): 是否生成成功
- `validation` (object): 文档校验结果

## 执行管线（9 阶段管道）

### 阶段 1：数据准备
需求文档解析 → `_design-data-{date}.json`；项目代码扫描 → `_scan-data.json`。
**门禁**：`subsystems` 数量 > 0，否则终止。

### 阶段 2：模板预处理（不可跳过）
复制模板 → 封面替换 → `full_template_cleanup`（蓝色清理+示例清除+备注清除）→ 窜行表格修复 → 目录结构确保。

### 阶段 3：图表生成（可并行）
> v13.0 混合方案，详见 [DETAILS.md](./DETAILS.md) 的"图表生成混合方案"章节。

**智能体前置流程（preGeneration，必须先执行）**：
1. 读取 `config/chart-tools.json` 的 `chartTypes`，识别 `preferredEngine` 为 `drawio` 或 `mcp` 的图表类型
2. 对 `preferredEngine=drawio` 的图表（部署图/ER图/UML类图/时序图/活动图）：通过 Skill 工具调用 `drawio-skill`，传入对应 preset 和数据，生成 PNG 到 `output/diagrams/`
3. 对 `preferredEngine=mcp` 的图表（架构图/网络图/组件图/统计图）：检查 `mcp_mcp-server-chart` 可用性，可用则通过 `run_mcp` 调用并下载 URL 为本地 PNG，不可用则跳过由脚本降级
4. 完成前置生成后，运行文档生成脚本，脚本检测 `output/diagrams/` 已存在的 PNG 并跳过，仅处理未生成的图表类型

**降级链**：drawio→mcp→graphviz→antv→matplotlib→placeholder。drawio/mcp 由智能体调用（agentDriven），graphviz/antv/matplotlib 由脚本调用。

**门禁**：`enforceDiagramGate` 检查三图齐全 + 大小 > 10KB。

### 阶段 4：章节填充（核心管线）
> 6级优先级策略，详见 [DETAILS.md](./DETAILS.md) 的"章节填充优先级策略"章节。

特殊处理（必须在通用匹配前）→ H1+H2组合匹配 → H1匹配 → H2匹配 → 模糊匹配 → `fill_empty_chapter` 兜底。

### 阶段 5：后处理
业务子模块插入 → 架构图插入 → ER图插入 → 修订记录更新 → 术语表清理 → 正文缩进 → 表格样式 → 保存 → 目录更新注入。

### 阶段 6：文档校验
自动验证：标题层级一致性、蓝色字体残留=0、占位符残留=0、表格字体统一、ER章节位置。

### 阶段 7：迭代闭环（用户反馈时触发）
用户反馈 → 根因分析 → 修复代码 → 重新执行管线 → 校验通过 → 输出 `-v{n+1}.docx`。最多迭代5次。

### 阶段 8：交付文档质量审核（v13.0 新增）
> 详见 [DETAILS.md](./DETAILS.md) 的"交付文档质量审核"章节。

7类审核项（QC001硬编码/QC002功能号/QC003日期/QC004章节结构/QC005占位符/QC006图表完整性/QC007表格完整性）。阻断项不通过→阻断交付。

### 阶段 9：测试报告版本迭代（v13.0 新增）
> 详见 [DETAILS.md](./DETAILS.md) 的"测试报告版本迭代"章节。

仅适用于 testreport 类型。版本号 `v{major}.{minor}`，7步迭代工作流，最多迭代10次。

## 三级配置继承体系（v13.0）

所有配置文件支持三级继承：技能级（默认）→ 项目级（覆盖）→ 银行级（覆盖）。

**合并策略**：deep-merge，子级覆盖父级同名字段，数组整体替换。

**配置文件清单**：

| 配置文件 | 用途 |
|---------|------|
| `config/chart-tools.json` | 图表工具混合方案（12种图表 + 5级降级链） |
| `config/quality-checklist.json` | 交付文档质量审核清单（7类审核项） |
| `config/report-versioning.json` | 测试报告版本迭代管理 |
| `config/excel-doc-types.json` | Excel从零生成文档类型定义 |
| `config/banks/<银行代码>.json` | 银行级个性化配置 |

**覆盖方式**：
1. 项目级：在 `config/` 下创建 `<文件名>.override.json`
2. 银行级：在 `config/banks/<银行代码>.json` 中添加对应字段

## 关键策略摘要

| 策略 | 说明 | 详细文档 |
|------|------|---------|
| 图表混合方案 | drawio+mcp 5级降级链 | [DETAILS.md](./DETAILS.md) |
| 质量审核 | 7类审核项，阻断/主要/次要三级 | [DETAILS.md](./DETAILS.md) |
| 版本迭代 | 7步工作流，7种变更类别 | [DETAILS.md](./DETAILS.md) |
| 章节填充优先级 | 6级匹配策略，特殊处理优先 | [DETAILS.md](./DETAILS.md) |
| 文档内容管理 | ContentRegistry 按需加载 | [DETAILS.md](./DETAILS.md) |
| 蓝色文本清理 | 分阶段清理+两次清理 | [DETAILS.md](./DETAILS.md) |
| xlsx模板填充 | Schema优先，6步管线 | [DETAILS.md](./DETAILS.md) |
| 银行级配置 | 参数优先级：CLI > 银行配置 > 默认 | [DETAILS.md](./DETAILS.md) |
| Excel从零生成 | 配置驱动，4步管线 | [DETAILS.md](./DETAILS.md) |
| 失败处理矩阵 | 阻断/警告/信息三级处理 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| 复盘经验 | 6种失败模式与对策 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |

## 注意事项

- 概要设计说明书内容基于 `_scan-data.json` 动态构建，**不硬编码**特定项目/银行业务内容
- 技术栈描述基于 `techStack` 字段动态匹配 `config/tech-descriptions.json`
- 非功能性章节条件生成（检测到 Redis → 缓存策略，检测到 Dubbo → 服务治理）
- 需求文档必须为 Markdown 格式
- BEMP 流程规范：本技能属于"输出交付文档"阶段，必须通过 `document-delivery-engineer` 智能体调用

## 命令速查

```bash
cd .trae/skills/bemp-advanced-doc-generator

# 概要设计说明书（代码库自动扫描 + 模板填充）
node scripts/cli.js -t outline-design -m "银行名称" -r "项目根目录" --json

# 概要设计说明书（自定义模板）
node scripts/cli.js -t outline-design -m "银行名称" -r "项目根目录" --template "模板.docx" \
  --cover-placeholders "XXX信息系统/项目=项目名;XXX=项目名;2018=2026" --json

# 详细设计文档（Word — 从需求MD生成）
node scripts/cli.js -t design -m "模块名称" -r "需求.md" --template "模板.docx"

# 详细设计文档（从预生成 design_data JSON 生成，跳过需求分析）
node scripts/cli.js -t design -m "模块名称" --template "模板.docx" --design-data "_design-data.json"

# 详细设计文档（保留模式：仅替换封面，保留模板全部正文）
node scripts/cli.js -t design -m "模块名称" --template "模板.docx" --preserve

# 单元测试报告（Excel，基于 xlsx 模板填充）
node scripts/cli.js -t unit-test-report-xlsx -m "模块名称" \
  --xlsx-template "模板.xlsx" --test-source "测试代码目录" --mode unit --json

# 单元测试报告（Excel，银行级配置自动加载）
node scripts/cli.js -t unit-test-report-xlsx -m "模块名称" --bank <银行代码> --json

# SIT 测试用例（Excel，从需求文档分析生成）
node scripts/cli.js -t testcase -f excel -r "需求文件.md" -m "模块名称" --json

# 测试报告
node scripts/cli.js -t testreport -m "模块名称"

# Excel 从零生成（配置驱动）
node scripts/cli.js -t excel-custom --excel-doc-type test-case-custom --md-files "用例1.md" "用例2.md" -m "模块名称" --json
```

### 新增参数

| 参数 | 版本 | 类型 | 说明 |
|------|------|------|------|
| `--design-data` | v8.1 | string | 预生成 design_data JSON 路径，跳过 RequirementAnalyzer |
| `--preserve` | v8.1 | flag | 保留模式，仅替换封面 |
| `--excel-doc-type` | v11.0 | string | excel-custom 子类型 |
| `--md-files` | v11.0 | string[] | MD 数据源文件路径 |
| `--json-files` | v11.0 | string[] | JSON 数据源文件路径 |
| `--bank` | v9.0 | string | 银行配置代码 |
| `--test-filter` | v9.0 | string | 测试类名过滤 |

## 详细文档（渐进式披露）

| 文档 | 内容 | 何时查阅 |
|------|------|---------|
| [DETAILS.md](./DETAILS.md) | 图表混合方案、质量审核、版本迭代、章节填充策略、文档内容管理、蓝色文本清理、xlsx模板填充、银行级配置、Excel从零生成 | 需要了解详细操作逻辑、配置参数、管线细节时 |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 失败处理矩阵、复盘经验、适用/不适用场景、通用化设计原则 | 遇到失败场景需要排查、了解历史问题和对策时 |
