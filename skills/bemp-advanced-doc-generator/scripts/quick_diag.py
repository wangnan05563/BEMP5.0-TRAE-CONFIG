"""快速诊断：检查最新生成的文档和日志"""
import os
import json

# 1. 检查最新 JSON 输出
json_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\机构管理和管理员管理功能优化_design_data.json"
if os.path.exists(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    subs = data.get('businessSubmodules', [])
    chapters = data.get('chapters', [])
    print(f"[JSON] businessSubmodules: {len(subs)} 个")
    for i, s in enumerate(subs):
        print(f"  [{i}] {s.get('name','') if isinstance(s,dict) else s}")
    print(f"[JSON] chapters: {len(chapters)} 个")
    for i, c in enumerate(chapters):
        secs = c.get('sections', [])
        print(f"  [{i}] {c.get('title','')} | sections={len(secs)}")
else:
    print(f"[JSON] 文件不存在: {json_path}")

# 2. 检查 _fn_trace.log 最后 10 行
trace_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\scripts\_fn_trace.log"
if os.path.exists(trace_path):
    with open(trace_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"\n[_fn_trace.log] 最后10行:")
    for line in lines[-10:]:
        print(f"  {line.rstrip()}")

# 3. 检查 _insert_section.log 最后 10 行
sec_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\scripts\_insert_section.log"
if os.path.exists(sec_path):
    with open(sec_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"\n[_insert_section.log] 最后10行:")
    for line in lines[-10:]:
        print(f"  {line.rstrip()}")
