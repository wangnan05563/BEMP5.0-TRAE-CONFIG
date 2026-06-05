"""直接测试 ER 缓存逻辑"""
import paths
import sys, json, os
sys.path.insert(0, str(paths.SCRIPTS_DIR))
import importlib.util
spec = importlib.util.spec_from_file_location("er_d", str(paths.SCRIPTS_DIR / 'er-diagram-renderer.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); render_er_diagram = m.render_er_diagram

# 读取 _er-diagrams.json
data = json.load(open(str(paths.er_diagrams_path()), 'r', encoding='utf-8'))
print(f'总分组: {len(data)}')

output_dir = str(paths.OUTPUT_DIR)

import time
start = time.time()
for i, er in enumerate(data):
    label = er.get('label', er.get('groupName'))
    safe_label = label.replace(' ', '_').replace('/', '_').replace('\\', '_')
    png_filename = f'ER_{str(i + 1).zfill(2)}_{safe_label}.png'
    png_path = os.path.join(output_dir, png_filename)
    t0 = time.time()
    result = render_er_diagram(er, png_path, 'test')
    dt = time.time() - t0
    print(f'[{i+1:02d}] {label[:30]:30s} {dt:.2f}s -> {result}', flush=True)
total = time.time() - start
print(f'\n总用时: {total:.1f}s')
