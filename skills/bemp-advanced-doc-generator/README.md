# BEMP 高级文档生成器 v8.0

BEMP 高级文档生成器是专业的技术文档生成工具，支持概要设计说明书、详细设计文档、单元测试报告（Word/Excel双格式）、测试用例和测试报告的自动生成。V8.0 新增 xlsx 模板填充标准管线（含 SOP 与复盘文档），V7.0 引入 7 阶段执行管线、空章节双重检测、图表生成降级链、蓝色文本双重清理等关键策略，V6.0 基于 .docx 模板填充引擎重构。

## 主要特性

| 特性 | 描述 | 状态 |
|------|------|------|
| **三种文档类型** | 详细设计、测试用例、测试报告 | ✅ |
| **三种输出格式** | Word (.docx)、Markdown (.md)、Excel (.xlsx) | ✅ |
| **xlsx 模板填充管线（v8.0）** | 6 步标准作业：inspect→scan→build→map→write→validate，零硬编码 | ✅ |
| **表头评分检测** | 关键词+必填*+列名长度-说明行评分，精准识别表头行 | ✅ |
| **SEMANTIC_RULES 优先级** | 长复合词规则先于通用词，避免 `步骤描述` 误匹配 `summary` | ✅ |
| **样式最小覆盖** | 保留模板原 cell.style（边框/底色），仅覆盖 font/alignment | ✅ |
| **Excel SIT测试用例** | 基于自定义 Excel 模板，自动解析列映射生成 SIT 格式测试用例 | ✅ |
| **需求文档智能分析** | 从 Markdown 需求文档自动提取测试点并生成用例 | ✅ |
| **可视化文档生成** | 智能场景识别，ProcessOn MCP + 本地 HTML 备用 | ✅ |
| **统一错误处理** | BempDocError 统一错误码（E001-E006 + E101-E106） | ✅ |
| **统一配置管理** | 集中管理常量、路径、样式和错误码 | ✅ |
| **JSON结构化输出** | `--json` 参数输出含自动验证结果的结构化数据 | ✅ |
| **自动列对齐验证** | Excel 生成后自动验证数据列对齐率（17 列 100% 门禁） | ✅ |

## v7.1 配置驱动升级（2026-06-07）

### 核心原则：零硬编码，全配置驱动

所有 Uml / 标题规范化 / 空表格处理 / ER 图迁移 / 关键技术差异化 / 图表引擎选择 的参数均已从代码中剥离，统一由 `scripts/doc_rules.yaml` 管理。Python 端通过 `doc_formatter.load_doc_rules()` 加载，Node 端通过 `lib/yaml-loader.js` 加载。

### 配置节速查

| 配置节 | 用途 | 关键字段 |
|--------|------|----------|
| `uml` | UML 图表生成 | `keywords`, `required_headings`, `file_matchers`, `fallback_*` |
| `title_normalize` | 标题编号规范化 | `heading_style_ids`, `number_pattern`, `strip_style_numbering` |
| `empty_table` | 空表格智能处理 | `delete_if`, `fill_if`, `dual_layer_check` |
| `er_diagram_migration` | ER 图章节迁移 | `target_h1`, `h2_prefix`, `max_groups` |
| `tech_description` | 关键技术差异化 | `type_keywords`, `subset_size`, `fallback_tech_stack` |
| `chart_engine` | 图表引擎调度 | `engine_priority`, `uml_engine`, `fallback_strategy` |

### 新增模块

| 模块 | 文件 | 职责 |
|------|------|------|
| 图表调度器 | `lib/diagram_dispatcher.py` | 统一 ER/架构/UML 图生成入口，按 `chart_engine` 配置选择引擎 |
| YAML 加载器 | `lib/yaml-loader.js` | Node 端配置加载，支持 js-yaml / yaml-mini 双引擎降级 |
| 配置验证测试 | `tests/test_doc_rules.py` | 18 个测试用例验证 6 个配置节的完整性和正确性 |

