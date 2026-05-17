---
name: "bemp-advanced-doc-generator"
description: "自动生成BEMP详细设计文档、测试用例、测试报告，支持Word/Markdown/Excel格式输出。"
whenToUse: "用户需要创建/生成/编制/撰写/md转 详细设计、测试用例、测试报告或Excel格式SIT测试用例、思维导图时调用。"
triggers: "生成/交付/编制/撰写 md/word/excel 详细设计/详细设计/测试用例/思维导图/项目文档"
---

# BEMP 高级文档生成器 v5.0

## 能力

- 详细设计文档（Word/MD）
- 测试用例文档（Word/MD）
- 测试报告文档（Word/MD）
- Excel SIT测试用例（基于模板自动解析列映射）
- 需求文档智能分析 → 自动提取测试点生成用例
- 可视化流程图/思维导图（ProcessOn MCP + 本地HTML备用）

## 触发关键词

"生成详细设计文档"、"生成测试用例"、"生成测试报告"、"生成Excel测试用例"、"SIT测试用例"、"需求分析生成用例"

## 执行命令

```bash
cd .trae/skills/bemp-advanced-doc-generator

# Excel SIT测试用例（最常用，从需求文档自动分析生成）
node cli.js -t testcase -f excel -r "需求文件路径.md" -m "模块名称"

# Excel SIT测试用例（JSON结构化输出，含自动验证结果）
node cli.js -t testcase -f excel -r "需求文件路径.md" -m "模块名称" --json

# 详细设计文档（Word）
node cli.js -t design -m "模块名称"

# 详细设计文档（Markdown）
node cli.js -t design -f md -m "模块名称"

# 测试报告
node cli.js -t testreport -m "模块名称"

# 带可视化
node cli.js -t design -m "模块名称" -v
```

## 参数说明

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| --type | -t | 文档类型: design/testcase/testreport | design |
| --module | -m | 模块名称 | 必填 |
| --format | -f | 输出格式: docx/md/excel | docx |
| --requirement | -r | 需求文档路径（Markdown格式） | - |
| --output | -o | 输出文件路径 | 自动生成 |
| --json | | JSON结构化输出（含自动验证结果） | false |
| --visualization | -v | 生成可视化文档 | false |
| --template | | Excel模板文件路径 | 默认模板 |
| --config | -c | 配置文件路径 | 默认配置 |

## 输出路径

```
output/{模块名称}-{文档类型}-{日期}.xlsx/.docx/.md
```

## 注意事项

- Excel测试用例生成会自动验证列对齐，`--json` 模式输出含验证结果
- 需求文档须为 Markdown 格式，分析器自动提取多级标题、业务规则和校验规则
- 详细架构、模块说明、错误码定义见 README.md
