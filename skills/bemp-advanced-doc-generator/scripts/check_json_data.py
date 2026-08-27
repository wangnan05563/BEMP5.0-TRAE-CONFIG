from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent

from pathlib import Path
"""检查 design_data JSON 的 businessSubmodules 和 chapters 结构"""
import json
import os

json_path = str(SKILL_ROOT / "output" / "机构管理和管理员管理功能优化_design_data.json")

if os.path.exists(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("=" * 70)
    print("design_data 关键字段检查")
    print("=" * 70)
    
    # businessSubmodules
    subs = data.get('businessSubmodules', [])
    print(f"\nbusinessSubmodules: {len(subs)} 个")
    for i, sub in enumerate(subs):
        name = sub.get('name', '') if isinstance(sub, dict) else str(sub)
        desc = sub.get('description', '')[:50] if isinstance(sub, dict) else ''
        print(f"  [{i}] {name} | {desc}")
    
    # chapters
    chapters = data.get('chapters', [])
    print(f"\nchapters: {len(chapters)} 个")
    for i, ch in enumerate(chapters):
        title = ch.get('title', '')
        secs = ch.get('sections', [])
        print(f"  [{i}] {title} | sections={len(secs)}")
        for j, sec in enumerate(secs[:3]):
            sec_title = sec.get('title', '')
            has_content = bool(sec.get('content', {}).get('rows'))
            print(f"    [{j}] {sec_title} | has_table={has_content}")
    
    # profile
    profile = data.get('profile', {})
    print(f"\nprofile keys: {list(profile.keys())[:10]}")
    
else:
    print(f"文件不存在: {json_path}")
    # 查找可能的 JSON 文件
    output_dir = os.path.dirname(json_path)
    for f in os.listdir(output_dir):
        if f.endswith('.json'):
            print(f"  找到: {f}")
