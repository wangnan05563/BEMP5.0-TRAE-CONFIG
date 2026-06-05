"""测试优化效果 - 直接调用，避免PowerShell GBK编码问题"""
import paths
import subprocess, time, os, sys

start = time.time()
cmd = ['node', str(paths.SCRIPTS_DIR / 'cli.js'),
       '-t', 'outline-design', '-m', '河南农商', '-r', str(paths.PROJECT_ROOT),
       '--requirement-md', str(paths.BANK_REQUIREMENTS_DIR / '额度.md'),
       '--use-scan-cache', '--json']
# 完全静默运行，避免编码问题
with open(str(paths.OUTPUT_DIR / '_run.log'), 'w', encoding='utf-8') as f:
    f.write(f'CMD: {" ".join(cmd)}\n\n')
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    out, _ = proc.communicate()
    # 字节转字符串
    text = out.decode('utf-8', errors='replace')
    f.write(text)
elapsed = time.time() - start
with open(str(paths.OUTPUT_DIR / '_run.log'), 'a', encoding='utf-8') as f:
    f.write(f'\n=== 用时: {elapsed:.1f}s ===\n')
out_path = str(paths.OUTPUT_DIR / '河南农商-概要设计说明书-20260603.docx')
if os.path.exists(out_path):
    print(f'OUTPUT: {os.path.getsize(out_path)} bytes, 用时: {elapsed:.1f}s', flush=True)
else:
    print('FAIL: 文档未生成', flush=True)
