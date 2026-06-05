"""用 Python 包装测试 cli.js 缓存模式"""
import paths
import subprocess
import time
import os

env = os.environ.copy()
start = time.time()
cmd = ['node', str(paths.SCRIPTS_DIR / 'cli.js'),
       '-t', 'outline-design',
       '-m', '河南农商',
       '-r', str(paths.PROJECT_ROOT),
       '--requirement-md', str(paths.BANK_REQUIREMENTS_DIR / '额度.md'),
       '--use-scan-cache', '--json']
print('CMD:', ' '.join(cmd))
proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='ignore')
out = []
while True:
    line = proc.stdout.readline()
    if not line:
        if proc.poll() is not None: break
        time.sleep(0.05)
        continue
    out.append(line)
    print(line, end='')
ret = proc.wait()
elapsed = time.time() - start
print(f'\n=== 用时: {elapsed:.1f}s, returncode: {ret} ===')
out_path = str(paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260603.docx')
if os.path.exists(out_path):
    print(f'OUTPUT: {os.path.getsize(out_path)} bytes')
with open(str(paths.OUTPUT_DIR / '_opt.log'), 'w', encoding='utf-8') as f:
    f.writelines(out)
    f.write(f'\n=== 用时: {elapsed:.1f}s ===\n')
