#!/usr/bin/env python3
"""
网站功能地图生成器
基于 Playwright MCP 自动探索目标网站，生成功能地图 MD 文件

Usage:
    python scripts/generate_functional_map.py
    python scripts/generate_functional_map.py --config ../config/generator-config.json
"""

import argparse
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.join(SCRIPT_DIR, '..')

sys.path.insert(0, SCRIPT_DIR)
from common import resolve_config_placeholders


def load_config(config_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    return resolve_config_placeholders(config)


def generate_map(config):
    """输出 Playwright MCP 探索指令序列，供 AI Agent 执行"""
    target = config.get('target', {})
    base_url = target.get('base_url', '')
    hash_route = target.get('hash_route', '#/')
    login_path = target.get('login_path', '#/login')

    instructions = {
        "step": "functional_map_generation",
        "target_url": f"{base_url}/{hash_route}",
        "login_url": f"{base_url}/{login_path}",
        "actions": [
            "1. 启动浏览器，访问 {login_url}",
            "2. 登录系统（使用 bemp-webapp-testing 的 LoginManager）",
            "3. 遍历左侧主菜单，记录每个子系统入口",
            "4. 进入每个子系统，遍历子菜单，记录页面路由",
            "5. 对每个页面：截图 + 提取关键元素（ID/选择器/功能）",
            "6. 记录页面间跳转关系和状态流转",
            "7. 输出功能地图 MD 文件（按 assets/templates/functional-map.md 模板）"
        ],
        "output_path": os.path.join(SKILL_DIR, config.get('output', {}).get(
            'functional_map', 'references/website-functional-map.md')),
        "bank_url_prefixes": {
            bid: b.get('url_prefix', '/') for bid, b in config.get('banks', {}).items()
            if bid != 'active_bank'
        }
    }
    return instructions


def main():
    parser = argparse.ArgumentParser(description='生成网站功能地图')
    parser.add_argument('--config', default='../config/generator-config.json',
                        help='配置文件路径')
    args = parser.parse_args()

    config = load_config(args.config)
    result = generate_map(config)

    output_path = result['output_path']
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\n[INFO] 请按上述指令序列通过 Playwright MCP 执行探索")
    print(f"[INFO] 输出路径: {output_path}")


if __name__ == '__main__':
    main()