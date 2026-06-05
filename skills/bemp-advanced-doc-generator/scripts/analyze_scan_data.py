"""分析 scan_data 结构"""
import json
import paths

d = json.load(open(str(paths.scan_data_path()), encoding='utf-8'))
print('=== scan_data 顶层字段 ===')
for k, v in d.items():
    if isinstance(v, list):
        print(f'  {k}: list, len={len(v)}')
    elif isinstance(v, dict):
        print(f'  {k}: dict, keys={list(v.keys())[:5]}')
    else:
        print(f'  {k}: {v}')

print()
print('=== modules 前5 ===')
for m in d.get('modules', [])[:5]:
    print(f'  - {m.get("name", m.get("code", str(m)))} | group={m.get("group")}')

print()
print('=== subsystems 前5 ===')
for s in d.get('subsystems', [])[:5]:
    print(f'  - code={s.get("code", "")} name={s.get("name", "")}')

print()
print('=== interfaces 前5 ===')
for i in d.get('interfaces', [])[:5]:
    print(f'  - {i}')

print()
print('=== externalDeps 前5 ===')
for e in d.get('externalDeps', [])[:5]:
    print(f'  - {e}')
