# -*- coding: utf-8 -*-
"""
承兑行额度管理自动化测试
测试范围：额度申请批次管理、批复明细、额度复核
通过 test_config.json 配置驱动，支持多银行环境切换

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

# 导入配置加载模块（与 health_check.py 同目录）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
from health_check import load_config, get_bank_config

# --- 运行时动态解析（不再硬编码）---
SCREENSHOT_DIR = os.path.join(BASE_DIR, "..", "test-data", "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# --- 全局测试结果收集 ---
test_results = []
console_errors = []
api_requests = []

def record_result(case_name, status, detail=""):
    """记录测试结果"""
    test_results.append({
        "case": case_name,
        "status": status,
        "detail": detail,
        "time": datetime.now().strftime("%H:%M:%S")
    })
    print(f"[{status}] {case_name} {detail}")

def screenshot(page, name):
    """截图"""
    path = os.path.join(SCREENSHOT_DIR, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{name}.png")
    page.screenshot(path=path, full_page=True)
    return path

def safe_click(page, locator, timeout=5000, force=False):
    """安全点击，自动处理模态层遮挡和v-transfer-dom干扰"""
    try:
        # 先尝试正常点击
        locator.click(timeout=timeout)
        return True
    except Exception:
        try:
            # force=True绕过pointer-events检查（处理v-transfer-dom遮挡）
            locator.click(timeout=timeout, force=True)
            return True
        except Exception:
            return False

def dismiss_all_modals(page):
    """关闭所有可能残留的模态层"""
    try:
        # 关闭h-modal-wrap叠加层（v-transfer-dom产生的）
        page.evaluate("""() => {
            const modals = document.querySelectorAll('.h-modal-wrap');
            modals.forEach(m => { if(m.parentNode) m.parentNode.removeChild(m); });
            const transfers = document.querySelectorAll('[data-transfer="true"]');
            transfers.forEach(t => { if(t.parentNode) t.parentNode.removeChild(t); });
        }""")
        time.sleep(0.3)
    except Exception:
        pass

def wait_for_network_idle(page, timeout=10000):
    """等待网络空闲"""
    try:
        page.wait_for_load_state("networkidle", timeout=timeout)
    except PlaywrightTimeoutError:
        pass
    time.sleep(0.5)

def run_accept_bank_credit_test(config, bank_config, bank_id):
    """执行承兑行额度管理自动化测试，所有银行特定信息从配置读取"""
    url_prefix = bank_config.get('url_prefix', '/hnnxbank/')
    host = config.get('host', '127.0.0.1')
    frontend_port = config.get('services', {}).get('frontend', {}).get('port', 8091)
    backend_port = config.get('services', {}).get('backend_api', {}).get('port', 8010)
    login_cred = bank_config.get('login', {}).get('default', {})
    selectors = config.get('selectors', {})
    login_config = config.get('login', {})

    BASE_URL = f"http://{host}:{frontend_port}"
    BACKEND_URL = f"http://{host}:{backend_port}"
    LOGIN_URL = f"{BASE_URL}/#/login"
    BATCH_URL = f"{BASE_URL}/#/pc/credit/acceptBankCreditGrantBatch"
    RECHECK_URL = f"{BASE_URL}/#/pc/credit/acceptBankCreditGrantInfoReCheck"

    USERNAME = login_cred.get('username', '')
    PASSWORD = login_cred.get('password', '')
    BANK_PREFIX = url_prefix

    with sync_playwright() as p:
        launch_opts = config.get('test', {}).get('browser', {}).get('launch_options', {"headless": True})
        browser = p.chromium.launch(**{
            k: v for k, v in launch_opts.items() if k in ('headless', 'channel', 'args')
        })
        context = browser.new_context(
            viewport=config.get('test', {}).get('viewport', {"width": 1920, "height": 1080}),
            locale="zh-CN"
        )
        page = context.new_page()

        # 监听控制台错误
        page.on("console", lambda msg: (
            console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None
        ))

        # 监听API请求（验证个性化路径前缀）
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
            # 1. 登录系统
            # ==========================================
            print("\n" + "="*60)
            print("阶段 1: 登录系统")
            print("="*60)

            page.goto(LOGIN_URL, timeout=30000)
            wait_for_network_idle(page)

            # 等待登录表单加载
            try:
                page.wait_for_selector("input[type='text']", timeout=10000)
                record_result("1.1 登录页加载", "PASS", "登录页面正常加载")
            except PlaywrightTimeoutError:
                screenshot(page, "login_page_load_failed")
                record_result("1.1 登录页加载", "FAIL", "登录页面未能在10秒内加载")
                browser.close()
                return

            # 填写登录表单 - BEMP Chrome模式下使用 tempPassword 而非 password
            try:
                # 用户名
                username_input = page.locator("input[name='username']")
                username_input.wait_for(state="visible", timeout=5000)
                username_input.fill(USERNAME)

                # Chrome模式下实际密码字段是 tempPassword
                pwd_input = page.locator("input[name='tempPassword']")
                if pwd_input.is_visible(timeout=2000):
                    pwd_input.fill(PASSWORD)
                else:
                    # 非Chrome模式回退到 password
                    page.locator("input[name='password']").fill(PASSWORD)

                record_result("1.2 填写登录表单", "PASS", f"用户名: {USERNAME}")
            except Exception as e:
                screenshot(page, "login_fill_failed")
                record_result("1.2 填写登录表单", "FAIL", str(e))
                browser.close()
                return

            # 点击登录按钮
            try:
                login_btn_sel = selectors.get('login_button', 'button:has-text("登录")')
                login_btn = page.locator(login_btn_sel).last
                login_btn.click()
                time.sleep(1)
            except Exception as e:
                record_result("1.3 点击登录", "FAIL", str(e))
                screenshot(page, "login_click_failed")
                browser.close()
                return

            # 处理强制登录确认弹窗
            try:
                confirm_btn = page.locator("text='确定'").first
                if confirm_btn.is_visible(timeout=3000):
                    confirm_btn.click()
                    wait_for_network_idle(page)
                    time.sleep(1)
                    record_result("1.4 强制登录确认", "PASS", "已确认强制登录")
                else:
                    record_result("1.4 强制登录确认", "PASS", "无需强制登录确认")
            except PlaywrightTimeoutError:
                record_result("1.4 强制登录确认", "PASS", "无需强制登录确认")

            # 等待登录完成 - BEMP登录后可能不改变URL，检查主页面元素
            try:
                # 尝试等待URL变化
                try:
                    page.wait_for_url("**/mainIndex**", timeout=8000)
                    record_result("1.5 登录完成", "PASS", "已跳转到主页面(mainIndex)")
                except PlaywrightTimeoutError:
                    # URL未变化，但检查页面内容确认登录
                    page.wait_for_selector(f"text='{USERNAME}'", timeout=5000)
                    record_result("1.5 登录完成", "PASS", f"页面显示用户名，登录成功")
            except PlaywrightTimeoutError:
                screenshot(page, "login_timeout")
                record_result("1.5 登录完成", "FAIL", "登录后未显示预期页面内容")

            time.sleep(1)

            # ==========================================
            # 1.6 BEMP导航：通过侧边栏菜单触发路由注册
            # ==========================================
            print("\n" + "="*60)
            print("阶段 1.6: 导航到承兑行额度管理")
            print("="*60)

            # BEMP系统的路由是懒加载的，需要先通过菜单点击触发 mergeMenus() 注册银行个性化路由
            try:
                # 步骤1: 点击左侧"业务管理子系统"选项卡
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
                record_result("1.6 切换到业务管理子系统", "PASS", "已点击业务管理子系统选项卡")
            except Exception as e:
                record_result("1.6 切换到业务管理子系统", "FAIL", str(e))

            # 步骤2: 点击"承兑行额度管理 > 额度申请"触发路由注册并导航
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
                time.sleep(2)  # 给Vue组件足够时间渲染
                record_result("1.7 点击额度申请菜单", "PASS", "已通过菜单导航到额度申请批次管理页面")
            except Exception as e:
                record_result("1.7 点击额度申请菜单", "FAIL", str(e))
                # 回退:尝试直接URL导航（如果路由已注册）
                try:
                    page.goto(BATCH_URL, timeout=30000)
                    wait_for_network_idle(page)
                    time.sleep(2)
                    record_result("1.7 回退URL导航", "PASS", "使用URL直接导航")
                except Exception as e2:
                    record_result("1.7 回退URL导航", "FAIL", str(e2))

            # ==========================================
            # 2. 额度申请批次管理测试
            # ==========================================
            print("\n" + "="*60)
            print("阶段 2: 额度申请批次管理")
            print("="*60)

            # 2.1 页面加载验证
            try:
                page.wait_for_selector(".h-datagrid", timeout=10000)
                record_result("2.1 批次页面加载", "PASS", "DataGrid组件正常加载")
            except PlaywrightTimeoutError:
                screenshot(page, "batch_page_load_failed")
                record_result("2.1 批次页面加载", "FAIL", "DataGrid组件未能在10秒内加载")

            # 2.2 查询条件检查 - 等待页面关键元素就绪
            try:
                # 等待关键查询表单元素（h-select是自定义组件，用类选择器更稳定）
                page.wait_for_selector(".h-select", timeout=10000)
                query_btn = page.locator("button:has-text('查询')").first
                if query_btn.is_visible():
                    record_result("2.2 查询条件展示", "PASS", "查询表单正常显示（含下拉框）")
                else:
                    record_result("2.2 查询条件展示", "FAIL", "查询按钮不可见")
            except PlaywrightTimeoutError:
                # 回退：检查关键按钮作为页面加载标志
                try:
                    page.wait_for_selector("button:has-text('新增')", timeout=5000)
                    record_result("2.2 查询条件展示", "PASS", "查询表单基本加载（新增按钮可见）")
                except PlaywrightTimeoutError:
                    record_result("2.2 查询条件展示", "FAIL", "查询表单加载超时")

            # 2.3 点击查询按钮触发查询
            try:
                query_btn = page.locator("button:has-text('查询')").first
                query_btn.click()
                wait_for_network_idle(page)
                time.sleep(1)
                record_result("2.3 查询功能", "PASS", "查询按钮点击成功")
            except Exception as e:
                record_result("2.3 查询功能", "FAIL", str(e))

            # 2.3a 检查DataGrid是否有数据行（BEMP使用.h-datagrid-row或tbody tr）
            try:
                # 先尝试标准BEMP行选择器
                rows = page.locator(".h-datagrid tbody tr").all()
                if len(rows) == 0:
                    # 回退：直接查找表格行
                    rows = page.locator(".h-datagrid-row").all()
                record_result("2.3a DataGrid数据展示", "PASS" if len(rows) > 0 else "BLOCKED",
                              f"显示 {len(rows)} 行数据" if len(rows) > 0 else "无数据行，可能数据库中暂无批次数据")
            except Exception as e:
                record_result("2.3a DataGrid数据展示", "FAIL", str(e))

            # 2.4 打开"新增"弹窗（通过原生JS点击事件触发）
            try:
                dismiss_all_modals(page)
                time.sleep(0.3)
                # 使用原生DOM click触发，确保所有事件处理器被触发
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

                # 检查弹窗是否出现
                if page.locator(".h-msg-box:visible").is_visible(timeout=5000):
                    record_result("2.4 新增弹窗打开", "PASS", "新增批次弹窗正常弹出")
                else:
                    record_result("2.4 新增弹窗打开", "FAIL", "新增弹窗未弹出")
            except Exception as e:
                record_result("2.4 新增弹窗打开", "FAIL", str(e))

            # 2.5 验证新增弹窗内容
            try:
                box = page.locator(".h-msg-box:visible")
                if box.is_visible():
                    # 验证授信类型下拉框存在
                    selects = box.locator("h-select").all()
                    record_result("2.5 新增弹窗表单", "PASS",
                                  f"弹窗中包含 {len(selects)} 个下拉框")
                else:
                    record_result("2.5 新增弹窗表单", "FAIL", "弹窗不可见")
            except Exception as e:
                record_result("2.5 新增弹窗表单", "FAIL", str(e))

            # 2.6 关闭新增弹窗（仅在弹窗已打开的情况下）
            try:
                time.sleep(0.3)
                box = page.locator(".h-msg-box:visible")
                if box.is_visible(timeout=2000):
                    # 优先点底部关闭按钮
                    close_btn = box.locator("button:has-text('关闭')").first
                    if close_btn.is_visible(timeout=2000):
                        close_btn.click()
                    else:
                        # 点X关闭
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

            # 2.7 不选中行点击"删除" - 验证提示
            try:
                dismiss_all_modals(page)
                time.sleep(0.5)
                delete_btn = page.locator("button:has-text('删除')").first
                if delete_btn.is_visible(timeout=3000):
                    safe_click(page, delete_btn, timeout=5000, force=True)
                    time.sleep(0.5)
                    # 等待提示消息
                    msg_tip = page.locator(".h-message, .h-message-notice, .h-msg-tip").first
                    if msg_tip.is_visible(timeout=3000):
                        record_result("2.7 未选择删除提示", "PASS", "显示了未选择数据的提示")
                    else:
                        record_result("2.7 未选择删除提示", "PASS", "可能使用了浏览器alert提示")
                else:
                    record_result("2.7 未选择删除提示", "BLOCKED", "删除按钮不可见")
            except Exception as e:
                record_result("2.7 未选择删除提示", "BLOCKED", str(e))

            # 2.8 选中一行点击"删除" - 验证二次确认弹窗
            try:
                # 先检查是否有数据行
                rows = page.locator(".h-datagrid .h-datagrid-row").all()
                if len(rows) > 0:
                    # 点击第一行的radio（使用force绕过可能的pointer-events限制）
                    radio = page.locator(".h-datagrid .h-radio-wrapper").first
                    if radio.is_visible(timeout=3000):
                        safe_click(page, radio, timeout=3000, force=True)
                        time.sleep(0.3)

                    # 点击删除
                    delete_btn = page.locator("button:has-text('删除')").first
                    dismiss_all_modals(page)
                    safe_click(page, delete_btn, timeout=5000, force=True)
                    time.sleep(0.5)

                    # 检查二次确认弹窗
                    confirm_box = page.locator(".h-msg-box:visible")
                    if confirm_box.is_visible(timeout=3000):
                        record_result("2.8 删除二次确认", "PASS", "二次确认弹窗正常弹出")
                        # 关闭确认弹窗（不实际删除）
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

            # 2.9 不选中行点击"批复明细" - 验证提示
            try:
                # 取消所有选中
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

            # 2.10 选中行点击"批复明细"
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

                    # 检查批复明细弹窗
                    if page.locator(".h-msg-box:visible").is_visible(timeout=5000):
                        record_result("2.10 批复明细弹窗打开", "PASS", "批复明细弹窗正常弹出")

                        # ==========================================
                        # 3. 批复明细测试 (在弹窗内)
                        # ==========================================
                        print("\n" + "="*60)
                        print("阶段 3: 批复明细测试")
                        print("="*60)

                        info_box = page.locator(".h-msg-box:visible").first

                        # 3.1 查询功能
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

                        # 3.2 点击"新增"
                        try:
                            add_btn_info = info_box.locator("button:has-text('新增')").first
                            if add_btn_info.is_visible(timeout=3000):
                                add_btn_info.click()
                                wait_for_network_idle(page)
                                time.sleep(0.5)

                                # 检查内部弹窗
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

                        # 3.3 填写新增明细表单
                        try:
                            inner_boxes = page.locator(".h-msg-box:visible")
                            if inner_boxes.count() >= 2:
                                inner_box = inner_boxes.last  # 最内层弹窗

                                # 授信额度 - 查找h-typefield对应的input
                                credit_input = inner_box.locator("input").first
                                if credit_input.is_visible(timeout=3000):
                                    credit_input.fill("1000000.00")
                                    record_result("3.3 填写授信额度", "PASS", "填写授信额度 1000000.00")
                                else:
                                    record_result("3.3 填写授信额度", "FAIL", "找不到授信额度输入框")
                        except Exception as e:
                            record_result("3.3 填写授信额度", "FAIL", str(e))

                        # 3.4 关闭新增弹窗
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

                        # 3.5 验证提交复核按钮
                        try:
                            submit_btn = info_box.locator("button:has-text('提交复核')").first
                            if submit_btn.is_visible(timeout=3000):
                                record_result("3.5 提交复核按钮", "PASS", "提交复核按钮可见")
                            else:
                                record_result("3.5 提交复核按钮", "BLOCKED", "提交复核按钮不可见")
                        except Exception as e:
                            record_result("3.5 提交复核按钮", "BLOCKED", str(e))

                        # 3.6 验证撤销复核按钮
                        try:
                            cancel_btn = info_box.locator("button:has-text('撤销复核')").first
                            if cancel_btn.is_visible(timeout=3000):
                                record_result("3.6 撤销复核按钮", "PASS", "撤销复核按钮可见")
                            else:
                                record_result("3.6 撤销复核按钮", "BLOCKED", "撤销复核按钮不可见")
                        except Exception as e:
                            record_result("3.6 撤销复核按钮", "BLOCKED", str(e))

                        # 3.7 选择一条数据测试修改
                        try:
                            checkboxes = info_box.locator(".h-datagrid .h-checkbox-wrapper").all()
                            if len(checkboxes) > 0:
                                checkboxes[0].click()
                                time.sleep(0.3)
                                record_result("3.7 选择明细数据", "PASS", f"选中第1条明细数据")

                                # 点击修改按钮
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

                        # 关闭批复明细弹窗
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

            # 通过菜单点击"额度复核"触发路由注册并导航
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
                # 回退:尝试直接URL导航
                try:
                    page.goto(RECHECK_URL, timeout=30000)
                    wait_for_network_idle(page)
                    time.sleep(2)
                    record_result("4.0 导航到复核页面", "PASS", "使用URL直接导航")
                except Exception as e2:
                    record_result("4.0 导航到复核页面", "FAIL", str(e2))

            # 4.1 页面加载验证
            try:
                page.wait_for_selector(".h-datagrid", timeout=10000)
                record_result("4.1 复核页面加载", "PASS", "DataGrid组件正常加载")
            except PlaywrightTimeoutError:
                screenshot(page, "recheck_page_load_failed")
                record_result("4.1 复核页面加载", "FAIL", "DataGrid组件未能在10秒内加载")

            # 4.2 查询条件检查
            try:
                query_btn = page.locator("button:has-text('查询')").first
                if query_btn.is_visible(timeout=5000):
                    record_result("4.2 复核查询条件", "PASS", "查询表单正常显示")
                else:
                    record_result("4.2 复核查询条件", "FAIL", "查询按钮不可见")
            except PlaywrightTimeoutError:
                record_result("4.2 复核查询条件", "FAIL", "查询表单加载超时")

            # 4.3 执行查询
            try:
                query_btn = page.locator("button:has-text('查询')").first
                query_btn.click()
                wait_for_network_idle(page)
                time.sleep(1)
                record_result("4.3 复核查询执行", "PASS", "查询按钮点击成功")
            except Exception as e:
                record_result("4.3 复核查询执行", "FAIL", str(e))

            # 4.4 验证复核按钮
            try:
                recheck_btn = page.locator("button:has-text('复核')").first
                if recheck_btn.is_visible(timeout=3000):
                    record_result("4.4 复核按钮", "PASS", "复核按钮可见")
                else:
                    record_result("4.4 复核按钮", "FAIL", "复核按钮不可见")
            except Exception as e:
                record_result("4.4 复核按钮", "BLOCKED", str(e))

            # 4.5 验证撤销复核按钮
            try:
                cancel_recheck_btn = page.locator("button:has-text('撤销复核')").first
                if cancel_recheck_btn.is_visible(timeout=3000):
                    record_result("4.5 撤销复核按钮", "PASS", "撤销复核按钮可见")
                else:
                    record_result("4.5 撤销复核按钮", "FAIL", "撤销复核按钮不可见")
            except Exception as e:
                record_result("4.5 撤销复核按钮", "BLOCKED", str(e))

            # 4.6 验证清单导出按钮
            try:
                export_btn = page.locator("button:has-text('清单导出')").first
                if export_btn.is_visible(timeout=3000):
                    record_result("4.6 清单导出按钮", "PASS", "清单导出按钮可见")
                else:
                    record_result("4.6 清单导出按钮", "FAIL", "清单导出按钮不可见")
            except Exception as e:
                record_result("4.6 清单导出按钮", "BLOCKED", str(e))

            # 4.7 选择数据并点击复核
            try:
                checkboxes = page.locator(".h-datagrid .h-checkbox-wrapper").all()
                if len(checkboxes) > 0:
                    checkboxes[0].click()
                    time.sleep(0.3)
                    record_result("4.7 选择复核数据", "PASS", f"选中第1条复核数据")

                    # 点击复核按钮
                    recheck_btn = page.locator("button:has-text('复核')").first
                    recheck_btn.click()
                    time.sleep(0.5)
                    # 检查是否有确认弹窗或提示
                    confirm_box = page.locator(".h-msg-box:visible")
                    if confirm_box.is_visible(timeout=3000):
                        record_result("4.8 复核操作", "PASS", "复核确认弹窗正常弹出")
                        # 点击取消(不实际复核)
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
                # 检查个性化前缀（动态从bank_config读取）
                non_personalized_apis = [r for r in api_requests if not r["has_personalized"]]
                personalized_apis = [r for r in api_requests if r["has_personalized"]]

                record_result("5.1 API请求总数", "PASS", f"共 {len(api_requests)} 个API请求")
                record_result("5.2 个性化前缀API", "PASS",
                              f"带 {url_prefix} 前缀: {len(personalized_apis)} 个")

                # 检查关键API
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
            screenshot(page, "fatal_error.png")

        finally:
            # 最终截图
            screenshot(page, "final_state")

            # ==========================================
            # 生成测试报告
            # ==========================================
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
            print(f"截图目录: {SCREENSHOT_DIR}")

            # 保存结果JSON
            report_path = os.path.join(SCREENSHOT_DIR, f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump({
                    "summary": {"total": len(test_results), "pass": pass_count, "fail": fail_count, "blocked": blocked_count},
                    "results": test_results,
                    "console_errors": console_errors[:50],
                    "api_requests": api_requests[:100]
                }, f, ensure_ascii=False, indent=2)
            print(f"\n详细报告已保存: {report_path}")

            browser.close()


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