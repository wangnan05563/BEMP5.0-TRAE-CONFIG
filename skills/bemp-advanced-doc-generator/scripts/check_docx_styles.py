"""详细查看 docx 的 styles.xml"""
import paths
import zipfile, re
docx = str(paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260603.docx')
out = str(paths.OUTPUT_DIR / '_docx_styles.log')
with zipfile.ZipFile(docx) as z:
    s = z.read('word/styles.xml').decode('utf-8')
# 用更宽松的 regex
ids = re.findall(r'styleId=["\']([^"\']+)["\']', s)
# Heading1 段落数
h1 = re.findall(r'pStyle[^>]+Heading', s)
lines = []
lines.append(f'styles.xml 字符: {len(s)}')
lines.append(f'样式IDs ({len(ids)}): {ids[:30]}')
lines.append(f'含 "Heading" 样式引用 ({len(h1)} 处): {h1[:5]}')
# document.xml 中的 pStyle 引用
with zipfile.ZipFile(docx) as z:
    d = z.read('word/document.xml').decode('utf-8')
pstyles = re.findall(r'pStyle[^/>]+', d)
lines.append(f'\ndocument.xml 中 pStyle 引用样例: {pstyles[:5]}')

with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('OK')
