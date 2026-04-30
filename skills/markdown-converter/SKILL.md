---
name: markdown-converter
description: Convert documents and files to Markdown using markitdown. Use when converting PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx, .xls), HTML, CSV, JSON, XML, images (with EXIF/OCR), audio (with transcription), ZIP archives, YouTube URLs, or EPubs to Markdown format for LLM processing or text analysis.
---

# Markdown Converter

Convert files to Markdown using `uvx markitdown` — no installation required.

## Basic Usage

```bash
# Convert to stdout
uvx markitdown input.pdf

# Save to file
uvx markitdown input.pdf -o output.md
uvx markitdown input.docx > output.md

# From stdin
cat input.pdf | uvx markitdown

# 高级用法：保留图片等嵌入式资源（base64 嵌入）
markitdown input.docx -o output.md --keep-data-uris

# 使用 Azure Document Intelligence 优化复杂 PDF 转换
markitdown input.pdf -d -e "https://your-resource.cognitiveservices.azure.com/" -o output.md
```

## Supported Formats

- **Documents**: PDF, Word (.docx/.doc), PowerPoint (.pptx), Excel (.xlsx, .xls)
- **Web/Data**: HTML, CSV, JSON, XML
- **Media**: Images (EXIF + OCR), Audio (EXIF + transcription)
- **Other**: ZIP (iterates contents), YouTube URLs, EPub

## Options

```bash
-o OUTPUT      # Output file
-x EXTENSION   # Hint file extension (for stdin)
-m MIME_TYPE   # Hint MIME type
-c CHARSET     # Hint charset (e.g., UTF-8)
-d             # Use Azure Document Intelligence
-e ENDPOINT    # Document Intelligence endpoint
--use-plugins  # Enable 3rd-party plugins
--list-plugins # Show installed plugins
--keep-data-uris  # Preserve data URIs (base64-encoded images)
```

## Examples

```bash
# Convert Word document
uvx markitdown report.docx -o report.md

# Convert Word document with embedded images
markitdown report.docx -o report.md --keep-data-uris

# Convert Excel spreadsheet
uvx markitdown data.xlsx > data.md

# Convert PowerPoint presentation
uvx markitdown slides.pptx -o slides.md

# Convert with file type hint (for stdin)
cat document | uvx markitdown -x .pdf > output.md

# Use Azure Document Intelligence for better PDF extraction
uvx markitdown scan.pdf -d -e "https://your-resource.cognitiveservices.azure.com/"
```

## Post-Processing Scripts

After converting documents, use these scripts in the `scripts/` directory to optimize the output:

### Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `optimize.py` | All-in-one optimization (recommended) | `python scripts/optimize.py input.md [-o output.md]` |
| `fix_heading_numbers.py` | Fix heading numbering (1., 1.1, 1.1.1...) | `python scripts/fix_heading_numbers.py input.md` |
| `clean_duplicate_numbers.py` | Remove duplicate heading numbers | `python scripts/clean_duplicate_numbers.py input.md` |
| `fix_invoice_table.py` | Fix invoice table formatting (colspan) | `python scripts/fix_invoice_table.py input.md` |
| `check_quality.py` | Quality check and validation | `python scripts/check_quality.py input.md` |

### Recommended Workflow

```bash
# 1. Convert document
uvx markitdown input.docx -o output.md --keep-data-uris

# 2. Run all optimizations (recommended)
python scripts/optimize.py output.md

# Or run individual scripts:
python scripts/clean_duplicate_numbers.py output.md
python scripts/fix_heading_numbers.py output.md
python scripts/fix_invoice_table.py output.md

# 3. Check quality
python scripts/check_quality.py output.md
```

### optimize.py Options

```bash
python scripts/optimize.py <input_file> [options]

Options:
  -o, --output OUTPUT     Output file path (default: overwrite input)
  --skip-auto-optimize    Skip auto-optimization, only run quality check
```

### Script Details

#### fix_heading_numbers.py
- Automatically numbers all headings (1-6 levels)
- Format: `# 1.`, `## 1.1`, `### 1.1.1`, `#### 1.1.1.1`, etc.
- Removes existing numbers before re-numbering

#### clean_duplicate_numbers.py
- Removes duplicate heading numbers like "## 2.1 2.1 Title" → "## 2.1 Title"
- Handles various duplicate patterns

#### fix_invoice_table.py
- Fixes invoice-related tables (发票后补、发票补录)
- Merges table cells using colspan
- Preserves button elements and styling

#### check_quality.py
- Checks heading structure completeness
- Validates table, list, link counts
- Scores document quality (0-100)
- Reports issues and warnings

## Notes

- Output preserves document structure: headings, tables, lists, links
- First run caches dependencies; subsequent runs are faster
- For complex PDFs with poor extraction, use `-d` with Azure Document Intelligence
- Use `--keep-data-uris` to embed images as base64 in Markdown
- Run post-processing scripts to optimize table formatting and heading numbers
