"""详细分析7.1问题"""
import paths
from docx import Document

path = str(paths.detail_design_template())
doc = Document(path)

# 打印所有"7."H2
for i, p in enumerate(doc.paragraphs):
    if p.style and p.style.name == 'Heading 2' and (p.text.strip().startswith('7.') or '7.1' in p.text):
        print(f"[{i:3d}] {p.style.name}: '{p.text.strip()}'")
