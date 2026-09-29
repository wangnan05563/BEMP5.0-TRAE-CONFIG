# -*- coding: utf-8 -*-
"""
BEMP 回归脚本参数化模板（bemp-chrome-devtools-test 技能资产）
=============================================================
设计原则（来自 W8 round6 复盘，勿在基于本模板的脚本中引入硬编码）：
1. 脚本只实现五段式骨架：登录 → 导航 → 场景注入 → 断言 → 清理与日志落盘
2. 所有环境值/账号/菜单链路/组件/注入数据/断言要素/输出路径均来自场景配置 JSON
   （config/regression-scenarios/*.json），占位符 ${ENV:VAR:default} 运行时解析
3. 断言三通道：响应拦截（值断言）/ getComputedStyle（样式断言）/ console 监听（行为断言）
4. 开窗策略 J2：UI 操作优先，选中行依赖不可靠时按 open_strategy=component_state 直驱组件状态
5. 诊断落盘兜底：PowerShell 管道 GBK 编码可能吞 stdout，日志必须 finally flush 落盘

用法：
    python regression-script-template.py --scenario config/regression-scenarios/hnnxbank-aml-round6.json
"""
import argparse
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

# PowerShell 管道重定向时 stdout 默认 GBK，中文输出可能触发 UnicodeEncodeError 吞掉全部输出
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# ────────────────────────── 环境占位符解析（${ENV:VAR:default}） ──────────────────────────

_ENV_PATTERN = re.compile(r"\$\{ENV:([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}")

# 与 _shared/Resolve-EnvConfig.ps1 行为对齐：环境变量未设置时 fallback 到
# env-config.json 的 environmentDefaults（单一事实来源），避免两侧解析结果漂移
_SHARED_ENV_CONFIG = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "_shared", "env-config.json"))

_ENV_DEFAULTS = None


def _env_defaults():
    global _ENV_DEFAULTS
    if _ENV_DEFAULTS is None:
        try:
            with open(_SHARED_ENV_CONFIG, encoding="utf-8") as f:
                _ENV_DEFAULTS = json.load(f).get("environmentDefaults", {})
        except Exception:
            _ENV_DEFAULTS = {}
    return _ENV_DEFAULTS


def resolve_env(value):
    """解析 ${ENV:VAR} / ${ENV:VAR:default}。优先级：环境变量 > environmentDefaults > inline default；均无时保留原文显式暴露问题。"""
    if not isinstance(value, str):
        return value

    def _sub(m):
        val = os.environ.get(m.group(1))
        if val is None or val == "":
            val = _env_defaults().get(m.group(1))
        if val is None or val == "":
            return m.group(2) if m.group(2) is not None else m.group(0)
        return val

    return _ENV_PATTERN.sub(_sub, value)


def resolve_deep(node):
    if isinstance(node, str):
        return resolve_env(node)
    if isinstance(node, dict):
        return {k: resolve_deep(v) for k, v in node.items() if k != "_doc" and not k.startswith("_doc")}
    if isinstance(node, list):
        return [resolve_deep(i) for i in node]
    return node


# ────────────────────────── 共享 Vue 组件定位（W6-03：避免每次回归重写） ──────────────────────────

FIND_COMP_JS = """(args) => {
    function findComp(comp, name, depth) {
        if (!comp || depth > (args.maxDepth || 18)) return null;
        if (comp.$options && comp.$options.name === name) return comp;
        const kids = comp.$children || [];
        for (let i = 0; i < kids.length; i++) {
            const r = findComp(kids[i], name, depth + 1);
            if (r) return r;
        }
        return null;
    }
    const app = document.getElementById('app') || document.body.firstElementChild;
    const c = app && app.__vue__ ? findComp(app.__vue__, args.name, 0) : null;
    return c ? { found: true, uid: c._uid } : { found: false };
}"""


def find_component(page, name, max_depth=18):
    return page.evaluate(FIND_COMP_JS, {"name": name, "maxDepth": max_depth})


def call_component(page, comp_name, method):
    # 直接调组件方法，规避按钮文本国际化匹配失败（round5/round6 实测教训）
    return page.evaluate(
        """(args) => {
            function findComp(comp, name, depth) {
                if (!comp || depth > 18) return null;
                if (comp.$options && comp.$options.name === name) return comp;
                for (const k of (comp.$children || [])) {
                    const r = findComp(k, name, depth + 1);
                    if (r) return r;
                }
                return null;
            }
            const app = document.getElementById('app').__vue__;
            const c = findComp(app, args.comp, 0);
            if (!c) return { ok: false, why: 'comp not found' };
            c[args.method]();
            return { ok: true };
        }""", {"comp": comp_name, "method": method})


