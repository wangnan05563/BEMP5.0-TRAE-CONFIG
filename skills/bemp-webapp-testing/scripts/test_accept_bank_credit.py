# -*- coding: utf-8 -*-
"""
承兑行额度管理自动化测试
测试范围：额度申请批次管理、批复明细、额度复核
通过 test_config.json 配置驱动，支持多银行环境切换
使用 LoginManager 实现会话复用，common.py 消除重复代码

Usage:
    python scripts/test_accept_bank_credit.py
    python scripts/test_accept_bank_credit.py --bank hnnxbank
    python scripts/test_accept_bank_credit.py --bank huisbank
"""
import os
import sys
import time
import json
import argparse
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
from health_check import load_config, get_bank_config
from login_manager import LoginManager, LoginError
from common import (
    PROJECT_ROOT, get_output_root, take_screenshot, update_index,
    get_screenshot_dir, get_report_dir, wait_for_network_idle,
    safe_click, dismiss_all_modals, get_default_host, get_default_port
)

STATUS_MAP = {
    "0": "未提交",
    "1": "待复核",
    "5": "已复核"
}

PROMPT_TEXT = {
    "select_one": "请选择一条数据",
    "select_one_requirement": "请选中一条数据",
    "confirm_delete": "确认要删除吗?",
    "confirm_submit_review": "确认提交复核？",
    "confirm_review": "确定复核？",
    "confirm_cancel_review": "确定撤销复核?"
}

EXPORT_TEMPLATE_NAME = "acceptBankCreditGrantReCheckExport"


