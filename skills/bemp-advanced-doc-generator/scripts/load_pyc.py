"""从 pyc 创建 .py wrapper，让 Python 直接加载 pyc"""
import paths
import importlib.util, sys, os, shutil, types, inspect, textwrap, dis, io

pyc = str(paths.SCRIPTS_DIR / '__pycache__' / 'outline-design-generator.cpython-314.pyc')
out_py = str(paths.SCRIPTS_DIR / 'outline-design-generator.py')
log = str(paths.OUTPUT_DIR / '_load_pyc.log')

# 1. 备份 corrupt
corrupt = out_py + '.corrupt.bak'
if not os.path.exists(corrupt) and os.path.exists(out_py):
    shutil.copy2(out_py, corrupt)

# 2. 加载
spec = importlib.util.spec_from_file_location('outline_design_generator', pyc, loader=importlib.machinery.SourcelessFileLoader('outline_design_generator', pyc))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
sys.modules['outline_design_generator'] = mod

print(f'OK loaded, top-level funcs: {sorted([n for n in dir(mod) if not n.startswith("_") and callable(getattr(mod, n))])}')

# 3. 尝试调用 generate_outline_design 验证
print(f'generate_outline_design: {mod.generate_outline_design}')

with open(log, 'w', encoding='utf-8') as f:
    f.write('OK loaded\n')
    f.write(f'funcs: {sorted([n for n in dir(mod) if not n.startswith("_") and callable(getattr(mod, n))])}\n')

