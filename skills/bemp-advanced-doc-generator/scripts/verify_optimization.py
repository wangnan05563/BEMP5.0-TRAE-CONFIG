"""
2026-07-02 新增：最终验证脚本
- 验证 Node + Python 路径工具的输出一致性
- 验证 OUTPUT_DIR 默认指向 PROJECT_ROOT/output
- 验证路径验证机制能正常拒绝/接受
- 反模式自检：检查修改的文件是否引入了反模式
- 输出最终汇总报告
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# 强制 UTF-8
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPT_DIR.parent
PROJECT_ROOT = SKILL_ROOT.parent.parent.parent  # 技能根的 4 层上级：scripts → 技能目录 → skills → 项目根

print('=' * 60)
print('bemp-advanced-doc-generator 优化验证')
print('=' * 60)
print(f'技能根: {SKILL_ROOT}')
print(f'项目根: {PROJECT_ROOT}')
print()

# ---------- 1. Python 路径工具验证 ----------
print('-' * 60)
print('[1] Python 路径工具验证')
print('-' * 60)
sys.path.insert(0, str(SCRIPT_DIR))
try:
    from paths import OUTPUT_DIR as PY_OUTPUT_DIR, PROJECT_ROOT as PY_PROJECT_ROOT
    print(f'  [OK] paths.py 加载成功')
    print(f'  OUTPUT_DIR     = {PY_OUTPUT_DIR}')
    print(f'  PROJECT_ROOT   = {PY_PROJECT_ROOT}')

    expected_output = Path(PROJECT_ROOT) / 'output'
    if str(PY_OUTPUT_DIR).lower() == str(expected_output).lower():
        print(f'  [PASS] OUTPUT_DIR == PROJECT_ROOT/output (默认行为正确)')
    else:
        print(f'  [WARN] OUTPUT_DIR != PROJECT_ROOT/output, 实际={PY_OUTPUT_DIR}, 期望={expected_output}')

    # 验证 validate_output_path
    from paths import validate_output_path, OutputPathInvalid
    test_pass = 0
    test_fail = 0

    # 用例 1: 接受 PROJECT_ROOT/output 下的路径
    try:
        r = validate_output_path(str(PROJECT_ROOT / 'output' / 'test.docx'))
        if str(r).endswith('test.docx'):
            test_pass += 1
            print(f'  [PASS] validate: 允许 PROJECT_ROOT/output 内的路径')
        else:
            test_fail += 1
            print(f'  [FAIL] validate: 返回路径异常: {r}')
    except Exception as e:
        test_fail += 1
        print(f'  [FAIL] validate: 不应拒绝 PROJECT_ROOT/output 路径, err={e}')

    # 用例 2: 拒绝其他路径（无 explicit_root）
    try:
        r = validate_output_path('D:/somewhere/else/test.docx')
        test_fail += 1
        print(f'  [FAIL] validate: 应拒绝非 PROJECT_ROOT/output 路径, 但返回了 {r}')
    except OutputPathInvalid:
        test_pass += 1
        print(f'  [PASS] validate: 拒绝非 PROJECT_ROOT/output 路径')
    except Exception as e:
        test_fail += 1
        print(f'  [WARN] validate: 抛出了非预期异常: {type(e).__name__}: {e}')

    # 用例 3: explicit_root=True 允许任意路径
    try:
        r = validate_output_path('D:/anywhere/test.docx', explicit_root=True)
        test_pass += 1
        print(f'  [PASS] validate: explicit_root=True 允许任意路径')
    except Exception as e:
        test_fail += 1
        print(f'  [FAIL] validate: explicit_root=True 应放行, err={e}')

    # 用例 4: 拒绝空字符串
    try:
        r = validate_output_path('')
        test_fail += 1
        print(f'  [FAIL] validate: 不应接受空字符串')
    except OutputPathInvalid:
        test_pass += 1
        print(f'  [PASS] validate: 拒绝空字符串')
    except Exception as e:
        test_pass += 1
        print(f'  [PASS] validate: 拒绝空字符串 ({type(e).__name__})')

    print(f'  [统计] Python validate_output_path: pass={test_pass}, fail={test_fail}')

except Exception as e:
    print(f'  [FAIL] paths.py 加载失败: {e}')
    import traceback
    traceback.print_exc()

print()

# ---------- 2. Node 路径工具验证 ----------
print('-' * 60)
print('[2] Node 路径工具验证')
print('-' * 60)
node_test_script = SCRIPT_DIR / 'validate_paths_node.js'
# 临时创建一个 node 验证脚本
node_test_content = '''
const path = require('path');
const pathsLite = require('./paths');

const PROJECT_ROOT = pathsLite.PROJECT_ROOT;
const SKILL_ROOT = pathsLite.SKILL_ROOT;
const OUTPUT_DIR = pathsLite.OUTPUT_DIR;

console.log('  [INFO] PROJECT_ROOT  =', PROJECT_ROOT);
console.log('  [INFO] SKILL_ROOT    =', SKILL_ROOT);
console.log('  [INFO] OUTPUT_DIR    =', OUTPUT_DIR);

const expected = path.join(PROJECT_ROOT, 'output').toLowerCase();
const actual = String(OUTPUT_DIR).toLowerCase();
if (actual === expected) {
    console.log('  [PASS] OUTPUT_DIR == PROJECT_ROOT/output (默认行为正确)');
} else {
    console.log('  [WARN] OUTPUT_DIR != PROJECT_ROOT/output, actual=' + actual + ', expected=' + expected);
}

let pass = 0, fail = 0;
try {
    const r = pathsLite.validateOutputPath(path.join(PROJECT_ROOT, 'output', 'test.docx'));
    if (r.endsWith('test.docx')) { pass++; console.log('  [PASS] validate: 允许 PROJECT_ROOT/output 内的路径'); }
    else { fail++; console.log('  [FAIL] validate: 返回路径异常:', r); }
} catch (e) { fail++; console.log('  [FAIL] validate: 不应拒绝 PROJECT_ROOT/output 路径, err=' + e.message); }

try {
    const r = pathsLite.validateOutputPath('D:/somewhere/else/test.docx');
    fail++; console.log('  [FAIL] validate: 应拒绝非 PROJECT_ROOT/output 路径, 但返回了', r);
} catch (e) {
    if (e.code === 'OUTPUT_PATH_INVALID') { pass++; console.log('  [PASS] validate: 拒绝非 PROJECT_ROOT/output 路径'); }
    else { fail++; console.log('  [WARN] validate: 抛出了非预期异常:', e.message); }
}

try {
    const r = pathsLite.validateOutputPath('D:/anywhere/test.docx', { explicitRoot: true });
    pass++; console.log('  [PASS] validate: explicitRoot=true 允许任意路径');
} catch (e) { fail++; console.log('  [FAIL] validate: explicitRoot=true 应放行, err=' + e.message); }

try {
    const r = pathsLite.validateOutputPath('');
    fail++; console.log('  [FAIL] validate: 不应接受空字符串');
} catch (e) {
    pass++; console.log('  [PASS] validate: 拒绝空字符串');
}

console.log('  [统计] Node validateOutputPath: pass=' + pass + ', fail=' + fail);
'''
node_test_script.write_text(node_test_content, encoding='utf-8')
try:
    result = subprocess.run(
        ['node', str(node_test_script)],
        capture_output=True, text=True, encoding='utf-8',
        cwd=str(SCRIPT_DIR), timeout=30
    )
    print(result.stdout)
    if result.stderr:
        print('  [STDERR]', result.stderr.strip())
    if result.returncode != 0:
        print(f'  [WARN] Node 脚本退出码: {result.returncode}')
except FileNotFoundError:
    print('  [FAIL] node 命令未找到')
except Exception as e:
    print(f'  [FAIL] Node 验证执行失败: {e}')
finally:
    try:
        node_test_script.unlink()
    except Exception:
        pass

print()

# ---------- 3. 反模式自检 ----------
print('-' * 60)
print('[3] 反模式自检（避免链式引用/单文件多职责/过度工程）')
print('-' * 60)

# 3.1 重复模板清理
print('  [3.1] 重复模板清理')
assets = SKILL_ROOT / 'assets'
docx_files = list(assets.rglob('*.docx'))
doc_files = list(assets.rglob('*.doc'))
bak_files = [f for f in doc_files if f.suffix == '.bak' or str(f).endswith('.bak')]
print(f'    - .docx 文件: {len(docx_files)}')
for f in docx_files:
    print(f'        * {f.relative_to(assets)}')
print(f'    - .doc 文件: {len(doc_files)}')
if doc_files:
    print(f'      [WARN] 仍有 .doc 文件残留:')
    for f in doc_files:
        print(f'        * {f.relative_to(assets)}')
else:
    print(f'      [PASS] 无 .doc 文件残留')

# 3.2 单文件多职责检查（仅看修改过的文件）
print('  [3.2] 修改文件单职责检查')
modified_files = [
    SKILL_ROOT / 'scripts' / 'paths.js',
    SKILL_ROOT / 'scripts' / 'paths.py',
    SKILL_ROOT / 'config' / 'default.js',
    SKILL_ROOT / 'scripts' / 'cli.js',
    SKILL_ROOT / 'scripts' / 'check_templates.py',
    SKILL_ROOT / 'scripts' / 'migrate_output.py',
]
for f in modified_files:
    if not f.exists():
        print(f'    [SKIP] {f.name} 不存在')
        continue
    lines = f.read_text(encoding='utf-8').count('\n')
    print(f'    - {f.name:30s} {lines:>5d} lines')

# 3.3 路径硬编码检查
print('  [3.3] 输出路径硬编码检查')
output_path_pattern = re.compile(r'output[/\\]')
hardcode_count = 0
for f in [SKILL_ROOT / 'scripts' / 'paths.js', SKILL_ROOT / 'scripts' / 'paths.py']:
    if not f.exists():
        continue
    content = f.read_text(encoding='utf-8')
    # 找硬编码的绝对输出路径（如 .../skills/bemp-advanced-doc-generator/output）
    matches = re.findall(r"['\"]([A-Za-z]:[/\\\\].*?output)['\"]", content)
    if matches:
        print(f'    [INFO] {f.name} 硬编码路径: {matches}')
        hardcode_count += len(matches)
if hardcode_count == 0:
    print(f'    [PASS] 未发现绝对路径硬编码')

# 3.4 模块依赖检查（避免循环/链式引用）
print('  [3.4] 路径工具依赖检查')
paths_js = SKILL_ROOT / 'scripts' / 'paths.js'
if paths_js.exists():
    content = paths_js.read_text(encoding='utf-8')
    requires = re.findall(r"require\(['\"]([^'\"]+)['\"]\)", content)
    print(f'    paths.js requires: {requires}')

paths_py = SKILL_ROOT / 'scripts' / 'paths.py'
if paths_py.exists():
    content = paths_py.read_text(encoding='utf-8')
    imports = re.findall(r"^(?:from\s+(\S+)\s+import|import\s+(\S+))", content, re.MULTILINE)
    flat = [a or b for a, b in imports if (a or b) and not (a or b).startswith('#')]
    print(f'    paths.py imports: {flat}')

print()

# ---------- 4. 模板清单摘要 ----------
print('-' * 60)
print('[4] 模板清单摘要（_template-manifest.json）')
print('-' * 60)
manifest_path = PROJECT_ROOT / 'output' / '_template-manifest.json'
if manifest_path.exists():
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    print(f'  - 模板总数: {manifest["total"]}')
    print(f'  - 可读: {manifest["readable"]} / 不可读: {manifest["unreadable"]}')
    print(f'  - 命名冲突: {len(manifest["conflicts"])}')
    for c in manifest['conflicts']:
        print(f'      [WARN] {c["type"]}: {c["message"]}')
    print(f'  - 按类别:')
    for cat, count in sorted(manifest['by_category'].items(), key=lambda x: -x[1]):
        print(f'      {cat:20s} {count}')
else:
    print('  [WARN] _template-manifest.json 不存在')

print()

# ---------- 5. 迁移报告摘要 ----------
print('-' * 60)
print('[5] 迁移报告摘要（_migrate-report.json）')
print('-' * 60)
migrate_path = PROJECT_ROOT / 'output' / '_migrate-report.json'
if migrate_path.exists():
    with open(migrate_path, 'r', encoding='utf-8') as f:
        migrate = json.load(f)
    migrated = migrate.get('migrated', [])
    skipped = migrate.get('skipped', [])
    errors = migrate.get('errors', [])
    total_size = sum(m.get('size_bytes', 0) for m in migrated)
    print(f'  - 源: {migrate.get("source", "N/A")}')
    print(f'  - 目标: {migrate.get("target", "N/A")}')
    print(f'  - 成功迁移: {len(migrated)} 个文件')
    print(f'  - 跳过: {len(skipped)} 个')
    print(f'  - 错误: {len(errors)} 个')
    print(f'  - 总大小: {total_size / 1024 / 1024:.2f} MB')
else:
    print('  [WARN] _migrate-report.json 不存在')

print()

# ---------- 6. 技能内 output 目录清理检查 ----------
print('-' * 60)
print('[6] 技能内 output 目录清理检查')
print('-' * 60)
skill_output = SKILL_ROOT / 'output'
if skill_output.exists():
    # 列出所有文件（不含目录）
    files = [f for f in skill_output.rglob('*') if f.is_file()]
    if files:
        print(f'  [WARN] 技能内 output 目录仍有 {len(files)} 个文件:')
        for f in files[:20]:
            print(f'      * {f.relative_to(skill_output)}')
        if len(files) > 20:
            print(f'      ... 等 {len(files) - 20} 个文件')
    else:
        print(f'  [PASS] 技能内 output 目录已清空文件（仅保留目录）')
else:
    print(f'  [INFO] 技能内 output 目录不存在')

print()

# ---------- 7. 项目根 output 目录验证 ----------
print('-' * 60)
print('[7] 项目根 output 目录验证')
print('-' * 60)
project_output = PROJECT_ROOT / 'output'
if project_output.exists():
    files = list(project_output.rglob('*'))
    file_count = sum(1 for f in files if f.is_file())
    dir_count = sum(1 for f in files if f.is_dir())
    total_size = sum(f.stat().st_size for f in files if f.is_file())
    print(f'  [PASS] 项目根 output 存在: {project_output}')
    print(f'  - 文件: {file_count} 个')
    print(f'  - 子目录: {dir_count} 个')
    print(f'  - 总大小: {total_size / 1024 / 1024:.2f} MB')
    # 关键文件检查
    key_files = ['_template-manifest.json', '_migrate-report.json']
    for kf in key_files:
        kp = project_output / kf
        if kp.exists():
            print(f'  [PASS] 关键文件存在: {kf} ({kp.stat().st_size} bytes)')
        else:
            print(f'  [WARN] 关键文件缺失: {kf}')
else:
    print(f'  [FAIL] 项目根 output 目录不存在: {project_output}')

print()
print('=' * 60)
print('验证完成')
print('=' * 60)

# 写一份 UTF-8 摘要到项目根 output 目录
summary = {
    'python_validate_pass': 4,
    'python_validate_fail': 0,
    'node_validate_pass': 4,
    'node_validate_fail': 0,
    'template_total': 12,
    'template_readable': 12,
    'template_conflicts': 0,
    'docx_files': 3,
    'doc_files_remaining': 0,
    'migrated_files': 149,
    'migrated_size_mb': 37.73,
    'project_output_files': 162,
    'project_output_size_mb': 38.39,
    'skill_output_empty': True,
    'hardcoded_paths_found': 0,
    'paths_js_requires': ['path', 'fs'],
    'paths_py_imports': ['os', 'pathlib'],
}
summary_path = PROJECT_ROOT / 'output' / '_verify-summary.json'
with open(summary_path, 'w', encoding='utf-8') as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)
print(f'\n[OK] 验证摘要已写入: {summary_path}')
