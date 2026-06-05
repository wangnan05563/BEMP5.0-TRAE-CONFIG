"""测试优化效果 - 第二次运行（缓存应该全部命中）"""
import paths
import subprocess, time, os, sys
# 修复Windows GBK编码导致希腊字母输出失败
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

start = time.time()
cmd = ['node', str(paths.SCRIPTS_DIR / 'cli.js'),
       '-t', 'outline-design', '-m', '河南农商', '-r', str(paths.PROJECT_ROOT),
       '--requirement-md', str(paths.BANK_REQUIREMENTS_DIR / '额度.md'),
       '--use-scan-cache', '--json']
print('CMD:', ' '.join(cmd), flush=True)
proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
out = []
for line in proc.stdout:
    print(line, end='', flush=True)
    out.append(line)
proc.wait()
elapsed = time.time() - start
print(f'\n=== 第二次(缓存命中)用时: {elapsed:.1f}s ===', flush=True)
with open(str(paths.OUTPUT_DIR / '_opt2.log'), 'w', encoding='utf-8') as f:
    f.writelines(out)
    f.write(f'\n=== 用时: {elapsed:.1f}s ===\n')
out_path = str(paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260603.docx')
if os.path.exists(out_path):
    print(f'OUTPUT: {os.path.getsize(out_path)} bytes', flush=True)
