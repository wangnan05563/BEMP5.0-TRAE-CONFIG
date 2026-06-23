---
name: "bemp-advanced-doc-generator"
description: "BEMP项目技术文档自动生成：基于.docx模板和代码扫描数据，填充生成概要设计说明书、详细设计文档。支持单元测试报告(xlsx/Word)、测试用例、测试报告的模板驱动生成。支持配置驱动的Excel从零生成（excel-custom）。触发时机：用户要求生成/编制/撰写BEMP项目的概要设计、详细设计、测试文档，或要求基于模板填充文档内容，或要求将MD/JSON数据源转为格式化Excel。"
---

# BEMP 高级文档生成器 v11.0

## 触发条件

Use this skill when:
- 用户要求**基于模板生成/填充** BEMP 概要设计说明书或详细设计文档（核心场景）
- 用户要求生成 BEMP 单元测试报告（Word 或基于 xlsx 模板填充）
- 用户要求从需求文档生成 BEMP 测试用例或测试报告
- 用户要求将 MD/JSON 数据源转为格式化 Excel（`excel-custom` 类型）
- 用户明确提到"以XX模板为准"、"按模板填充"、"生成XX设计文档"等关键词

Do NOT use this skill when:
- 用户仅要求阅读/查看已有文档（直接打开文件即可）
- 用户要求编写代码或修复 bug（应使用开发类技能）
- 用户要求生成 PRD/需求文档（应使用 `bemp-generate-prd`）
- 用户要求生成非 BEMP 项目的通用文档
- 用户要求的文档类型无对应模板且无代码扫描数据（无法生成有意义内容）

## 输入输出

Input:
- `--type` (string): 文档类型，必选一：`outline-design`|`design`|`unit-test-report`|`unit-test-report-xlsx`|`testcase`|`testreport`|`excel-custom`
- `--module` (string): 模块/银行名称，必填
- `--requirement` (string): 需求文档路径（Markdown）或项目根目录（outline-design）
- `--template` (string): 自定义 .docx 模板路径，可选，默认使用内置模板
- `--cover-placeholders` (string): 封面占位替换映射，格式 `"XXX=项目名;2018=2026"`
- `--bank` (string): 银行级配置代码（如 `<银行代码>`），自动加载 testSource/template/filter/coverPlaceholders
- `--test-filter` (string): 测试类名过滤（逗号分隔），仅扫描类名包含关键词的测试类
- `--json` (bool): 是否输出 JSON 结构化结果，默认 false
- `--no-antv` (bool): 禁用 AntV 引擎强制走 matplotlib，默认 false
- 详细参数见 `README.md` 参数表

Output:
- `outputPath` (string): 生成的 .docx/.xlsx/.md 文件绝对路径
- `success` (bool): 是否生成成功
- `tocUpdated` (bool): 目录域是否已注入 updateFields
- `validation` (object): 文档校验结果（标题层级/蓝色残留/占位符/图表存在性）

## 执行管线（7 阶段管道）

以下为概要设计/详细设计文档生成的完整管线。测试用例/测试报告等类型走各自的简化管线。

### 阶段 1：数据准备

```
需求文档解析 → 输出 _design-data-{date}.json（businessModules、globalRules、模块层级）
项目代码扫描 → 输出 _scan-data.json（subsystems、interfaces、techStack、externalDeps）
```

**门禁**：`_scan-data.json` 中 `subsystems` 数量 > 0，否则终止并提示"项目扫描无结果"。

### 阶段 2：模板预处理（不可跳过）

按顺序执行以下操作，每步可独立验证：

1. **复制模板**：`shutil.copy2(template_path, output_path)` — 保护原模板不被修改
2. **封面替换**：匹配 `XXX信息系统`/`XXX项目`/`XXX 系统` 等占位模式，替换为实际项目名
3. **增强模板清理**（v7.0 新增）：`doc_formatter.full_template_cleanup(doc)` — 一键执行三阶段清理：
   - 阶段 A：`enhanced_blue_cleanup` — 蓝色文本清理（段落+表格+残留扫描），分类处理蓝色标题/蓝色占位符/蓝色正文
   - 阶段 B：`clear_example_content` — 示例内容清除，识别前缀（"示例："、"样例："等）、占位符模式（"XXX"、"【请填写】"等）、模板说明文字
   - 阶段 C：`clean_template_remarks` — 模板备注清除，清除"模板说明"、"填写说明"等备注段落，清理标题中的括号备注
   - 失败时回退到旧版 `_clean_template_content` + `_secondary_clean_blue_runs`
