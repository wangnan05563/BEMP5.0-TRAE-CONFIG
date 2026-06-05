"""检查文档样式和实际 pStyle"""
import paths
import zipfile, re
docx = str(paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260603.docx')
out = str(paths.OUTPUT_DIR / '_styles.log')
lines = []
with zipfile.ZipFile(docx) as z:
    styles_xml = z.read('word/styles.xml').decode('utf-8')
    # 提取所有 style id
    style_ids = re.findall(r'w:styleId="([^"]+)"\s+w:type="paragraph"', styles_xml)
    lines.append(f'段落样式IDs ({len(style_ids)}):')
    for sid in style_ids[:30]:
        lines.append(f'  {sid}')
    # 找标题相关
    headings = [s for s in style_ids if 'head' in s.lower() or s in ['1','2','3','4','5','6','7','8','9','10','标题1','标题2','标题3','标题4']]
    lines.append(f'\n标题相关样式: {headings}')

with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('OK')
