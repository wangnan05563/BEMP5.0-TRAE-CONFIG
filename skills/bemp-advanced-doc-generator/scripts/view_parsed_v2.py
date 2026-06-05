"""查看解析结果摘要 - 直接打印"""
import json
import sys
import io
import paths

# 设置stdout为utf-8避免编码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

d = json.load(open(str(paths.requirement_parsed_path()), encoding='utf-8-sig'))

print(f'moduleName: {d.get("moduleName")}')
print(f'globalRules count: {len(d.get("globalRules", []))}')
print()
print(f'businessModules ({len(d["businessModules"])}个):')
for m in d['businessModules']:
    print(f'  - [{m["name"]}] subsections={len(m.get("subsections", []))}')
    for sub in m.get('subsections', []):
        print(f'      * {sub["name"]}: rules={len(sub.get("rules", []))} fields={len(sub.get("fields", []))}')
print()
print('globalRules:')
for r in d.get('globalRules', []):
    print(f'  - {r[:60]}')