4. **窜行表格修复**：`_detect_misplaced_tables` 检测"适用范围"下属于"设计目标"的表格，调用 `_move_table_after_heading` 移动
5. **目录结构确保**：`_ensure_toc_heading` 确保"目录"H1 标题存在，`force_insert_toc` 无 TOC 域时插入动态域

### 阶段 3：图表生成（可并行）

```
ER 图：er-diagram-generator.js → 28 张 ER 图 → output/ER_*.html/.png/.mmd
架构图：antv-client.js → diagram-service.js → output/diagrams/architecture-diagram.png
网络图：antv-client.js → diagram-service.js → output/diagrams/network-topology.png
部署图：antv-client.js → diagram-service.js → output/diagrams/deployment-diagram.png
UML 图：uml-generator.js → uml-renderer.py → output/diagrams/uml/class-diagram.png
```

**门禁**：`enforceDiagramGate` 检查三张必要 PNG 存在且 > 10KB，缺失则阻断并输出错误列表。

### 阶段 4：章节填充（核心管线）

**填充优先级策略（严格执行此顺序）**：

```
优先级 1 — 特殊处理（必须在 _find_matching_chapter 之前执行）：
  术语定义 → _fill_glossary_table（表格填充）
  参考资料 → _fill_references（编号列表）
  开发环境 → _fill_dev_environment（列表）
  界面     → _fill_ui_description（从需求提取或占位）
  性能     → _fill_performance（指标列表）
  目的     → _fill_purpose（从业务背景提取）
  适用范围 → _fill_scope（从范围说明提取）
  读者对象 → _fill_reader_audience（通用列表）
  组件内部模块列表 → _fill_component_module_list（汇总表）
  附录     → _fill_appendix（综合附录：A接口/B数据表/C错误码/D栏位/E功能/F术语）

优先级 2 — H1+H2 组合精确匹配：TEMPLATE_CHAPTER_MAP 中查找 "H1标题|H2标题" 组合

优先级 3 — H1 精确匹配：按 H1 标题查 TEMPLATE_CHAPTER_MAP

优先级 4 — H2 精确匹配：按 H2 标题查 TEMPLATE_CHAPTER_MAP

优先级 5 — 模糊匹配：去编号前缀后比较（如 "1.1 编写目的" → "编写目的"）

优先级 6 — fill_empty_chapter 兜底：插入"不涉及"占位
```

**设计原则**：特殊处理必须在通用匹配之前。原因是 `_find_matching_chapter` 的模糊匹配可能将"适用范围"错误匹配到"1.3 范围说明"等章节，导致特殊处理被跳过。

### 阶段 5：后处理

1. **业务子模块插入**：`_insert_business_submodules` 在第 5 章"系统组件"下展开 businessModules
2. **架构图插入**：`_insert_architecture_diagrams` 在"系统总体框架"下插入 3 张架构图
3. **ER 图插入**：`_insert_er_diagrams` 在"数据库设计"章节前插入 ER 图 PNG
4. **UML 占位**：`_insert_uml_placeholders` 为无图 UML 标题插入"待补充"占位
5. **修订记录更新**：`_update_revision_table` 更新版本=V1.0、日期=当天、修改人=自动生成
6. **术语表空表清理**：`_cleanup_empty_glossary_table` 移除只有表头的空术语表
7. **设计约束清理**：`_clean_design_constraint_chapter` 删除与业务无关的段落
8. **正文缩进**：`apply_body_indent_to_doc` 为所有非标题段落添加首行缩进 2 字符
9. **表格样式**：`apply_table_style` 统一所有表格边框+字号+表头样式
10. **保存**：`doc.save(output_path)`
11. **目录更新注入**：`inject_update_fields` 在 settings.xml 中注入 `<w:updateFields w:val="true"/>`

