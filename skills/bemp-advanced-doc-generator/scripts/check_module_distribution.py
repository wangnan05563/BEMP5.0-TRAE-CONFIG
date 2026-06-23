"""检查模块分配情况"""
from docx import Document
from docx.oxml.ns import qn

v_new_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\机构管理和管理员管理功能优化-详细设计文档-20260617.docx"
doc = Document(v_new_path)

print("=" * 70)
print("模块分配检查")
print("=" * 70)

body = doc.element.body
current_h1 = None
h1_contents = {}

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
        
        # H1 标题
        if style_name == '1' and text:
            current_h1 = text
            if current_h1 not in h1_contents:
                h1_contents[current_h1] = {'h2_count': 0, 'table_count': 0, 'para_count': 0}
            print(f"\n[H1] {text}")
        
        # H2 标题
        elif style_name == '2' and current_h1 and text:
            h1_contents[current_h1]['h2_count'] += 1
            print(f"  [H2] {text}")
        
        # 普通段落
        elif current_h1 and text:
            h1_contents[current_h1]['para_count'] += 1
    
    elif tag == 'tbl' and current_h1:
        h1_contents[current_h1]['table_count'] += 1
        rows = elem.findall(qn('w:tr'))
        first_row = []
        if rows:
            for cell in rows[0].findall(qn('w:tc')):
                cell_text = ''.join(t.text or '' for t in cell.findall('.//' + qn('w:t'))).strip()
                first_row.append(cell_text[:20])
        print(f"  [表格] {len(rows)}行, 首行={first_row}")

print("\n" + "=" * 70)
print("统计汇总")
print("=" * 70)

for h1, stats in h1_contents.items():
    if '模块' in h1 and '设计说明' in h1:
        print(f"\n{h1}:")
        print(f"  H2子章节: {stats['h2_count']}")
        print(f"  表格: {stats['table_count']}")
        print(f"  段落: {stats['para_count']}")
