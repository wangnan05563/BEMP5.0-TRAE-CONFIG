"""打印解析结果摘要"""
import json
import paths
d = json.load(open(str(paths.requirement_parsed_path()), encoding='utf-8-sig'))
print(f'moduleName: {d.get("moduleName")}')
print(f'globalRules: {len(d.get("globalRules", []))}条')
print(f'\nbusinessModules: {len(d["businessModules"])}个')
for m in d['businessModules']:
    print(f'\n【{m["name"]}】(子节数={len(m.get("subsections", []))})')
    for s in m.get('subsections', []):
        print(f'  - {s["name"]}: rules={len(s.get("rules", []))}, fields={len(s.get("fields", []))}')
print()
print('---globalRules前5:')
for r in d.get('globalRules', [])[:5]:
    print(f'  + {r[:60]}')
