"""精确验证修复效果：使用正确的样式名称"""
from docx import Document
from docx.oxml.ns import qn

v_new_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\机构管理和管理员管理功能优化-详细设计文档-20260617.docx"
doc = Document(v_new_path)

print("=" * 70)
print("修复验证报告（精确版）")
print("=" * 70)

body = doc.element.body

# 问题1：检查"组件内部的模块列表及说明"章节
print("\n【问题1】'组件内部的模块列表及说明'章节内容")
in_component_section = False
comp_tables = []

# 问题2：检查"模块2设计说明"下的结构
print("\n【问题2】'模块2设计说明'下的子章节结构")
in_module2 = False
module2_h2_list = []
module2_tables = []

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
        
        # 检查是否进入"组件内部的模块列表及说明"（style='1' 表示 H1）
        if style_name == '1' and '组件' in text and '模块列表' in text:
            in_component_section = True
            print(f"  找到标题: {text}")
            continue
        
        # 检查是否进入"模块2设计说明"（style='1' 表示 H1）
        if style_name == '1' and '模块2' in text:
            in_module2 = True
            in_component_section = False  # 离开组件列表章节
            print(f"  进入模块2设计说明")
            continue
        
        # 检查是否离开当前区域（遇到其他 H1）
        if style_name == '1' and (in_component_section or in_module2):
            if in_component_section:
                in_component_section = False
                print(f"  离开组件列表章节")
            if in_module2:
                in_module2 = False
                print(f"  离开模块2设计说明")
            continue
        
        # 记录模块2下的H2（style='2' 表示 H2）
        if in_module2 and style_name == '2':
            module2_h2_list.append(text)
            print(f"    H2: {text}")
    
    elif tag == 'tbl':
        rows = elem.findall(qn('w:tr'))
        row_count = len(rows)
        
        # 提取首行内容
        first_row_cells = []
        if rows:
            for cell in rows[0].findall(qn('w:tc')):
                cell_text = ''.join(t.text or '' for t in cell.findall('.//' + qn('w:t'))).strip()
                first_row_cells.append(cell_text[:30])
        
        if in_component_section:
            comp_tables.append({
                'rows': row_count,
                'first_row': first_row_cells
            })
            print(f"    表格({row_count}行): 首行={first_row_cells}")
            # 打印前几行数据
            for r_idx, row in enumerate(rows[1:8], 2):
                cells = []
                for cell in row.findall(qn('w:tc')):
                    cell_text = ''.join(t.text or '' for t in cell.findall('.//' + qn('w:t'))).strip()
                    cells.append(cell_text[:30])
                print(f"      行{r_idx}: {cells}")
        
        if in_module2:
            module2_tables.append({
                'rows': row_count,
                'first_row': first_row_cells
            })
            print(f"    表格({row_count}行)")
            print(f"      首行: {first_row_cells}")

# 汇总
print("\n" + "=" * 70)
print("验证汇总")
print("=" * 70)

print(f"\n【问题1】组件内部的模块列表及说明:")
print(f"  表格数: {len(comp_tables)}")
if comp_tables:
    for i, tbl in enumerate(comp_tables, 1):
        print(f"  表格{i}: {tbl['rows']}行, 首行={tbl['first_row']}")
    # 检查是否包含正确的模块名称
    all_text = str(comp_tables)
    if '批量导入机构' in all_text or '批量复制角色' in all_text:
        print(f"  ✅ 已修复：章节包含正确的业务模块列表")
    else:
        print(f"  ⚠️ 部分修复：有表格但内容可能不正确")
else:
    print(f"  ❌ 未修复：章节内容为空")

print(f"\n【问题2】模块2设计说明下的子章节:")
print(f"  H2子章节数: {len(module2_h2_list)}")
print(f"  表格数: {len(module2_tables)}")
if module2_h2_list:
    print(f"  H2列表:")
    for h in module2_h2_list:
        print(f"    - {h}")
if len(module2_h2_list) >= 2:
    print(f"  ✅ 已修复：多个表格被H2子章节分隔")
elif len(module2_tables) >= 2 and len(module2_h2_list) == 0:
    print(f"  ❌ 未修复：多个表格挤在一起，缺少H2子章节分隔")
else:
    print(f"  ⚠️ 需要人工检查")
