#!/usr/bin/env python3
"""
测试数据准备脚本
通过 Oracle MCP / MySQL MCP 查询数据库，生成标准化测试数据文档

Usage:
    python scripts/prepare_test_data.py --module acceptance
    python scripts/prepare_test_data.py --module all --db oracle
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


def generate_data_instructions(config, module, db_type):
    """输出数据准备指令，供 AI Agent 通过 MCP 执行"""
    output_dir = os.path.join(SKILL_DIR, config.get('output', {}).get(
        'test_data_dir', 'test-data'))

    instructions = {
        "step": "test_data_preparation",
        "module": module,
        "db_type": db_type,
        "mcp_tools": {
            "oracle": [
                "mcp_oracle-mcp_list_schemas",
                "mcp_oracle-mcp_list_tables",
                "mcp_oracle-mcp_describe_table",
                "mcp_oracle-mcp_execute_query"
            ],
            "mysql": [
                "mcp_MySQL_execute_sql"
            ]
        },
        "workflow": [
            "1. 读取 test-cases/ 目录下目标模块的用例文件",
            "2. 提取每个用例的数据需求（前置条件中的数据）",
            "3. 通过 MCP 查询现有数据：SELECT COUNT(*) FROM [表] WHERE [条件]",
            "4. 识别数据缺口：需求量 - 现有可用量",
            "5. 生成补充 SQL（INSERT），通过 MCP 执行",
            "6. 验证数据就绪：SELECT 查询确认",
            "7. 输出测试数据 MD 文件（按 assets/templates/test-data.md 模板）"
        ],
        "output_dir": output_dir,
        "cleanup_note": "测试完成后须执行数据清理 DELETE，避免污染环境"
    }
    return instructions


def main():
    parser = argparse.ArgumentParser(description='准备测试数据')
    parser.add_argument('--config', default='../config/generator-config.json',
                        help='配置文件路径')
    parser.add_argument('--module', default='all',
                        help='目标模块')
    parser.add_argument('--db', default='oracle', choices=['oracle', 'mysql'],
                        help='数据库类型')
    args = parser.parse_args()

    config = load_config(args.config)
    result = generate_data_instructions(config, args.module, args.db)

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\n[INFO] 请按上述工作流通过 MCP 工具准备测试数据")


if __name__ == '__main__':
    main()