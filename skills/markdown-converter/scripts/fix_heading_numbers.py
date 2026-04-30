#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 Markdown 文档标题序号（最终版本）
"""

import re

def fix_heading_numbers(content):
    """
    修复标题序号
    """
    lines = content.split('\n')
    
    # 计数器
    h1_count = 0
    h2_count = 0
    h3_count = 0
    h4_count = 0
    h5_count = 0
    h6_count = 0
    
    new_lines = []
    
    for line in lines:
        # 匹配标题行
        match = re.match(r'^(#+)\s+(.+)$', line)
        if match:
            level = len(match.group(1))
            title = match.group(2)
            
            # 移除所有可能的旧序号（多种模式）
            # 模式 1: "1. 1. " (重复)
            title = re.sub(r'^\d+\.\s+\d+\.\s+', '', title)
            # 模式 2: "1. " (单个)
            title = re.sub(r'^\d+\.\s+', '', title)
            # 模式 3: "1 " (无点)
            title = re.sub(r'^\d+\s+', '', title)
            
            if level == 1:
                h1_count += 1
                h2_count = 0
                h3_count = 0
                h4_count = 0
                h5_count = 0
                h6_count = 0
                new_line = f"# {h1_count}. {title}"
            elif level == 2:
                h2_count += 1
                h3_count = 0
                h4_count = 0
                h5_count = 0
                h6_count = 0
                new_line = f"## {h1_count}.{h2_count} {title}"
            elif level == 3:
                h3_count += 1
                h4_count = 0
                h5_count = 0
                h6_count = 0
                new_line = f"### {h1_count}.{h2_count}.{h3_count} {title}"
            elif level == 4:
                h4_count += 1
                h5_count = 0
                h6_count = 0
                new_line = f"#### {h1_count}.{h2_count}.{h3_count}.{h4_count} {title}"
            elif level == 5:
                h5_count += 1
                h6_count = 0
                new_line = f"##### {h1_count}.{h2_count}.{h3_count}.{h4_count}.{h5_count} {title}"
            elif level == 6:
                h6_count += 1
                new_line = f"###### {h1_count}.{h2_count}.{h3_count}.{h4_count}.{h5_count}.{h6_count} {title}"
            else:
                new_line = line
            
            new_lines.append(new_line)
        else:
            new_lines.append(line)
    
    return '\n'.join(new_lines)

def fix_heading_numbers_in_file(file_path):
    """修复指定文件中的标题序号"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = fix_heading_numbers(content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"标题序号修复完成：{file_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("用法: python fix_heading_numbers.py <input_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    fix_heading_numbers_in_file(input_file)