### 关键技术去重机制

`_build_tech_description(scan, bm, component_index)` 通过 `component_index` 参数确保不同组件获得差异化技术描述：
- 稳定 hash（`bm_name + component_index`）从 `techStack` 选取 5-7 项不同子集
- `module_type` 自动识别（query/write/batch/approval）追加差异化业务规则
- **12 组件全唯一，0 重复**

## 触发关键词

```
生成详细设计文档 | 生成测试用例 | 生成测试报告 | 生成Excel测试用例 | SIT测试用例 | 需求分析生成用例
```

## 触发关键词（xlsx 模板填充）

```
基于xlsx模板生成 | 按xlsx模板填充 | 单元测试报告xlsx | 单元测试报告excel
```

## 配套文档

| 文档 | 用途 |
|------|------|
| [SKILL.md](./SKILL.md) | 技能主文件（v8.0：xlsx 6 步标准作业 + 7 阶段管道） |
| [references/xlsx-template-fill-sop.md](./references/xlsx-template-fill-sop.md) | xlsx 模板填充 SOP（标准作业流程） |
| [references/xlsx-template-fill-retrospective.md](./references/xlsx-template-fill-retrospective.md) | xlsx 模板填充复盘（机构管理优化场景） |
| [references/ER图生成工作流程标准.md](./references/ER图生成工作流程标准.md) | ER 图生成规范 |
| [references/内容结构标准.md](./references/内容结构标准.md) | 文档内容结构规范 |
| [references/技术术语表.md](./references/技术术语表.md) | 技术术语统一表 |
| [references/文档格式标准.md](./references/文档格式标准.md) | 文档格式标准 |

## 目录结构