### 阶段 6：文档校验

自动验证项（`document-validator.py`）：
- 标题层级一致性（H1→H2→H3 不跨级）
- 蓝色字体残留 = 0（超链接除外）
- 占位符残留 = 0（`XXX`/`【待补充】`/`{placeholder}` 等）
- 表格字体统一（宋体 10.5pt）
- ER 章节位置（在"系统集成"后"附录"前）

人工复核项：
- 目录不跨级
- 3 张必要 PNG 存在
- ER 图 PNG 在附录
- 封面文字正确

### 阶段 7：迭代闭环（当用户反馈时触发）

```
用户反馈问题 → 根因分析 → 修复代码 → 重新执行管线 → 校验通过 → 输出版本号 -v{n+1}.docx
```

同一次生成任务最多迭代 5 次，超限需与用户确认方向。

## 关键策略

### xlsx 模板填充标准管线（v8.0 新增）

适用于 `unit-test-report-xlsx` 类型，与概要设计/详细设计的 7 阶段管道**并行**。详细 SOP 见 [references/xlsx-template-fill-sop.md](references/xlsx-template-fill-sop.md)，复盘记录见 [references/xlsx-template-fill-retrospective.md](references/xlsx-template-fill-retrospective.md)。

```
[1] TemplateInspector  → TemplateSchema    # 模板解析（评分制表头检测）
[2] Scanner            → scanResult        # 数据源扫描（MD/Java）
[3] ContentBuilder     → testcases[]       # 标准化全语义键
[4] ColumnMapper       → rows[][]          # 基于 schema.columns 动态映射
[5] _writeAll          → xlsx              # 复制+清空+写入+统一样式
[6] _validate          → 7 项校验          # 门禁
```

**核心设计原则**：
- **Schema 优先**：先 inspect 模板得到 `TemplateSchema`，再驱动所有后续步骤
- **零硬编码**：列数/列名/表头行/起始行/Sheet 名全部从模板动态读取
- **样式最小覆盖**：保留模板原 `cell.style`（边框/底色），仅覆盖 font/alignment
- **多语言兼容**：`pickList('中文', 'english', 'Alias')` 三键轮询

**6 项关键判断逻辑**（速查）：
1. **表头评分**：关键词+必填*+列名长度-说明行 → 最高分=表头
2. **SEMANTIC_RULES 顺序**：长复合词规则必须先于通用词
3. **列填充率门禁**：schema 缺列 → scanner 缺字段 → mapper 兜底 三级排查
4. **路径稳健性**：`__dirname` 锚定技能根，禁用 `process.cwd()`
5. **多语言 key 容错**：YAML 字段支持中英+别名
6. **样式最小覆盖**：spread `oldStyle`，仅覆盖 font/alignment

### 文档内容管理架构（v7.0 新增）

```
content/
├── __init__.py          # ContentRegistry（按需加载）+ CONTENT_INDEX（索引导航）
├── common.py            # 共享工具：build_tech_stack_text、format_date_now 等
├── outline_chapters.py  # 概要设计章节生成器（独立模块，与 detail 互不干扰）
└── detail_chapters.py   # 详细设计章节生成器（独立模块，与 outline 互不干扰）
```

**按需加载机制**：`ContentRegistry` 仅在首次访问时加载对应模块，避免一次性加载所有内容。模块加载后缓存，后续访问直接使用缓存。

**模块独立性**：`outline_chapters` 和 `detail_chapters` 各自管理自己的生成器函数，数据与逻辑完全隔离，互不干扰。

**索引导航**：`CONTENT_INDEX` 定义每个文档类型下的章节及对应的生成器函数名，便于快速定位章节与生成器。

**使用方式**：
```python
from content import ContentRegistry
registry = ContentRegistry()
# 按需生成内容（模块在首次调用时自动加载）
result = registry.generate('outline', '编写目的', scan_data)
```

### 示例内容识别与清除（v7.0 新增）

`doc_formatter.py` 中新增以下函数：

