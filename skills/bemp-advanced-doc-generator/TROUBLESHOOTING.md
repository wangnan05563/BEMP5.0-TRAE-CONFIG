# BEMP 文档生成器故障排查与复盘

> 本文档为 bemp-advanced-doc-generator 技能的故障排查与复盘指南，由 SKILL.md 渐进式披露拆分而来。

## 失败处理矩阵

| 失败场景 | 严重度 | 根因 | 处理策略 |
|---------|--------|------|---------|
| `.doc` (OLE2) 模板 | 阻断 | python-docx 不支持 OLE2 | 终止，提示用户转换为 `.docx` 格式 |
| `_scan-data.json` 不存在或为空 | 阻断 | 项目扫描未执行或失败 | 终止，提示先执行 `project-scanner.js` |
| 模板文件不存在 | 阻断 | 路径错误或文件被移除 | 终止，提示检查 `--template` 参数 |
| AntV 不可用 + matplotlib 也失败 | 阻断 | 网络/环境问题 | 终止图表生成，文档中插入"图表待补充"占位 |
| 三张必要 PNG 缺失/过小 | 警告 | 图表生成失败 | 文档继续生成，在"已知问题"中标注 |
| 蓝色文本残留（首次清理后 > 0） | 警告 | `_clean_template_content` 遗漏 | 自动触发二次清理，最终残留 > 0 则人工标注 |
| 章节内容窜行（表格在错误章节下） | 警告 | 模板结构不规则 | 自动执行 `_detect_misplaced_tables` 修复 |
| 模板不含 TOC 域 | 警告 | 模板设计缺目录 | 自动 `force_insert_toc` 插入动态域 |
| 空章节检测误判 | 警告 | 仅有表格无段落 | 双重检测（段落+表格）已修复 |
| excel-custom 配置文件不存在 | 阻断 | excel-doc-types.json 缺失 | 终止，提示检查 config/excel-doc-types.json |
| MD 格式校验未通过 | 警告 | MD 文件不符合预期格式 | 继续解析，输出警告日志 |
| drawio-skill 不可用（v13.0） | 警告 | Skill 工具未注册 | 按降级链切换至 mcp-server-chart |
| mcp-server-chart URL 下载失败（v13.0） | 警告 | 网络超时或 URL 失效 | 按降级链切换至 graphviz/antv/matplotlib |
| 全部5级降级链均失败（v13.0） | 阻断 | 所有图表引擎不可用 | 文档中插入"图表待补充"占位 |
| 质量审核阻断项不通过（v13.0） | 阻断 | 文档存在硬编码/功能号过期/占位符残留 | 阻断交付，输出修复建议列表 |
| 版本历史 JSON 文件损坏（v13.0） | 警告 | _report-version-history.json 格式错误 | 重新初始化版本历史，从 v1.0 开始 |
| design 模板锚点分类错位（章节内容错位/产出废弃） | 阻断 | 模板标题与 chapter_classification / template_h2_alias_map 关键词不匹配 | 按「design 模板锚点分类错位」章节诊断；重试仍失败 → 切换先例脚本模式 |

## 复盘与优化总结 (v8.1)

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
- 需求为 Markdown 格式 + BEMP 详细设计文档

**不适用**：
- 无 .docx 模板 → 回退到 Markdown 生成
- 模板为 .doc (OLE2) → 提示转换格式
- 需要概要设计说明书 → 走 `outline-design-generator.py`

### 通用化设计原则

1. **零硬编码**：所有阈值/关键词/降级策略统一由配置文件管理
2. **配置驱动**：管线段顺序、模式触发条件、图表降级链、附录清理规则均配置化
3. **已设标题保护**：`unify_heading_styles` 中 `current_level > 0` 时永不修改 pStyle 级别
4. **降级安全链**：drawio → mcp → graphviz → antv → matplotlib → 占位文字（v13.0 扩展为5级）
5. **递归内容检测**：附录清理支持表格单元格内文本匹配 + 祖先回溯
6. **三级配置继承**：技能级 → 项目级 → 银行级，deep-merge 策略（v13.0 新增）

## design 模板锚点分类错位

> 来源：反洗钱四阶段校验需求交付文档实测复盘（2026-08）。切换条件已登记于 `scripts/config/design-pipeline.yaml` → `pipeline_fallback` 段。

### 症状

- design 管线（design-pipeline.yaml 驱动）生成的 docx 中，章节内容出现在错误标题之下（如"接口"内容落在"功能描述"下）
- 模板实际标题无法被 `chapter_classification` 关键词或 `template_h2_alias_map` 别名命中，锚点分类误判导致内容归属错乱，产出整体废弃、不可通过人工修补挽救

### 根因

- 模板标题措辞与配置关键词/别名不匹配（每个银行模板措辞不同，关键词集不可能穷举）
- 模板结构不规则：标题层级缺失、锚点顺序与 design_data.chapters 顺序不一致

### 诊断方法

1. **对照检查**：提取模板实际 H1/H2 标题列表，与 design_data.chapters 章节标题逐一比对，找出无锚点命中的标题
2. **产出验证**：检查输出 docx 中每个 H2 下是否存在内容——空章节 + 后续章节内容异常膨胀 = 错位信号
3. **配置核查**：确认缺失锚点是否可通过在 design-pipeline.yaml 的 `chapter_classification` / `template_h2_alias_map` 补登记关键词解决（改配置优于改代码）

### 降级路径：先例脚本模式（precedent-script）

锚点配置重试仍失败（切换条件见 design-pipeline.yaml → `pipeline_fallback.switch_conditions`）时，放弃模板锚点填充，切换全代码构建：

1. 复制技能 `scripts/` 下同构先例脚本为新需求脚本：以 `gen_org_mgmt_design.py` 为默认复制起点（可用环境变量 `BEMP_DOC_PRECEDENT_SCRIPT` 覆盖），命名 `gen_<requirement>_design.py`（先例：`gen_aml4_design.py`）
2. 仅调整数据源（章节标题/内容/表格数据），保持样式工具函数与章节骨架不变
3. 直接运行新脚本精准生成——全代码构建、无模板遗留空章节，天然不受锚点分类影响
4. 交付文档"已知问题"章节标注本次管线失败原因与降级方式

### gen_* 系列脚本范本注册约定

- `scripts/gen_*.py` 为按需求命名的生成脚本，**每次成功交付后保留作为范本，不删除**
- 新脚本头部注释必须注明所复制的先例脚本名（参考 gen_aml4_design.py 头部："生成模式与 gen_org_mgmt_design.py 先例一致"）
- 范本链（按成功交付时间演进）：`gen_org_mgmt_design.py` → `gen_sync_org_tree_design.py` → `gen_aml4_design.py` → （后续新脚本追加在链尾）
- 选择复制起点时取范本链中结构与当前需求最接近的脚本，而非固定取链首
