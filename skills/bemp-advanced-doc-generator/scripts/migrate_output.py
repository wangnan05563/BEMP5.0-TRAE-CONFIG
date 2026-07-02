"""
2026-07-02 新增：技能内 output -> 项目根 output 迁移脚本

将 bemp-advanced-doc-generator/output/ 下的所有交付物和中间文件迁移到
<projectRoot>/output/ 目录，迁移后保留技能内 output 目录结构(空目录)
便于后续生成。

策略:
- 交付物(.docx/.xlsx): 迁移,冲突时项目根 output 优先保留
- 中间文件(_*.json/.cache): 迁移,冲突时项目根 output 优先保留
- 二进制资产(.png/.dot/.mmd): 迁移,冲突时项目根 output 优先保留
- 临时脚本(build_*.py/verify_*.py/_extract_*.py): 迁移,冲突时跳过
- 调试日志(*.log/_genlog.txt/_structure.txt): 迁移,冲突时项目根优先

用法:
  python scripts/migrate_output.py                  # 执行迁移
  python scripts/migrate_output.py --dry-run        # 仅预览,不动文件
  python scripts/migrate_output.py --delete-empty   # 迁移后删除技能内空目录
  python scripts/migrate_output.py --report-only    # 仅输出迁移报告
"""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path

# 复用 paths 模块
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
try:
    from paths import SKILL_ROOT, PROJECT_ROOT, detect_dual_output
except Exception as e:
    print(f'错误: 无法导入 paths 模块: {e}', file=sys.stderr)
    sys.exit(1)


# 强制 UTF-8 输出（Windows GBK 兼容）
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass


# 迁移文件分类（决定优先级）
# conflict_policy: 'project-wins'(项目根优先) / 'skill-wins'(技能内优先) / 'skip'
FILE_CATEGORIES = {
    # 交付物：项目根优先（已修复/更新的版本）
    '.docx': 'project-wins',
    '.xlsx': 'project-wins',
    # 中间文件：项目根优先
    '.json': 'project-wins',
    '.cache': 'project-wins',
    # 二进制资产：项目根优先
    '.png': 'project-wins',
    '.dot': 'project-wins',
    '.mmd': 'project-wins',
    '.html': 'project-wins',
    # 日志/脚本：项目根优先
    '.log': 'project-wins',
    '.txt': 'project-wins',
    '.py': 'project-wins',
}


def classify_file(p: Path) -> str:
    """根据文件后缀返回冲突策略"""
    suffix = p.suffix.lower().lstrip('.')
    return FILE_CATEGORIES.get(f'.{suffix}', 'project-wins')


def should_migrate(p: Path) -> bool:
    """判断是否应迁移该文件"""
    if not p.is_file():
        return False
    # 跳过 .bak 备份文件
    if p.suffix.lower() == '.bak':
        return False
    return True


def migrate_files(skill_output: Path, project_output: Path, dry_run: bool = False) -> dict:
    """
    迁移 skill_output 下的文件到 project_output
    保持相对路径结构
    """
    if not skill_output.exists():
        return {
            'success': True,
            'migrated': [],
            'skipped': [],
            'errors': [],
            'message': f'技能内 output 目录不存在: {skill_output}',
        }

    project_output.mkdir(parents=True, exist_ok=True)

    migrated = []
    skipped = []
    errors = []

    for src in sorted(skill_output.rglob('*')):
        if not should_migrate(src):
            continue
        rel = src.relative_to(skill_output)
        dst = project_output / rel
        policy = classify_file(src)

        try:
            # 目标已存在
            if dst.exists():
                if policy == 'project-wins':
                    skipped.append({
                        'src': str(src),
                        'dst': str(dst),
                        'reason': '目标已存在,项目根优先保留',
                    })
                    continue
                elif policy == 'skip':
                    skipped.append({
                        'src': str(src),
                        'dst': str(dst),
                        'reason': '目标已存在,跳过',
                    })
                    continue
                # 'skill-wins' 才会覆盖

            if dry_run:
                migrated.append({
                    'src': str(src),
                    'dst': str(dst),
                    'action': 'dry-run',
                    'size_bytes': src.stat().st_size,
                })
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                migrated.append({
                    'src': str(src),
                    'dst': str(dst),
                    'action': 'copied',
                    'size_bytes': src.stat().st_size,
                })
        except Exception as e:
            errors.append({
                'src': str(src),
                'dst': str(dst),
                'error': str(e),
            })

    return {
        'success': len(errors) == 0,
        'migrated': migrated,
        'skipped': skipped,
        'errors': errors,
    }


