"""检查chapter_map的键"""
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

print("chapter_map keys:")
for key in sorted(chapter_map.keys()):
    print(f"  '{key}'")