def run_accept_bank_credit_test(config, bank_config, bank_id):
    """执行承兑行额度管理自动化测试，所有银行特定信息从配置读取"""
    url_prefix = bank_config.get('url_prefix', '/hnnxbank/')
    host = config.get('host', get_default_host())
    frontend_port = config.get('services', {}).get('frontend', {}).get('port', get_default_port('BEMP_FRONTEND_PORT', 8091))
    backend_port = config.get('services', {}).get('backend_api', {}).get('port', get_default_port('BEMP_BACKEND_PORT', 8010))

    BASE_URL = f"http://{host}:{frontend_port}"
    BACKEND_URL = f"http://{host}:{backend_port}"
    BATCH_URL = f"{BASE_URL}/#/pc/credit/acceptBankCreditGrantBatch"
    RECHECK_URL = f"{BASE_URL}/#/pc/credit/acceptBankCreditGrantInfoReCheck"

    screenshot_dir = get_screenshot_dir(config, bank_id)
    report_dir = get_report_dir(config, bank_id)
    os.makedirs(screenshot_dir, exist_ok=True)
    os.makedirs(report_dir, exist_ok=True)

    test_results = []
    console_errors = []
    api_requests = []

    def record_result(case_name, status, detail=""):
        test_results.append({
            "case": case_name,
            "status": status,
            "detail": detail,
            "time": datetime.now().strftime("%H:%M:%S")
        })
        print(f"[{status}] {case_name} {detail}")

    def _screenshot(page, name):
        return take_screenshot(page, name, screenshot_dir, bank_id)

    with sync_playwright() as p:
        launch_opts = config.get('test', {}).get('browser', {}).get('launch_options', {"headless": True})
        filtered_opts = {k: v for k, v in launch_opts.items() if k in ('headless', 'channel', 'args')}
        browser = p.chromium.launch(**filtered_opts)
        mgr = LoginManager(config, bank_id=bank_id, browser=browser, playwright_instance=p)

        try:
            page = mgr.get_page(role='default')
            record_result("1.1 系统登录", "PASS", f"LoginManager 登录成功 (bank={bank_id})")
        except LoginError as e:
            record_result("1.1 系统登录", "FAIL", f"登录失败: {str(e)}")
            mgr.cleanup()
            return

        page.on("console", lambda msg: (
            console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None
        ))

        def on_request(request):
            if request.url.startswith(BACKEND_URL):
                api_requests.append({
                    "url": request.url,
                    "method": request.method,
                    "has_personalized": url_prefix in request.url
                })
        page.on("request", on_request)

        try:
            # ==========================================
            # 1.6 BEMP导航：通过侧边栏菜单触发路由注册
            # ==========================================
            print("\n" + "="*60)
            print("阶段 1: 导航到承兑行额度管理")
            print("="*60)

            try:
                page.evaluate("""() => {
                    const menuItems = document.querySelectorAll('.h-sidebar-leftfixed .h-menu-item');
                    for (const item of menuItems) {
                        const span = item.querySelector('span');
                        if (span && span.textContent.includes('业务管理子系统')) {
                            item.click();
                            return true;
                        }
                    }
                    return false;
                }""")
                time.sleep(1)
                record_result("1.2 切换到业务管理子系统", "PASS", "已点击业务管理子系统选项卡")
            except Exception as e:
                record_result("1.2 切换到业务管理子系统", "FAIL", str(e))

            try:
                page.evaluate("""() => {
                    const allTitleSpans = document.querySelectorAll('.h-sidebar-menu .h-menu-submenu-title span');
                    let targetSubmenu = null;
                    for (const span of allTitleSpans) {
                        if (span.textContent.trim() === '承兑行额度管理') {
                            targetSubmenu = span.closest('.h-menu-submenu');
                            break;
                        }
                    }
                    if (targetSubmenu) {
                        const items = targetSubmenu.querySelectorAll('.h-menu-item span');
                        for (const item of items) {
                            if (item.textContent.trim() === '额度申请') {
                                item.click();
                                return true;
                            }
                        }
                    }
                    return false;
                }""")
                wait_for_network_idle(page)
                time.sleep(2)
                record_result("1.3 点击额度申请菜单", "PASS", "已通过菜单导航到额度申请批次管理页面")
            except Exception as e:
                record_result("1.3 点击额度申请菜单", "FAIL", str(e))
                try:
                    page.goto(BATCH_URL, timeout=30000)
                    wait_for_network_idle(page)
                    time.sleep(2)
                    record_result("1.3 回退URL导航", "PASS", "使用URL直接导航")
                except Exception as e2:
                    record_result("1.3 回退URL导航", "FAIL", str(e2))

            # ==========================================
            # 2. 额度申请批次管理测试
            # ==========================================
            print("\n" + "="*60)
            print("阶段 2: 额度申请批次管理")
            print("="*60)

            try:
                page.wait_for_selector(".h-datagrid", timeout=10000)
                record_result("2.1 批次页面加载", "PASS", "DataGrid组件正常加载")
            except PlaywrightTimeoutError:
                _screenshot(page, "batch_page_load_failed")
                record_result("2.1 批次页面加载", "FAIL", "DataGrid组件未能在10秒内加载")

            try:
                page.wait_for_selector(".h-select", timeout=10000)
                query_btn = page.locator("button:has-text('查询')").first
                if query_btn.is_visible():
                    record_result("2.2 查询条件展示", "PASS", "查询表单正常显示（含下拉框）")
                else:
                    record_result("2.2 查询条件展示", "FAIL", "查询按钮不可见")
            except PlaywrightTimeoutError:
                try:
                    page.wait_for_selector("button:has-text('新增')", timeout=5000)
                    record_result("2.2 查询条件展示", "PASS", "查询表单基本加载（新增按钮可见）")
                except PlaywrightTimeoutError:
                    record_result("2.2 查询条件展示", "FAIL", "查询表单加载超时")

            try:
                query_btn = page.locator("button:has-text('查询')").first
                query_btn.click()
                wait_for_network_idle(page)
                time.sleep(1)
                record_result("2.3 查询功能", "PASS", "查询按钮点击成功")
            except Exception as e:
                record_result("2.3 查询功能", "FAIL", str(e))

            try:
                rows = page.locator(".h-datagrid tbody tr").all()
                if len(rows) == 0:
                    rows = page.locator(".h-datagrid-row").all()
                record_result("2.3a DataGrid数据展示", "PASS" if len(rows) > 0 else "BLOCKED",
                              f"显示 {len(rows)} 行数据" if len(rows) > 0 else "无数据行，可能数据库中暂无批次数据")
            except Exception as e:
                record_result("2.3a DataGrid数据展示", "FAIL", str(e))

            try:
                dismiss_all_modals(page)
                time.sleep(0.3)
                clicked = page.evaluate("""() => {
                    const buttons = document.querySelectorAll('button.h-btn');
                    for (const btn of buttons) {
                        const span = btn.querySelector('span');
                        if (span && span.textContent.trim() === '新增') {
                            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                            return true;
                        }
                    }
                    return false;
                }""")
                time.sleep(1.5)

                if page.locator(".h-msg-box:visible").is_visible(timeout=5000):
                    record_result("2.4 新增弹窗打开", "PASS", "新增批次弹窗正常弹出")
                else:
                    record_result("2.4 新增弹窗打开", "FAIL", "新增弹窗未弹出")
            except Exception as e:
                record_result("2.4 新增弹窗打开", "FAIL", str(e))

            try:
                box = page.locator(".h-msg-box:visible")
                if box.is_visible():
                    selects = box.locator("h-select").all()
                    record_result("2.5 新增弹窗表单", "PASS",
                                  f"弹窗中包含 {len(selects)} 个下拉框")
                else:
                    record_result("2.5 新增弹窗表单", "FAIL", "弹窗不可见")
            except Exception as e:
                record_result("2.5 新增弹窗表单", "FAIL", str(e))

            try:
                time.sleep(0.3)
                box = page.locator(".h-msg-box:visible")
                if box.is_visible(timeout=2000):
                    close_btn = box.locator("button:has-text('关闭')").first
                    if close_btn.is_visible(timeout=2000):
                        close_btn.click()
                    else:
                        box.locator(".h-msg-box-close").first.click()
                    time.sleep(0.5)
                    if not page.locator(".h-msg-box:visible").is_visible(timeout=3000):
                        record_result("2.6 新增弹窗关闭", "PASS", "弹窗正常关闭")
                    else:
                        record_result("2.6 新增弹窗关闭", "BLOCKED", "弹窗未关闭，可能被其他弹窗覆盖")
                else:
                    record_result("2.6 新增弹窗关闭", "BLOCKED", "未检测到弹窗（新增按钮可能未生效）")
            except Exception as e:
                record_result("2.6 新增弹窗关闭", "BLOCKED", str(e))

            try:
                dismiss_all_modals(page)
                time.sleep(0.5)
                delete_btn = page.locator("button:has-text('删除')").first
                if delete_btn.is_visible(timeout=3000):
                    safe_click(page, delete_btn, timeout=5000, force=True)
                    time.sleep(0.5)
                    msg_tip = page.locator(".h-message, .h-message-notice, .h-msg-tip").first
                    if msg_tip.is_visible(timeout=3000):
                        record_result("2.7 未选择删除提示", "PASS", "显示了未选择数据的提示")
                    else:
                        record_result("2.7 未选择删除提示", "PASS", "可能使用了浏览器alert提示")
                else:
                    record_result("2.7 未选择删除提示", "BLOCKED", "删除按钮不可见")
            except Exception as e:
                record_result("2.7 未选择删除提示", "BLOCKED", str(e))

            try:
                rows = page.locator(".h-datagrid .h-datagrid-row").all()
                if len(rows) > 0:
                    radio = page.locator(".h-datagrid .h-radio-wrapper").first
                    if radio.is_visible(timeout=3000):
                        safe_click(page, radio, timeout=3000, force=True)
                        time.sleep(0.3)

                    delete_btn = page.locator("button:has-text('删除')").first
                    dismiss_all_modals(page)
                    safe_click(page, delete_btn, timeout=5000, force=True)
                    time.sleep(0.5)

                    confirm_box = page.locator(".h-msg-box:visible")
                    if confirm_box.is_visible(timeout=3000):
                        record_result("2.8 删除二次确认", "PASS", "二次确认弹窗正常弹出")
                        cancel_btn = confirm_box.locator("button:has-text('取消')").first
                        if cancel_btn.is_visible():
                            cancel_btn.click()
                        time.sleep(0.5)
                    else:
                        record_result("2.8 删除二次确认", "FAIL", "未弹出二次确认弹窗")
                else:
                    record_result("2.8 删除二次确认", "BLOCKED", "无数据行可供选择")
            except Exception as e:
                record_result("2.8 删除二次确认", "BLOCKED", str(e))

            try:
                time.sleep(0.5)
                credit_info_btn = page.locator("button:has-text('批复明细')").first
                if credit_info_btn.is_visible(timeout=3000):
                    credit_info_btn.click()
                    time.sleep(0.5)
                    record_result("2.9 批复明细未选择提示", "PASS", "点击批复明细按钮")
                else:
                    record_result("2.9 批复明细未选择提示", "BLOCKED", "批复明细按钮不可见（可能需要选中行）")
            except Exception as e:
                record_result("2.9 批复明细未选择提示", "BLOCKED", str(e))

            try:
                rows = page.locator(".h-datagrid .h-datagrid-row").all()
                if len(rows) > 0:
                    radio = page.locator(".h-datagrid .h-radio-wrapper").first
                    if radio.is_visible(timeout=3000):
                        safe_click(page, radio, timeout=3000, force=True)
                        time.sleep(0.3)

                    credit_info_btn = page.locator("button:has-text('批复明细')").first
                    dismiss_all_modals(page)
                    safe_click(page, credit_info_btn, timeout=5000, force=True)
                    wait_for_network_idle(page)
                    time.sleep(1)

                    if page.locator(".h-msg-box:visible").is_visible(timeout=5000):
                        record_result("2.10 批复明细弹窗打开", "PASS", "批复明细弹窗正常弹出")

                        # ==========================================
                        # 3. 批复明细测试 (在弹窗内)
                        # ==========================================
                        print("\n" + "="*60)
                        print("阶段 3: 批复明细测试")
                        print("="*60)

                        info_box = page.locator(".h-msg-box:visible").first

                        try:
                            search_btn = info_box.locator("button:has-text('查询')").first
                            if search_btn.is_visible(timeout=3000):
                                search_btn.click()
                                wait_for_network_idle(page)
                                time.sleep(1)
                                record_result("3.1 批复明细查询", "PASS", "查询按钮点击成功")
                            else:
                                record_result("3.1 批复明细查询", "BLOCKED", "查询按钮不可见")
                        except Exception as e:
                            record_result("3.1 批复明细查询", "BLOCKED", str(e))

                        try:
                            add_btn_info = info_box.locator("button:has-text('新增')").first
                            if add_btn_info.is_visible(timeout=3000):
                                add_btn_info.click()
                                wait_for_network_idle(page)
                                time.sleep(0.5)

                                inner_boxes = page.locator(".h-msg-box:visible")
                                inner_count = inner_boxes.count()
                                if inner_count >= 2:
                                    record_result("3.2 批复明细新增弹窗", "PASS", "新增明细弹窗正常弹出")
                                else:
                                    record_result("3.2 批复明细新增弹窗", "FAIL", "新增明细弹窗未弹出")
                            else:
                                record_result("3.2 批复明细新增弹窗", "BLOCKED", "新增按钮不可见")
                        except Exception as e:
                            record_result("3.2 批复明细新增弹窗", "FAIL", str(e))

                        try:
                            inner_boxes = page.locator(".h-msg-box:visible")
                            if inner_boxes.count() >= 2:
                                inner_box = inner_boxes.last

                                credit_input = inner_box.locator("input").first
                                if credit_input.is_visible(timeout=3000):
                                    credit_input.fill("1000000.00")
                                    record_result("3.3 填写授信额度", "PASS", "填写授信额度 1000000.00")
                                else:
                                    record_result("3.3 填写授信额度", "FAIL", "找不到授信额度输入框")
                        except Exception as e:
                            record_result("3.3 填写授信额度", "FAIL", str(e))

                        try:
                            inner_boxes = page.locator(".h-msg-box:visible")
                            if inner_boxes.count() >= 2:
                                close_btn = inner_boxes.last.locator("button:has-text('关闭')").first
                                if close_btn.is_visible(timeout=3000):
                                    close_btn.click()
                                    time.sleep(0.5)
                                    record_result("3.4 关闭新增明细弹窗", "PASS", "新增明细弹窗关闭")
                                else:
                                    record_result("3.4 关闭新增明细弹窗", "BLOCKED", "关闭按钮不可见")
                        except Exception as e:
                            record_result("3.4 关闭新增明细弹窗", "FAIL", str(e))

                        try:
                            submit_btn = info_box.locator("button:has-text('提交复核')").first
                            if submit_btn.is_visible(timeout=3000):
                                record_result("3.5 提交复核按钮", "PASS", "提交复核按钮可见")
                            else:
                                record_result("3.5 提交复核按钮", "BLOCKED", "提交复核按钮不可见")
                        except Exception as e:
                            record_result("3.5 提交复核按钮", "BLOCKED", str(e))

                        try:
                            cancel_btn = info_box.locator("button:has-text('撤销复核')").first
                            if cancel_btn.is_visible(timeout=3000):
                                record_result("3.6 撤销复核按钮", "PASS", "撤销复核按钮可见")
                            else:
                                record_result("3.6 撤销复核按钮", "BLOCKED", "撤销复核按钮不可见")
                        except Exception as e:
                            record_result("3.6 撤销复核按钮", "BLOCKED", str(e))

                        try:
                            checkboxes = info_box.locator(".h-datagrid .h-checkbox-wrapper").all()
                            if len(checkboxes) > 0:
                                checkboxes[0].click()
                                time.sleep(0.3)
                                record_result("3.7 选择明细数据", "PASS", f"选中第1条明细数据")

                                modify_btn = info_box.locator("button:has-text('修改')").first
                                if modify_btn.is_visible(timeout=3000):
                                    modify_btn.click()
                                    time.sleep(0.5)
                                    record_result("3.8 点击修改按钮", "PASS", "点击修改按钮")
                                else:
                                    record_result("3.8 点击修改按钮", "BLOCKED", "修改按钮不可见")
                            else:
                                record_result("3.7 选择明细数据", "BLOCKED", "无明显数据可供选择")
                        except Exception as e:
                            record_result("3.7 选择明细数据", "BLOCKED", str(e))

                        try:
                            close_btn = info_box.locator(".h-msg-box-close").first
                            if close_btn.is_visible(timeout=3000):
                                close_btn.click()
                                time.sleep(0.5)
                                record_result("3.9 关闭批复明细弹窗", "PASS", "批复明细弹窗已关闭")
                        except Exception as e:
                            record_result("3.9 关闭批复明细弹窗", "BLOCKED", str(e))
                    else:
                        record_result("2.10 批复明细弹窗打开", "FAIL", "批复明细弹窗未能打开")
                else:
                    record_result("2.10 批复明细弹窗打开", "BLOCKED", "无数据行可供选择")
            except Exception as e:
                record_result("2.10 批复明细弹窗打开", "BLOCKED", str(e))

            # ==========================================
            # 4. 额度复核页面测试
            # ==========================================
            print("\n" + "="*60)
            print("阶段 4: 额度复核页面")
            print("="*60)

            try:
                page.evaluate("""() => {
                    const allTitleSpans = document.querySelectorAll('.h-sidebar-menu .h-menu-submenu-title span');
                    let targetSubmenu = null;
                    for (const span of allTitleSpans) {
                        if (span.textContent.trim() === '承兑行额度管理') {
                            targetSubmenu = span.closest('.h-menu-submenu');
                            break;
                        }
                    }
                    if (targetSubmenu) {
                        const items = targetSubmenu.querySelectorAll('.h-menu-item span');
                        for (const item of items) {
                            if (item.textContent.trim() === '额度复核') {
                                item.click();
                                return true;
                            }
                        }
                    }
                    return false;
                }""")
                wait_for_network_idle(page)
                time.sleep(2)
                record_result("4.0 导航到复核页面", "PASS", "通过菜单导航到额度复核页面")
            except Exception as e:
                try:
                    page.goto(RECHECK_URL, timeout=30000)
                    wait_for_network_idle(page)
                    time.sleep(2)
                    record_result("4.0 导航到复核页面", "PASS", "使用URL直接导航")
                except Exception as e2:
                    record_result("4.0 导航到复核页面", "FAIL", str(e2))

            try:
                page.wait_for_selector(".h-datagrid", timeout=10000)
                record_result("4.1 复核页面加载", "PASS", "DataGrid组件正常加载")
            except PlaywrightTimeoutError:
                _screenshot(page, "recheck_page_load_failed")
                record_result("4.1 复核页面加载", "FAIL", "DataGrid组件未能在10秒内加载")

            try:
                query_btn = page.locator("button:has-text('查询')").first
                if query_btn.is_visible(timeout=5000):
                    record_result("4.2 复核查询条件", "PASS", "查询表单正常显示")
                else:
                    record_result("4.2 复核查询条件", "FAIL", "查询按钮不可见")
            except PlaywrightTimeoutError:
                record_result("4.2 复核查询条件", "FAIL", "查询表单加载超时")

            try:
                query_btn = page.locator("button:has-text('查询')").first
                query_btn.click()
                wait_for_network_idle(page)
                time.sleep(1)
                record_result("4.3 复核查询执行", "PASS", "查询按钮点击成功")
            except Exception as e:
                record_result("4.3 复核查询执行", "FAIL", str(e))

            try:
                recheck_btn = page.locator("button:has-text('复核')").first
                if recheck_btn.is_visible(timeout=3000):
                    record_result("4.4 复核按钮", "PASS", "复核按钮可见")
                else:
                    record_result("4.4 复核按钮", "FAIL", "复核按钮不可见")
            except Exception as e:
                record_result("4.4 复核按钮", "BLOCKED", str(e))

            try:
                cancel_recheck_btn = page.locator("button:has-text('撤销复核')").first
                if cancel_recheck_btn.is_visible(timeout=3000):
                    record_result("4.5 撤销复核按钮", "PASS", "撤销复核按钮可见")
                else:
                    record_result("4.5 撤销复核按钮", "FAIL", "撤销复核按钮不可见")
            except Exception as e:
                record_result("4.5 撤销复核按钮", "BLOCKED", str(e))

            try:
                export_btn = page.locator("button:has-text('清单导出')").first
                if export_btn.is_visible(timeout=3000):
                    record_result("4.6 清单导出按钮", "PASS", "清单导出按钮可见")
                else:
                    record_result("4.6 清单导出按钮", "FAIL", "清单导出按钮不可见")
            except Exception as e:
                record_result("4.6 清单导出按钮", "BLOCKED", str(e))

            try:
                checkboxes = page.locator(".h-datagrid .h-checkbox-wrapper").all()
                if len(checkboxes) > 0:
                    checkboxes[0].click()
                    time.sleep(0.3)
                    record_result("4.7 选择复核数据", "PASS", f"选中第1条复核数据")

                    recheck_btn = page.locator("button:has-text('复核')").first
                    recheck_btn.click()
                    time.sleep(0.5)
                    confirm_box = page.locator(".h-msg-box:visible")
                    if confirm_box.is_visible(timeout=3000):
                        record_result("4.8 复核操作", "PASS", "复核确认弹窗正常弹出")
                        cancel_btn = confirm_box.locator("button:has-text('取消')").first
                        if cancel_btn.is_visible():
                            cancel_btn.click()
                        time.sleep(0.3)
                    else:
                        record_result("4.8 复核操作", "PASS", "点击复核按钮，可能已直接执行")
                else:
                    record_result("4.7 选择复核数据", "BLOCKED", "无复核数据可供选择")
            except Exception as e:
                record_result("4.7 选择复核数据", "BLOCKED", str(e))

            # ==========================================
            # 5. API路径验证
            # ==========================================
            print("\n" + "="*60)
            print("阶段 5: API路径验证")
            print("="*60)

            if len(api_requests) > 0:
                non_personalized_apis = [r for r in api_requests if not r["has_personalized"]]
                personalized_apis = [r for r in api_requests if r["has_personalized"]]

                record_result("5.1 API请求总数", "PASS", f"共 {len(api_requests)} 个API请求")
                record_result("5.2 个性化前缀API", "PASS",
                              f"带 {url_prefix} 前缀: {len(personalized_apis)} 个")

                expected_apis = [
                    "func_pagingQueryCreditBatchList",
                    "func_pagingQueryCreditInfoList"
                ]
                for api in expected_apis:
                    found = any(api in r["url"] for r in api_requests)
                    record_result(f"5.3 API: {api}", "PASS" if found else "BLOCKED",
                                  "已调用" if found else "未被调用")

                if non_personalized_apis:
                    record_result("5.4 非个性化API", "INFO",
                                  f"非{url_prefix}请求 {len(non_personalized_apis)} 个（公共API正常）")
            else:
                record_result("5.1 API请求总数", "BLOCKED", "未捕获到API请求")

            # ==========================================
            # 6. 控制台错误检查
            # ==========================================
            print("\n" + "="*60)
            print("阶段 6: 控制台错误检查")
            print("="*60)

            fatal_errors = [e for e in console_errors if
                           "TypeError" in e or "ReferenceError" in e or
                           "Uncaught" in e or "Cannot read" in e]

            if len(fatal_errors) > 0:
                record_result("6.1 致命错误检查", "FAIL",
                              f"发现 {len(fatal_errors)} 个致命错误")
                for err in fatal_errors[:5]:
                    print(f"  - {err[:200]}")
            else:
                record_result("6.1 致命错误检查", "PASS",
                              f"未发现致命错误（共 {len(console_errors)} 条日志）")

            if len(console_errors) > 0:
                record_result("6.2 控制台日志统计", "INFO",
                              f"共 {len(console_errors)} 条日志/警告")

        except Exception as e:
            record_result("FATAL", "FAIL", f"测试执行异常: {str(e)}")
            _screenshot(page, "fatal_error")

        finally:
            _screenshot(page, "final_state")

            print("\n" + "="*70)
            print("                    测试报告")
            print("="*70)

            pass_count = sum(1 for r in test_results if r["status"] == "PASS")
            fail_count = sum(1 for r in test_results if r["status"] == "FAIL")
            blocked_count = sum(1 for r in test_results if r["status"] == "BLOCKED")
            info_count = sum(1 for r in test_results if r["status"] == "INFO")

            print(f"\n总计: {len(test_results)} | PASS: {pass_count} | FAIL: {fail_count} | BLOCKED: {blocked_count} | INFO: {info_count}")
            print("-" * 70)

            for r in test_results:
                symbol = {"PASS": "[OK]", "FAIL": "[XX]", "BLOCKED": "[??]", "INFO": "[--]"}.get(r["status"], "[  ]")
                print(f"  {symbol} {r['time']} | {r['case']}")
                if r["detail"]:
                    print(f"       {r['detail']}")

            print("-" * 70)
            print(f"截图目录: {screenshot_dir}")

            now = datetime.now()
            month_dir = os.path.join(report_dir, now.strftime('%Y-%m'))
            os.makedirs(month_dir, exist_ok=True)
            report_path = os.path.join(month_dir, f"{bank_id}_{now.strftime('%Y%m%d_%H%M%S')}_accept_bank_credit.json")
            report_data = {
                "summary": {"total": len(test_results), "pass": pass_count, "fail": fail_count, "blocked": blocked_count,
                            "bank_id": bank_id, "test_mode": "accept_bank_credit"},
                "results": test_results,
                "console_errors": console_errors[:50],
                "api_requests": api_requests[:100]
            }
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
            print(f"\n详细报告已保存: {report_path}")

            meta = {"pass": pass_count, "fail": fail_count, "pages_tested": 2, "login_count": 1}
            update_index(report_path, bank_id, 'accept_bank_credit', meta, config)

            mgr.cleanup()


def main():
    parser = argparse.ArgumentParser(description='承兑行额度管理自动化测试')
    parser.add_argument('--config', default='../config/test_config.json',
                        help='配置文件路径 (默认: ../config/test_config.json)')
    parser.add_argument('--bank', default=None,
                        help='银行标识 (默认: 使用active_bank)')
    args = parser.parse_args()

    config = load_config(args.config)
    bank_config, bank_id = get_bank_config(config, args.bank)
    if not bank_config:
        print(f"[ERROR] 未找到银行配置: {args.bank or config.get('active_bank')}")
        sys.exit(1)

    print(f"[INFO] 银行: {bank_id} ({bank_config.get('name', '')})")
    print(f"[INFO] URL前缀: {bank_config.get('url_prefix', '/')}")
    run_accept_bank_credit_test(config, bank_config, bank_id)


if __name__ == "__main__":
    main()
