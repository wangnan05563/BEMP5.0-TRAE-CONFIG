"""检查 docx 与 模板的 styles.xml 对比"""
import zipfile
import paths
docx = str(paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260603.docx')
tpl = str(paths.outline_design_template())
out = str(paths.OUTPUT_DIR / '_cmp.log')
lines = []
with zipfile.ZipFile(tpl) as z:
    tpl_files = set(z.namelist())
with zipfile.ZipFile(docx) as z:
    doc_files = set(z.namelist())
    doc_styles = z.read('word/styles.xml').decode('utf-8')

# 检查 docx 是否有 [Content_Types].xml
lines.append(f'模板文件数: {len(tpl_files)}, docx文件数: {len(doc_files)}')
# diff
only_doc = doc_files - tpl_files
only_tpl = tpl_files - doc_files
lines.append(f'仅在 docx: {only_doc}')
lines.append(f'仅在模板: {only_tpl}')

# styles.xml 长度对比
with zipfile.ZipFile(tpl) as z:
    tpl_styles = z.read('word/styles.xml').decode('utf-8')
lines.append(f'\n模板 styles.xml: {len(tpl_styles)} 字符')
lines.append(f'docx  styles.xml: {len(doc_styles)} 字符')
lines.append(f'差额: {len(tpl_styles) - len(doc_styles)} 字符')

# 看 docx 是否有 numbering.xml
if 'word/numbering.xml' in doc_files:
    lines.append('\n✓ docx 含 numbering.xml')
else:
    lines.append('\n✗ docx 不含 numbering.xml')

with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('OK')
