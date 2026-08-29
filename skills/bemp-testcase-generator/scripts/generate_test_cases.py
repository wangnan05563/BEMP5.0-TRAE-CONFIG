#!/usr/bin/env python3
"""
测试用例生成器
读取功能地图和优先级矩阵，按模板生成 P0 级别测试用例 MD 文件

Usage:
    python scripts/generate_test_cases.py --module acceptance
    python scripts/generate_test_cases.py --priority P0 --module all
"""

import argparse
import json
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.join(SCRIPT_DIR, '..')

sys.path.insert(0, SCRIPT_DIR)
from common import resolve_config_placeholders


def load_config(config_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    return resolve_config_placeholders(config)


def load_template(template_name):
    template_path = os.path.join(SKILL_DIR, 'assets', 'templates', template_name)
    if os.path.exists(template_path):
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    return ""


def get_case_prefix(module, config):
    prefixes = config.get('case_id_prefixes', {})
    for prefix, name in prefixes.items():
        if module.upper() in prefix or module.lower() in name.lower():
            return prefix
    return module.upper()


def _get_default_bank_code():
    """银行单一入口：环境变量 BANK_CODE > _shared/env-config.json environmentDefaults。
    读不到返回 None（不硬编码回退银行名），由调用方显式报错。
    注意：不读顶层 bank.code——该字段是 ${ENV:BANK_CODE} 嵌套占位符，
    json.load 后为字面量，会产生 '${ENV:BANK_CODE}' 这样的非法银行名。"""
    env_val = os.environ.get('BANK_CODE')
    if env_val:
        return env_val
    env_config_path = os.path.join(SKILL_DIR, '..', '_shared', 'env-config.json')
    if os.path.exists(env_config_path):
        try:
            with open(env_config_path, 'r', encoding='utf-8') as f:
                shared = json.load(f)
            defaults = shared.get('environmentDefaults') or {}
            if defaults.get('BANK_CODE'):
                return defaults['BANK_CODE']
        except (json.JSONDecodeError, IOError):
            pass
    return None


def generate_cases(config, module, priority, bank_id):
    """输出用例生成指令，供 AI Agent 按模板填充"""
    bank_config = config.get('banks', {}).get(bank_id, {})
    url_prefix = bank_config.get('url_prefix', '/')
    case_prefix = get_case_prefix(module, config)

    output_dir = os.path.join(SKILL_DIR, config.get('output', {}).get(
        'test_cases_dir', 'test-cases'))

    instructions = {
        "step": "test_case_generation",
        "module": module,
        "priority": priority,
        "bank_id": bank_id,
        "url_prefix": url_prefix,
        "case_prefix": case_prefix,
        "template": "test-case-P0.md" if priority == "P0" else "test_case_template.md",
        "output_dir": output_dir,
        "generation_rules": [
            "1. 每个功能模块至少1个正常流程 + 1个异常流程",
            "2. 边界测试：最大/最小输入值、空值、特殊符号",
            "3. 用户体验：模拟真实用户操作习惯",
            "4. 用例编号格式：TC-{case_prefix}-{三位序号}",
            "5. 所有路径使用 {url_prefix} 前缀",
            "6. 验证点须含：功能验证 + 个性化路径 + 控制台错误"
        ]
    }
    return instructions


def main():
    parser = argparse.ArgumentParser(description='生成测试用例')
    parser.add_argument('--config', default='../config/generator-config.json',
                        help='配置文件路径')
    parser.add_argument('--module', default='all',
                        help='目标模块 (acceptance/discount/pledge/branch/all)')
    parser.add_argument('--priority', default='P0',
                        help='优先级 (P0/P1/P2/P3)')
    parser.add_argument('--bank', default=None,
                        help='银行标识 (默认: active_bank)')
    args = parser.parse_args()

    config = load_config(args.config)
    # 银行优先级：CLI --bank > config.active_bank（字面值）> 单一入口（环境变量/_shared）。
    # config.active_bank 为 ${ENV:BANK_CODE} 占位符时视为未指定，走单一入口，防止配置内写死银行压过 _shared。
    bank_id = args.bank
    if not bank_id:
        raw_active = config.get('banks', {}).get('active_bank')
        if raw_active and '${ENV:' not in raw_active:
            bank_id = raw_active
        else:
            bank_id = _get_default_bank_code()
    if not bank_id:
        raise SystemExit('[ERROR] 无法确定当前银行：请 --bank 指定、设置环境变量 BANK_CODE 或在 _shared/env-config.json 配置默认值')

    result = generate_cases(config, args.module, args.priority, bank_id)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\n[INFO] 请按上述规则和模板生成测试用例 MD 文件")


if __name__ == '__main__':
    main()