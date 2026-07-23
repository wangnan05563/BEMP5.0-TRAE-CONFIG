# BEMP 文档生成器详细指南

> 本文档为 bemp-advanced-doc-generator 技能的详细操作指南，由 SKILL.md 渐进式披露拆分而来。

## 图表生成混合方案（v13.0）

> 配置统一由 `config/chart-tools.json` 管理（合并原 chart-config.json + diagram-config.json）。

### 智能体编排流程（preGeneration，v13.1 新增）

> 根因：脚本层无法调用 Skill 工具和 run_mcp，导致 drawio/mcp 引擎在脚本层不可用，降级到 matplotlib 生成朴素图表。v13.1 引入智能体前置流程解决此问题。

```
智能体（document-delivery-engineer）在运行文档生成脚本前：
  1. 读取 chart-tools.json 的 chartTypes，识别 preferredEngine 为 drawio/mcp 的图表类型
  2. 对 preferredEngine=drawio 的图表：
     → 通过 Skill 工具调用 drawio-skill，传入 preset 和数据
     → drawio-skill 生成 .drawio XML，渲染为 PNG 保存到 output/diagrams/
  3. 对 preferredEngine=mcp 的图表：
     → 检查 mcp_mcp-server-chart 是否可用
     → 可用：通过 run_mcp 调用对应工具，下载 URL 为本地 PNG 到 output/diagrams/
     → 不可用：跳过，由脚本降级处理
  4. 运行文档生成脚本：
     → 脚本检测 output/diagrams/ 已存在的 PNG 并跳过（skipExisting=true）
     → 仅处理未生成的图表类型（降级到 graphviz/antv/matplotlib）
  5. enforceDiagramGate 门禁检查（三图齐全 + 大小 > 10KB）
```

**关键配置**：
- `engines.drawio.agentDriven = true`：标记 drawio 由智能体调用
- `engines.mcp.agentDriven = true`：标记 mcp 由智能体调用
- `preGeneration.enabled = true`：启用智能体前置流程
- `preGeneration.steps`：4 步流程定义

### 5级降级链

```
drawio-skill（专业架构图/UML/ER/时序图，通过 Skill 工具调用，agentDriven）
    ↓ 不可用或调用失败
mcp-server-chart（统计图表/流程图，通过 run_mcp 调用，agentDriven，返回URL需下载为本地PNG）
    ↓ 不可用或调用失败
Graphviz（本地 dot 命令渲染，通过 graphviz-renderer.js，脚本调用）
    ↓ 失败（dot 命令不存在）
AntV MCP（通过 antv-client.js 调用 antv-studio.alipay.com，脚本调用）
    ↓ 失败（API 不可用/超时）
matplotlib 降级生成（scripts/diagram-generator.py，脚本调用）
    ↓ 降级发生时
输出 WARN，建议在交付文档"已知问题"中标注
    ↓ 最终
enforceDiagramGate 门禁检查（三图齐全 + 大小 > 10KB）
```

### 12种图表类型与工具映射

| 图表类型 | 首选引擎 | 工具/预设 | 适用文档 |
|---------|---------|----------|---------|
| 系统架构图 | mcp | generate_flow_diagram | 概要设计/详细设计 |
| 网络结构图 | mcp | generate_network_graph | 概要设计 |
| 部署图 | drawio | architecture 预设 | 概要设计 |
| 组件结构图 | mcp | generate_mind_map | 概要设计/详细设计 |
| ER图 | drawio | erd 预设 | 详细设计/概要设计 |
| UML类图 | drawio | uml-class 预设 | 详细设计 |
| 时序图 | drawio | sequence 预设 | 详细设计 |
| 活动图 | drawio | flowchart 预设 | 详细设计 |
| 饼图 | mcp | generate_pie_chart | 测试报告 |
| 趋势图 | mcp | generate_line_chart | 测试报告 |
| 桑基图 | mcp | generate_sankey_chart | 测试报告/概要设计 |
| 鱼骨图 | mcp | generate_fishbone_diagram | 测试报告 |

### drawio-skill 调用流程

1. 通过 Skill 工具调用 `drawio-skill`，传入 preset 和数据
2. drawio-skill 生成 .drawio XML 文件
3. 渲染为 PNG 保存到 `output/diagrams/` 目录
4. PNG 走原有 `_insert_architecture_diagrams` / `_insert_er_diagrams` 插入文档

### mcp-server-chart 调用流程

1. 通过 `run_mcp` 调用 mcp_mcp-server-chart 的对应工具
2. **URL转本地PNG**：返回的是 HTTP URL，需下载保存到 `output/diagrams/`，文件名规范：`{图表类型}-{模块名}.png`
3. 下载后的 PNG 走原有插入逻辑