def cleanup_skill_output(skill_output: Path, delete_empty: bool = False) -> dict:
    """
    迁移完成后,删除技能内 output 中已被迁移的文件
    - delete_empty=True 时,递归删除所有空目录
    """
    removed = []
    keep_dir = []

    if not skill_output.exists():
        return {'removed': removed, 'keep_dir': keep_dir}

    # 删除已迁移文件
    for src in sorted(skill_output.rglob('*'), reverse=True):
        if src.is_file() and src.suffix.lower() != '.bak':
            try:
                src.unlink()
                removed.append(str(src))
            except Exception as e:
                keep_dir.append(f'{src}: {e}')

    # 删除空目录
    if delete_empty:
        for d in sorted(skill_output.rglob('*'), reverse=True):
            if d.is_dir() and not any(d.iterdir()):
                try:
                    d.rmdir()
                except Exception as e:
                    keep_dir.append(f'{d}: {e}')

    return {'removed': removed, 'keep_dir': keep_dir}


def print_report(stats: dict, dry_run: bool):
    """打印迁移报告"""
    mode = '[DRY-RUN] ' if dry_run else ''
    print('=' * 60)
    print(f'{mode}技能内 output -> 项目根 output 迁移报告')
    print('=' * 60)
    print(f'源: {stats["source"]}')
    print(f'目标: {stats["target"]}')

    mig = stats['migrated']
    skp = stats['skipped']
    err = stats['errors']
    print()
    print(f'迁移文件: {len(mig)}')
    total_size = sum(m.get('size_bytes', 0) for m in mig)
    print(f'  总大小: {total_size / 1024:.1f} KB ({total_size / (1024*1024):.2f} MB)')
    print(f'跳过文件: {len(skp)}')
    if skp:
        for s in skp[:10]:
            print(f'  - {Path(s["src"]).name} -> {Path(s["dst"]).name}  ({s["reason"]})')
        if len(skp) > 10:
            print(f'  ... 共 {len(skp)} 个跳过项')
    print(f'错误数: {len(err)}')
    if err:
        for e in err:
            print(f'  - {e["src"]}: {e["error"]}')

    cleanup = stats.get('cleanup', {})
    if cleanup:
        print()
        print(f'技能内 output 已删除文件: {len(cleanup.get("removed", []))}')
        print(f'保留目录/失败: {len(cleanup.get("keep_dir", []))}')

    print()
    print('=' * 60)


def main():
    parser = argparse.ArgumentParser(description='迁移技能内 output -> 项目根 output')
    parser.add_argument('--dry-run', action='store_true', help='仅预览,不动文件')
    parser.add_argument('--delete-empty', action='store_true', help='迁移后删除技能内空目录')
    parser.add_argument('--report', type=str, default=None, help='迁移报告 JSON 输出路径')
    parser.add_argument('--report-only', action='store_true', help='仅输出报告,不执行迁移')
    args = parser.parse_args()

    dual = detect_dual_output()
    skill_output = Path(dual['skill_output'])
    project_output = Path(dual['project_output'])

    print(f'技能内 output: {skill_output}')
    print(f'项目根 output: {project_output}')
    print(f'同时存在: {dual["both_exist"]}')

    if not skill_output.exists():
        print(f'\n[SKIP] 技能内 output 不存在,无需迁移')
        sys.exit(0)

    if args.report_only:
        # 仅输出报告(扫描文件清单)
        all_files = [p for p in skill_output.rglob('*') if p.is_file() and p.suffix.lower() != '.bak']
        print(f'\n技能内 output 文件数: {len(all_files)}')
        total = sum(p.stat().st_size for p in all_files)
        print(f'总大小: {total / 1024:.1f} KB')
        return

    # 执行迁移
    result = migrate_files(skill_output, project_output, dry_run=args.dry_run)

    # 清理(仅在非 dry-run 时)
    cleanup = None
    if not args.dry_run:
        cleanup = cleanup_skill_output(skill_output, delete_empty=args.delete_empty)

    stats = {
        'source': str(skill_output),
        'target': str(project_output),
        'migrated': result['migrated'],
        'skipped': result['skipped'],
        'errors': result['errors'],
        'cleanup': cleanup or {},
        'success': result['success'] and (not cleanup or len(cleanup.get('keep_dir', [])) == 0),
    }

    print_report(stats, args.dry_run)

    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        print(f'\n[OK] 报告已写入: {report_path}')

    sys.exit(0 if stats['success'] else 1)


if __name__ == '__main__':
    main()
