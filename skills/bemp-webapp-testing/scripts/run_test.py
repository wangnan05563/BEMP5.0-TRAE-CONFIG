#!/usr/bin/env python3
"""
BEMP 通用测试运行器
基于配置驱动，自动执行健康检查、登录、功能测试，生成测试报告
支持通过 --bank 参数切换不同银行环境
使用 LoginManager 实现会话复用，减少token消耗

Usage:
    python scripts/run_test.py --help
    python scripts/run_test.py --test all
    python scripts/run_test.py --test branch --bank hnnxbank
    python scripts/run_test.py --test all --bank huisbank --no-headless
    python scripts/run_test.py --test all --role admin
"""

import argparse
import json
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', '..'))

sys.path.insert(0, os.path.dirname(__file__))
from health_check import run_health_check, load_config, get_bank_config, validate_config
from login_manager import LoginManager, LoginError


def ensure_playwright():
    try:
        from playwright.sync_api import sync_playwright
        return True
    except ImportError:
        print("[ERROR] Playwright not installed. Run: pip install playwright && playwright install chromium")
        return False


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


def run_tests(test_module, config, bank_id, screenshot_dir, headless=True, role='default'):
    from playwright.sync_api import sync_playwright

    bank_config, resolved_bank_id = get_bank_config(config, bank_id)
    if not bank_config:
        print(f"[ERROR] Bank configuration not found: {bank_id}")
        return []

    url_prefix = bank_config.get('url_prefix', '/')
    bank_pages = bank_config.get('pages', {})

    os.makedirs(screenshot_dir, exist_ok=True)
    results = []
    login_count = 0

    with sync_playwright() as p:
        launch_opts = config.get('test', {}).get('browser', {}).get('launch_options', {})
        browser = p.chromium.launch(**{
            k: v for k, v in launch_opts.items() if k in ('headless', 'channel', 'args')
        })
        if not headless:
            browser = p.chromium.launch(headless=False)

        mgr = LoginManager(config, bank_id=bank_id, browser=browser, playwright_instance=p)

        print(f"\n[STEP 1] Logging in (role={role}, bank={resolved_bank_id})")
        try:
            page = mgr.get_page(role=role)
            login_count = 1
        except LoginError as e:
            results.append({
                'case_id': 'TC-COMMON-001',
                'name': '系统登录',
                'status': 'FAIL',
                'detail': f'登录失败: {str(e)}',
                'screenshot': '-'
            })
            mgr.cleanup()
            return results

        page.screenshot(path=os.path.join(screenshot_dir, "02_after_login.png"))
        results.append({
            'case_id': 'TC-COMMON-001',
            'name': '系统登录',
            'status': 'PASS',
            'detail': f'登录成功 (bank={resolved_bank_id}, user={role}, session_reused={login_count == 0})',
            'screenshot': '02_after_login.png'
        })

        js_errors = capture_errors(page)
        api_requests = capture_requests(page)

        test_pages = get_test_pages(bank_pages, test_module)
        for idx, (page_key, page_info) in enumerate(test_pages.items(), 3):
            page_name = page_info.get('name', page_key)
            page_path = page_info.get('path', '')
            require_personalized = page_info.get('require_personalized', False)
            checks = page_info.get('checks', [])

            print(f"[STEP {idx}] Testing: {page_name} ({page_path})")

            if not mgr._is_page_session_valid(page):
                print(f"  [WARN] Session expired, refreshing...")
                try:
                    page = mgr.refresh_session(role)
                    login_count += 1
                    js_errors = capture_errors(page)
                    api_requests = capture_requests(page)
                except LoginError:
                    results.append({
                        'case_id': page_info.get('case_id', f'TC-{idx}'),
                        'name': page_name,
                        'status': 'BLOCKED',
                        'detail': '会话刷新失败',
                        'screenshot': '-'
                    })
                    continue

            js_errors.clear()
            api_requests.clear()

            page.goto(f"{mgr._base_url}{page_path}")
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)

            screenshot_file = f"{idx:02d}_{page_name.replace(' ', '_')}.png"
            page.screenshot(path=os.path.join(screenshot_dir, screenshot_file), full_page=True)

            critical_errors = filter_critical_errors(js_errors, config)
            personalized_urls = filter_personalized_urls(api_requests, url_prefix)

            status = 'PASS'
            details = []

            if critical_errors:
                status = 'FAIL'
                details.append(f"JS错误: {len(critical_errors)}个")
                for err in critical_errors[:3]:
                    details.append(f"  - {err[:100]}")

            if require_personalized and not personalized_urls:
                status = 'FAIL'
                details.append(f"未使用个性化URL路径(期望前缀: {url_prefix})")

            for check in checks:
                check_type = check.get('type')
                if check_type == 'text_visible':
                    text = check.get('text', '')
                    if page.locator(f'text={text}').is_visible(timeout=3000):
                        details.append(f"字段'{text}'显示正常")
                    else:
                        status = 'FAIL'
                        details.append(f"字段'{text}'未显示")

            results.append({
                'case_id': page_info.get('case_id', f'TC-{idx}'),
                'name': page_name,
                'status': status,
                'detail': '; '.join(details) if details else '页面加载正常',
                'screenshot': screenshot_file,
                'js_errors': len(critical_errors),
                'personalized_urls': len(personalized_urls)
            })

        stats = mgr.get_login_stats()
        print(f"\n[STATS] Login count: {login_count}, Roles: {stats['active_roles']}")

        mgr.cleanup()

    results_meta = {
        'login_count': login_count,
        'pages_tested': len(test_pages),
        'token_saving_pct': round((1 - login_count / max(len(test_pages), 1)) * 100, 1)
    }
    results.append(results_meta)

    return results