### mcp-server-chart 注意事项

- 工具返回的是 HTTP URL（如 `https://mdn.alipayobjects.com/...`），不是本地文件
- 必须通过 HTTP 下载保存到 `output/diagrams/` 目录后才能插入 docx
- 推荐主题：`academy`（学术风格，适合正式交付文档）

### 原有 AntV/matplotlib 管线（降级引擎）

```
ER 图：er-diagram-generator.js → 28 张 ER 图 → output/ER_*.html/.png/.mmd
架构图：antv-client.js → diagram-service.js → output/diagrams/architecture-diagram.png
网络图：antv-client.js → diagram-service.js → output/diagrams/network-topology.png
部署图：antv-client.js → diagram-service.js → output/diagrams/deployment-diagram.png
UML 图：uml-generator.js → uml-renderer.py → output/diagrams/uml/class-diagram.png
```

### 门禁

`enforceDiagramGate` 检查三张必要 PNG 存在且 > 10KB，缺失则阻断并输出错误列表。门禁阈值由 `chart-tools.json` 的 `qualityGate` 配置。

## 交付文档质量审核（阶段8）

> 配置由 `config/quality-checklist.json` 管理。

### 7类审核项

| 审核项ID | 审核项名称 | 严重度 | 说明 |
|---------|-----------|--------|------|
| QC001 | 硬编码检查 | 阻断 | 检查文档中是否有硬编码的功能号、日期、路径、银行名称等 |
| QC002 | 功能号检查 | 阻断 | 检查功能号是否为最新值 |
| QC003 | 日期检查 | 主要 | 检查文档中的日期是否为当前日期 |
| QC004 | 章节结构检查 | 阻断 | 检查章节编号是否冲突、标题层级是否连续 |
| QC005 | 占位符检查 | 阻断 | 检查是否有未填充的占位符文本和蓝色文本残留 |
| QC006 | 图表完整性检查 | 主要 | 检查图表文件是否存在且大小 > 10KB |
| QC007 | 表格完整性检查 | 主要 | 检查空表格是否填充"不涉及" |

### 审核流程

1. 读取 `config/quality-checklist.json` 获取审核项配置
2. 按配置继承优先级加载（技能级 → 项目级 → 银行级）
3. 并行执行所有启用的审核项
4. 汇总审核结果，生成质量审核报告（`output/_quality-checklist-result.md`）
5. 根据 `conclusionCriteria` 判定结论（通过/条件通过/不通过）
6. 阻断级问题不通过时 → 阻断交付，输出修复建议
7. 主要/次要问题不通过时 → 记录到"已知问题"章节，允许交付

### 审核结论判定

- **通过**：所有阻断项通过 AND 主要项通过率 >= 80%
- **条件通过**：所有阻断项通过 AND 主要项通过率 < 80%
- **不通过**：存在未通过的阻断项

## 测试报告版本迭代（阶段9）

> 仅适用于 testreport / unit-test-report 类型，配置由 `config/report-versioning.json` 管理。

### 版本号规则

```
格式：v{major}.{minor}（如 v1.0, v2.0, v3.0）
主版本号递增（major+1, minor=0）：实质性变更
  - 新增测试用例执行结果
  - 缺陷状态发生变更（OPEN → FIXED）
  - 阻塞问题解决并重新测试
  - 测试范围扩大
  - 二轮调试测试完成
次版本号递增（minor+1）：非实质性变更
  - 修正文字错误
  - 更新图表样式
  - 补充说明性文字
```

### 迭代工作流（7步）

1. **检测变更**：对比当前测试数据与上一版本数据，识别变更项
2. **确定版本号**：根据变更类型确定新版本号
3. **生成变更记录**：根据变更项生成结构化变更记录
4. **更新版本历史**：在文档版本历史章节追加新版本记录
5. **生成新版本文件**：按命名规则生成（如 `_测试报告_v2.0.docx`）
6. **保存版本历史**：保存到 `output/_report-version-history.json`
7. **质量审核**：对新版本文件执行阶段8质量审核

### 7种变更类别

| 变更类别 | 说明 |
|---------|------|
| test-case-result | 用例结果变更 |
| defect-status | 缺陷状态变更 |
| blocked-issue | 阻塞问题解决 |
| test-scope | 测试范围变更 |
| test-environment | 测试环境变更 |
| report-format | 报告格式变更 |
| text-correction | 文字修正 |

### 迭代限制

同一测试报告最多迭代 10 次，超限提示用户检查测试流程。

## 章节填充优先级策略

