from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent

from pathlib import Path
"""精确验证：检查模块分配和表格分隔"""
from docx import Document
from docx.oxml.ns import qn

doc_path = str(SKILL_ROOT / "output" / "机构管理和管理员管理功能优化-详细设计文档-20260617.docx")
doc = Document(doc_path)

print("=" * 70)
print("验证报告")
print("=" * 70)

# 遍历所有段落和表格，记录完整结构
body = doc.element.body
current_h1 = None
current_h2 = None
h1_stats = {}  # {h1_text: {'h2s': [], 'tables': []}}

for elem in body:
    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
    
    if tag == 'p':
        # 获取样式
        pPr = elem.find(qn('w:pPr'))
        style_val = ''
        if pPr is not None:
            pStyle = pPr.find(qn('w:pStyle'))
            if pStyle is not None:
                style_val = pStyle.get(qn('w:val'), '')
        
        text = ''.join(t.text or '' for t in elem.findall('.//' + qn('w:t'))).strip()
        
        # 判断是否是 H1
        is_h1 = style_val in ('1', 'Heading1', 'heading1', 'Heading 1')
        is_h2 = style_val in ('2', 'Heading2', 'heading2', 'Heading 2')
        
        if is_h1 and text:
            current_h1 = text
            current_h2 = None
            if current_h1 not in h1_stats:
                h1_stats[current_h1] = {'h2s': [], 'tables': []}
            print(f"\n[H1] {text}")
        
        elif is_h2 and text and current_h1:
            current_h2 = text
            h1_stats[current_h1]['h2s'].append(text)
            print(f"  [H2] {text}")
        
        elif text and current_h1:
            print(f"  [P] {text[:60]}")
    
    elif tag == 'tbl' and current_h1:
        rows = elem.findall(qn('w:tr'))
        row_count = len(rows)
        first_row = []
        if rows:
            for cell in rows[0].findall(qn('w:tc')):
                cell_text = ''.join(t.text or '' for t in cell.findall('.//' + qn('w:t'))).strip()
                first_row.append(cell_text[:25])
        h1_stats[current_h1]['tables'].append({
            'rows': row_count,
            'first_row': first_row,
            'under_h2': current_h2
        })
        print(f"  [TABLE] {row_count}行, 首行={first_row}, 位于H2='{current_h2}'下")

print("\n" + "=" * 70)
print("统计汇总")
print("=" * 70)

for h1, stats in h1_stats.items():
    if '模块' in h1 and '设计说明' in h1:
        print(f"\n{h1}:")
        print(f"  H2子章节: {len(stats['h2s'])}")
        for h2 in stats['h2s']:
            print(f"    - {h2}")
        print(f"  表格: {len(stats['tables'])}")
        for t in stats['tables']:
            print(f"    - {t['rows']}行, 首行={t['first_row']}, H2='{t['under_h2']}'")
    
    if '组件' in h1 and '模块列表' in h1:
        print(f"\n{h1}:")
        print(f"  表格: {len(stats['tables'])}")
        for t in stats['tables']:
            print(f"    - {t['rows']}行, 首行={t['first_row']}")
            # 打印数据行
            for r_idx in range(1, min(t['rows'], 8)):
                print(f"      行{r_idx+1}")