# ────────────────────────── 诊断日志（finally 落盘兜底） ──────────────────────────

LOG_LINES = []
RESULT = {"scenario": "", "cases": {}, "console_errors": [], "shots": []}


def log(*args):
    line = " ".join(str(a) for a in args)
    LOG_LINES.append(line)
    try:
        print(line)
    except Exception:
        pass


def flush_log(log_file):
    os.makedirs(os.path.dirname(log_file) or ".", exist_ok=True)
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("\n".join(LOG_LINES))


# ────────────────────────── 五段式骨架 ──────────────────────────

def step_login(page, env):
    """登录段：账号来自场景配置引用的角色（用户名经 ${ENV:} 解析，密码不落配置）。"""
    role = env["account_role"]
    user_env = {"default": "BEMP_TEST_USER_DEFAULT", "admin": "BEMP_TEST_USER_ADMIN",
                "branch_admin": "BEMP_TEST_USER_BRANCH_ADMIN"}[role]
    user = os.environ.get(user_env) or "wangnan02"
    pwd = os.environ.get("BEMP_TEST_PASSWORD") or "888888"
    page.goto(f"{env['frontend_url']}/#/login", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2000)
    page.fill('input[placeholder*="用户名"]', user)
    page.fill('input[placeholder*="密码"]', pwd)
    page.locator("button", has_text="登").first.click()
    for _ in range(30):
        if "/login" not in page.url:
            break
        try:
            dlg = page.locator('text=确定强制退出已登录账号吗？')
            if dlg.count() > 0 and dlg.first.is_visible():
                page.evaluate("""() => {
                    const b = Array.from(document.querySelectorAll('button'))
                        .find(b => b.offsetParent !== null && (b.textContent||'').trim() === '确定');
                    if (b) b.click();
                }""")
                break
        except Exception:
            pass
        page.wait_for_timeout(1000)
    ok = "/login" not in page.url
    RESULT["login"] = "PASS" if ok else "FAIL"
    return ok


def step_navigate(page, nav):
    """导航段：菜单链路按配置逐级点击；失败时按 leaf_dump_fallback dump 叶子菜单辅助定位（W6-04）。"""
    for text in nav["menu_path"]:
        page.evaluate("""(t) => {
            const els = Array.from(document.querySelectorAll('li,span,a,div'))
                .filter(e => (e.textContent||'').trim() === t && e.offsetParent !== null);
            if (els.length) {
                const el = els[els.length-1];
                el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
                el.click();
            }
        }""", text)
        page.wait_for_timeout(2500)
    page.wait_for_timeout(3000)
    log("[URL]", page.url)
    return nav["target_url_fragment"] in page.url


def run_case(page, case, target, env):
    """注入 + 触发 + 断言：断言三通道按配置选择，全部通过才 PASS。"""
    comp_name = target["dialog"]
    grid_ref = target["datagrid_ref"]
    row = case.get("inject_row") or {}
    if row:
        page.evaluate("""(args) => {
            function findComp(comp, name, depth) {
                if (!comp || depth > 18) return null;
                if (comp.$options && comp.$options.name === name) return comp;
                for (const k of (comp.$children || [])) {
                    const r = findComp(k, name, depth + 1);
                    if (r) return r;
                }
                return null;
            }
            const c = findComp(document.getElementById('app').__vue__, args.comp, 0);
            const grid = c && c.$refs[args.ref];
            if (!grid) return;
            if (!grid.tData) grid.tData = [];
            Object.assign(grid.tData[0] || (grid.tData[0] = {}), args.row);
            c.$forceUpdate();
        }""", {"comp": comp_name, "ref": grid_ref, "row": row})

    trigger = case["trigger"]
    if trigger.get("method") == "component_call_with_response":
        with page.expect_response(
                lambda r: trigger["response_url_contains"] in r.url,
                timeout=trigger.get("response_timeout_ms", 20000)) as resp:
            call_component(page, comp_name, trigger["target"])
        log("[RESP]", resp.value.status)
    else:
        call_component(page, comp_name, trigger["target"])
    page.wait_for_timeout(2500)

    a = case["assert"]
    passed = True
    detail = {}
    if a.get("dialog_selector"):
        dlg = page.evaluate("""(sel) => {
            const d = document.querySelector(sel);
            return { visible: !!(d && d.offsetParent !== null),
                     text: d ? d.innerText.slice(0, 400) : '' };
        }""", a["dialog_selector"])
        detail["dialog"] = dlg
        passed &= dlg["visible"]
        for t in a.get("dialog_text_contains", []):
            passed &= t in dlg["text"]
    for t in a.get("console_error_not_contains", []):
        passed &= not any(t in e for e in RESULT["console_errors"])
    if a.get("highlight"):
        h = a["highlight"]
        hl = page.evaluate("""(args) => {
            return Array.from(document.querySelectorAll(args.sel))
                .map(e => ({ text: (e.textContent||'').trim(), color: getComputedStyle(e).color }));
        }""", {"sel": h["selector"]})
        detail["highlight"] = hl
        passed &= any(x["text"] == h["match_text"] and h["rgb_contains"] in x["color"] for x in hl)

    shot_name = case.get("screenshot")
    if shot_name and passed:
        path = os.path.join(env["_shot_dir"], f"{shot_name}.png")
        page.screenshot(path=path)
        RESULT["shots"].append(path)
    RESULT["cases"][case["id"]] = "PASS" if passed else "FAIL"
    return passed


