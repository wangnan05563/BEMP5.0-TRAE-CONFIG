#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理 Markdown 文档标题中的重复序号
"""

import re

def clean_duplicate_numbers(content):
    """
    清理标题中的重复序号，如 "## 2.1 2.1 标题" -> "## 2.1 标题"
    """
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        # 匹配标题行
        match = re.match(r'^(#+)\s+(\d+[\.\d]*\s+)(\d+[\.\d]*\s+)(.+)$', line)
        if match:
            # 如果有重复序号，保留第一个，删除第二个
            level_marks = match.group(1)
            title = match.group(4)
            new_line = f"{level_marks} {match.group(2).strip()} {title}"
            new_lines.append(new_line)
        else:
            new_lines.append(line)
    
    return '\n'.join(new_lines)

def clean_duplicate_numbers_in_file(file_path):
    """清理指定文件中的重复序号"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = clean_duplicate_numbers(content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"重复序号清理完成：{file_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("用法: python clean_duplicate_numbers.py <input_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    clean_duplicate_numbers_in_file(input_file)