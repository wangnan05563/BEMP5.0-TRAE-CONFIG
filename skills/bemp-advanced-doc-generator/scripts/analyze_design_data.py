from pathlib import Path
SKILL_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent

from pathlib import Path
"""深入分析：检查 design_data 中的 businessSubmodules 和 chapters 结构"""
import json
import os

# 查找最新的 design_data JSON 文件
output_dir = str(SKILL_ROOT / "output")
design_data_files = [f for f in os.listdir(output_dir) if f.startswith('_design-data') and f.endswith('.json')]

if design_data_files:
    latest_file = max(design_data_files, key=lambda x: os.path.getmtime(os.path.join(output_dir, x)))
    file_path = os.path.join(output_dir, latest_file)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("=" * 60)
    print(f"Design Data 分析: {latest_file}")
    print("=" * 60)
    
    # 检查 businessSubmodules
    print("\n【businessSubmodules】")
    bsm = data.get('businessSubmodules', [])
    if bsm:
        print(f"  数量: {len(bsm)}")
        for i, sub in enumerate(bsm[:5]):
            if isinstance(sub, dict):
                name = sub.get('name') or sub.get('title', '')
                desc = sub.get('description', '')
                print(f"  [{i}] {name}: {desc[:60]}")
    else:
        print("  空（这是问题1的根因）")
    
    # 检查 chapters 结构
    print("\n【chapters 结构】")
    chapters = data.get('chapters', [])
    print(f"  数量: {len(chapters)}")
    for i, ch in enumerate(chapters):
        title = ch.get('title', '')
        sections = ch.get('sections', [])
        print(f"  [{i}] {title} (sections: {len(sections)})")
        for j, sec in enumerate(sections[:3]):
            sec_title = sec.get('title', '')
            sec_content = sec.get('content', {})
            has_table = bool(sec_content.get('headers') and sec_content.get('rows'))
            print(f"      [{j}] {sec_title} (has_table: {has_table})")
    
    # 检查 moduleName
    print(f"\n【moduleName】: {data.get('moduleName', '')}")
    
else:
    print("未找到 design_data JSON 文件")