def get_test_pages(bank_pages, test_module):
    if test_module == 'all':
        return bank_pages

    filtered = {}
    for key, page_info in bank_pages.items():
        page_path = page_info.get('path', '')
        if test_module == 'branch' and '/sm/' in page_path:
            filtered[key] = page_info
        elif test_module == 'sign' and '/bm/sign/' in page_path:
            filtered[key] = page_info
        elif test_module == 'cust' and '/bm/cust/' in page_path:
            filtered[key] = page_info
        elif key == test_module:
            filtered[key] = page_info

    return filtered


def resolve_output_path(relative_path):
    """将配置中的相对路径解析为项目根目录下的绝对路径"""
    if os.path.isabs(relative_path):
        return relative_path
    return os.path.normpath(os.path.join(PROJECT_ROOT, relative_path))


def generate_report(results, output_dir, bank_id):
    now = datetime.now()
    month_dir = os.path.join(output_dir, bank_id, now.strftime('%Y-%m'))
    os.makedirs(month_dir, exist_ok=True)
    timestamp = now.strftime('%Y%m%d_%H%M%S')
    report_file = os.path.join(month_dir, f"{bank_id}_{timestamp}_report.md")

    meta = None
    test_results = []
    for r in results:
        if isinstance(r, dict) and 'login_count' in r:
            meta = r
        else:
            test_results.append(r)

    pass_count = sum(1 for r in test_results if r['status'] == 'PASS')
    fail_count = sum(1 for r in test_results if r['status'] == 'FAIL')
    total = len(test_results)

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"# BEMP 功能测试报告 ({bank_id})\n\n")
        f.write(f"**测试时间**：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**银行环境**：{bank_id}\n\n")
        f.write(f"**测试结果**：{pass_count}/{total} 通过")
        if fail_count > 0:
            f.write(f"，{fail_count} 失败")
        f.write("\n\n")

        if meta:
            f.write("## Token消耗统计\n\n")
            f.write(f"| 指标 | 值 |\n")
            f.write(f"|------|----|\n")
            f.write(f"| 实际登录次数 | {meta['login_count']} |\n")
            f.write(f"| 测试页面数 | {meta['pages_tested']} |\n")
            f.write(f"| Token节省比例 | {meta['token_saving_pct']}%% |\n\n")

        f.write("## 测试结果汇总\n\n")
        f.write("| 用例编号 | 用例名称 | 状态 | 详情 |\n")
        f.write("|---------|---------|------|------|\n")
        for r in test_results:
            status_icon = "PASS" if r['status'] == 'PASS' else r['status']
            f.write(f"| {r['case_id']} | {r['name']} | {status_icon} | {r.get('detail', '-')} |\n")

        f.write("\n## 详细测试记录\n\n")
        for r in test_results:
            f.write(f"### {r['case_id']}: {r['name']}\n\n")
            f.write(f"- **状态**：{r['status']}\n")
            f.write(f"- **详情**：{r.get('detail', '-')}\n")
            f.write(f"- **截图**：{r.get('screenshot', '-')}\n")
            if r.get('js_errors'):
                f.write(f"- **JS错误数**：{r['js_errors']}\n")
            if r.get('personalized_urls') is not None:
                f.write(f"- **个性化URL数**：{r['personalized_urls']}\n")
            f.write("\n")

    print(f"\nReport saved to: {report_file}")
    return report_file


