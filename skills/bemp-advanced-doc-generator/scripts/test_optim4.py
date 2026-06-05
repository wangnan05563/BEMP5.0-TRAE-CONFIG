"""完整流程测试 - 验证ER缓存+扫描缓存后总耗时"""
import paths
import subprocess, time, os

start = time.time()
cmd = ['node', str(paths.SCRIPTS_DIR / 'cli.js'),
       '-t', 'outline-design', '-m', '河南农商', '-r', str(paths.PROJECT_ROOT),
       '--requirement-md', str(paths.BANK_REQUIREMENTS_DIR / '额度.md'),
       '--use-scan-cache', '--json']

log_path = str(paths.OUTPUT_DIR / '_run4.log')
with open(log_path, 'w', encoding='utf-8') as f:
    f.write(f'CMD: {" ".join(cmd)}\n\n')
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    out, _ = proc.communicate()
    text = out.decode('utf-8', errors='replace')
    f.write(text)
elapsed = time.time() - start

# 提取关键时间点
print(f'\n=== 总用时: {elapsed:.1f}s ===')
key_lines = []
for ln in text.splitlines():
    if any(kw in ln for kw in ['[+] ER图', '扫描数据', '业务子模块', 'ER图PNG', '生成完成', '渲染完成', '图表统计', '用时', 'errors', 'warnings']):
        key_lines.append(ln)
for l in key_lines[-25:]:
    print(l)
