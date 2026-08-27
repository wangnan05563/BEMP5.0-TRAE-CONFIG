from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent

from pathlib import Path
# -*- coding: utf-8 -*-
"""诊断模块2为什么是空的 - 追踪主循环处理流程"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from docx import Document
from docx.oxml.ns import qn

doc_path = str(SKILL_ROOT / "output" / "机构管理和管理员管理功能优化-详细设计文档-20260617.docx")
doc = Document(doc_path)

print("=" * 70)
print("诊断：模板中模块设计说明 H1 列表")
print("=" * 70)

# 检查文档中所有 H1
all_h1s = []
for i, para in enumerate(doc.paragraphs):
    style_val = ''
    pPr = para._element.find(qn('w:pPr'))
    if pPr is not None:
        pStyle = pPr.find(qn('w:pStyle'))
        if pStyle is not None:
            style_val = pStyle.get(qn('w:val'), '')
    
    if style_val in ['1', 'Heading1', 'heading1']:
        text = para.text.strip()
        all_h1s.append((i, text, style_val))
        is_module = '模块' in text and '设计说明' in text
        marker = ' <<<<' if is_module else ''
        print(f"  [{i}] style={style_val}: {text}{marker}")

print(f"\n总 H1 数: {len(all_h1s)}")
module_h1s = [(i, t) for i, t, s in all_h1s if '模块' in t and '设计说明' in t]
print(f"模块设计说明 H1 数: {len(module_h1s)}")

print("\n" + "=" * 70)
print("诊断：每个模块 H1 下的内容（XML级别）")
print("=" * 70)

body = doc.element.body
for mod_idx, (para_idx, mod_title) in enumerate(module_h1s):
    print(f"\n--- {mod_title} (para[{para_idx}]) ---")
    
    # 找到对应的 XML 元素
    h1_elem = None
    elem_idx = 0
    for elem in body:
        if elem.tag.endswith('}p'):
            if elem_idx == para_idx:
                h1_elem = elem
                break
            elem_idx += 1
    
    if h1_elem is None:
        print("  ERROR: 找不到对应的 XML 元素")
        continue
    
    # 找下一个 H1
    next_h1 = None
    sib = h1_elem.getnext()
    while sib is not None:
        if sib.tag.endswith('}p'):
            pPr = sib.find(qn('w:pPr'))
            if pPr is not None:
                pStyle = pPr.find(qn('w:pStyle'))
                if pStyle is not None:
                    sv = pStyle.get(qn('w:val'), '')
                    if sv in ['1', 'Heading1', 'heading1']:
                        next_h1 = sib
                        break
        sib = sib.getnext()
    
    # 遍历 H1 下的所有元素
    h2_count = 0
    table_count = 0
    para_count = 0
    sib = h1_elem.getnext()
    while sib is not None and sib is not next_h1:
        if sib.tag.endswith('}p'):
            pPr = sib.find(qn('w:pPr'))
            style_val = ''
            if pPr is not None:
                pStyle = pPr.find(qn('w:pStyle'))
                if pStyle is not None:
                    style_val = pStyle.get(qn('w:val'), '')
            text = ''.join(t.text or '' for t in sib.findall('.//' + qn('w:t'))).strip()
            if style_val in ['2', 'Heading2', 'heading2']:
                h2_count += 1
                print(f"  H2: {text[:60]}")
            elif text:
                para_count += 1
        elif sib.tag.endswith('}tbl'):
            table_count += 1
            rows = sib.findall(qn('w:tr'))
            print(f"  TABLE: {len(rows)} rows")
        sib = sib.getnext()
    
    print(f"  统计: H2={h2_count}, 表格={table_count}, 段落={para_count}")
    if h2_count == 0 and table_count == 0:
        print(f"  >>> 空章节！")
