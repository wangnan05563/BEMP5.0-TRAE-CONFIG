"""检查 outline-design-generator.py 中所有 Heading 引用"""
import paths
import re
src = str(paths.SCRIPTS_DIR / 'outline-design-generator.py')
out = str(paths.OUTPUT_DIR / '_inspect.log')
with open(src, 'r', encoding='utf-8') as f:
    lines = f.readlines()
result = []
for i, ln in enumerate(lines, 1):
    if 'Heading' in ln or 'startswith' in ln:
        result.append(f'{i:4d}: {ln.rstrip()}')
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(result))
print('OK')
