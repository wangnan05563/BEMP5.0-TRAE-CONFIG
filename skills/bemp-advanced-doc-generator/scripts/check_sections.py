"""检查特定section的content结构"""
import json
import paths

with open(str(paths.OUTPUT_DIR / '_design-data-20260603.json'), 'r', encoding='utf-8') as f:
    data = json.load(f)

chapters = data.get('chapters', [])
chapter_map = {}
for ch in chapters:
    ch_title = ch.get('title', '')
    chapter_map[ch_title] = ch
    if ch.get('sections'):
        for sec in ch['sections']:
            sec_title = sec.get('title', '')
            chapter_map[sec_title] = sec

# 检查1.3范围说明
print("=== 1.3 范围说明 ===")
sec = chapter_map.get('1.3 范围说明', {})
print(json.dumps(sec, ensure_ascii=False, indent=2)[:500])

# 检查4.2数据结构定义
print("\n=== 4.2 数据结构定义 ===")
sec = chapter_map.get('4.2 数据结构定义', {})
content = sec.get('content', {})
print(f"has description: {bool(content.get('description'))}")
print(f"has headers: {bool(content.get('headers'))}")
print(f"has rows: {bool(content.get('rows'))}")
print(f"rows count: {len(content.get('rows', []))}")

# 检查glossary
print("\n=== appendix.glossary ===")
appendix = data.get('appendix', {})
glossary = appendix.get('glossary', [])
print(f"glossary count: {len(glossary)}")
for g in glossary:
    print(f"  {g}")
