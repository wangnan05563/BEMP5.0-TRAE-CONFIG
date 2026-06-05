"""
需求文档解析器 - 解析Markdown格式的需求文档
识别业务子模块、业务规则、栏位定义等
"""
import re
import json
import sys
from pathlib import Path
import paths

# ── 模块级常量 ──────────────────────────────────────────────
OPERATION_NAMES = {'查询', '新增', '修改', '删除', '复核', '提交复核', '撤销复核', '清单导出', '提交',
                   '撤销', '确认', '关闭', '重置', '同步', '查看', '导出', '导入', '打印'}
# 业务关键字可从 profile 的 moduleKeywords 字段注入，此处仅保留通用兜底值
_MODULE_KEYWORDS_DEFAULT = {'管理', '申请', '明细', '模块', '系统'}
MODULE_KEYWORDS = set(_MODULE_KEYWORDS_DEFAULT)
MIN_MODULE_NAME_LENGTH = 4
SUBSECTION_LOOKAHEAD_LINES = 15
BASE_H1_NUM_MIN = 5
MAX_SUMMARY_RULES = 5
DEFAULT_SUMMARY_TEMPLATE = "{name}模块提供相关业务处理功能。"
# ────────────────────────────────────────────────────────────


def parse_requirement_md(md_path, extra_keywords=None):
    """
    解析需求.md，提取业务子模块信息
    Args:
        md_path: 需求文档路径
        extra_keywords: 额外的模块识别关键字列表（如从profile.moduleKeywords注入）
    返回:
    {
        "moduleName": "XXX模块",
        "businessModules": [
            {
                "name": "子模块A",
                "h1Num": 4,  # 在需求文档中的H1序号(用于概要设计的H1排序)
                "h2Title": "子模块A",  # 原始H2标题
                "subsections": [
                    {"name": "查询", "rules": [...], "fields": [...], "interface": [...]}
                ],
                "summary": "..."
            }
        ],
        "businessRules": [...]  # 全局业务规则
    }
    """
    content = Path(md_path).read_text(encoding='utf-8')
    lines = content.split('\n')

    # 合并外部注入的关键字到模块级 MODULE_KEYWORDS
    if extra_keywords:
        global MODULE_KEYWORDS
        MODULE_KEYWORDS = _MODULE_KEYWORDS_DEFAULT | set(extra_keywords)

    # 1. 提取主模块名（第一个 H3 标题）
    module_name = None
    for line in lines:
        m = re.match(r'^\s*###\s+(.+)$', line)
        if m:
            module_name = m.group(1).strip()
            break
    if not module_name:
        module_name = Path(md_path).stem

    # 2. 提取业务子模块（H5标题，如"子模块A"/"子模块B明细"等）
    # 它们的特征是"子模块标题"下面有 H6 子节（查询/新增/删除/修改/复核/提交等）
    # 或者直接用H4标题（不同需求文档可能不同）
    business_modules = []
    current_module = None
    current_subsection = None

    # 先收集所有候选模块标题（H4或H5，名字典型为：查询/新增/删除/修改/批复明细/复核/提交复核 等不是模块名）
    # 模块名特征：长度>=3个汉字、不是常见UI操作名
    def _is_module_name(name):
        if name in OPERATION_NAMES:
            return False
        return any(kw in name for kw in MODULE_KEYWORDS) or len(name) >= MIN_MODULE_NAME_LENGTH

    state = 'normal'  # normal | module | subsection

    for i, line in enumerate(lines):
        # H4 标题（####）
        m4 = re.match(r'^\s*####\s+(.+)$', line)
        # H5 标题（#####）  
        m5 = re.match(r'^\s*#####\s+(.+)$', line)

        # 业务子模块识别：H5中符合模块名特征的，且下方有H6子节
        if m5:
            name = m5.group(1).strip()
            if _is_module_name(name):
                # 验证下方有H6子节（subsection）
                has_subsection = False
                for k in range(i + 1, min(i + SUBSECTION_LOOKAHEAD_LINES, len(lines))):
                    if re.match(r'^\s*######\s+', lines[k]):
                        has_subsection = True
                        break
                    if re.match(r'^\s*#{1,5}\s+', lines[k]):  # 遇到更高级标题
                        break
                if has_subsection:
                    current_module = {
                        "name": name,
                        "subsections": [],
                        "summary": "",
                        "rules": []
                    }
                    business_modules.append(current_module)
                    current_subsection = None
                    state = 'module'
                    continue
        elif m4:
            # H4 通常是描述性标题，跳过
            pass

        # H6 子节标题（###### 子节）
        m6 = re.match(r'^\s*######\s+(.+)$', line)
        if m6 and current_module:
            current_subsection = {
                "name": m6.group(1).strip(),
                "rules": [],
                "fields": [],
                "interface_description": ""
            }
            current_module["subsections"].append(current_subsection)
            state = 'subsection'
            continue

        # 在子节内识别"业务规则"
        if current_subsection and re.match(r'^\s*\*\s*业务规则\s*$', line.strip()):
            # 收集业务规则列表项
            j = i + 1
            while j < len(lines):
                next_line = lines[j]
                rule_match = re.match(r'^\s*(\d+)[.．]\s+(.+)$', next_line)
                if rule_match:
                    current_subsection["rules"].append(rule_match.group(2).strip())
                    j += 1
                else:
                    break
            continue

        # 在子节内识别"栏位描述"
        if current_subsection and re.match(r'^\s*\*\s*栏位描述\s*$', line.strip()):
            # 收集表格
            table = _extract_table(lines, i)
            if table:
                current_subsection["fields"] = table
            continue

        # 在子节内识别"界面设计"
        if current_subsection and re.match(r'^\s*\*\s*界面设计\s*$', line.strip()):
            table = _extract_table(lines, i)
            if table:
                # 界面表格转为描述
                current_subsection["interface_description"] = _table_to_text(table)
            continue

    # 3. 提取全局业务规则（模块级别，H3 下含"规则"关键字的子节）
    global_rules = []
    in_global_rules = False
    for i, line in enumerate(lines):
        # 顶层"业务模块额度使用规则"或类似（H4或H5含"规则"关键字）
        m_rule_section = re.match(r'^\s*#{4,5}\s+.*规则\s*$', line)
        if m_rule_section:
            in_global_rules = True
            continue
        if in_global_rules:
            # 收集中间所有列表项（直到下一个H5/H4/H3）
            rule_match = re.match(r'^\s*[\-\+\*]\s+(.+)$', line)
            if rule_match:
                global_rules.append(rule_match.group(1).strip())
            elif re.match(r'^\s*#{2,6}\s+', line):
                in_global_rules = False

    return {
        "moduleName": module_name,
        "businessModules": business_modules,
        "globalRules": global_rules
    }


