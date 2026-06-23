"""检查模板中模块2的详细结构"""
from docx import Document
from docx.oxml.ns import qn

template_path = r"d:\code\QJ\BEMP5.0DEV\docs\07【模板】详细设计说明书.docx"
doc = Document(template_path)

print("=" * 70)
print("模板中模块2设计说明章节详细检查")
print("=" * 70)

body = doc.element.body
in_module2 = False
module2_content = []

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
        
        # 检查是否进入模块2设计说明
        if style_name == '1' and '模块2' in text and '设计说明' in text:
            in_module2 = True
            print(f"\n>>> 找到模块2设计说明: {text}")
            print(f"    样式: {style_name}")
            continue
        
        # 检查是否离开模块2（遇到其他 H1）
        if style_name == '1' and in_module2:
            print(f"\n>>> 离开模块2设计说明，遇到: {text}")
            in_module2 = False
            continue
        
        # 记录模块2下的内容
        if in_module2:
            module2_content.append({
                'type': 'paragraph',
                'style': style_name,
                'text': text[:100] if text else '(空)'
            })
            if style_name in ['1', '2', '3', 'Heading1', 'Heading2', 'Heading3']:
                print(f"  [{style_name}] {text}")
            elif text:
                print(f"  [段落] {text[:80]}")
    
    elif tag == 'tbl' and in_module2:
        rows = elem.findall(qn('w:tr'))
        row_count = len(rows)
        module2_content.append({
            'type': 'table',
            'rows': row_count
        })
        print(f"  [表格] {row_count}行")

print("\n" + "=" * 70)
print(f"模块2内容统计")
print("=" * 70)
print(f"总元素数: {len(module2_content)}")
print(f"段落数: {sum(1 for item in module2_content if item['type'] == 'paragraph')}")
print(f"表格数: {sum(1 for item in module2_content if item['type'] == 'table')}")

if len(module2_content) == 0:
    print("\n❌ 模块2在模板中完全为空！")
else:
    print("\n✅ 模块2在模板中有内容")
