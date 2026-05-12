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

    bank_config, bank_id = get_bank_config(config, args.bank)
    if bank_config:
        print(f"  Active Bank: {bank_id} ({bank_config.get('name', '')})")
        print()

    healthy, results = run_health_check(config)
    sys.exit(0 if healthy else 1)


if __name__ == '__main__':
    main()
