# bemp-markdown-converter 反向构建提示词

## 核心功能
文档格式转换技能，使用`uvx markitdown`将PDF、Word(.docx)、PowerPoint(.pptx)、Excel(.xlsx/.xls)、HTML、CSV、JSON、XML、图片(含EXIF/OCR)、音频(含转录)、ZIP归档、YouTube URL、EPub等格式转为Markdown。提供后处理脚本优化输出质量。

## 关键实现逻辑
- 核心工具：`uvx markitdown`（无需安装，uvx自动管理依赖）
- 基本用法：`uvx markitdown input.pdf -o output.md`，支持stdin管道输入
- 高级选项：`--keep-data-uris`保留base64嵌入图片、`-d -e`使用Azure Document Intelligence优化复杂PDF
- 后处理脚本(scripts/目录)：
  - `optimize.py`：一体化优化(推荐)，组合所有后处理步骤
  - `fix_heading_numbers.py`：自动编号标题(1./1.1/1.1.1)
  - `clean_duplicate_numbers.py`：去除重复标题编号
  - `fix_invoice_table.py`：修复发票表格格式(colspan合并)
  - `check_quality.py`：质量检查与评分(0-100)

## 输入输出参数
- 输入：任意支持格式的文件路径或stdin
- 输出：Markdown文件(-o指定)或stdout
- 选项：-o输出文件、-x扩展名提示、-m MIME类型提示、-c字符集、-d Azure DI、-e端点、--keep-data-uris保留图片、--use-plugins启用插件

## 主要业务流程
1. 检测输入文件格式
2. 调用`uvx markitdown`转换为目标Markdown
3. 运行`optimize.py`一体化优化(标题编号/去重/表格修复)
4. 运行`check_quality.py`质量检查评分
5. 输出最终Markdown文件

## 技术特性
- Python后处理脚本，requirements.txt管理依赖
- 质量检查维度：标题结构完整性、表格/列表/链接数量统计、文档质量评分
- 配置文件：scripts/config/quality_rules.json(质量规则)、table_templates.json(表格模板)
- 首次运行缓存依赖，后续更快
