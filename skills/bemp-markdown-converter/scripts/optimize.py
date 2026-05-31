#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Markdown 文档后处理优化工具
编排器：整合所有优化功能，提供一键式文档优化
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

sys.path.append(str(Path(__file__).resolve().parent))
from utils.file_io import safe_read, safe_write
from utils.logger import get_logger
from fix_heading_numbers import fix_heading_numbers
from clean_duplicate_numbers import clean_duplicate_numbers
from fix_invoice_table import fix_invoice_tables
from fix_table_headers import fix_table_headers
from check_quality import check_markdown_quality

logger = get_logger(__name__)

_OPTIMIZE_STEPS = [
    ("清理重复序号", clean_duplicate_numbers),
    ("修复标题序号", fix_heading_numbers),
    ("修复表格标题行", fix_table_headers),
    ("修复发票相关表格", fix_invoice_tables),
]


def optimize_markdown_file(
    input_file: str,
    output_file: Optional[str] = None,
    optimize_all: bool = True,
    dry_run: bool = False,
) -> Optional[str]:
    if output_file is None:
        output_file = input_file

    print("=" * 60)
    print("🚀 Markdown 文档后处理优化")
    print("=" * 60)
    print(f"📄 输入文件: {input_file}")
    print(f"📝 输出文件: {output_file}")
    if dry_run:
        print("🔍 [DRY-RUN] 仅预览，不写入文件")
    print("-" * 60)

    try:
        content = safe_read(input_file)
    except Exception as e:
        logger.error("读取文件失败: %s", e)
        return None

    if optimize_all:
        for i, (step_name, step_fn) in enumerate(_OPTIMIZE_STEPS, 1):
            print(f"\n📝 步骤 {i}: {step_name}...")
            try:
                content = step_fn(content)
                print(f"✅ {step_name}完成")
            except Exception as e:
                logger.error("步骤 %d [%s] 失败: %s", i, step_name, e)
                print(f"⚠️ {step_name}失败，跳过: {e}")
    else:
        print("\nℹ️ 跳过自动优化，仅进行质量检查")

    if dry_run:
        print("\n🔍 [DRY-RUN] 预览完成，未写入文件")
        print(f"📄 优化后内容长度: {len(content)} 字符")
    else:
        try:
            safe_write(output_file, content, backup=True)
            print("\n✅ 文档优化完成！")
        except Exception as e:
            logger.error("写入文件失败: %s", e)
            print(f"\n❌ 写入文件失败: {e}")
            return None

    print("\n📊 执行质量检查...")
    try:
        if dry_run:
            from check_quality import _scan_content, _evaluate_rules, _load_rules
            config = _load_rules()
            stats = _scan_content(content)
            score, issues = _evaluate_rules(stats, config.get("rules", []))
            pass_score = config.get("pass_score", 60)
            print(f"  质量评分: {score}/100 ({'合格' if score >= pass_score else '未通过'})")
            for issue in issues:
                print(f"  • {issue['message']}")
            success = score >= pass_score
        else:
            success = check_markdown_quality(output_file)
    except Exception as e:
        logger.error("质量检查异常: %s", e)
        success = False

    if success:
        print("\n🎉 优化流程完成，文档质量合格！")
    else:
        print("\n⚠️ 优化流程完成，但文档质量检查未通过，请手动检查。")

    return output_file


def main() -> None:
    parser = argparse.ArgumentParser(description='Markdown 文档后处理优化工具')
    parser.add_argument('input_file', help='输入的 Markdown 文件路径')
    parser.add_argument('-o', '--output', help='输出的 Markdown 文件路径（默认覆盖原文件）')
    parser.add_argument('--skip-auto-optimize', action='store_true', help='跳过自动优化步骤，仅进行质量检查')
    parser.add_argument('--dry-run', action='store_true', help='仅预览变更，不写入文件')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], help='日志级别')

    args = parser.parse_args()

    get_logger(level=args.log_level)

    if not Path(args.input_file).exists():
        logger.error("输入文件不存在: %s", args.input_file)
        sys.exit(1)

    output_file = args.output if args.output else args.input_file
    optimize_all = not args.skip_auto_optimize

    result = optimize_markdown_file(
        args.input_file,
        output_file,
        optimize_all=optimize_all,
        dry_run=args.dry_run,
    )

    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
