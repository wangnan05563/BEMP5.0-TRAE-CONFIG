from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent

from pathlib import Path
"""检查文档中的样式名称"""
from docx import Document
from docx.oxml.ns import qn

v_new_path = str(SKILL_ROOT / "output" / "机构管理和管理员管理功能优化-详细设计文档-20260617.docx")
doc = Document(v_new_path)

print("=" * 70)
print("文档样式检查")
print("=" * 70)

body = doc.element.body
count = 0

for elem in body:
    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
    
    if tag == 'p':
        style_elem = elem.find(qn('w:pPr'))
        style_name = ''
        if style_elem is not None:
            pstyle = style_elem.find(qn('w:pStyle'))
            if pstyle is not None:
                style_name = pstyle.get(qn('w:val'), '')
        
        text = ''.join(t.text or '' for t in elem.findall('.//' + qn('w:t'))).strip()
        
        # 打印前50个段落
        if count < 50:
            print(f"[{count}] style='{style_name}' text='{text[:80]}'")
            count += 1
        
        # 特别关注包含"组件"或"模块2"的段落
        if '组件' in text or '模块2' in text or '模块列表' in text:
            print(f"  >>> 找到关键段落: style='{style_name}' text='{text}'")
    
    elif tag == 'tbl':
        if count < 50:
            rows = elem.findall(qn('w:tr'))
            print(f"[{count}] TABLE rows={len(rows)}")
            count += 1