```
bemp-advanced-doc-generator/
├── SKILL.md                                    # 技能主文件（v6.0，7阶段执行管线）
├── README.md                                   # 使用说明（本文件）
├── config/
│   ├── default.js                              # 统一配置（常量/路径/错误码/样式）
│   ├── default-table-data.json                 # 默认表格数据
│   ├── subsystem-descriptions.json             # 子系统描述
│   ├── tech-descriptions.json                  # 技术栈描述
│   └── modules/                                # 模块配置
│       ├── default-profile.json                # 默认配置
│       ├── 企业客户管理.json
│       ├── 分理处机构业务办理.json
│       ├── 承兑行额度管理.json
│       └── 机构管理.json
├── scripts/
│   ├── cli.js                                  # 统一命令行入口
│   ├── outline-design-generator.py             # 概要设计文档生成器（核心）
│   ├── design-generator.py                     # 详细设计文档生成器（核心）
│   ├── doc_formatter.py                        # 文档格式化工具（缩进/表格/空章节/TOC）
│   ├── doc_utils.py                            # 文档通用工具（蓝色检测/段落操作）
│   ├── doc_rules.yaml                          # 格式化规则配置
│   ├── document-validator.py                   # 文档自动校验
│   ├── diagram-generator.py                    # 图表生成（matplotlib 降级）
│   ├── er-diagram-renderer.py                  # ER 图渲染
│   ├── uml-renderer.py                         # UML 图渲染
│   ├── requirement_md_parser.py                # 需求 Markdown 解析
│   ├── paths.py / paths.js                     # 路径常量（消除硬编码）
│   ├── package.json / package-lock.json        # Node.js 依赖
│   ├── lib/                                    # Node.js 核心库
│   │   ├── project-scanner.js                  # 项目代码扫描
│   │   ├── requirement-analyzer.js             # 需求分析
│   │   ├── antv-client.js                      # AntV 图表引擎
│   │   ├── diagram-service.js                  # 图表服务
│   │   ├── diagram_dispatcher.py               # 图表调度器（v7.1）
│   │   ├── er-diagram-generator.js             # ER 图生成
│   │   ├── enhanced-uml-service.js             # 增强 UML 服务
│   │   ├── graphviz-generator.js               # Graphviz DOT 生成（v7.1 配置驱动）
│   │   ├── graphviz-renderer.js                # Graphviz 渲染
│   │   ├── yaml-loader.js                      # YAML 配置加载（v7.1）
│   │   ├── yaml-mini.js                        # 零依赖 YAML 解析（v7.1）
│   │   ├── uml-generator.js                    # UML 图生成（旧版）
│   │   ├── excel-testcase-generator.js         # Excel 测试用例生成
│   │   ├── excel-template-parser.js            # Excel 模板解析
│   │   ├── xlsx-report-generator.js            # XLSX 报告生成
│   │   ├── doc-builder.js                      # 文档构建引擎
│   │   ├── java-test-scanner.js                # Java 测试扫描
│   │   ├── test-case-md-scanner.js             # 测试用例 Markdown 扫描
│   │   ├── template_toc_utils.js               # 模板 TOC 工具
│   │   └── visualization.js                    # 可视化
│   ├── tests/                                  # 测试（v7.1）
│   │   └── test_doc_rules.py                   # 配置验证测试
│   └── _legacy/                                # 已弃用代码（备份）
├── assets/
│   ├── template-outline-design.docx            # 默认概要设计模板
│   ├── template-outline-design-hnnx.docx       # 银行概要设计模板（示例）
│   ├── template-hnnx-outline-design.docx       # 银行概要设计模板（示例备用）
│   ├── 详细设计文档模板.json                    # 详细设计 JSON 模板
│   ├── 测试用例模板.json                       # 测试用例 JSON 模板
│   ├── 测试报告模板.json                       # 测试报告 JSON 模板
│   ├── 单元测试报告模板.json                    # 单元测试报告 JSON 模板
│   ├── 需求规格说明书模板.json                  # 需求规格说明书 JSON 模板
│   └── templates/                              # 模板文件
│       ├── 测试用例.xlsx                       # SIT 测试用例默认模板
│       ├── excel-testcase-template-config.json # Excel 列映射配置
│       ├── default_flowchart.json              # 流程图默认模板
│       ├── default_mindmap.json                # 思维导图默认模板
│       └── XX银行-XX项目-差异化需求详细设计模板.doc
├── references/                                 # 参考文档
│   ├── 内容结构标准.md                         # 文档章节结构标准
│   ├── 文档格式标准.md                         # 页面/文字/表格样式标准
│   ├── 技术术语表.md                           # 票据/系统/接口/开发术语
│   └── ER图生成工作流程标准.md                  # ER 图生成规范
└── output/                                     # 文档输出目录（运行时生成）
    ├── diagrams/                               # 图表输出
    │   └── uml/                                # UML 图
    ├── _scan-data.json                         # 代码扫描缓存
    ├── _design-data-{date}.json                # 设计数据缓存
    └── {银行名}-{文档类型}-{日期}.docx          # 生成的文档
```

## 快速开始

### 安装依赖

```bash
cd .trae/skills/bemp-advanced-doc-generator
npm install
```

依赖清单（来自 package.json）：

| 依赖 | 版本 | 用途 |
|------|------|------|
| `docx` | ^8.5.0 | Word 文档生成 |
| `exceljs` | ^4.4.0 | Excel 文件读写 |
| `axios` | ^1.6.0 | ProcessOn API 调用 |
| `dotenv` | ^16.3.0 | 环境变量管理 |

### 基本用法

```bash
# 生成详细设计文档（Word格式）
node cli.js -t design -m "机构管理"

# 生成Markdown格式详细设计文档
node cli.js -t design -f md -m "机构管理"

# 从需求文档自动分析生成Excel SIT测试用例（最常用）
node cli.js -t testcase -f excel -r "需求.md" -m "额度管理"

# JSON结构化输出（含自动验证结果）
node cli.js -t testcase -f excel -r "需求.md" -m "额度管理" --json

# 生成测试用例文档（Word格式）
node cli.js -t testcase -m "角色管理"

# 生成测试报告
node cli.js -t testreport -m "批量导入"

# 生成可视化文档
node cli.js -t design -m "机构管理" -v
```

