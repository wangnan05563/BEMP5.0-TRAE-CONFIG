# BEMP 高级文档生成器 v5.0

## 简介

BEMP 高级文档生成器是专业的技术文档生成工具，支持详细设计文档、测试用例、测试报告的自动生成，以及基于Excel模板的SIT测试用例生成。V5.0进行了全面重构优化，统一了文档构建引擎、精简了可视化模块、统一了错误处理和环境配置。

## 主要特性

- **三种文档类型**：详细设计、测试用例、测试报告
- **三种输出格式**：Word (.docx)、Markdown (.md)、Excel (.xlsx)
- **Excel SIT测试用例**：基于自定义Excel模板，自动解析列映射生成SIT格式测试用例
- **需求文档智能分析**：从Markdown需求文档自动提取测试点并生成用例
- **可视化文档生成**：智能场景识别，ProcessOn MCP + 本地HTML备用
- **统一错误处理**：BempDocError 统一错误码
- **统一配置管理**：集中管理常量、路径、样式和错误码
- **JSON结构化输出**：`--json` 参数输出含自动验证结果的结构化数据

## 快速开始

### 安装依赖

```bash
cd .trae/skills/bemp-advanced-doc-generator
npm install
```

### 基本用法

```bash
# 生成详细设计文档（Word格式）
node cli.js -t design -m "机构管理"

# 生成Markdown格式
node cli.js -t design -f md -m "机构管理"

# 生成Excel SIT测试用例（从需求文档分析）
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

### 命令行参数

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| --type | -t | 文档类型: design/testcase/testreport | design |
| --module | -m | 模块名称 | 必填 |
| --format | -f | 输出格式: docx/md/excel | docx |
| --output | -o | 输出文件路径 | 自动生成 |
| --requirement | -r | 需求文档路径 | - |
| --template | | 模板文件路径 | 默认模板 |
| --config | -c | 配置文件路径 | - |
| --json | | JSON结构化输出（含自动验证结果） | false |
| --visualization | -v | 生成可视化文档 | false |
| --help | -h | 显示帮助信息 | - |

## 目录结构

```
bemp-advanced-doc-generator/
├── cli.js                      # 统一命令行入口
├── package.json                # 依赖管理
├── config/
│   └── default.js              # 统一配置（常量/路径/错误码）
├── lib/
│   ├── doc-builder.js          # Word文档构建引擎
│   ├── excel-testcase-generator.js  # Excel测试用例生成器
│   ├── excel-template-parser.js     # Excel模板解析器
│   ├── requirement-analyzer.js      # 需求文档分析器
│   └── visualization.js            # 可视化生成模块
├── assets/
│   ├── templates/              # 模板文件
│   │   ├── 测试用例.xlsx       # Excel测试用例模板
│   │   ├── excel-testcase-template-config.json
│   │   ├── default_flowchart.json
│   │   └── default_mindmap.json
│   ├── 详细设计文档模板.json
│   ├── 测试用例模板.json
│   └── 测试报告模板.json
├── references/                 # 参考文档
│   ├── 内容结构标准.md
│   ├── 技术术语表.md
│   └── 文档格式标准.md
└── output/                     # 输出目录
```

## 技术架构

```
┌──────────────────────────────────────────────────────┐
│            bemp-advanced-doc-generator v5.0           │
├──────────────────────────────────────────────────────┤
│  cli.js (统一命令行入口)                              │
│    ├── -t design/testcase/testreport                 │
│    ├── -f docx/md/excel                              │
│    ├── -r requirementPath                            │
│    ├── --json 结构化输出                              │
│    └── -v visualization                              │
├──────────────────────────────────────────────────────┤
│  config/default.js (统一配置)                         │
│    ├── 常量(A4/字体/字号/表格样式)                     │
│    ├── 路径(projectRoot/templateDir/outputDir)        │
│    ├── 错误码(ERROR_CODES)                           │
│    └── ProcessOn配置                                 │
├──────────────────────────────────────────────────────┤
│  lib/ (核心模块)                                     │
│    ├── doc-builder.js      Word文档构建引擎           │
│    ├── excel-testcase-generator.js  Excel测试用例生成  │
│    ├── excel-template-parser.js     Excel模板解析      │
│    ├── requirement-analyzer.js      需求文档分析       │
│    └── visualization.js    可视化生成(ProcessOn+本地)  │
└──────────────────────────────────────────────────────┘
```

## 模块说明

### config/default.js — 统一配置模块

集中管理所有常量、路径、样式定义和错误码：
- A4页面常量、字体字号常量
- BEMP文档样式定义（DOC_STYLES）
- 表格边框和表头背景色
- 路径配置（projectRoot、templateDir、outputDir）
- ProcessOn API配置
- 错误码定义（ERROR_CODES）和 BempDocError 类

### lib/doc-builder.js — 统一文档构建引擎

合并了原 generate-doc.js 和 generate-simple-branch-doc.js 的公共逻辑：
- DocumentBuilder 类：统一的 Word 文档构建方法
- 支持 design/testcase/testreport 三种文档类型
- 支持 Markdown 格式输出
- 数据驱动的模板系统，消除硬编码业务内容

### lib/excel-testcase-generator.js — Excel测试用例生成器

基于Excel模板生成SIT格式测试用例：
- 模板解析 + 配置合并
- 需求文档分析 + 测试用例生成
- 数据写入 + 样式应用 + 列对齐自动验证
- `--json` 模式输出结构化结果

### lib/excel-template-parser.js — Excel模板解析器

自动检测Excel模板结构：
- 表头行检测（基于核心数据字段关键词匹配）
- 列映射提取（最长关键词优先匹配，避免误映射）
- 样式提取、合并单元格提取
- 配置文件加载与合并

### lib/requirement-analyzer.js — 需求文档分析器

从Markdown需求文档提取测试点：
- 多级标题解析（支持######级别）
- 业务规则提取、字段描述解析
- 校验规则识别（12种校验类型）
- 正例/反例/边界用例自动生成

### lib/visualization.js — 可视化生成模块

精简的可视化文档生成：
- SceneIdentifier：场景识别（流程图/思维导图）
- VisualizationGenerator：ProcessOn API + 本地HTML备用模式
- 自动降级：API不可用时切换到本地Mermaid HTML生成

## Excel SIT测试用例生成

### 从需求文档自动生成

```bash
node cli.js -t testcase -f excel -m "承兑行额度" -r "需求文档.md"
```

### 指定模板和配置

```bash
node cli.js -t testcase -f excel -m "机构管理" -r "需求.md" --template "自定义模板.xlsx" -c "自定义配置.json" -o "输出.xlsx"
```

### 模板配置说明

Excel模板配置文件 `assets/templates/excel-testcase-template-config.json` 定义了字段到Excel列的映射关系，支持自定义对齐方式和数据类型。

### 自动验证

生成完成后自动验证列对齐率，`--json` 模式输出验证结果：
```json
{
  "success": true,
  "outputPath": "output/模块-SIT测试用例-20260516.xlsx",
  "totalCases": 68,
  "positive": 13,
  "negative": 55,
  "boundary": 0,
  "validation": {
    "valid": true,
    "alignmentRate": "100.0%",
    "fileSize": 12345
  }
}
```

## 文档格式标准

| 项目 | 标准 |
|------|------|
| 文件格式 | Word (.docx) / Markdown (.md) / Excel (.xlsx) |
| 页面设置 | A4 纵向，边距上下 2.54cm，左右 3.17cm |
| 标题样式 | 一级黑体三号，二级黑体四号，三级黑体小四号 |
| 正文字体 | 宋体小四号，1.5 倍行距 |
| 表格样式 | 表头黑体五号加粗，内容宋体五号 |

### 输出文件命名规范

```
详细设计文档：{模块名称}-详细设计文档-{日期}.docx/.md
测试用例文档：{模块名称}-测试用例-{日期}.docx/.md
测试报告文档：{模块名称}-测试报告-{日期}.docx/.md
Excel SIT测试用例：{模块名称}-SIT测试用例-{日期}.xlsx
```

## 错误码定义

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| E001 | 模板文件未找到 | 检查模板路径是否正确 |
| E002 | 需求文件未找到 | 检查需求文档路径 |
| E003 | 文档生成失败 | 查看详细错误信息 |
| E004 | 输出文件失败 | 检查输出目录权限 |
| E005 | 数据验证失败 | 检查输入参数 |
| E006 | 参数无效 | 检查命令行参数 |

## 可视化文档生成

### ProcessOn MCP 集成

设置环境变量：
```bash
set PROCESSON_API_KEY=your_api_key_here
```

### 自动降级

当 ProcessOn API 不可用时，自动切换到本地 Mermaid HTML 生成模式。

## V5.0 变更记录

| 变更项 | 说明 |
|--------|------|
| 目录重构 | scripts/ → lib/ + config/，职责更清晰 |
| 统一配置 | 新增 config/default.js，集中管理常量、路径、错误码 |
| 统一文档引擎 | 合并 generate-doc.js + generate-simple-branch-doc.js → doc-builder.js |
| 精简可视化 | processon-integration.js (710行) → visualization.js (163行) |
| 统一CLI | 合并 cli.js + smart-doc-generator.js → 新 cli.js |
| 统一错误处理 | BempDocError + ERROR_CODES |
| 删除冗余 | 移除 script-registry.js、interactive-cli.js、SCRIPT_TEMPLATE.js 等 |
| SKILL.md精简 | 从252行精简至70行，详细内容迁移至README.md，节省~2900 tokens/次 |
| --json输出 | 新增JSON结构化输出模式，含自动列对齐验证结果 |
| 自动验证 | Excel测试用例生成后自动验证列对齐率 |
