#!/usr/bin/env python3
"""
BEMP 统一登录管理器
提供会话复用、多角色切换、自动重连、storage_state持久化等能力
显著减少重复登录次数，降低token消耗

Usage:
    from login_manager import LoginManager
    mgr = LoginManager(config)
    page = mgr.get_page(role='default')
    mgr.switch_role('admin')
    mgr.cleanup()
"""

import json
import os
import time
import sys

sys.path.insert(0, os.path.dirname(__file__))
from health_check import load_config, get_bank_config

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', '..'))


class LoginManager:
    SESSION_STATE_DIR = "session_states"
    STATE_MAX_AGE_SECONDS = 1800

    def __init__(self, config, bank_id=None, browser=None, playwright_instance=None):
        self._config = config
        self._bank_id = bank_id or config.get('active_bank', '')
        self._bank_config, _ = get_bank_config(config, self._bank_id)
        self._host = config.get('host', '127.0.0.1')
        self._frontend_port = config.get('services', {}).get('frontend', {}).get('port', 8091)
        self._base_url = f"http://{self._host}:{self._frontend_port}"
        self._selectors = config.get('selectors', {})
        self._login_config = config.get('login', {})
        self._session_config = config.get('session', {})

        self._playwright = playwright_instance
        self._browser = browser
        self._owns_browser = browser is None
        self._owns_playwright = playwright_instance is None

        self._contexts = {}
        self._pages = {}
        self._login_timestamps = {}
        state_dir = self._session_config.get('state_dir', self.SESSION_STATE_DIR)
        self._state_dir = os.path.join(PROJECT_ROOT, state_dir) if not os.path.isabs(state_dir) else state_dir

    def _ensure_browser(self):
        if self._browser is None:
            from playwright.sync_api import sync_playwright
            if self._playwright is None:
                self._playwright = sync_playwright().start()
                self._owns_playwright = True
            launch_opts = self._config.get('test', {}).get('browser', {}).get('launch_options', {})
            self._browser = self._playwright.chromium.launch(**{
                k: v for k, v in launch_opts.items() if k in ('headless', 'channel', 'args')
            })
            self._owns_browser = True
        return self._browser

    def _get_account(self, role='default'):
        bank_login = self._bank_config.get('login', {})
        account = bank_login.get(role, bank_login.get('default', {}))
        if not account:
            accounts_data = self._load_test_accounts()
            bank_accounts = accounts_data.get(self._bank_id, {}).get('accounts', [])
            for acc in bank_accounts:
                if acc.get('role') == role:
                    return acc
            if bank_accounts:
                return bank_accounts[0]
        return account

    def _load_test_accounts(self):
        accounts_file = self._config.get('test_data', {}).get('accounts_file', 'test-data/test-accounts.json')
        accounts_path = os.path.join(PROJECT_ROOT, '.trae', 'skills', 'bemp-webapp-testing', accounts_file)
        try:
            with open(accounts_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _get_state_file(self, role):
        return os.path.join(self._state_dir, f"{self._bank_id}_{role}_state.json")

    def _is_state_valid(self, role):
        state_file = self._get_state_file(role)
        if not os.path.exists(state_file):
            return False
        max_age = self._session_config.get('state_max_age', self.STATE_MAX_AGE_SECONDS)
        file_age = time.time() - os.path.getmtime(state_file)
        if file_age > max_age:
            return False
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                state = json.load(f)
            cookies = state.get('cookies', [])
            return any(c.get('name', '').lower() in ('token', 'session_id', 'jsessionid', 'bemp_token')
                       for c in cookies)
        except (json.JSONDecodeError, KeyError):
            return False

    def _save_state(self, role, context):
        state_file = self._get_state_file(role)
        os.makedirs(os.path.dirname(state_file), exist_ok=True)
        context.storage_state(path=state_file)
        self._login_timestamps[role] = time.time()

    def _create_context_from_state(self, role):
        state_file = self._get_state_file(role)
        browser = self._ensure_browser()
        try:
            context = browser.new_context(storage_state=state_file)
            return context
        except Exception:
            return None

    def _perform_login(self, page, username, password):
        selectors = self._selectors
        login_config = self._login_config

        page.goto(f"{self._base_url}/#/login")
        page.wait_for_load_state('networkidle')

        username_sel = selectors.get('login_username', 'input[placeholder*="用户名"]')
        password_sel = selectors.get('login_password', 'input[placeholder*="密码"]')
        login_btn_sel = selectors.get('login_button', 'button:has-text("登录")')

        page.fill(username_sel, username)
        page.fill(password_sel, password)
        page.click(login_btn_sel)
        page.wait_for_timeout(2000)

        try:
            confirm_sel = selectors.get('force_login_confirm', '.h-msg-box-confirm button:has-text("是")')
            confirm_btn = page.locator(confirm_sel)
            if confirm_btn.is_visible(timeout=login_config.get('force_login_timeout', 3000)):
                confirm_btn.click()
                page.wait_for_timeout(1000)
        except Exception:
            pass

        page.wait_for_load_state('networkidle')

        try:
            session_sel = selectors.get('session_expired', 'text=会话已失效')
            if page.locator(session_sel).is_visible(timeout=2000):
                return False
        except Exception:
            pass

        return True

    def _is_page_session_valid(self, page):
        try:
            session_sel = self._selectors.get('session_expired', 'text=会话已失效')
            return not page.locator(session_sel).is_visible(timeout=1000)
        except Exception:
            return True

    def get_page(self, role='default', headless=None):
        if role in self._pages:
            page = self._pages[role]
            if self._is_page_session_valid(page):
                return page
            else:
                self._invalidate_role(role)

        if self._is_state_valid(role):
            context = self._create_context_from_state(role)
            if context is not None:
                page = context.new_page()
                viewport = self._config.get('test', {}).get('viewport', {'width': 1920, 'height': 1080})
                page.set_viewport_size(viewport)
                page.goto(f"{self._base_url}/#/")

                try:
                    page.wait_for_load_state('networkidle', timeout=5000)
                    if self._is_page_session_valid(page):
                        self._contexts[role] = context
                        self._pages[role] = page
                        self._login_timestamps[role] = time.time()
                        return page
                except Exception:
                    pass

                try:
                    context.close()
                except Exception:
                    pass

        return self._fresh_login(role, headless)

    def _fresh_login(self, role='default', headless=None):
        browser = self._ensure_browser()
        context = browser.new_context()
        viewport = self._config.get('test', {}).get('viewport', {'width': 1920, 'height': 1080})
        page = context.new_page()
        page.set_viewport_size(viewport)

        account = self._get_account(role)
        username = account.get('username', '')
        password = account.get('password', '')

        success = self._perform_login(page, username, password)
        if not success:
            context.close()
            raise LoginError(f"Login failed for role '{role}' (user={username})")

        self._save_state(role, context)
        self._contexts[role] = context
        self._pages[role] = page
        self._login_timestamps[role] = time.time()
        return page

    def _invalidate_role(self, role):
        if role in self._pages:
            try:
                self._pages[role].close()
            except Exception:
                pass
            del self._pages[role]
        if role in self._contexts:
            try:
                self._contexts[role].close()
            except Exception:
                pass
            del self._contexts[role]
        state_file = self._get_state_file(role)
        if os.path.exists(state_file):
            try:
                os.remove(state_file)
            except Exception:
                pass

    def switch_role(self, role='default'):
        return self.get_page(role)

    def refresh_session(self, role='default'):
        self._invalidate_role(role)
        return self._fresh_login(role)

    def get_login_stats(self):
        stats = {
            'active_roles': list(self._pages.keys()),
            'login_count': len(self._login_timestamps),
            'state_cache_hits': 0,
            'roles': {}
        }
        for role, ts in self._login_timestamps.items():
            stats['roles'][role] = {
                'login_time': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(ts)),
                'age_seconds': int(time.time() - ts),
                'has_cached_state': self._is_state_valid(role)
            }
        return stats

    def pre_login_roles(self, roles=None):
        if roles is None:
            bank_login = self._bank_config.get('login', {})
            roles = list(bank_login.keys())
            if not roles:
                roles = ['default']

        results = {}
        for role in roles:
            try:
                self.get_page(role)
                results[role] = True
            except LoginError:
                results[role] = False
        return results

    def cleanup(self):
        for role in list(self._pages.keys()):
            try:
                self._pages[role].close()
            except Exception:
                pass
        self._pages.clear()

        for role in list(self._contexts.keys()):
            try:
                self._contexts[role].close()
            except Exception:
                pass
        self._contexts.clear()

        if self._owns_browser and self._browser:
            try:
                self._browser.close()
            except Exception:
                pass
            self._browser = None

        if self._owns_playwright and self._playwright:
            try:
                self._playwright.stop()
            except Exception:
                pass
            self._playwright = None

    def navigate_to(self, page_path, role='default'):
        page = self.get_page(role)
        page.goto(f"{self._base_url}{page_path}")
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(500)
        return page


