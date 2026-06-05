"""
BEMP 适配器索引验证脚本
验证 bank-index.json 完整性、模板覆盖率、引用有效性

用法:
    python verify_index.py [--root PROJECT_ROOT]

环境变量:
    BEMP_ROOT  - 项目根目录（优先级低于 --root 参数）
"""
import argparse
import json
import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SKILL_DIR = os.path.dirname(_SCRIPT_DIR)
_DEFAULT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(_SKILL_DIR)))


def resolve_project_root(cli_root=None):
    root = cli_root or os.environ.get('BEMP_ROOT') or _DEFAULT_ROOT
    return os.path.normpath(root)


def main():
    parser = argparse.ArgumentParser(description='BEMP bank-index.json 验证')
    parser.add_argument('--root', default=None, help='项目根目录')
    args = parser.parse_args()

    root = resolve_project_root(args.root)
    skill_dir = _SKILL_DIR
    idx_path = os.path.join(skill_dir, 'config', 'bank-index.json')
    ref_dir = os.path.join(skill_dir, 'references', 'banks')

    if not os.path.exists(idx_path):
        logger.error(f"bank-index.json 不存在: {idx_path}")
        sys.exit(1)

    idx = json.load(open(idx_path, 'r', encoding='utf-8'))

    # 统计
    status_counts = {}
    for v in idx['banks'].values():
        s = v.get('status', '?')
        status_counts[s] = status_counts.get(s, 0) + 1

    # 验证引用有效性
    missing_refs = []
    impl_no_template = []
    for bk, info in idx['banks'].items():
        if info.get('status') == 'EMPTY':
            continue
        ref = info.get('ref', '')
        if not ref:
            continue
        fp = os.path.join(skill_dir, ref)
        if not os.path.exists(fp):
            missing_refs.append((bk, ref))

    # 模板覆盖率
    templates = [f for f in os.listdir(ref_dir) if f.endswith('.md') and f != '_empty-bank-skeleton.md']
    impl_banks = [k for k, v in idx['banks'].items() if v.get('status') == 'IMPLEMENTED']
    impl_no_template = [bk for bk in impl_banks if not os.path.exists(os.path.join(ref_dir, f'{bk}.md'))]

    # LEGACY 模板保留率
    legacy_banks = [k for k, v in idx['banks'].items() if v.get('status') == 'LEGACY']
    legacy_with_template = [bk for bk in legacy_banks if os.path.exists(os.path.join(ref_dir, f'{bk}.md'))]

    # style_enum 覆盖
    impl_styles = set()
    for bk in impl_banks:
        impl_styles.add(idx['banks'][bk].get('style', ''))
    missing_styles = impl_styles - set(idx.get('style_enum', {}).keys())

    # 输出报告
    errors = 0
    logger.info("=== 验证报告 ===")
    logger.info(f"bank-index.json: {len(idx['banks'])} 家银行")
    logger.info(f"  状态分布: {status_counts}")
    logger.info(f"  分支: {idx.get('_meta', {}).get('branch', 'N/A')}")
    logger.info(f"")
    logger.info(f"磁盘模板: {len(templates)} 个 (.md)")
    logger.info(f"IMPLEMENTED 有模板: {len(impl_banks) - len(impl_no_template)}/{len(impl_banks)}")
    logger.info(f"LEGACY 保留模板: {len(legacy_with_template)}/{len(legacy_banks)}")

    if missing_refs:
        errors += 1
        logger.error(f"引用缺失 ({len(missing_refs)}):")
        for bk, r in missing_refs[:10]:
            logger.error(f"  {bk} -> {r}")

    if impl_no_template:
        errors += 1
        logger.error(f"IMPLEMENTED 缺模板: {impl_no_template}")
    else:
        logger.info("所有 IMPLEMENTED 银行均有模板 ✓")

    if missing_styles:
        errors += 1
        logger.error(f"style_enum 未覆盖: {missing_styles}")
    else:
        logger.info("style_enum 覆盖完整 ✓")

    # 检查 pkg 一致性
    pkg_issues = []
    for bk in impl_banks:
        info = idx['banks'][bk]
        pkg = info.get('pkg', '')
        if not pkg.startswith('com.hundsun.bemp'):
            pkg_issues.append((bk, pkg))
    if pkg_issues:
        logger.warning(f"包名异常: {pkg_issues}")

    logger.info(f"\n验证{'失败' if errors else '通过'} ({errors} 个错误)")
    sys.exit(errors)


if __name__ == '__main__':
    main()
