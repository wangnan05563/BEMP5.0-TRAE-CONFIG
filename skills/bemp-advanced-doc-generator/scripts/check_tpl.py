"""检查模板的 styles.xml"""
import zipfile, re
import paths
src = str(paths.outline_design_template())
out = str(paths.OUTPUT_DIR / '_tpl_styles.log')
lines = []
with zipfile.ZipFile(src) as z:
    s = z.read('word/styles.xml').decode('utf-8')
    lines.append(f'模板 styles.xml chars: {len(s)}')
    ids = re.findall(r'w:styleId="([^"]+)"', s)
    lines.append(f'样式IDs ({len(ids)}):')
    for sid in ids[:50]:
        lines.append(f'  {sid}')
    # 看是否有 Heading1
    lines.append(f'\n含 "Heading1" 样式: {bool(re.search(r"Heading1", s))}')
    lines.append(f'含 "标题1" 样式: {bool(re.search(r"标题1", s))}')
    # 找标题样式定义
    head_styles = re.findall(r'<w:style [^>]*w:styleId="([^"]+)"[^>]*>.*?</w:style>', s, re.S)
    heading_styles = [h for h in head_styles if 'head' in h.lower() or h in ['1','2','3','4','5','6','7','8','9','10','标题1','标题2','标题3','标题4']]
    lines.append(f'\n标题相关 styles: {heading_styles}')

with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('OK')
