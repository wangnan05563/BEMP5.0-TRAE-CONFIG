#!/usr/bin/env python3
"""
自动化测试产物定期清理工具
根据保留策略自动删除过期的报告、截图、会话状态及日志文件
清理后自动更新 aotutests-playwright/index.json

Usage:
    python scripts/cleanup.py                         # 使用默认保留策略
    python scripts/cleanup.py --report-days 30        # 报告保留30天
    python scripts/cleanup.py --screenshot-days 7     # 截图保留7天
    python scripts/cleanup.py --dry-run               # 预览模式（不实际删除）
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', '..'))
OUTPUT_ROOT = os.path.join(PROJECT_ROOT, 'aotutests-playwright')

DEFAULT_RETENTION = {
    'reports': 30,
    'screenshots': 14,
    'session_states': 7,
    'logs': 14
}


def scan_files(root_dir, pattern='*'):
    """递归扫描目录下的所有文件"""
    result = []
    if not os.path.exists(root_dir):
        return result
    for dirpath, _, filenames in os.walk(root_dir):
        for fn in filenames:
            if fn == '.gitkeep' or fn == 'index.json':
                continue
            filepath = os.path.join(dirpath, fn)
            mtime = os.path.getmtime(filepath)
            result.append((filepath, mtime))
    return result


def delete_expired(category, retention_days, cutoff_time, dry_run):
    """删除过期文件，返回删除计数"""
    cat_dir = os.path.join(OUTPUT_ROOT, category)
    deleted = 0
    if not os.path.exists(cat_dir):
        return 0
    for dirpath, _, filenames in os.walk(cat_dir):
        for fn in filenames:
            if fn == '.gitkeep':
                continue
            filepath = os.path.join(dirpath, fn)
            if os.path.getmtime(filepath) < cutoff_time:
                if not dry_run:
                    os.remove(filepath)
                    print(f"  [DEL] {category}/{os.path.relpath(filepath, cat_dir)}")
                else:
                    print(f"  [DRY-RUN] would delete: {category}/{os.path.relpath(filepath, cat_dir)}")
                deleted += 1
    # 清理空子目录
    if not dry_run and os.path.exists(cat_dir):
        for dirpath, dirnames, _ in os.walk(cat_dir, topdown=False):
            if dirpath == cat_dir:
                continue
            try:
                os.rmdir(dirpath)
            except OSError:
                pass
    return deleted


def update_index_after_cleanup():
    """清理后重新生成 index.json，只保留现存文件"""
    index_path = os.path.join(OUTPUT_ROOT, 'index.json')
    if not os.path.exists(index_path):
        return
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    except (json.JSONDecodeError, IOError):
        return

    valid_entries = []
    for entry in existing.get('entries', []):
        file_path = os.path.join(PROJECT_ROOT, entry.get('file', ''))
        if os.path.exists(file_path):
            valid_entries.append(entry)

    removed = len(existing.get('entries', [])) - len(valid_entries)
    existing['entries'] = valid_entries
    existing['total_entries'] = len(valid_entries)
    existing['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    existing['last_cleanup'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)
    return removed


def main():
    parser = argparse.ArgumentParser(description='清理自动化测试过期产物')
    parser.add_argument('--report-days', type=int, default=None,
                        help=f'报告保留天数 (默认: {DEFAULT_RETENTION["reports"]})')
    parser.add_argument('--screenshot-days', type=int, default=None,
                        help=f'截图保留天数 (默认: {DEFAULT_RETENTION["screenshots"]})')
    parser.add_argument('--session-days', type=int, default=None,
                        help=f'会话状态保留天数 (默认: {DEFAULT_RETENTION["session_states"]})')
    parser.add_argument('--log-days', type=int, default=None,
                        help=f'日志保留天数 (默认: {DEFAULT_RETENTION["logs"]})')
    parser.add_argument('--dry-run', action='store_true',
                        help='预览模式，不实际删除文件')
    args = parser.parse_args()

    print(f"[CLEANUP] 输出目录: {OUTPUT_ROOT}")
    print(f"[CLEANUP] 模式: {'预览 (--dry-run)' if args.dry_run else '执行'}")
    print()

    total_deleted = 0
    for category in ['reports', 'screenshots', 'session_states', 'logs']:
        retention = (
            getattr(args, f'{category.rstrip("s")}_days'.replace('session_state', 'session'), None)
            or DEFAULT_RETENTION[category]
        )
        cutoff = time.time() - retention * 86400
        cutoff_str = datetime.fromtimestamp(cutoff).strftime('%Y-%m-%d %H:%M:%S')

        deleted = delete_expired(category, retention, cutoff, args.dry_run)
        total_deleted += deleted
        print(f"[{category}] 保留 {retention} 天 (截断于 {cutoff_str}), 删除 {deleted} 项")

    if not args.dry_run:
        stale_removed = update_index_after_cleanup()
        if stale_removed:
            print(f"\n[INDEX] 从 index.json 移除 {stale_removed} 条过期记录")

    print(f"\n[CLEANUP] {'将' if args.dry_run else '已'}删除 {total_deleted} 项")
    if args.dry_run:
        print("[CLEANUP] 提示：去掉 --dry-run 执行实际删除")


if __name__ == '__main__':
    main()