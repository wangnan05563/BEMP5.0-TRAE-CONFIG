"""查看模板样式名"""
import zipfile, re
import paths
src = str(paths.outline_design_template())
out = str(paths.OUTPUT_DIR / '_tpl_names.log')
with zipfile.ZipFile(src) as z:
    s = z.read('word/styles.xml').decode('utf-8')

lines = []
for sid in ['1', '2', '3', '4', '5', '10', '20', '30', 'TOCHeading', 'TableHeading']:
    pattern = rf'<w:style w:type="paragraph" w:styleId="{sid}"[^>]*>(.*?)</w:style>'
    m = re.search(pattern, s, re.S)
    if m:
        # 找 w:name
        nm = re.search(r'<w:name w:val="([^"]+)"', m.group(0))
        lines.append(f'  styleId="{sid}": name="{nm.group(1) if nm else "?"}"')
    else:
        lines.append(f'  styleId="{sid}": NOT FOUND')

with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('OK')
