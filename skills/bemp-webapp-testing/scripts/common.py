#!/usr/bin/env python3
"""
BEMP 测试公共模块
抽取各测试脚本共享的基础设施：路径解析、截图、索引更新、错误/API监听、选择器获取
"""

import json
import os
import time
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', '..'))
OUTPUT_ROOT = os.path.join(PROJECT_ROOT, 'aotutests-playwright')


def resolve_output_path(relative_path):
    if os.path.isabs(relative_path):
        return relative_path
    return os.path.normpath(os.path.join(PROJECT_ROOT, relative_path))


def get_output_root(config=None):
    if config:
        configured = config.get('test', {}).get('output_root', '')
        if configured:
            return resolve_output_path(configured)
    return OUTPUT_ROOT


def get_selector(config, name, **kwargs):
    selectors = config.get('selectors', {})
    selector = selectors.get(name, '')
    for key, value in kwargs.items():
        selector = selector.replace('{' + key + '}', str(value))
    return selector


def capture_errors(page):
    js_errors = []
    def on_console(msg):
        if msg.type == 'error':
            js_errors.append(msg.text)
    page.on("console", on_console)
    return js_errors


def capture_requests(page):
    api_requests = []
    def on_request(request):
        api_requests.append({'url': request.url, 'method': request.method})
    page.on("request", on_request)
    return api_requests


def filter_critical_errors(js_errors, config):
    critical_patterns = config.get('error_filters', {}).get('critical_errors', ['TypeError', 'ReferenceError'])
    return [e for e in js_errors if any(p in e for p in critical_patterns)]


def filter_personalized_urls(api_requests, url_prefix):
    return [r for r in api_requests if url_prefix in r['url']]


def take_screenshot(page, name, screenshot_dir, bank_id=''):
    os.makedirs(screenshot_dir, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    bank_prefix = f"{bank_id}_" if bank_id else ''
    filename = f"{ts}_{bank_prefix}{name}.png"
    path = os.path.join(screenshot_dir, filename)
    page.screenshot(path=path, full_page=True)
    return path


def update_index(report_path, bank_id, test_mode, meta=None, config=None):
    index_path = os.path.join(get_output_root(config), 'index.json')
    existing = {}
    if os.path.exists(index_path):
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    if 'entries' not in existing:
        existing['entries'] = []
    entry = {
        "file": os.path.relpath(report_path, PROJECT_ROOT).replace('\\', '/'),
        "bank_id": bank_id,
        "mode": test_mode,
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    }
    if meta:
        entry["pages_tested"] = meta.get('pages_tested', 0)
        entry["login_count"] = meta.get('login_count', 0)
        entry["pass"] = meta.get('pass', 0)
        entry["fail"] = meta.get('fail', 0)
    existing['entries'].append(entry)
    existing['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    existing['total_entries'] = len(existing['entries'])
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)


def get_screenshot_dir(config=None, bank_id=''):
    base = resolve_output_path(
        config.get('test', {}).get('screenshot_dir', 'aotutests-playwright/screenshots')
    ) if config else os.path.join(OUTPUT_ROOT, 'screenshots')
    if bank_id:
        month_dir = datetime.now().strftime('%Y-%m')
        return os.path.join(base, bank_id, month_dir)
    return base


def get_report_dir(config=None, bank_id=''):
    base = resolve_output_path(
        config.get('test', {}).get('report_dir', 'aotutests-playwright/reports')
    ) if config else os.path.join(OUTPUT_ROOT, 'reports')
    if bank_id:
        month_dir = datetime.now().strftime('%Y-%m')
        return os.path.join(base, bank_id, month_dir)
    return base


def wait_for_network_idle(page, timeout=10000):
    try:
        page.wait_for_load_state("networkidle", timeout=timeout)
    except Exception:
        pass
    time.sleep(0.3)


def safe_click(page, locator, timeout=5000, force=False):
    try:
        locator.click(timeout=timeout)
        return True
    except Exception:
        try:
            locator.click(timeout=timeout, force=True)
            return True
        except Exception:
            return False


def dismiss_all_modals(page):
    try:
        page.evaluate("""() => {
            document.querySelectorAll('.h-modal-wrap').forEach(m => { if(m.parentNode) m.parentNode.removeChild(m); });
            document.querySelectorAll('[data-transfer="true"]').forEach(t => { if(t.parentNode) t.parentNode.removeChild(t); });
        }""")
        time.sleep(0.3)
    except Exception:
        pass
