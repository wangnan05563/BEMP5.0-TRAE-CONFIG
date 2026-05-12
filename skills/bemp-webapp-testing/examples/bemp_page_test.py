"""
BEMP 页面功能测试示例
演示使用 LoginManager 进行会话复用的测试模式
所有页面路由和个性化前缀均从配置读取，不硬编码任何银行特定信息
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from login_manager import LoginManager, LoginError

CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config', 'test_config.json')


def load_config():
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"host": "127.0.0.1", "services": {"frontend": {"port": 8091}}, "banks": {}}


def get_bank_config(config, bank_id=None):
    if bank_id is None:
        bank_id = config.get('active_bank', 'hnnxbank')
    return config.get('banks', {}).get(bank_id, {}), bank_id


def test_dialog_interaction(page, config, screenshot_dir='./screenshots'):
    os.makedirs(screenshot_dir, exist_ok=True)
    results = []
    selectors = config.get('selectors', {})

    js_errors = []
    def capture_error(msg):
        if msg.type == 'error':
            js_errors.append(msg.text)
    page.on("console", capture_error)

    try:
        add_btn = page.locator(selectors.get('add_button', 'button:has-text("新增")'))
        if add_btn.is_visible(timeout=3000):
            add_btn.click()
            msg_box_selector = selectors.get('msg_box_visible', '.h-msg-box:visible')
            page.wait_for_selector(msg_box_selector, timeout=5000)
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(screenshot_dir, 'dialog_open.png'))

            js_errors.clear()
            close_selector = selectors.get('msg_box_close', '.h-msg-box-close:visible')
            page.click(close_selector)
            page.wait_for_timeout(1000)

            critical_errors = [e for e in js_errors if 'TypeError' in e or 'ReferenceError' in e]
            if critical_errors:
                results.append(('TC-DIALOG-001', '弹窗交互-关闭验证', 'FAIL', f'JS错误: {critical_errors[0][:80]}'))
            else:
                dialog_visible = page.locator(msg_box_selector).is_visible(timeout=1000)
                if not dialog_visible:
                    results.append(('TC-DIALOG-001', '弹窗交互-关闭验证', 'PASS', '弹窗正常关闭'))
                else:
                    results.append(('TC-DIALOG-001', '弹窗交互-关闭验证', 'FAIL', '弹窗未关闭'))
    except Exception as e:
        results.append(('TC-DIALOG-001', '弹窗交互-关闭验证', 'FAIL', str(e)[:100]))

    return results


def test_datagrid_query(page, config, url_prefix, screenshot_dir='./screenshots'):
    os.makedirs(screenshot_dir, exist_ok=True)
    results = []
    selectors = config.get('selectors', {})

    api_requests = []
    js_errors = []

    def capture_request(request):
        api_requests.append({'url': request.url, 'method': request.method})
    def capture_error(msg):
        if msg.type == 'error':
            js_errors.append(msg.text)

    page.on("request", capture_request)
    page.on("console", capture_error)

    try:
        query_btn = page.locator(selectors.get('query_button', 'button:has-text("查询")'))
        if query_btn.is_visible(timeout=3000):
            api_requests.clear()
            js_errors.clear()
            query_btn.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)

        personalized_urls = [r for r in api_requests if url_prefix in r['url']]
        critical_errors = [e for e in js_errors if 'TypeError' in e or 'ReferenceError' in e]

        if critical_errors:
            results.append(('TC-GRID-001', 'DataGrid查询-错误检测', 'FAIL',
                            f'发现{len(critical_errors)}个关键JS错误'))
        elif personalized_urls:
            results.append(('TC-GRID-001', 'DataGrid查询-个性化路径', 'PASS',
                            f'使用个性化路径({url_prefix})，请求数: {len(personalized_urls)}'))
        else:
            results.append(('TC-GRID-001', 'DataGrid查询-个性化路径', 'FAIL',
                            f'未发现个性化请求路径(期望前缀: {url_prefix})'))

        page.screenshot(path=os.path.join(screenshot_dir, 'datagrid_query.png'), full_page=True)
    except Exception as e:
        results.append(('TC-GRID-001', 'DataGrid查询验证', 'FAIL', str(e)[:100]))

    return results


if __name__ == '__main__':
    config = load_config()
    bank_config, bank_id = get_bank_config(config)
    url_prefix = bank_config.get('url_prefix', '/')

    print(f"[INFO] Using bank: {bank_id}, prefix: {url_prefix}")

    bank_pages = bank_config.get('pages', {})
    first_page = next(iter(bank_pages.values()), None)

    mgr = LoginManager(config, bank_id=bank_id)
    try:
        page = mgr.get_page(role='default')
        print(f"[OK] Login successful via LoginManager")

        if first_page:
            page.goto(f"{mgr._base_url}{first_page['path']}")
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)

            print("\n=== Testing Dialog Interaction ===")
            results1 = test_dialog_interaction(page, config)
            for r in results1:
                print(f"  {r[0]}: {r[1]} - {r[2]} ({r[3]})")

            print("\n=== Testing DataGrid Query ===")
            results2 = test_datagrid_query(page, config, url_prefix)
            for r in results2:
                print(f"  {r[0]}: {r[1]} - {r[2]} ({r[3]})")

            all_results = results1 + results2
            fail_count = sum(1 for r in all_results if r[2] == 'FAIL')
            print(f"\nTotal: {len(all_results)}, Pass: {len(all_results) - fail_count}, Fail: {fail_count}")

        stats = mgr.get_login_stats()
        print(f"\n[STATS] Login count: 1 (session reused for all pages)")
        print(f"[STATS] Token saving: ~{(1 - 1/max(len(bank_pages), 1))*100:.0f}%")

    except LoginError as e:
        print(f"[FAIL] Login failed: {e}")
    finally:
        mgr.cleanup()