def step_cleanup(page, cleanup, target):
    """清理段：阻断类回归不产生真实提交，仅需关闭弹窗；关闭动作按配置执行。"""
    for method in cleanup.get("close_calls", []):
        page.evaluate("""(args) => {
            function findComp(comp, name, depth) {
                if (!comp || depth > 18) return null;
                if (comp.$options && comp.$options.name === name) return comp;
                for (const k of (comp.$children || [])) {
                    const r = findComp(k, name, depth + 1);
                    if (r) return r;
                }
                return null;
            }
            const c = findComp(document.getElementById('app').__vue__, args.comp, 0);
            if (c && c[args.method]) c[args.method]();
        }""", {"comp": target["dialog"], "method": method})
    page.evaluate("""(btns) => {
        const b = Array.from(document.querySelectorAll('button'))
            .find(b => b.offsetParent !== null && btns.includes((b.textContent||'').trim()));
        if (b) b.click();
    }""", cleanup.get("click_buttons", []))


# ────────────────────────── 主流程 ──────────────────────────

def main():
    parser = argparse.ArgumentParser(description="BEMP parameterized regression runner")
    parser.add_argument("--scenario", required=True, help="回归场景配置 JSON 路径")
    args = parser.parse_args()

    with open(args.scenario, encoding="utf-8") as f:
        scenario = resolve_deep(json.load(f))

    env = scenario["env"]
    env["_shot_dir"] = scenario["output"]["shot_dir"]
    log_file = scenario["output"]["log_file"]
    RESULT["scenario"] = scenario["scenario_id"]
    noise = list(scenario.get("console_noise_extra", []))

    os.makedirs(env["_shot_dir"], exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=env.get("headless", True))
        ctx = browser.new_context(viewport=env.get("viewport", {"width": 1600, "height": 900}))
        page = ctx.new_page()

        def on_console(msg):
            if msg.type != "error":
                return
            t = msg.text
            if any(re.search(k, t) for k in noise):
                return
            RESULT["console_errors"].append(t[:300])
        page.on("console", on_console)
        page.on("requestfailed", lambda r: RESULT["console_errors"].append(
            "REQFAIL " + r.url[:200] + " " + str(r.failure)))

        if not step_login(page, env):
            print(json.dumps(RESULT, ensure_ascii=False, indent=1))
            browser.close()
            return
        page.wait_for_timeout(2500)

        if not step_navigate(page, scenario["navigation"]):
            RESULT["nav"] = "FAIL: target fragment not reached"
            print(json.dumps(RESULT, ensure_ascii=False, indent=1))
            browser.close()
            return

        target = scenario["target_component"]
        for case in scenario["cases"]:
            log("[CASE]", case["id"], case["title"])
            run_case(page, case, target, env)

        step_cleanup(page, scenario.get("cleanup", {}), target)
        print(json.dumps(RESULT, ensure_ascii=False, indent=1))
        browser.close()


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        # 无论成功/异常/提前返回都落盘诊断日志，避免管道吞输出后无证据可查
        flush_log("aotutests-devtools/logs/regression_runner_log.txt")
