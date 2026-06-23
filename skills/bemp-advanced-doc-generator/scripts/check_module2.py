"""详细检查模块2设计说明章节的内容"""
from docx import Document
from docx.oxml.ns import qn

v_new_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\机构管理和管理员管理功能优化-详细设计文档-20260617.docx"
doc = Document(v_new_path)

print("=" * 70)
print("模块2设计说明章节详细检查")
print("=" * 70)

body = doc.element.body
in_module2 = False
element_count = 0

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
        
        # 检查是否进入"模块2设计说明"
        if style_name == '1' and '模块2' in text:
            in_module2 = True
            print(f"\n>>> 进入模块2设计说明: {text}")
            continue
        
        # 检查是否离开（遇到其他 H1）
        if style_name == '1' and in_module2:
            print(f"\n<<< 离开模块2设计说明，遇到: {text}")
            in_module2 = False
            break
        
        # 打印模块2下的所有内容
        if in_module2:
            element_count += 1
            if style_name == '2':
                print(f"  [H2] {text}")
            elif style_name == '3':
                print(f"    [H3] {text}")
            elif text:
                print(f"    [段落] {text[:100]}")
    
    elif tag == 'tbl' and in_module2:
        rows = elem.findall(qn('w:tr'))
        row_count = len(rows)
        
        # 提取首行内容
        first_row_cells = []
        if rows:
            for cell in rows[0].findall(qn('w:tc')):
                cell_text = ''.join(t.text or '' for t in cell.findall('.//' + qn('w:t'))).strip()
                first_row_cells.append(cell_text[:30])
        
        print(f"    [表格] {row_count}行, 首行={first_row_cells}")

print(f"\n总共检查了 {element_count} 个元素")