### NPM Scripts

```bash
npm run generate              # 等同于 node cli.js
npm run generate:design       # 生成详细设计文档
npm run generate:testcase     # 生成测试用例文档
npm run generate:testcase-excel  # 生成Excel SIT测试用例
npm run generate:testreport   # 生成测试报告
```

### 命令行参数

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| --type | -t | 文档类型: design/testcase/testreport | design |
| --module | -m | 模块名称 | 必填 |
| --format | -f | 输出格式: docx/md/excel | docx |
| --output | -o | 输出文件路径 | 自动生成 |
| --requirement | -r | 需求文档路径（Markdown格式） | - |
| --template | | Excel模板文件路径 | 默认模板 |
| --config | -c | 配置文件路径 | 默认配置 |
| --json | | JSON结构化输出（含自动验证结果） | false |
| --visualization | -v | 生成可视化文档 | false |
| --help | -h | 显示帮助信息 | - |

**快捷类型**：`testcase-excel` 等同于 `-t testcase -f excel`，`design-md` 等同于 `-t design -f md`

## 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│              bemp-advanced-doc-generator v5.0                 │
├──────────────────────────────────────────────────────────────┤
│  cli.js (统一命令行入口)                                     │
│    ├── 参数解析 (parseArgs)                                  │
│    ├── 类型/格式快捷映射 (testcase-excel → -t testcase -f excel) │
│    ├── JSON输出模式 (--json → 结构化结果+验证)                │
│    └── 错误处理 (BempDocError → 统一错误码)                   │
├──────────────────────────────────────────────────────────────┤
│  config/default.js (统一配置)                                │
│    ├── 页面常量 (A4: 11906×16838 DXA)                        │
│    ├── 字体字号 (SimSun/SimHei/Consolas, 三号~六号)           │
│    ├── 文档样式 (DOC_STYLES: Heading1-3)                     │
│    ├── 表格样式 (TABLE_BORDERS, TABLE_HEADER_BG: D9E2F3)     │
│    ├── 路径配置 (skillRoot/projectRoot/templateDir/outputDir) │
│    ├── 错误码 (E001-E006) + BempDocError 类                  │
│    └── ProcessOn配置 (apiKey/apiBase/retryCount/retryDelay)   │
├──────────────────────────────────────────────────────────────┤
│  lib/ (核心模块)                                             │
│    ├── doc-builder.js           Word/MD文档构建引擎           │
│    ├── excel-testcase-generator.js  Excel测试用例生成+验证     │
│    ├── excel-template-parser.js     模板解析(最长关键词匹配)   │
│    ├── requirement-analyzer.js      需求分析(12种校验识别)     │
│    └── visualization.js             可视化(ProcessOn+本地)    │
└──────────────────────────────────────────────────────────────┘
```

## 模块详细说明

### config/default.js — 统一配置模块

集中管理所有常量、路径、样式定义和错误码。

| 配置项 | 导出名称 | 说明 |
|--------|---------|------|
| 页面常量 | `A4_WIDTH`, `A4_HEIGHT`, `MARGIN` | A4 纵向，边距上下 2.54cm，左右 3.17cm |
| 字体字号 | `FONT`, `SIZE` | SimSun/SimHei/Consolas，三号(32)~六号(18) |
| 文档样式 | `DOC_STYLES` | Heading1-3 样式定义（字体/字号/间距） |
| 表格样式 | `TABLE_BORDERS`, `TABLE_HEADER_BG` | 单线1磅黑色边框，表头背景色 #D9E2F3 |
| 路径配置 | `paths` | skillRoot/projectRoot/templateDir/outputDir/libDir |
| 错误码 | `ERROR_CODES` | E001(模板未找到) ~ E006(参数无效) |
| 错误类 | `BempDocError` | 统一错误类，含 code/message/detail |
| ProcessOn | `processon` | apiKey/apiBase/retryCount(3)/retryDelay(1000ms) |

### lib/doc-builder.js — 文档构建引擎

统一的 Word/Markdown 文档构建引擎，支持三种文档类型。

**核心方法**：

| 方法 | 说明 |
|------|------|
| `generateDesignDocument(module, path, templateData)` | 生成详细设计文档（Word） |
| `generateTestCaseDocument(module, path, templateData)` | 生成测试用例文档（Word） |
| `generateTestReportDocument(module, path, templateData)` | 生成测试报告文档（Word） |
| `generateMarkdown(module, path, type)` | 生成 Markdown 格式文档 |

**文档结构**：封面页 → 修订记录 → 目录 → 章节内容

**模板系统**：支持 JSON 模板数据驱动，无模板时使用默认模板数据。模板文件位于 `assets/` 目录：

| 模板文件 | 文档类型 | 章节数 |
|---------|---------|--------|
| `详细设计文档模板.json` | design | 8章（系统概述→技术实现细节） |
| `测试用例模板.json` | testcase | 8章（引言→测试执行结果） |
| `测试报告模板.json` | testreport | 多章（测试概述→质量评估） |

**Markdown 模板**：每种文档类型有对应的 Markdown 模板方法（`_getDesignMarkdownTemplate` / `_getTestCaseMarkdownTemplate` / `_getTestReportMarkdownTemplate`），生成带占位符的框架文档。

### lib/excel-testcase-generator.js — Excel 测试用例生成器

基于 Excel 模板生成 SIT 格式测试用例，含自动列对齐验证。

**生成流程**（5步）：

```
[1/5] 解析Excel模板 → 检测列映射
[2/5] 获取测试用例数据 → 需求分析/外部传入
[3/5] 加载模板工作簿 → ExcelJS读取
[4/5] 写入测试用例数据 → 按列映射填充
[5/5] 保存输出文件 → 自动验证列对齐
```

**数据来源**（优先级）：

1. 外部传入 `testCases` 数组
2. 需求文档路径 `requirementPath` → 调用 RequirementAnalyzer
3. 需求文档内容 `requirementContent` → 调用 RequirementAnalyzer

**列对齐自动验证**（`_validateAlignment`）：

生成完成后自动读取输出文件，逐行检查 `nature` 列（正例/反例/边界）和 `id` 列（TC-前缀或数字）是否正确对齐，计算对齐率。

**JSON 输出结构**（`--json` 模式）：

```json
{
  "success": true,
  "type": "testcase-excel",
  "outputPath": "output/模块-SIT测试用例-20260516.xlsx",
  "totalCases": 27,
  "positive": 6,
  "negative": 18,
  "boundary": 3,
  "validation": {
    "valid": true,
    "fileSize": 12345,
    "expectedCount": 27,
    "alignmentRate": "100.0%",
    "checkedRows": 27,
    "alignedRows": 27
  }
}
```

### lib/excel-template-parser.js — Excel 模板解析器

自动检测 Excel 模板结构，提取列映射和样式信息。

**核心算法**：

| 方法 | 算法 | 说明 |
|------|------|------|
| `_detectHeaderRows` | 关键词计数法 | 遍历前10行，统计数据字段关键词命中数（≥3则为表头行） |
| `_extractColumnMapping` | **最长关键词匹配** | 对每个单元格文本，匹配所有已知关键词，选择最长匹配避免误映射 |
| `_extractStyles` | 样本行提取 | 从数据起始行提取字体/对齐/行高/列宽 |
| `_extractMergedCells` | 合并区域提取 | 解析 `_merges` 属性获取合并单元格范围 |

**已知字段关键词映射**：

| 字段 | 关键词列表 |
|------|-----------|
| id | 用例编号, 序号, ID, No |
| level1 | 一级模块, 子系统 |
| level2 | 二级模块, 子模块, 功能域 |
| level3 | 三级模块, 菜单 |
| level4 | 四级模块, 子功能, 测试点 |
| precondition | 前置条件, 前提条件, 预置条件, 初始状态 |
| content | 测试用例内容, 用例内容, 测试步骤, 操作步骤, 测试内容 |
| nature | 用例性质, 用例类型, 正反例 |
| expected | 预期结果, 期望结果, 预期输出 |
| actual | 实际结果, 实际输出 |
| tester | 测试人员, 执行人 |
| status | 测试状态, 执行状态 |
| remark | 备注, 说明 |

**配置合并**：自动检测配置 → 自定义配置文件 → 默认配置文件（`excel-testcase-template-config.json`），后者覆盖前者。

### lib/requirement-analyzer.js — 需求文档分析器

从 Markdown 需求文档提取测试点并自动生成测试用例。

**分析流程**：

```
Markdown内容 → 提取菜单路径(【】引用) → 按标题分节 → 构建测试点 → 生成测试用例
```

**菜单路径提取**：从 `【子系统】` `【模块名】` 格式的引用中提取 level1/level2/level3。

**测试点构建**（`_buildTestPoint`）：

- 过滤非功能标题（需求背景/需求目标/优化详情等）
- 仅处理 level≥3 的中功能标题和 level≥5 的子功能标题
- 提取业务规则（有序列表/无序列表）
- 提取字段描述（Markdown 表格中的数据名称/IO类型/必填/约束）
- 识别校验规则（12种类型）

**12种校验类型识别**：

| 校验类型 | 触发关键词 | 生成的反例内容 |
|---------|-----------|---------------|
| 唯一性校验 | 不可重复、不能重复、唯一 | 输入已存在的重复数据 |
| 必填校验 | 必须必输填、不能为空 | 不填写必填项 |
| 格式校验 | 格式为应、格式要求 | 输入不符合格式的数据 |
| 边界校验 | 不超过、不能超过、最多、最大、最小 | 输入超出边界值的数据 |
| 异常提示 | 提示、报错、错误、失败 | 在异常条件下执行操作 |
| 权限校验 | 只能、仅限能、不允许 | 在无权限的情况下执行操作 |
| 重复校验 | 已存在、重复、冲突 | 重复提交操作 |
| 默认值校验 | 默认、自动 | 不修改默认值执行操作 |
| 只读校验 | 灰显、不可修改、只读 | 尝试修改只读字段 |
| 数据校验 | 校验、验证、检查 | 输入不符合校验规则的数据 |
| 选择校验 | 选中、选择数据、未选择 | 未选择任何数据执行操作 |
| 确认校验 | 确认、二次确认 | 在确认弹窗中点击取消 |

**测试用例生成规则**：

- 每个测试点生成 1 条正例
- 每个校验类型生成 1 条反例（最多取前3种校验）
- 从业务规则中提取否定规则生成反例
- 从必填字段描述中生成必填反例（最多3个字段）

**降级提取**（`_fallbackExtract`）：当标题分节未提取到测试点时，从 `数字.【功能名】` 格式的列表项提取。

### lib/visualization.js — 可视化生成模块

精简的可视化文档生成，支持 ProcessOn MCP 和本地 HTML 双模式。

**场景识别**（`SceneIdentifier`）：

| 识别方式 | 说明 |
|---------|------|
| `identifyByModule(moduleName)` | 根据模块名关键词匹配场景（优先） |
| `identify(content)` | 根据内容关键词评分（流程图 vs 思维导图） |

模块名场景映射：

| 模块关键词 | 类型 | 场景 |
|-----------|------|------|
| 批量导入/角色复制/机构管理/异常处理 | flowchart | 对应业务流程 |
| 系统概述/功能模块/数据模型/接口定义/安全策略/测试计划/测试用例 | mindmap | 对应结构导图 |

**生成降级链**：

```
ProcessOn API 调用（需 PROCESSON_API_KEY）
    ↓ 失败（423/404/ECONNREFUSED 直接降级，其他重试3次）