- `clear_example_content(doc)` — 识别并清除模板中的示例内容，包括：
  - 前缀匹配：如"示例："、"样例："、"说明："、"注："等
  - 整行匹配：如"以下为示例"、"请根据实际情况修改"等
  - 占位符模式：如"XXX"、"YYY"、"【请填写】"等
  - 表格中的示例内容清空
- `clean_template_remarks(doc)` — 清理模板备注说明段落
- `enhanced_blue_cleanup(doc)` — 增强版蓝色文本清理（分阶段：段落→表格→残留扫描）
- `full_template_cleanup(doc)` — 一键完整模板清理（以上三阶段的组合调用）

配置化规则文件 `doc_rules.yaml` 中新增节：
- `example_content` — 示例内容识别关键词与占位符模式
- `template_remarks` — 模板备注清理关键词
- `template_cleanup` — 清理流程配置（阶段顺序与参数）

### 生成器函数接口规范（v7.0 新增）

每个章节生成器函数遵循统一的接口规范：

```python
def build_xxx_text(scan_data: dict) -> str | None:
    """从 scan_data 动态生成章节内容，返回文本字符串或 None"""
    ...

def build_xxx_table(scan_data: dict) -> list[list] | None:
    """从 scan_data 动态生成表格数据，返回 [headers, rows...] 或 None"""
    ...
```

### 空章节双重检测

只检查段落文本**或**只检查表格都会导致误判。必须两者都检查：

```python
# 检测逻辑（已内置于 fill_empty_chapter）
has_paragraph_text = any(p.text.strip() for p in paragraphs_between)
has_table_content = any(cell.text.strip() for table in tables_between 
                        for row in table.rows for cell in row.cells)
is_empty = not has_paragraph_text and not has_table_content
```

**额外保护**：纯表格章节（如只有表格无描述段落），在插入表格前先插入一行描述段落，防止 `fill_empty_chapter` 覆盖。

### 图表生成降级链

```
AntV MCP 可用 + 数据合法 → AntV 生成（主引擎）
    ↓ 失败（API 不可用/超时/数据校验失败）
matplotlib 降级生成（scripts/diagram-generator.py）
    ↓ 降级发生时
输出 WARN，建议在交付文档"已知问题"中标注
    ↓ 最终
enforceDiagramGate 门禁检查（三图齐全 + 大小 > 10KB）
```

### 蓝色文本清理策略

| 场景 | 处理方式 |
|------|---------|
| 蓝色空标题段落 | 删除整段 |
| 蓝色占位文本段落（非标题） | 删除整段 |
| 蓝色标题（有实质内容） | 保留但变黑 |
| 表格蓝色占位单元格 | 清空变黑 |
| 段落中 run 级蓝色（非超链接） | 清空 run.text + 颜色变黑 |
| 超链接蓝色 | 保留不动 |

**两次清理的必要性**：`_clean_template_content` 以段落/单元格为粒度，可能遗漏表格中 run 级的蓝色文本。`_secondary_clean_blue_runs` 遍历每个 run 做补充清理。

## 失败处理矩阵

