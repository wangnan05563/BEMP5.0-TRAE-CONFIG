"""检查 design_data JSON 的 chapters 和 businessSubmodules"""
import json
import os

json_path = r"d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\output\机构管理和管理员管理功能优化_design_data.json"

if os.path.exists(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("=" * 70)
    print("design_data 关键字段检查")
    print("=" * 70)
    
    # chapters
    chapters = data.get('chapters', [])
    print(f"\nchapters: {len(chapters)} 个")
    for i, ch in enumerate(chapters):
        title = ch.get('title', '')
        secs = ch.get('sections', [])
        print(f"  [{i}] {title} | sections={len(secs)}")
    
    # businessSubmodules
    subs = data.get('businessSubmodules', [])
    print(f"\nbusinessSubmodules: {len(subs)} 个")
    for i, sub in enumerate(subs):
        name = sub.get('name', '') if isinstance(sub, dict) else str(sub)
        print(f"  [{i}] {name}")
    
    # _preserve flag
    preserve = data.get('_preserve', False)
    print(f"\n_preserve flag: {preserve}")
    
    # 检查 _PRESERVE_MODE 条件
    preserve_mode = preserve or (len(chapters) == 0)
    print(f"\n_PRESERVE_MODE would be: {preserve_mode}")
    print(f"  - _preserve={preserve}")
    print(f"  - len(chapters)==0: {len(chapters) == 0}")
    
else:
    print(f"文件不存在: {json_path}")
    # 查找可能的 JSON 文件
    output_dir = os.path.dirname(json_path)
    for f in os.listdir(output_dir):
        if f.endswith('.json'):
            print(f"  找到: {f}")
