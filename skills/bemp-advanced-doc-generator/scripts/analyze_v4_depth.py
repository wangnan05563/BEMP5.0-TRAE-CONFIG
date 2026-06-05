"""分析v4文档的内容深度和来源"""
import paths
from docx import Document
import sys

v4_path = str(paths.BANK_REQUIREMENTS_DIR / '承兑行额度管理-详细设计说明书-v4.docx')
doc = Document(v4_path)

# 分析每个Heading 1下的Heading 2和Normal段落
output = []
output.append('='*80)
output.append('v4文档：每个H1下的详细内容')
output.append('='*80)

current_h1 = None
current_h2 = None
for p in doc.paragraphs:
    if p.style and p.style.name == 'Heading 1':
        current_h1 = p.text.strip()
        current_h2 = None
        output.append(f'\n## H1: {current_h1}')
    elif p.style and p.style.name == 'Heading 2':
        current_h2 = p.text.strip()
        output.append(f'  ### H2: {current_h2}')
    elif p.style and p.style.name == 'Normal' and current_h2:
        text = p.text.strip()
        if text and len(text) > 5:
            output.append(f'    - {text[:120]}')

with open(str(paths.OUTPUT_DIR / 'v4_depth.txt'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))
print('Done')
