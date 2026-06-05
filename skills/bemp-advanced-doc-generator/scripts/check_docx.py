"""检查 docx - 写文件方式避免控制台编码"""
import paths
import zipfile, re

docx = str(paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260603.docx')
out_log = str(paths.OUTPUT_DIR / '_docx_metrics.log')
lines = []

with zipfile.ZipFile(docx) as z:
    xml = z.read('word/document.xml').decode('utf-8')
    h_titles = re.findall(r'pStyle w:val="(Heading\d)"', xml)
    h1 = h_titles.count('Heading1')
    h2 = h_titles.count('Heading2')
    h3 = h_titles.count('Heading3')
    h4 = h_titles.count('Heading4')
    tbl = len(re.findall(r'<w:tbl>', xml))
    img = len(re.findall(r'<w:drawing>', xml))
    blip = len(re.findall(r'r:embed', xml))
    lines.append(f'字符: {len(xml):,}')
    lines.append(f'H1:{h1} H2:{h2} H3:{h3} H4:{h4}')
    lines.append(f'表格: {tbl} drawing: {img} 嵌入图: {blip}')

# 提取所有标题
texts = re.findall(r'<w:p[^>]*>(?:(?!</w:p>).)*?pStyle w:val="Heading[1-4]"(?:(?!</w:p>).)*?<w:t[^>]*>([^<]+)</w:t>', xml, re.S)
lines.append(f'\n所有 H1-H4 标题 ({len(texts)} 个):')
for i, t in enumerate(texts):
    lines.append(f'  {i+1:3d}. {t}')

# 提取所有图片（r:embed 后跟图片名）
imgs = re.findall(r'r:embed="(rId\d+)"', xml)
lines.append(f'\n嵌入图片资源ID: {imgs[:20]}...')

with open(out_log, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print(f'OK: {out_log}')