| 失败场景 | 严重度 | 根因 | 处理策略 |
|---------|--------|------|---------|
| `.doc` (OLE2) 模板 | 阻断 | python-docx 不支持 OLE2 | 终止，提示用户转换为 `.docx` 格式 |
| `_scan-data.json` 不存在或为空 | 阻断 | 项目扫描未执行或失败 | 终止，提示先执行 `project-scanner.js` |
| 模板文件不存在 | 阻断 | 路径错误或文件被移除 | 终止，提示检查 `--template` 参数 |
| AntV 不可用 + matplotlib 也失败 | 阻断 | 网络/环境问题 | 终止图表生成，文档中插入"图表待补充"占位 |
| 三张必要 PNG 缺失/过小 | 警告 | 图表生成失败 | 文档继续生成，在"已知问题"中标注 |
| 蓝色文本残留（首次清理后 > 0） | 警告 | `_clean_template_content` 遗漏 | 自动触发二次清理，最终残留 > 0 则人工标注 |
| 章节内容窜行（表格在错误章节下） | 警告 | 模板结构不规则 | 自动执行 `_detect_misplaced_tables` 修复，失败则人工调整 |
| 模板不含 TOC 域 | 警告 | 模板设计缺目录 | 自动 `force_insert_toc` 插入动态域 |
| 模板不含 UML 图表标题 | 信息 | 模板版本差异 | 自动 `_insert_uml_placeholders` 创建 H2+占位 |
| 空章节检测误判 | 警告 | 仅有表格无段落 | 双重检测（段落+表格）已修复，但仍需人工复核 |
| excel-custom 配置文件不存在 | 阻断 | excel-doc-types.json 缺失 | 终止，提示检查 config/excel-doc-types.json |
| excel-custom Python 脚本执行失败 | 阻断 | openpyxl 未安装或 Python 错误 | 终止，输出 stderr 供诊断 |
| MD 格式校验未通过（缺必要结构） | 警告 | MD 文件不符合预期格式 | 继续解析，输出警告日志 |
| 必填字段缺失（用例编号/名称/优先级） | 警告 | MD 解析后字段为空 | 继续生成，在结果 JSON 的 validation 中标注缺失数 |
| MD 单条用例解析异常 | 警告 | 正则匹配失败或格式变体 | 跳过该条用例，输出警告，不影响其他用例 |

## 注意事项

- 概要设计说明书内容基于 `_scan-data.json` 动态构建，**不硬编码**特定项目/银行业务内容
- 技术栈描述基于 `techStack` 字段动态匹配 `config/tech-descriptions.json`
- 组件内容基于 `subsystems` 列表动态分组；外部接口基于 `externalDeps` 动态生成
- 非功能性章节条件生成（检测到 Redis → 缓存策略，检测到 Dubbo → 服务治理）
- 需求文档必须为 Markdown 格式（`requirement-analyzer.js` 依赖 Markdown 结构解析）
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

# 详细设计文档（Word — 从预生成 design_data JSON 生成，跳过需求分析）
node scripts/cli.js -t design -m "模块名称" --template "模板.docx" --design-data "_design-data.json"

# 详细设计文档（Word — 保留模式：仅替换封面，保留模板全部正文）
node scripts/cli.js -t design -m "模块名称" --template "模板.docx" --preserve

# 详细设计文档（Markdown）
node scripts/cli.js -t design -f md -m "模块名称"

# 单元测试报告（Excel，基于 xlsx 模板填充）
node scripts/cli.js -t unit-test-report-xlsx -m "模块名称" \
  --xlsx-template "模板.xlsx" --test-source "测试代码目录" --mode unit --json

# 单元测试报告（Excel，银行级配置自动加载）
node scripts/cli.js -t unit-test-report-xlsx -m "模块名称" --bank <银行代码> --json

# 单元测试报告（Excel，银行配置 + 自定义过滤）
node scripts/cli.js -t unit-test-report-xlsx -m "模块名称" \
  --bank <银行代码> --test-filter "ClassNameA,ClassNameB" --json

# SIT 测试用例（Excel，从需求文档分析生成）
node scripts/cli.js -t testcase -f excel -r "需求文件.md" -m "模块名称" --json

# 测试报告
node scripts/cli.js -t testreport -m "模块名称"

# Excel 从零生成（配置驱动，从 MD 测试用例生成格式化 Excel）
node scripts/cli.js -t excel-custom --excel-doc-type test-case-custom --md-files "用例1.md" "用例2.md" -m "模块名称" --json

