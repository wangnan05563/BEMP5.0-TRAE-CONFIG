"""检查 styles.xml 实际内容"""
import paths
import zipfile
docx = str(paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260603.docx')
out = str(paths.OUTPUT_DIR / '_styles_raw.log')
with zipfile.ZipFile(docx) as z:
    print('Files in zip:')
    for n in z.namelist():
        print(f'  {n}')
    print()
    styles = z.read('word/styles.xml').decode('utf-8')
    print(f'styles.xml length: {len(styles)}')
    print(f'First 2000 chars:\n{styles[:2000]}')