本地 Mermaid HTML 生成（输出到 output/visualizations/）
```

**批量生成**：`generateBatch(items)` 支持一次生成多个可视化文档。

## Excel 模板配置

### 默认配置文件

`assets/templates/excel-testcase-template-config.json` 定义了字段到 Excel 列的映射关系：

| 字段 | 列 | 表头 | 对齐 | 类型 |
|------|-----|------|------|------|
| id | B | 用例编号 | center | number |
| level1 | C | 一级模块 | center | string |
| level2 | D | 二级模块 | center | string |
| level3 | E | 三级模块 | center | string |
| level4 | F | 四级模块 | center | string |
| precondition | G | 前置条件 | left | string |
| content | H | 测试用例内容 | left | string |
| nature | I | 用例性质 | center | enum(正例/反例/边界) |
| expected | J | 预期结果 | left | string |
| actual | K | 实际结果 | left | string (不可写) |
| tester | L | 测试人员 | center | string (不可写) |
| status | M | 测试状态 | center | string (不可写) |
| remark | T | 备注 | left | string (不可写) |

- 数据起始行：第7行
- 默认样式：宋体9号、thin边框、行高45、居中自动换行

### 自定义模板

可通过 `--template` 指定自定义 Excel 模板，通过 `--config` 指定自定义列映射配置。配置格式与 `excel-testcase-template-config.json` 一致。

## JSON 模板文件

### 详细设计文档模板（8章）

| 章节 | 内容 |
|------|------|
| 第一章 系统概述 | 业务背景、设计目标、范围说明 |
| 第二章 功能模块划分 | 模块划分、模块职责、接口边界 |
| 第三章 核心业务流程 | 业务流程图、时序图、关键节点说明 |
| 第四章 数据模型设计 | 字段映射关系、数据结构定义、数组字段处理 |
| 第五章 接口定义 | API接口清单、接口详情、消息转换器配置 |
| 第六章 异常处理机制 | 错误码定义、处理流程、恢复策略 |
| 第七章 安全策略 | 认证授权、数据加密、访问控制 |
| 第八章 技术实现细节 | 核心算法、代码示例、性能优化、开发规范 |

### 测试用例文档模板（8章）

| 章节 | 内容 |
|------|------|
| 第一章 引言 | 编写目的、背景说明、定义、参考资料 |
| 第二章 测试计划 | 测试范围、测试目标、测试资源、测试进度 |
| 第三章 测试环境 | 硬件环境、软件环境、测试工具 |
| 第四章 功能测试用例 | 正常场景、异常场景、边界值、字段映射验证 |
| 第五章 集成测试用例 | 端到端测试、服务调用测试 |
| 第六章 性能测试用例 | 负载测试、压力测试、稳定性测试 |
| 第七章 安全测试用例 | 认证测试、授权测试、数据加密测试 |
| 第八章 测试执行结果 | 执行情况、缺陷统计、测试结论 |

## 文档格式标准

| 项目 | 标准 | 配置值 |
|------|------|--------|
| 纸张大小 | A4 纵向 | 11906 × 16838 DXA |
| 上/下边距 | 2.54 cm | 1440 DXA |
| 左/右边距 | 3.17 cm | 1800 DXA |
| 一级标题 | 黑体三号加粗 | SimHei, size:32 |
| 二级标题 | 黑体四号加粗 | SimHei, size:28 |
| 三级标题 | 黑体小四加粗 | SimHei, size:24 |
| 正文 | 宋体小四 | SimSun, size:24, 行距360 |
| 表格表头 | 黑体五号加粗，蓝底 | SimHei, size:21, bg:#D9E2F3 |
| 表格内容 | 宋体五号 | SimSun, size:21 |
| 代码块 | Consolas 六号 | Consolas, size:18 |
| 页眉 | 宋体10号居中 | "BEMP文档" |
| 页脚 | 宋体10号居中 | "第 X 页" |

### 输出文件命名规范

```
详细设计文档：{模块名称}-详细设计文档-{YYYYMMDD}.docx/.md
测试用例文档：{模块名称}-测试用例-{YYYYMMDD}.docx/.md
测试报告文档：{模块名称}-测试报告-{YYYYMMDD}.docx/.md
Excel SIT测试用例：{模块名称}-SIT测试用例-{YYYYMMDD}.xlsx
可视化文档：{模块名称}-{flowchart|mindmap}.html
```

## 错误码定义

| 错误码 | 常量名 | 说明 | 处理建议 |
|--------|--------|------|----------|
| E001 | TEMPLATE_NOT_FOUND | 模板文件未找到 | 检查模板路径，确认 `assets/templates/测试用例.xlsx` 存在 |
| E002 | REQUIREMENT_NOT_FOUND | 需求文件未找到 | 检查 `-r` 参数指定的需求文档路径 |
| E003 | GENERATION_FAILED | 文档生成失败 | 查看详细错误信息，检查模板数据格式 |
| E004 | OUTPUT_FAILED | 输出文件失败 | 检查输出目录权限和磁盘空间 |
| E005 | VALIDATION_FAILED | 数据验证失败 | 检查输入参数和模板配置 |
| E006 | INVALID_PARAMS | 参数无效 | 检查命令行参数，支持类型: design/testcase/testreport |

**BempDocError 类**：包含 `code`（错误码）、`message`（错误信息）、`detail`（详情堆栈）三个属性。

## 可视化文档生成

### ProcessOn MCP 集成

设置环境变量（.env 文件或系统环境变量）：

```
PROCESSON_API_KEY=your_api_key_here
PROCESSON_API_BASE=https://www.processon.com
PROCESSON_RETRY_COUNT=3
PROCESSON_RETRY_DELAY=1000
```

### 自动降级策略

| 场景 | 处理方式 |
|------|---------|
| API Key 未配置 | 直接使用本地 HTML 模式 |
| 423/404/ECONNREFUSED | 不重试，直接降级到本地模式 |
| 其他网络错误 | 重试3次（递增延迟），仍失败则降级 |
| 本地模式 | 生成 Mermaid HTML 文件到 `output/visualizations/` |

## 参考文档

| 文档 | 路径 | 内容 |
|------|------|------|
| 内容结构标准 | `references/内容结构标准.md` | 详细设计文档8章 + 测试用例文档7章的章节结构和内容要求 |
| 技术术语表 | `references/技术术语表.md` | 票据业务术语、系统模块术语、接口协议术语、开发技术术语 |
| 文档格式标准 | `references/文档格式标准.md` | 页面设置、文字样式、表格样式、图表规范、DXA换算表 |

## V5.0 变更记录

| 变更项 | 说明 |
|--------|------|
| 目录重构 | scripts/ → lib/ + config/，职责更清晰 |
| 统一配置 | 新增 config/default.js，集中管理常量、路径、错误码 |
| 统一文档引擎 | 合并 generate-doc.js + generate-simple-branch-doc.js → doc-builder.js |
| 精简可视化 | processon-integration.js (710行) → visualization.js (163行) |
| 统一CLI | 合并 cli.js + smart-doc-generator.js → 新 cli.js |
| 统一错误处理 | BempDocError + ERROR_CODES (E001-E006) |
| 删除冗余 | 移除 script-registry.js、interactive-cli.js、SCRIPT_TEMPLATE.js 等 |
| SKILL.md重构 | 从252行精简至70行（v5.0），v6.0扩展至237行含7阶段执行管线、关键策略与失败处理矩阵 |
| --json输出 | 新增JSON结构化输出模式，含自动列对齐验证结果 |
| 自动验证 | Excel测试用例生成后自动验证列对齐率 |
| 最长关键词匹配 | 模板解析器使用最长关键词匹配算法，避免列映射误匹配 |
| 12种校验识别 | 需求分析器支持12种校验类型自动识别和反例生成 |