def _extract_table(lines, start_idx):
    """从start_idx开始提取一个Markdown表格"""
    table = []
    j = start_idx + 1
    # 跳过紧邻的非表格行
    while j < len(lines) and not lines[j].strip().startswith('|'):
        j += 1
    # 收集表格行
    while j < len(lines) and lines[j].strip().startswith('|'):
        line = lines[j].strip()
        # 跳过分隔行（如 | --- | --- |）
        if re.match(r'^\|[\s\-:|]+\|$', line):
            j += 1
            continue
        cells = [c.strip() for c in line.split('|')[1:-1]]  # 去掉首尾空
        if any(cells):
            table.append(cells)
        j += 1
    return table


def _table_to_text(table):
    """将表格转为文字描述（用于界面设计）"""
    if not table:
        return ""
    lines = ["界面设计要点："]
    for row in table:
        # 合并每行单元格
        line = " | ".join(c for c in row if c)
        if line:
            lines.append(f"  {line}")
    return "\n".join(lines)


def merge_to_scan_data(scan_data, requirement_data):
    """
    将解析出的业务子模块数据合并到scan_data中
    - 新增 businessModules 字段
    - 添加到 subsystems 列表
    - 添加到 interfaces 列表（如果识别到）
    """
    if not requirement_data.get("businessModules"):
        return scan_data

    # 业务子模块的H1序号基于代码库中真实子模块数量+1开始
    existing_h1 = [s for s in scan_data.get('subsystems', [])]
    base_h1_num = max(BASE_H1_NUM_MIN, len(existing_h1) + 1)  # 至少从第5个H1开始（避开概述/系统/设计/总体框架/系统组件）

    business_modules = []
    for idx, bm in enumerate(requirement_data["businessModules"]):
        h1_num = base_h1_num + idx
        # 收集子节作为H2列表
        subsections = []
        for sub in bm.get("subsections", []):
            sub_entry = {
                "name": sub["name"],
                "h2Num": f"{h1_num}.{len(subsections) + 1}",
                "rules": sub.get("rules", []),
                "fields": sub.get("fields", []),
                "interface_description": sub.get("interface_description", "")
            }
            subsections.append(sub_entry)

        business_modules.append({
            "h1Num": h1_num,
            "name": bm["name"],
            "summary": _build_module_summary(bm),
            "rules": bm.get("rules", []),
            "subsections": subsections
        })

    scan_data["businessModules"] = business_modules
    scan_data["requirementModuleName"] = requirement_data.get("moduleName", "")
    scan_data["globalRules"] = requirement_data.get("globalRules", [])

    return scan_data