def run_pre_code_checks(project_root, bank_id=None):
    import subprocess
    issues = []

    if bank_id is None:
        bank_id = "hnnxbank"

    frontend_dir = os.path.join(project_root, "frontend", "src", "views", "bizViews", "banks", bank_id)
    index_file = os.path.join(project_root, "frontend", "src", "api", "bank", f"{bank_id}Index.js")

    checks = [
        ("F-01", "@on-click事件绑定", f'Select-String -Path "{frontend_dir}\\**\\*.vue" -Pattern "@on-click" -Recurse', 0),
        ("F-04", "Col拼写错误", f'Select-String -Path "{frontend_dir}\\**\\*.vue" -Pattern "\\bCol:" -Recurse', 0),
    ]

    if os.path.exists(index_file):
        checks.append(("F-02", "@views/路径缺少/", f'Select-String -Path "{index_file}" -Pattern "@views/"', 0))

    for check_id, check_name, ps_cmd, expected_count in checks:
        try:
            result = subprocess.run(
                ["powershell", "-Command", ps_cmd],
                capture_output=True, text=True, timeout=30
            )
            match_count = result.stdout.strip().count("\n") + 1 if result.stdout.strip() else 0
            if result.stdout.strip() == "":
                match_count = 0
            if match_count > expected_count:
                issues.append(f"[{check_id}] {check_name}: 发现{match_count}处问题")
        except Exception as e:
            issues.append(f"[{check_id}] {check_name}: 检查失败({str(e)[:50]})")

    return issues