# Excel 从零生成（从 JSON 数据生成单元测试报告）
node scripts/cli.js -t excel-custom --excel-doc-type unit-test-report-custom --json-files "结果.json" -m "模块名称" --json
```

### 新增参数（v8.1 — 2026-06-07）

| 参数 | 类型 | 说明 |
|------|------|------|
| `--design-data` | string | 直接传入预生成的 design_data JSON 路径，跳过 RequirementAnalyzer |
| `--preserve` | flag | 显式启用保留模式，仅替换封面字段，保留模板全部正文内容 |

### 新增参数（v11.0 — 2026-06-17）

| 参数 | 类型 | 说明 |
|------|------|------|
| `--excel-doc-type` | string | excel-custom 子类型：`test-case-custom`（默认）\|`unit-test-report-custom` |
| `--md-files` | string[] | MD 数据源文件路径（excel-custom 类型，支持多个） |
| `--json-files` | string[] | JSON 数据源文件路径（excel-custom 类型，支持多个） |

## 复盘与优化总结 (v8.1 — 2026-06-07)

### 成功路径（可复现的最小执行流程）

```
Step 1: 需求MD → RequirementAnalyzer.analyzeForDesign() → design_data JSON
Step 2: design_data + 模板.docx → design-generator.py → 输出.docx
Step 3: 验证：段落数/封面/标题层级/页眉页脚/编号剥除/附录清理
```

### 失败模式清单

| 场景 | 频率 | 严重度 | 根因 | 对策 |
|------|------|--------|------|------|
| CLI 中文参数乱码 | 高 | 高 | Windows PowerShell 编码不兼容 | 设置 PYTHONIOENCODING/直接调用 API/`--design-data` 绕过 |
| .docx 模板被误解析为 JSON | 高 | 中 | `loadTemplateData` 未区分 .docx | 检查后缀，.docx 时跳过 |
| 标题层级错位（H2→H3） | 中 | 高 | `h3_keywords` 匹配了 H1 直系子标题 | 已设标题不升级 + h3_keywords 净化 |
| 附录F不协调表格残留 | 中 | 中 | 表格单元格内文本未被段落级搜索命中 | v4 递归搜索后代元素 + 祖先回溯 |
| 保留模式下模板正文仍被删 | 低 | 高 | `_PRESERVE_MODE` 仅守卫第二遍未守卫第一遍 | 第一遍蓝色清理处也加 `if not _PRESERVE_MODE` |
| moduleName 被输出路径覆盖 | 低 | 中 | CLI 调用链中 moduleName 字段被覆写 | `{ ...designData, moduleName }` 显式注入 |

### 适用/不适用场景

**适用**：
- 有 .docx 模板 + 有需求 MD → 完整管线
- 有 .docx 模板 + 无需求 MD → 保留模式（仅替换封面）
- 需求为 Markdown 格式 + BEMP 详细设计文档 → RequirementAnalyzer 可用

**不适用**：
- 无 .docx 模板 → 回退到 Markdown 生成
- 模板为 .doc (OLE2) → 提示转换格式
- 需要概要设计说明书 → 走 `outline-design-generator.py`
- 仅需 Markdown 输出 → 跳过模板填充管线

### 通用化设计原则

1. **零硬编码**：所有阈值/关键词/降级策略统一由 `config/design-pipeline.yaml` 和 `doc_rules.yaml` 管理
2. **配置驱动**：管线段顺序、模式触发条件、图表降级链、附录清理规则均配置化
3. **已设标题保护**：`unify_heading_styles` 中 `current_level > 0` 时永不修改 pStyle 级别
4. **降级安全链**：graphviz → matplotlib → 占位文字，每层有兜底
5. **递归内容检测**：附录清理支持表格单元格内文本匹配 + 祖先回溯

## 银行级配置体系（v9.0 — 2026-06-08）

### 设计动机

批量生成多个需求的文档时发现：每个需求都需要手动指定 `--test-source`、`--xlsx-template`、`--cover-placeholders` 等参数，且测试扫描范围不精确（扫描整个银行目录返回全部测试类而非需求相关的几个）。银行级配置体系将所有银行特定参数集中管理，消除硬编码。

### 配置文件结构

```
config/banks/
├── _template.json     # 新银行接入模板（复制后修改）
└── <银行代码>.json     # 银行个性化配置
```

**`<银行代码>.json` 配置项**：

| 配置节 | 字段 | 说明 |
|--------|------|------|
| `coverPlaceholders` | `XXX信息系统` → `<项目名称>` | 封面占位替换映射 |
| `templates` | `design`/`outlineDesign`/`unitTestReport` | 各类型文档模板路径 |
| `testSource.baseDir` | `banks/<银行模块目录>` | 测试代码根目录 |
| `testSource.unitTestPaths` | `"<需求模块名>"` → 精确目录 | 需求级测试代码路径 |
| `testSource.testFilters` | `"<需求模块名>"` → `["<实现类名1>"]` | 需求级类名过滤 |
| `font` | `name`/`size`/`headingFont`/`bodyFont` | 字体配置 |
| `contentDefaults` | `project`/`component`/`tester`/`designer`/`cycle` | 内容默认值 |
| `qualityGate` | `docx`/`xlsx`/`testcase` | 质量门禁阈值 |

### 参数优先级规则

```
用户显式参数（CLI --test-source/--xlsx-template 等）
    > 银行配置（--bank <银行代码> 加载的 bank config）
    > 内置默认值
