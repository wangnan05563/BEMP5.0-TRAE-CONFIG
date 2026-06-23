"""检查所有模块设计说明章节的内容"""
from docx import Document
from docx.oxml.ns import qn

v_new_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\机构管理和管理员管理功能优化-详细设计文档-20260617.docx"
doc = Document(v_new_path)

print("=" * 70)
print("所有模块设计说明章节检查")
print("=" * 70)

body = doc.element.body
current_module = None
module_contents = {}

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
        
        # 检查是否进入模块设计说明章节
        if style_name == '1' and '模块' in text and '设计说明' in text:
            current_module = text
            if current_module not in module_contents:
                module_contents[current_module] = {'h2_count': 0, 'table_count': 0, 'para_count': 0}
            print(f"\n>>> {current_module}")
            continue
        
        # 检查是否离开当前模块（遇到其他 H1）
        if style_name == '1' and current_module:
            current_module = None
            continue
        
        # 统计当前模块下的内容
        if current_module:
            if style_name == '2':
                module_contents[current_module]['h2_count'] += 1
                print(f"  [H2] {text}")
            elif text:
                module_contents[current_module]['para_count'] += 1
    
    elif tag == 'tbl' and current_module:
        rows = elem.findall(qn('w:tr'))
        row_count = len(rows)
        module_contents[current_module]['table_count'] += 1
        
        # 提取首行内容
        first_row_cells = []
        if rows:
            for cell in rows[0].findall(qn('w:tc')):
                cell_text = ''.join(t.text or '' for t in cell.findall('.//' + qn('w:t'))).strip()
                first_row_cells.append(cell_text[:30])
        
        print(f"  [表格] {row_count}行, 首行={first_row_cells}")

print("\n" + "=" * 70)
print("汇总统计")
print("=" * 70)

for module, stats in module_contents.items():
    print(f"\n{module}:")
    print(f"  H2子章节: {stats['h2_count']}")
    print(f"  表格: {stats['table_count']}")
    print(f"  段落: {stats['para_count']}")
    
    if stats['h2_count'] == 0 and stats['table_count'] == 0:
        print(f"  ❌ 空章节")
    elif stats['h2_count'] >= 2:
        print(f"  ✅ 有子章节分隔")
    else:
        print(f"  ⚠️ 需要人工检查")