class LoginError(Exception):
    pass


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='BEMP Login Manager')
    parser.add_argument('--config', default='../config/test_config.json', help='Config file path')
    parser.add_argument('--bank', default=None, help='Bank identifier')
    parser.add_argument('--role', default='default', help='Login role')
    parser.add_argument('--pre-login', action='store_true', help='Pre-login all roles')
    parser.add_argument('--stats', action='store_true', help='Show login stats')
    parser.add_argument('--cleanup-states', action='store_true', help='Clean cached states')
    args = parser.parse_args()

    config = load_config(args.config)

    if args.cleanup_states:
        state_dir = os.path.join(os.path.dirname(__file__), '..', LoginManager.SESSION_STATE_DIR)
        cleaned = 0
        if os.path.exists(state_dir):
            for f in os.listdir(state_dir):
                if f.endswith('_state.json'):
                    os.remove(os.path.join(state_dir, f))
                    cleaned += 1
        print(f"Cleaned {cleaned} cached state files")
    elif args.pre_login:
        mgr = LoginManager(config, bank_id=args.bank)
        bank_login = config.get('banks', {}).get(args.bank or config.get('active_bank', ''), {}).get('login', {})
        roles = list(bank_login.keys()) or ['default']
        results = mgr.pre_login_roles(roles)
        for role, ok in results.items():
            print(f"  {role}: {'OK' if ok else 'FAIL'}")
        mgr.cleanup()
    elif args.stats:
        mgr = LoginManager(config, bank_id=args.bank)
        stats = mgr.get_login_stats()
        print(json.dumps(stats, indent=2, ensure_ascii=False))
    else:
        mgr = LoginManager(config, bank_id=args.bank)
        try:
            page = mgr.get_page(role=args.role)
            print(f"Login successful (role={args.role})")
            stats = mgr.get_login_stats()
            print(f"Active roles: {stats['active_roles']}")
        except LoginError as e:
            print(f"Login failed: {e}")
        finally:
            mgr.cleanup()
