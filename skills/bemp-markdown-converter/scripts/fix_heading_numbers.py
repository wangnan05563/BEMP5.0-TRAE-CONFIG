#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 Markdown 文档标题序号
用数组+循环替代6个独立计数器，消除重复代码
支持文档从任意层级开始（自动检测最小标题层级）
"""

import re
import sys
from pathlib import Path
from typing import List

sys.path.append(str(Path(__file__).resolve().parent))
from utils.file_io import safe_read, safe_write
from utils.logger import get_logger

logger = get_logger(__name__)

_OLD_NUM_PATTERNS = [
    re.compile(r'^\d+(?:\.\d+)+\.\s+'),
    re.compile(r'^\d+(?:\.\d+)+\s+'),
    re.compile(r'^\d+\.\s+'),
    re.compile(r'^\d+\s+'),
]


def _detect_min_heading_level(content: str) -> int:
    """检测文档中最小的标题层级（1-6），用于编号偏移调整。"""
    min_level = 7
    for line in content.split('\n'):
        match = re.match(r'^(#{1,6})\s+', line)
        if match:
            level = len(match.group(1))
            if level < min_level:
                min_level = level
    return min_level if min_level <= 6 else 1


def fix_heading_numbers(content: str) -> str:
    lines = content.split('\n')
    counters: List[int] = [0] * 6
    new_lines: List[str] = []
    min_level = _detect_min_heading_level(content)

    for line in lines:
        match = re.match(r'^(#+)\s+(.+)$', line)
        if not match:
            new_lines.append(line)
            continue

        level = len(match.group(1))
        title = match.group(2)

        if level < 1 or level > 6:
            new_lines.append(line)
            continue

        changed = True
        while changed:
            changed = False
            for pat in _OLD_NUM_PATTERNS:
                new_title = pat.sub('', title)
                if new_title != title:
                    title = new_title
                    changed = True

        effective_level = level - min_level + 1
        if effective_level < 1:
            effective_level = 1

        counters[effective_level - 1] += 1
        for i in range(effective_level, 6):
            counters[i] = 0

        number_parts = [str(counters[i]) for i in range(effective_level)]
        if effective_level == 1:
            prefix = f"{number_parts[0]}. "
        else:
            prefix = ".".join(number_parts) + " "

        new_lines.append(f"{'#' * level} {prefix}{title}")

    return '\n'.join(new_lines)


def fix_heading_numbers_in_file(file_path: str, dry_run: bool = False) -> None:
    try:
        content = safe_read(file_path)
        new_content = fix_heading_numbers(content)
        safe_write(file_path, new_content, dry_run=dry_run)
        logger.info("标题序号修复完成: %s", file_path)
    except Exception as e:
        logger.error("标题序号修复失败: %s - %s", file_path, e)
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python fix_heading_numbers.py <input_file> [--dry-run]")
        sys.exit(1)

    _dry_run = '--dry-run' in sys.argv
    fix_heading_numbers_in_file(sys.argv[1], dry_run=_dry_run)
