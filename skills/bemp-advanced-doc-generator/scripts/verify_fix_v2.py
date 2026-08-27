from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent

from pathlib import Path
"""精确验证修复效果：按文档顺序遍历段落和表格"""
from docx import Document
from docx.oxml.ns import qn

v_new_path = str(SKILL_ROOT / "output" / "机构管理和管理员管理功能优化-详细设计文档-20260617.docx")
doc = Document(v_new_path)

print("=" * 70)
print("修复验证报告（精确版）")
print("=" * 70)

# 按文档 body 元素顺序遍历（段落+表格混合）
body = doc.element.body
last_heading = ""
last_heading_style = ""

# 问题1：检查"组件内部的模块列表及说明"章节
print("\n【问题1】'组件内部的模块列表及说明'章节内容")
in_component_section = False
comp_items_printed = 0

# 问题2：检查"模块2设计说明"下的结构
print("\n【问题2】'模块2设计说明'下的子章节结构")
in_module2 = False
module2_h2_list = []
module2_tables = []

for elem in body:
    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
    
    if tag == 'p':
        # 段落
        style_elem = elem.find(qn('w:pPr'))
        style_name = ''
        if style_elem is not None:
            pstyle = style_elem.find(qn('w:pStyle'))
            if pstyle is not None:
                style_name = pstyle.get(qn('w:val'), '')
        
        text = ''.join(t.text or '' for t in elem.findall('.//' + qn('w:t'))).strip()
        
        if 'Heading' in style_name or style_name.startswith('heading'):
            last_heading = text
            last_heading_style = style_name
            
            # 检查是否进入"组件内部的模块列表及说明"
            if '组件' in text and '模块列表' in text:
                in_component_section = True
                print(f"  找到标题: {text} (style={style_name})")
                continue
            
            # 检查是否进入"模块2设计说明"
            if '模块2' in text and ('Heading1' in style_name or 'heading1' in style_name or 'Heading 1' in style_name):
                in_module2 = True
                print(f"  进入模块2设计说明")
                continue
            
            # 检查是否离开当前区域
            if in_component_section and ('Heading1' in style_name or 'heading1' in style_name or 'Heading 1' in style_name):
                in_component_section = False
                if comp_items_printed == 0:
                    print("  [!] 该章节下没有表格内容！")
                continue
            
            if in_module2 and ('Heading1' in style_name or 'heading1' in style_name or 'Heading 1' in style_name):
                in_module2 = False
                print(f"  离开模块2设计说明")
                continue
            
            # 记录模块2下的H2
            if in_module2 and ('Heading2' in style_name or 'heading2' in style_name or 'Heading 2' in style_name):
                module2_h2_list.append(text)
                print(f"    H2: {text}")
        
        elif in_component_section and text:
            comp_items_printed += 1
            if comp_items_printed <= 5:
                print(f"    段落: {text[:100]}")
    
    elif tag == 'tbl':
        # 表格
        rows = elem.findall(qn('w:tr'))
        row_count = len(rows)
        
        # 提取首行内容
        first_row_cells = []
        if rows:
            for cell in rows[0].findall(qn('w:tc')):
                cell_text = ''.join(t.text or '' for t in cell.findall('.//' + qn('w:t'))).strip()
                first_row_cells.append(cell_text[:30])
        
        if in_component_section:
            comp_items_printed += 1
            print(f"    表格({row_count}行): 首行={first_row_cells}")
            # 打印前几行数据
            for r_idx, row in enumerate(rows[1:6], 2):
                cells = []
                for cell in row.findall(qn('w:tc')):
                    cell_text = ''.join(t.text or '' for t in cell.findall('.//' + qn('w:t'))).strip()
                    cells.append(cell_text[:30])
                print(f"      行{r_idx}: {cells}")
        
        if in_module2:
            module2_tables.append({
                'heading': last_heading,
                'rows': row_count,
                'first_row': first_row_cells
            })
            print(f"    表格({row_count}行) 前导H2: {last_heading}")
            print(f"      首行: {first_row_cells}")

# 汇总
print("\n" + "=" * 70)
print("验证汇总")
print("=" * 70)
print(f"\n【问题1】组件内部的模块列表及说明:")
print(f"  内容条目数: {comp_items_printed}")
if comp_items_printed > 0:
    print(f"  ✅ 已修复：章节包含模块列表表格")
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
else:
    print(f"  ❌ 未修复：缺少H2子章节分隔")