def _build_module_summary(bm):
    """从子模块的rules生成summary"""
    rules = []
    for sub in bm.get("subsections", []):
        for r in sub.get("rules", []):
            rules.append(r)
    if not rules:
        return DEFAULT_SUMMARY_TEMPLATE.format(name=bm['name'])
    return f"{bm['name']}模块主要业务规则：\n" + "\n".join(f"{i+1}. {r}" for i, r in enumerate(rules[:MAX_SUMMARY_RULES]))


if __name__ == "__main__":
    # 可选第4个参数：JSON格式的额外关键字列表，如 '["额度","授信"]'
    _extra_kw = None
    if len(sys.argv) >= 5:
        try:
            _extra_kw = json.loads(sys.argv[4])
        except (json.JSONDecodeError, IndexError):
            pass
    if len(sys.argv) >= 4:
        # CLI 模式：python requirement_md_parser.py <md_path> <scan_in> <scan_out> [extra_keywords_json]
        md_path = sys.argv[1]
        scan_in_path = sys.argv[2]
        scan_out_path = sys.argv[3]
        try:
            req_data = parse_requirement_md(md_path, extra_keywords=_extra_kw)
            with open(scan_in_path, 'r', encoding='utf-8') as f:
                scan = json.load(f)
            scan = merge_to_scan_data(scan, req_data)
            with open(scan_out_path, 'w', encoding='utf-8') as f:
                json.dump(scan, f, ensure_ascii=False, indent=2)
            out = {
                "success": True,
                "businessModulesCount": len(req_data.get("businessModules", [])),
                "globalRulesCount": len(req_data.get("globalRules", [])),
                "moduleName": req_data.get("moduleName", "")
            }
            print(json.dumps(out, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
            sys.exit(1)
    else:
        # 单文件模式：仅解析并输出到 _requirement-parsed.json
        md_path = sys.argv[1] if len(sys.argv) > 1 else None
        if md_path is None:
            print("错误：单文件模式需要通过命令行参数指定 md_path", file=sys.stderr)
            sys.exit(1)
        result = parse_requirement_md(md_path)
        out_path = paths.requirement_parsed_path()
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"已写入: {out_path}")
        print(f"业务子模块数: {len(result['businessModules'])}")