def main():
    parser = argparse.ArgumentParser(description='BEMP Test Runner')
    parser.add_argument('--test', default='all',
                        help='Test module to run (default: all). Options: all, branch, sign, cust, or specific page key')
    parser.add_argument('--config', default='../config/test_config.json',
                        help='Path to config file')
    parser.add_argument('--bank', default=None,
                        help='Bank identifier (default: active_bank from config)')
    parser.add_argument('--role', default='default',
                        help='Login role (default: default). Options: default, admin, or custom role from config')
    parser.add_argument('--screenshot-dir', default=None,
                        help='Directory for screenshots (default: from config → aotutests-playwright/screenshots)')
    parser.add_argument('--output-dir', default=None,
                        help='Directory for test reports (default: from config → aotutests-playwright/reports)')
    parser.add_argument('--no-headless', action='store_true',
                        help='Run browser in visible mode')
    parser.add_argument('--skip-health-check', action='store_true',
                        help='Skip health check before testing')
    parser.add_argument('--skip-code-check', action='store_true',
                        help='Skip pre-code checks before testing')
    parser.add_argument('--project-root', default='../../..',
                        help='Project root directory for code checks')
    parser.add_argument('--cleanup-states', action='store_true',
                        help='Clean up cached session states before running')
    parser.add_argument('--auto-cleanup', action='store_true',
                        help='Auto-clean expired reports/screenshots/sessions before test')
    args = parser.parse_args()

    if not ensure_playwright():
        sys.exit(1)

    try:
        config = load_config(args.config)
    except FileNotFoundError:
        config = {
            "host": "127.0.0.1",
            "active_bank": "",
            "services": {
                "backend_api": {"port": 8010, "health_url": "http://127.0.0.1:8010/bemp-served/", "required": True},
                "frontend": {"port": 8091, "health_url": "http://127.0.0.1:8091/", "required": True}
            },
            "banks": {
                "PLACEHOLDER": {
                    "name": "请配置实际银行信息",
                    "url_prefix": "/PLACEHOLDER/",
                    "login": {"default": {"username": "PLACEHOLDER", "password": "PLACEHOLDER"}},
                    "pages": {}
                }
            }
        }

    bank_config, bank_id = get_bank_config(config, args.bank)
    if not bank_config:
        print(f"[ERROR] Bank '{args.bank}' not found in config")
        sys.exit(1)

    # 配置完整性校验
    is_valid, errors = validate_config(config)
    if errors:
        print("\n[CONFIG] 配置校验发现问题:")
        for err in errors:
            print(f"  - {err}")
        if not is_valid:
            print("\n[ERROR] 配置存在必填字段缺失，请修复后重试")
            sys.exit(1)

    print(f"[INFO] Using bank: {bank_id} ({bank_config.get('name', '')})")
    print(f"[INFO] URL prefix: {bank_config.get('url_prefix', '/')}")
    print(f"[INFO] Login role: {args.role}")

    if args.auto_cleanup:
        print("[CLEANUP] Auto-cleaning expired test artifacts...")
        from cleanup import main as cleanup_main
        import sys as _sys
        _sys.argv = ['cleanup.py', '--report-days', '30', '--screenshot-days', '14', '--session-days', '7', '--log-days', '14']
        cleanup_main()

    if args.cleanup_states:
        state_dir = resolve_output_path(config.get('session', {}).get('state_dir', 'aotutests-playwright/session_states'))
        cleaned = 0
        if os.path.exists(state_dir):
            for f in os.listdir(state_dir):
                if f.endswith('_state.json'):
                    os.remove(os.path.join(state_dir, f))
                    cleaned += 1
        print(f"[INFO] Cleaned {cleaned} cached session states")

    if not args.skip_code_check:
        print("[PRE-CHECK] Running code pre-checks...")
        code_issues = run_pre_code_checks(PROJECT_ROOT, bank_id)
        if code_issues:
            print("\n[WARNING] Code pre-checks found issues:")
            for issue in code_issues:
                print(f"  {issue}")
            print("[WARNING] Consider fixing these issues before testing.")
        else:
            print("[OK] Code pre-checks passed.")

    if not args.skip_health_check:
        print("[PRE-CHECK] Running health check...")
        healthy, _ = run_health_check(config)
        if not healthy:
            print("\n[ABORT] Required services not available. Start services first.")
            sys.exit(1)

    print(f"\n[RUN] Starting tests: {args.test} (bank={bank_id}, role={args.role})")
    screenshot_dir = args.screenshot_dir or resolve_output_path(
        config.get('test', {}).get('screenshot_dir', 'aotutests-playwright/screenshots'))
    output_dir = args.output_dir or resolve_output_path(
        config.get('test', {}).get('report_dir', 'aotutests-playwright/reports'))
    results = run_tests(args.test, config, bank_id, screenshot_dir,
                        headless=not args.no_headless, role=args.role)

    meta = None
    test_results = []
    for r in results:
        if isinstance(r, dict) and 'login_count' in r:
            meta = r
        else:
            test_results.append(r)

    report_file = generate_report(results, output_dir, bank_id)
    update_index(report_file, bank_id, args.test, meta)

    if meta:
        print(f"\n[TOKEN] Login count: {meta['login_count']}, Pages: {meta['pages_tested']}, Saving: {meta['token_saving_pct']}%")

    fail_count = sum(1 for r in test_results if r['status'] == 'FAIL')
    sys.exit(1 if fail_count > 0 else 0)


def update_index(report_path, bank_id, test_mode, meta):
    index_path = resolve_output_path('aotutests-playwright/index.json')
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
        "pages_tested": meta.get('pages_tested', 0) if meta else 0,
        "login_count": meta.get('login_count', 0) if meta else 0
    }
    existing['entries'].append(entry)
    existing['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    existing['total_entries'] = len(existing['entries'])
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)


if __name__ == '__main__':
    main()
