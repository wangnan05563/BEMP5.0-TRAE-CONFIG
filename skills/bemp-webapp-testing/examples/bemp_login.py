"""
BEMP 登录流程示例
演示如何使用 LoginManager 进行登录，支持会话复用和多角色切换
兼容旧版直接调用 bemp_login() 的方式
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


def bemp_login(page, base_url, username, password, config=None, screenshot_dir='./screenshots'):
    """
    兼容旧版登录接口
    推荐使用 LoginManager.get_page() 替代，可自动处理会话复用
    """
    os.makedirs(screenshot_dir, exist_ok=True)
    selectors = (config or {}).get('selectors', {})
    login_config = (config or {}).get('login', {})

    page.goto(f"{base_url}/#/login")
    page.wait_for_load_state('networkidle')
    page.screenshot(path=os.path.join(screenshot_dir, 'login_page.png'))

    page.fill(selectors.get('login_username', 'input[placeholder*="用户名"]'), username)
    page.fill(selectors.get('login_password', 'input[placeholder*="密码"]'), password)
    page.click(selectors.get('login_button', 'button:has-text("登录")'))
    page.wait_for_timeout(2000)

    try:
        confirm_selector = selectors.get('force_login_confirm', '.h-msg-box-confirm button:has-text("是")')
        confirm_btn = page.locator(confirm_selector)
        if confirm_btn.is_visible(timeout=login_config.get('force_login_timeout', 3000)):
            confirm_btn.click()
            page.wait_for_timeout(1000)
    except Exception:
        pass

    page.wait_for_load_state('networkidle')
    page.screenshot(path=os.path.join(screenshot_dir, 'after_login.png'))

    session_selector = selectors.get('session_expired', 'text=会话已失效')
    login_error = page.locator(session_selector)
    try:
        if login_error.is_visible(timeout=2000):
            print("[FAIL] Login failed: session expired")
            return False
    except Exception:
        pass

    print("[OK] Login successful")
    return True


if __name__ == '__main__':
    config = load_config()
    bank_config, bank_id = get_bank_config(config)

    print(f"[INFO] Using bank: {bank_id}")
    print(f"[INFO] URL prefix: {bank_config.get('url_prefix', '/')}")

    mgr = LoginManager(config, bank_id=bank_id)
    try:
        page = mgr.get_page(role='default')
        print(f"[OK] Login via LoginManager successful")
        page.screenshot(path=os.path.join('./screenshots', 'home_page.png'))

        stats = mgr.get_login_stats()
        print(f"[STATS] Active roles: {stats['active_roles']}")
        for role, info in stats['roles'].items():
            print(f"  {role}: login_time={info['login_time']}, cached={info['has_cached_state']}")
    except LoginError as e:
        print(f"[FAIL] Login failed: {e}")
    finally:
        mgr.cleanup()
