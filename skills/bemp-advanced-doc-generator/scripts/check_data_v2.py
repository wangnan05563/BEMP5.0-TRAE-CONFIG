from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent

from pathlib import Path
"""检查当前数据状态"""
import json
import os

data_path = str(SKILL_ROOT / "output" / "_design-data-20260617.json")
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
        name = s.get('name', '')
        desc = str(s.get('description', ''))[:50]
        print(f"  [{i}] name={name!r}, desc={desc!r}")

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
    # 检查是否有表格数据
    has_table = False
    for sec in sections[:3]:
        sec_content = sec.get('content', {})
        if sec_content and sec_content.get('headers') and sec_content.get('rows'):
            has_table = True
            break
    if has_table:
        print(f"    ✓ 包含表格数据")
