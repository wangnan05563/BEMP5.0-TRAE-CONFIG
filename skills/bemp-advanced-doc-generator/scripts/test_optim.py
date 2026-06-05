"""测试优化效果：完整运行一次（建立缓存），再运行一次（验证缓存）"""
import paths
import subprocess, time, os

def run(label, extra_args):
    print(f'\n========== {label} ==========')
    start = time.time()
    cmd = ['node', str(paths.SCRIPTS_DIR / 'cli.js'),
           '-t', 'outline-design', '-m', '河南农商', '-r', str(paths.PROJECT_ROOT),
           '--requirement-md', str(paths.BANK_REQUIREMENTS_DIR / '额度.md'),
           '--json'] + extra_args
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
    proc.wait()
    elapsed = time.time() - start
    print(f'>>> {label} 用时: {elapsed:.1f}s')
    return elapsed, out

# 第一次：完整建立缓存
t1, _ = run('第1次（建立缓存）', ['--use-scan-cache'])

# 第二次：缓存命中
t2, _ = run('第2次（缓存命中）', ['--use-scan-cache'])

print(f'\n========== 优化效果 ==========')
print(f'第1次: {t1:.1f}s | 第2次: {t2:.1f}s | 加速: {t1/t2:.1f}x')