```
优先级 1 — 特殊处理（必须在 _find_matching_chapter 之前执行）：
  术语定义 → _fill_glossary_table
  参考资料 → _fill_references
  开发环境 → _fill_dev_environment
  界面     → _fill_ui_description
  性能     → _fill_performance
  目的     → _fill_purpose
  适用范围 → _fill_scope
  读者对象 → _fill_reader_audience
  组件内部模块列表 → _fill_component_module_list
  附录     → _fill_appendix

优先级 2 — H1+H2 组合精确匹配
优先级 3 — H1 精确匹配
优先级 4 — H2 精确匹配
优先级 5 — 模糊匹配（去编号前缀后比较）
优先级 6 — fill_empty_chapter 兜底：插入"不涉及"占位
```

**设计原则**：特殊处理必须在通用匹配之前。原因是 `_find_matching_chapter` 的模糊匹配可能将"适用范围"错误匹配到"1.3 范围说明"等章节。

## 文档内容管理架构（v7.0）

```
content/
├── __init__.py          # ContentRegistry（按需加载）+ CONTENT_INDEX（索引导航）
├── common.py            # 共享工具
├── outline_chapters.py  # 概要设计章节生成器（独立模块）
└── detail_chapters.py   # 详细设计章节生成器（独立模块）
```

**按需加载机制**：`ContentRegistry` 仅在首次访问时加载对应模块，避免一次性加载所有内容。

## 示例内容识别与清除（v7.0）

- `clear_example_content(doc)` — 识别并清除模板中的示例内容
- `clean_template_remarks(doc)` — 清理模板备注说明段落
- `enhanced_blue_cleanup(doc)` — 增强版蓝色文本清理
- `full_template_cleanup(doc)` — 一键完整模板清理（以上三阶段的组合调用）

配置化规则文件 `doc_rules.yaml` 中新增节：
- `example_content` — 示例内容识别关键词与占位符模式
- `template_remarks` — 模板备注清理关键词
- `template_cleanup` — 清理流程配置

## 蓝色文本清理策略

| 场景 | 处理方式 |
|------|---------|
| 蓝色空标题段落 | 删除整段 |
| 蓝色占位文本段落（非标题） | 删除整段 |
| 蓝色标题（有实质内容） | 保留但变黑 |
| 表格蓝色占位单元格 | 清空变黑 |
| 段落中 run 级蓝色（非超链接） | 清空 run.text + 颜色变黑 |
| 超链接蓝色 | 保留不动 |

**两次清理的必要性**：`_clean_template_content` 以段落/单元格为粒度，可能遗漏表格中 run 级的蓝色文本。`_secondary_clean_blue_runs` 遍历每个 run 做补充清理。

## xlsx 模板填充标准管线（v8.0）

详细 SOP 见 [references/xlsx-template-fill-sop.md](references/xlsx-template-fill-sop.md)。

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
- **样式最小覆盖**：保留模板原 `cell.style`，仅覆盖 font/alignment
- **多语言兼容**：`pickList('中文', 'english', 'Alias')` 三键轮询

## 银行级配置体系（v9.0）

### 配置文件结构

```
config/banks/
├── _template.json     # 新银行接入模板
└── <银行代码>.json     # 银行个性化配置
```

### 参数优先级规则

```
用户显式参数（CLI --test-source/--xlsx-template 等）
    > 银行配置（--bank <银行代码> 加载的 bank config）
    > 内置默认值
```

### 新银行接入流程

1. 复制 `config/banks/_template.json` → `config/banks/{bankCode}.json`
2. 填写 `bankName`、`projectName`、`coverPlaceholders`
3. 配置 `templates` 路径（相对于项目根目录）
4. 配置 `testSource.unitTestPaths` 和 `testSource.testFilters`
5. 调整 `qualityGate` 阈值（可选，默认值已内置）
6. 使用 `--bank {bankCode}` 即可

## Excel 从零生成管线（v11.0）

### 管线架构

```
[1] ExcelDocTypeConfig  → 加载 excel-doc-types.json
[2] ParserFactory       → 根据 data_source.type 创建解析器（MD/JSON）
[3] DataValidator       → 必填字段校验 + MD 格式校验
[4] ExcelBuilder        → 组装 Sheet + 写入数据 + 应用样式 + 输出 xlsx
```

### 核心设计原则

1. **配置驱动**：列数/列名/列宽/样式/数据源映射/校验规则全部从配置读取
2. **解析器可扩展**：通过 `ParserFactory` 支持新增数据源类型
3. **校验分层**：MD 格式校验 + 必填字段校验
4. **单条容错**：单条用例解析失败不影响其他用例
5. **汇总自动生成**：`summary_sheet.enabled=true` 时自动按分组字段统计
