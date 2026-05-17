#!/usr/bin/env python3
"""
BEMP 服务健康检查脚本
检查后端API、前端页面、WebSocket是否可达

Usage:
    python scripts/health_check.py
    python scripts/health_check.py --config ../config/test_config.json
    python scripts/health_check.py --bank huisbank
"""

import json
import socket
import sys
import urllib.request
import urllib.error
import os
import argparse
from datetime import datetime


def load_config(config_path):
    config_file = os.path.join(os.path.dirname(__file__), config_path)
    with open(config_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_config(config):
    """
    校验 test_config.json 的结构完整性。
    优先使用 jsonschema 库进行严格校验，不可用时回退到轻量校验。
    返回 (is_valid, errors_list)
    """
    errors = []

    # --- 基础字段检查 ---
    if 'active_bank' not in config:
        errors.append("缺少必填字段: active_bank")
    elif config['active_bank'] not in config.get('banks', {}):
        errors.append(f"active_bank '{config['active_bank']}' 不在 banks 节点中")

    if 'host' not in config:
        errors.append("缺少必填字段: host")

    if 'services' not in config:
        errors.append("缺少必填字段: services")
    else:
        for svc_name in ('backend_api', 'frontend'):
            if svc_name not in config['services']:
                errors.append(f"services 缺少必填子节点: {svc_name}")

    # --- banks 结构检查 ---
    banks = config.get('banks', {})
    if not banks:
        errors.append("banks 节点至少需要配置一个银行")
    else:
        for bank_id, bank_cfg in banks.items():
            for field in ('name', 'url_prefix', 'login', 'pages'):
                if field not in bank_cfg:
                    errors.append(f"banks.{bank_id} 缺少必填字段: {field}")
            url_prefix = bank_cfg.get('url_prefix', '')
            if url_prefix and not (url_prefix.startswith('/') and url_prefix.endswith('/')):
                errors.append(f"banks.{bank_id}.url_prefix 格式不正确 (应为 /xxx/): {url_prefix}")
            login = bank_cfg.get('login', {})
            if not login:
                errors.append(f"banks.{bank_id}.login 至少需要一个角色账号")

    # --- 尝试 jsonschema 严格校验 ---
    schema_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'test_config.schema.json')
    if os.path.exists(schema_path):
        try:
            import jsonschema
            with open(schema_path, 'r', encoding='utf-8') as f:
                schema = json.load(f)
            validator = jsonschema.Draft7Validator(schema)
            schema_errors = sorted(validator.iter_errors(config), key=lambda e: e.path)
            for err in schema_errors:
                path = '.'.join(str(p) for p in err.path) if err.path else '(root)'
                errors.append(f"Schema({path}): {err.message}")
        except ImportError:
            pass

    return len(errors) == 0, errors


def get_bank_config(config, bank_id=None):
    if bank_id is None:
        bank_id = config.get('active_bank', '')
    banks = config.get('banks', {})
    if bank_id not in banks:
        print(f"[WARN] Bank '{bank_id}' not found in config, using first available")
        bank_id = next(iter(banks)) if banks else None
    if bank_id is None:
        return None, bank_id
    return banks[bank_id], bank_id


def check_port(host, port, timeout=5):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.error, ConnectionRefusedError, OSError):
        return False


def check_http(url, timeout=5):
    try:
        req = urllib.request.Request(url, method='GET')
        req.add_header('User-Agent', 'BEMP-HealthCheck/1.0')
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


def run_health_check(config):
    results = {}
    services = config.get('services', {})
    host = config.get('host', '127.0.0.1')

    print("=" * 50)
    print("  BEMP Service Health Check")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    print()

    all_healthy = True

    for name, svc in services.items():
        port = svc.get('port')
        url = svc.get('health_url')
        required = svc.get('required', True)

        port_ok = check_port(host, port) if port else False
        http_ok = check_http(url) if url else False
        healthy = port_ok and (http_ok if url else True)

        status_icon = "OK" if healthy else "FAIL"
        required_icon = "[REQUIRED]" if required else "[OPTIONAL]"

        print(f"  {required_icon} {name} ({host}:{port})")
        print(f"    Port:   {'OK' if port_ok else 'FAIL'}")
        if url:
            print(f"    HTTP:   {'OK' if http_ok else 'FAIL'}")
        print(f"    Status: {status_icon}")
        print()

        results[name] = {
            'port': port,
            'port_ok': port_ok,
            'http_ok': http_ok,
            'healthy': healthy,
            'required': required
        }

        if required and not healthy:
            all_healthy = False

    print("=" * 50)
    if all_healthy:
        print("  Result: ALL REQUIRED SERVICES HEALTHY")
    else:
        print("  Result: SOME REQUIRED SERVICES UNHEALTHY")
        print()
        print("  Suggestions:")
        for name, r in results.items():
            if r['required'] and not r['healthy']:
                print(f"    - Start {name} service (port {r['port']})")
    print("=" * 50)

    return all_healthy, results


def main():
    parser = argparse.ArgumentParser(description='BEMP Service Health Check')
    parser.add_argument('--config', default='../config/test_config.json',
                        help='Path to config file (default: ../config/test_config.json)')
    parser.add_argument('--bank', default=None,
                        help='Bank identifier to use (default: active_bank from config)')
    parser.add_argument('--validate-only', action='store_true',
                        help='Only validate config and exit (skip health check)')
    args = parser.parse_args()

    try:
        config = load_config(args.config)
    except FileNotFoundError:
        print(f"Config file not found: {args.config}")
        print("Using default configuration...")
        config = {
            "host": "127.0.0.1",
            "services": {
                "backend_api": {
                    "port": 8010,
                    "health_url": "http://127.0.0.1:8010/bemp-served/",
                    "required": True
                },
                "frontend": {
                    "port": 8091,
                    "health_url": "http://127.0.0.1:8091/",
                    "required": True
                },
                "redis": {
                    "port": 6379,
                    "required": True
                },
                "zookeeper": {
                    "port": 2181,
                    "required": True
                }
            }
        }

    # 配置校验
    is_valid, errors = validate_config(config)
    if errors:
        print("\n[CALCONFIG] 配置校验发现问题:")
        for err in errors:
            print(f"  - {err}")
        if not is_valid:
            print("\n[ERROR] 配置存在必填字段缺失，请修复后重试")
            sys.exit(1)

    if args.validate_only:
        print("\n[OK] 配置校验通过")
        sys.exit(0)

    bank_config, bank_id = get_bank_config(config, args.bank)
    if bank_config:
        print(f"  Active Bank: {bank_id} ({bank_config.get('name', '')})")
        print()

    healthy, results = run_health_check(config)
    sys.exit(0 if healthy else 1)


if __name__ == '__main__':
    main()
