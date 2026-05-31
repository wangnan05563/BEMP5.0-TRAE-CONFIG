#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理 Markdown 文档标题中的重复序号
增强版：支持多重重复模式
"""

import re
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))
from utils.file_io import safe_read, safe_write
from utils.logger import get_logger

logger = get_logger(__name__)

_HEADING_RE = re.compile(r'^(#+)\s+(.+)$')

_DUP_NUM_RE = re.compile(
    r'^('
    r'\d+(?:\.\d+)?\s+'
    r'){2,}'
)


def clean_duplicate_numbers(content: str) -> str:
    lines = content.split('\n')
    new_lines: list = []

    for line in lines:
        match = _HEADING_RE.match(line)
        if not match:
            new_lines.append(line)
            continue

        level_marks = match.group(1)
        title = match.group(2)

        dup_match = _DUP_NUM_RE.match(title)
        if dup_match:
            first_num = dup_match.group(1).rstrip()
            rest = title[dup_match.end():]
            new_lines.append(f"{level_marks} {first_num} {rest}")
            continue

        new_lines.append(line)

    return '\n'.join(new_lines)


def clean_duplicate_numbers_in_file(file_path: str, dry_run: bool = False) -> None:
    try:
        content = safe_read(file_path)
        new_content = clean_duplicate_numbers(content)
        safe_write(file_path, new_content, dry_run=dry_run)
        logger.info("重复序号清理完成: %s", file_path)
    except Exception as e:
        logger.error("重复序号清理失败: %s - %s", file_path, e)
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python clean_duplicate_numbers.py <input_file> [--dry-run]")
        sys.exit(1)

    _dry_run = '--dry-run' in sys.argv
    clean_duplicate_numbers_in_file(sys.argv[1], dry_run=_dry_run)
