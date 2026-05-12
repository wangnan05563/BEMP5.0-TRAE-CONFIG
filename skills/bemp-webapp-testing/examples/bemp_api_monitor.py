"""
BEMP API 路径监控示例
演示如何监控和验证 API 请求是否使用个性化路径
支持通过配置切换不同银行的个性化前缀
"""

from playwright.sync_api import sync_playwright
import json
import os

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


def monitor_api_paths(page, base_url, url_prefix, test_pages, product_patterns, screenshot_dir='./screenshots'):
    """
    通用API路径监控：
    1. 遍历测试页面
    2. 监听请求
    3. 区分个性化请求和产品化请求
    4. 验证个性化路径使用情况
    """
    os.makedirs(screenshot_dir, exist_ok=True)
    results = []

    for page_info in test_pages:
        name = page_info['name']
        path = page_info['path']
        require_personalized = page_info.get('require_personalized', True)

        api_requests = []
        def capture_request(request, _prefix=url_prefix):
            api_requests.append({
                'url': request.url,
                'method': request.method,
                'is_personalized': _prefix in request.url
            })
        page.on("request", capture_request)

        api_requests.clear()
        page.goto(f"{base_url}{path}")
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        try:
            query_btn = page.locator('button:has-text("查询")')
            if query_btn.is_visible(timeout=3000):
                query_btn.click()
                page.wait_for_load_state('networkidle')
                page.wait_for_timeout(1000)
        except Exception:
            pass

        personalized_requests = [r for r in api_requests if r['is_personalized']]
        product_requests = [r for r in api_requests
                           if not r['is_personalized']
                           and any(p in r['url'] for p in product_patterns)]

        page.screenshot(path=os.path.join(screenshot_dir, f"api_monitor_{name}.png"), full_page=True)

        if require_personalized:
            if personalized_requests:
                results.append((name, 'PASS', f'个性化请求: {len(personalized_requests)}个'))
            else:
                results.append((name, 'FAIL',
                                f'未发现个性化请求({url_prefix})，产品化请求: {len(product_requests)}个'))
        else:
            results.append((name, 'PASS', f'API请求: {len(api_requests)}个'))

        print(f"\n[{name}] API Request Analysis:")
        print(f"  Total requests: {len(api_requests)}")
        print(f"  Personalized requests ({url_prefix}): {len(personalized_requests)}")
        for r in personalized_requests[:5]:
            print(f"    - {r['method']} {r['url'][:100]}")
        if product_requests:
            print(f"  Product requests: {len(product_requests)}")
            for r in product_requests[:3]:
                print(f"    - {r['method']} {r['url'][:100]}")

    return results


if __name__ == '__main__':
    config = load_config()
    bank_config, bank_id = get_bank_config(config)
    host = config.get('host', '127.0.0.1')
    port = config.get('services', {}).get('frontend', {}).get('port', 8091)
    base_url = f"http://{host}:{port}"
    url_prefix = bank_config.get('url_prefix', '/')
    product_patterns = config.get('product_url_patterns', ['/bm/', '/sm/'])
    default_login = bank_config.get('login', {}).get('default', {})
    username = default_login.get('username', 'admin')
    password = default_login.get('password', 'admin')

    bank_pages = bank_config.get('pages', {})
    test_pages = [
        {'name': k, 'path': v['path'], 'require_personalized': v.get('require_personalized', True)}
        for k, v in bank_pages.items()
    ]

    print(f"[INFO] Using bank: {bank_id}, prefix: {url_prefix}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        viewport = config.get('test', {}).get('viewport', {'width': 1920, 'height': 1080})
        page = browser.new_page(viewport=viewport)

        from bemp_login import bemp_login
        if not bemp_login(page, base_url, username, password, config):
            print("Login failed, aborting tests")
            browser.close()
            exit(1)

        print("\n=== API Path Monitor ===")
        if test_pages:
            results = monitor_api_paths(page, base_url, url_prefix, test_pages, product_patterns)

            print("\n=== Results ===")
            for r in results:
                status = "PASS" if r[1] == 'PASS' else "FAIL"
                print(f"  [{status}] {r[0]}: {r[2]}")
        else:
            print(f"[WARN] No pages configured for bank '{bank_id}'")

        browser.close()
