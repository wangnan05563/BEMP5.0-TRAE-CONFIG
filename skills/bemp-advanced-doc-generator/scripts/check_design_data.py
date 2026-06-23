"""检查 design_data.json 中的 businessSubmodules 和 chapters 结构"""
import json
import os

data_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\_design-data-20260617.json"
if not os.path.exists(data_path):
    print(f"文件不存在: {data_path}")
    exit(1)

with open(data_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 70)
print("1. businessSubmodules 字段")
print("=" * 70)
subs = data.get('businessSubmodules') or []
print(f"  数量: {len(subs)}")
for i, s in enumerate(subs):
    if isinstance(s, dict):
        print(f"  [{i}] name={s.get('name', '')[:30]!r}, desc={str(s.get('description', ''))[:50]!r}")
    else:
        print(f"  [{i}] {str(s)[:50]!r}")

print()
print("=" * 70)
print("2. chapters 分类")
print("=" * 70)
chapters = data.get('chapters') or []
print(f"  总章节数: {len(chapters)}")
for ch in chapters:
    ch_type = ch.get('type', '')
    ch_title = ch.get('title', '')
    sections = ch.get('sections') or []
    print(f"  [{ch_type}] {ch_title} (sections={len(sections)})")
    for sec in sections[:3]:
        sec_title = sec.get('title', '')
        sec_content = sec.get('content', {})
        has_table = bool(sec_content and sec_content.get('headers') and sec_content.get('rows'))
        print(f"    - {sec_title[:40]!r} (table={has_table})")
    if len(sections) > 3:
        print(f"    ... 还有 {len(sections) - 3} 个 sections")

print()
print("=" * 70)
print("3. business_chs（业务模块章节）")
print("=" * 70)
# 检查是否有 business_chs 字段
business_chs = data.get('business_chs') or []
print(f"  数量: {len(business_chs)}")
for ch in business_chs:
    print(f"  - {ch.get('title', '')}")
