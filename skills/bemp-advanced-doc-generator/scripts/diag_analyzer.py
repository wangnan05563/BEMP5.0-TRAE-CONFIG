"""诊断：检查 requirement-analyzer.js 输出的 design_data"""
import subprocess
import json
import os

# 运行 requirement-analyzer.js 生成 design_data
prd_path = r"d:\code\QJ\BEMP5.0DEV\docs\prd\02-机构管理和管理员管理功能优化.md"
script_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\scripts\requirement-analyzer.js"

result = subprocess.run(
    ['node', script_path, prd_path, '--design'],
    capture_output=True, text=True, encoding='utf-8'
)

if result.returncode != 0:
    print(f"[ERROR] node 执行失败: {result.stderr[:500]}")
else:
    try:
        data = json.loads(result.stdout)
        print(f"[OK] design_data 解析成功")
        
        # businessSubmodules
        subs = data.get('businessSubmodules', [])
        print(f"\nbusinessSubmodules: {len(subs)} 个")
        for i, s in enumerate(subs):
            name = s.get('name', '') if isinstance(s, dict) else str(s)
            desc = (s.get('description', '') if isinstance(s, dict) else '')[:60]
            print(f"  [{i}] {name} | {desc}")
        
        # chapters
        chapters = data.get('chapters', [])
        print(f"\nchapters: {len(chapters)} 个")
        for i, ch in enumerate(chapters):
            title = ch.get('title', '')
            secs = ch.get('sections', [])
            content = ch.get('content', {})
            has_rows = bool(content.get('rows')) if isinstance(content, dict) else False
            print(f"  [{i}] {title} | sections={len(secs)} | content_rows={has_rows}")
            for j, sec in enumerate(secs[:3]):
                sec_title = sec.get('title', '')
                sec_content = sec.get('content', {})
                sec_rows = bool(sec_content.get('rows')) if isinstance(sec_content, dict) else False
                print(f"    [{j}] {sec_title} | rows={sec_rows}")
        
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON 解析失败: {e}")
        print(f"stdout 前200字符: {result.stdout[:200]}")
