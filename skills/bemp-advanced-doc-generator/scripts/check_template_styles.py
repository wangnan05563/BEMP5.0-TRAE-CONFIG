"""检查模板标题的XML样式值"""
import paths
from docx import Document
from lxml import etree

doc = Document(str(paths.detail_design_template()))

nsmap = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

for i, p in enumerate(doc.paragraphs):
    if p.style and p.style.name.startswith('Heading'):
        # 获取XML中的pStyle值
        pPr = p._element.find('.//w:pPr/w:pStyle', nsmap)
        style_val = pPr.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if pPr is not None else 'N/A'
        print(f'[{i}] style.name={p.style.name}, pStyle.val={style_val}, text={p.text.strip()[:40]}')
