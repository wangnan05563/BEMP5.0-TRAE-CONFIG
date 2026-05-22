#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
安全文件读写工具
提供备份机制、输入验证、异常处理
"""

import shutil
from pathlib import Path
from typing import Optional

MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.md', '.markdown'}


def validate_file(file_path: str) -> Path:
    path = Path(file_path).resolve()

    if not path.exists():
        raise FileNotFoundError(f"文件不存在: {path}")

    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError(f"仅支持 Markdown 文件({', '.join(ALLOWED_EXTENSIONS)})，当前: {path.suffix}")

    if path.stat().st_size > MAX_FILE_SIZE:
        raise ValueError(
            f"文件超过 {MAX_FILE_SIZE // 1024 // 1024}MB 限制: "
            f"{path.stat().st_size / 1024 / 1024:.1f}MB"
        )

    return path


def safe_read(file_path: str, encoding: str = 'utf-8') -> str:
    path = validate_file(file_path)
    try:
        content = path.read_text(encoding=encoding)
    except UnicodeDecodeError:
        try:
            content = path.read_text(encoding='utf-8-sig')
        except UnicodeDecodeError:
            raise ValueError(
                f"文件编码无法识别: {path}，请确保文件为 UTF-8 编码"
            )

    return content


def safe_write(
    file_path: str,
    content: str,
    backup: bool = True,
    encoding: str = 'utf-8',
    dry_run: bool = False,
) -> Optional[str]:
    path = Path(file_path).resolve()

    if dry_run:
        return None

    if backup and path.exists():
        backup_path = path.with_suffix(path.suffix + '.bak')
        shutil.copy2(path, backup_path)

    path.write_text(content, encoding=encoding)
    return str(path)