```

### 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| `BankConfigLoader` | `scripts/lib/bank-config-loader.js` | 加载银行配置，列出可用银行 |
| `BankConfig` | `scripts/lib/bank-config-loader.js` | 类型安全配置访问，路径解析，参数合并 |
| `QualityGate` | `scripts/lib/quality-gate.js` | 统一质量门禁，参数化阈值校验 |
| `JavaTestScanner` | `scripts/lib/java-test-scanner.js` | 支持 `classFilters` 过滤的测试扫描器 |

### 新增 CLI 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--bank <code>` | 银行配置代码 | `--bank <银行代码>` |
| `--test-filter <keywords>` | 测试类名过滤（逗号分隔） | `--test-filter "ClassNameA,ClassNameB"` |

### 统一质量门禁

`QualityGate` 模块将 xlsx/docx/testcase 三种文档类型的校验阈值参数化：

- **xlsx**：`minFillRate`（整体填充率）、`requiredKeyFillRate`（必含主键填充率）、`maxBlueResidual`（蓝色残留上限）、`fontConsistency`（字体一致性）
- **docx**：`minParagraphs`（最小段落数）、`maxBlueResidual`、`maxPlaceholderResidual`（占位符残留上限）、`headingLevelConsistency`
- **testcase**：`minCases`（最小用例数）、`columnAlignmentRate`（列对齐率）、`priorityDistribution`（优先级分布要求）

### 新银行接入流程

1. 复制 `config/banks/_template.json` → `config/banks/{bankCode}.json`
2. 填写 `bankName`、`projectName`、`coverPlaceholders`
3. 配置 `templates` 路径（相对于项目根目录）
4. 配置 `testSource.unitTestPaths` 和 `testSource.testFilters`
5. 调整 `qualityGate` 阈值（可选，默认值已内置）
6. 使用 `--bank {bankCode}` 即可

## Excel 从零生成管线（v11.0 — 2026-06-17）

与模板填充模式（excel-testcase/unit-test-report-xlsx）并存的配置驱动 Excel 生成管线。所有列定义、样式、数据源映射均从 `config/excel-doc-types.json` 读取，零硬编码。

### 管线架构

```
[1] ExcelDocTypeConfig  → 加载 excel-doc-types.json
[2] ParserFactory       → 根据 data_source.type 创建解析器（MD/JSON）
[3] DataValidator       → 必填字段校验 + MD 格式校验
[4] ExcelBuilder        → 组装 Sheet + 写入数据 + 应用样式 + 输出 xlsx
```

### 核心设计原则

1. **配置驱动**：列数/列名/列宽/样式/数据源映射/校验规则全部从配置读取
2. **解析器可扩展**：通过 `ParserFactory` 支持新增数据源类型（MD/JSON/CSV）
3. **校验分层**：MD 格式校验（解析前）+ 必填字段校验（解析后），校验结果写入 JSON 输出
4. **单条容错**：单条用例解析失败不影响其他用例，输出警告后跳过
5. **汇总自动生成**：`summary_sheet.enabled=true` 时自动按分组字段统计

### 新增文档类型扩展流程

1. 在 `config/excel-doc-types.json` 的 `doc_types` 下新增文档类型定义
2. 定义 `data_source`（type/parser/field_mappings）
3. 定义 `validation`（required_fields/md_format_check 或 json_format_check）
4. 定义 `sheets`（列定义）和 `summary_sheet`（汇总配置）
5. 如需新解析器，在 `ParserFactory.create` 中注册
6. 通过 `--excel-doc-type <新类型>` 即可使用