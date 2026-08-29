---
name: bemp-markdown-converter
description: Convert documents and files to Markdown using markitdown or custom docx converter. Use when converting PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx, .xls), HTML, CSV, JSON, XML, images (with EXIF/OCR), audio (with transcription), ZIP archives, YouTube URLs, or EPubs to Markdown format for LLM processing or text analysis.
---

## 配置加载铁律（取参前必读）

本技能 config 下 JSON 中的 `${ENV:VAR}` 是占位符，直接读文件得到的是字面量，不是参数值。取参数值必须先解析：

```powershell
# 解析整个配置 / 取单键（以解析结果为参数值，禁止拿 ${ENV:XXX} 字面量当值用）
python  "..\_shared\load_config.py"  --file "<本技能配置路径>"  --get <a.b.c>
node    "..\_shared\load-config.js"  --file "<本技能配置路径>"  --get <a.b.c>
```

- 解析链：环境变量 > `_shared/env-config.json` environmentDefaults（唯一配置入口）> `${ENV:VAR:默认值}` 内联默认值
- 解析报错 → 跑 `powershell -File "<skills根>\_shared\doctor-config.ps1"`，按 FAIL 清单修复（改 _shared 或设环境变量，禁止把真值回写技能 config）
- 完整约定见 [_shared/config-loading-guide.md](../_shared/config-loading-guide.md)

# Markdown Converter

Convert files to Markdown — supports both `uvx markitdown` and custom BEMP docx converter.

## Basic Usage

### Method 1: Universal Converter (markitdown)

```bash
# Convert to stdout
uvx markitdown input.pdf

# Save to file
uvx markitdown input.pdf -o output.md

# 保留图片等嵌入式资源（base64 嵌入）
markitdown input.docx -o output.md --keep-data-uris
```

### Method 2: BEMP Docx Converter (推荐用于需求文档)

```bash
# 基础转换
python scripts/docx_to_md.py input.docx -o output.md

# 使用自定义配置
python scripts/docx_to_md.py input.docx -o output.md -c config/custom_config.json
```

## Supported Formats

- **Documents**: PDF, Word (.docx/.doc), PowerPoint (.pptx), Excel (.xlsx, .xls)
- **Web/Data**: HTML, CSV, JSON, XML
- **Media**: Images (EXIF + OCR), Audio (EXIF + transcription)
- **Other**: ZIP (iterates contents), YouTube URLs, EPub

## BEMP Docx Converter 核心流程

### 转换步骤
1. **预缓存图片** → 从文档级关系中获取所有图片数据，避免重复I/O
2. **遍历文档元素** → 按顺序处理段落(p)和表格(tbl)
3. **段落处理**：
   - 提取图片 → 生成Markdown引用并保存
   - 识别标题层级 → Heading样式显式标题 + List Paragraph隐式标题
   - 生成层级序号 → 父级.子级 累加计数器（如 8.1, 8.2）
   - 识别编号列表 → 处理numPr属性，区分普通列表和隐式标题
   - 应用段落间距 → 根据前一个元素类型添加空行
4. **表格处理**：
   - 提取单元格数据 → 统一列数
   - 识别特殊行类型 → 按钮行、表单行、标题行、合并行
   - 处理栏位描述表格 → 去重连续重复行
   - 构建Markdown输出 → 标题、表格、按钮行、表单行

### 特殊行类型识别

| 行类型 | 识别条件 | 处理方式 |
|--------|---------|---------|
| 按钮行 | 多列包含按钮关键字 或 合并行含按钮关键字 | 提取为 `[按钮文本]` |
| 表单行 | 合并行包含表单控件模式（如 `[    ]`） | 渲染为单行文本 |
| 标题行 | 第一行且为合并行 | 加粗显示 |
| 合并行 | 80%以上单元格内容相同 | 取第一个非空单元格 |
| 栏位描述表 | 表头含"数据名称""输入/输出""表现形式" | 去重连续重复行 |

## Configuration

所有参数通过 `scripts/config/converter_config.json` 管理，无硬编码：

```json
{
    "merge_row": { "enabled": true, "threshold_ratio": 0.8, "min_cell_count": 2 },
    "button_row": { "enabled": true, "cell_keywords": ["新增", "修改", ...], "min_button_count": 2 },
    "form_row": { "enabled": true, "patterns": ["\\[.*\\]", "<button>"] },
    "image": { "enabled": true, "output_dir": "images", "naming_pattern": "img_{index}_{hash}" },
    "heading_number": { "enabled": true, "preserve_from_text": true },
    "spacing": { "enabled": true, "rules": { "heading_after_normal": 1, ... } },
    "implicit_heading": { "enabled": true, "max_length": 20, "keywords": ["业务规则", ...] }
}
```

## Post-Processing Scripts

### Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `docx_to_md.py` | Docx to Markdown converter (推荐) | `python scripts/docx_to_md.py input.docx -o output.md` |
| `optimize.py` | All-in-one optimization | `python scripts/optimize.py input.md [-o output.md]` |
| `fix_heading_numbers.py` | Fix heading numbering | `python scripts/fix_heading_numbers.py input.md` |
| `clean_duplicate_numbers.py` | Remove duplicate heading numbers | `python scripts/clean_duplicate_numbers.py input.md` |
| `fix_table_headers.py` | Fix interface design table headers | `python scripts/fix_table_headers.py input.md` |
| `fix_invoice_table.py` | Fix invoice-related tables | `python scripts/fix_invoice_table.py input.md` |
| `check_quality.py` | Quality check and validation | `python scripts/check_quality.py input.md` |

### Recommended Workflow

```bash
# 1. Convert docx document (BEMP需求文档推荐)
python scripts/docx_to_md.py input.docx -o output.md

# 2. Or use markitdown (通用格式)
uvx markitdown input.docx -o output.md --keep-data-uris

# 3. Run all optimizations (recommended)
python scripts/optimize.py output.md

# 4. Check quality
python scripts/check_quality.py output.md
```

## Notes

- `docx_to_md.py` 专为BEMP需求文档优化，支持标题层级序号、图片提取、表格特殊行识别
- 所有参数通过 `config/converter_config.json` 管理，支持外部配置文件覆盖
- 图片自动提取到 `images/` 目录，使用MD5哈希避免重复
- 隐式标题（List Paragraph中的短文本）自动识别并赋予层级序号
- 首次运行缓存图片数据，后续转换更快
- 对于复杂PDF，使用 `markitdown -d` with Azure Document Intelligence
