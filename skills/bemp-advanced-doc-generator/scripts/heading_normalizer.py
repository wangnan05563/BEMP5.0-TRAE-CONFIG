# =====================================================================
# bemp-advanced-doc-generator / heading_normalizer.py
# ---------------------------------------------------------------------
# 用途：把"5.1bm"、"5.1 bm"、"5、机构管理"、"5.1.机构管理"等格式
#       不规范的 H2 子标题文本统一规范化为"5.1 机构管理"形式。
#
# 设计原则：
#   - 通用化：纯字符串规则，不依赖任何业务名/银行名
#   - 可配置：pattern 列表从外部 YAML 注入，未注入时用内置默认
#   - 幂等：多次执行结果一致（已规范化的文本再处理不会改变）
#   - 副作用小：仅修改文本，不动段落样式/结构
# =====================================================================
import re

# ─── 内置默认规则（未注入时兜底） ───
# 注意：必须用反向断言避免"5.1"被错误识别为"5."+"1"两段
# \b 在 "5.1bm" 中不匹配（1和b都是\w），改用 (?!\d)
# 1) "1.2" / "5.1" / "1.2.3" 多级数字，(?!\d) 保证不吞并后续数字
# 2) "1." / "1、" / "1）" 单级，(?!\.\d) 避免与多级冲突
# 残留标点（"5.1. 机构管理" → 剩 ". 机构管理"）由 strip_number_prefix 二次清理
DEFAULT_PREFIX_PATTERNS = [
    # 形式: "1.2" / "1.2.3" / "5.1" 多级数字前缀
    # (?!\d): 不吞并后续数字（"5.1"匹配后剩"bm"，"5.1.0"匹配到"5.1.0"）
    r'^\s*\d+(?:\.\d+)+(?!\d)',
    # 形式: "1." / "1、" / "1）"
    # 用反向断言 (?!\.\d) 避免与上面的多级冲突（"5.1" 不被吃成"5."）
    r'^\s*\d+\s*[、．.）)\]](?!\.\d)(?!\d)',
    # 形式: "[1]" / "（1）" / "(1)"
    r'^\s*[\[【（(]\s*\d+\s*[\]】）)]\s*',
    # 形式: "第1章" / "第1节"
    r'^\s*第\s*\d+\s*[章节部分]\s*',
    # 形式: "Chapter 1" / "Sec. 1" / "Section 1.2"
    r'^\s*(?:Chapter|Sec(?:tion)?|Section|附录)\.?\s*\d+(?:\.\d+)*\s*[:：\.\-]?\s*',
]

# 2) 数字+点+字母/中文组合的修正规则
#    例: "5.1bm" → "5.1 bm"（在数字编号后强制补空格）
#    例: "5.1 1.2" → "5.1"（剥除嵌套编号）
#    注意：此规则只剥离，不会插入新文字
DEFAULT_FIXUP_PATTERNS = [
    # 数字段紧贴非空白文字："5.1bm" → "5.1bm" 留待后续处理为 "5.1 bm"
    # 这里不直接剥除"bm"，因为无法判断"bm"是英文缩略还是章节名一部分
    # 改在 _normalize_h2_text 中基于上下文（紧跟数字.数字）补一个空格
]


def _default_rule_list():
    """返回内置默认规则列表（每次调用返回新列表，避免外部污染）"""
    return [re.compile(p) for p in DEFAULT_PREFIX_PATTERNS]


def _load_yaml_patterns(key, default=None):
    """从 doc_rules.yaml 读取 heading_numbering 模式（容错）"""
    if default is None:
        return _default_rule_list()
    try:
        import os
        import yaml
        rules_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 'doc_rules.yaml'
        )
        if not os.path.exists(rules_path):
            return default
        with open(rules_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or {}
        node = data.get('heading_numbering', {}) or {}
        raw = node.get(key, [])
        if not isinstance(raw, list):
            return default
        compiled = []
        for p in raw:
            try:
                compiled.append(re.compile(p))
            except re.error:
                # 非法正则跳过，不影响其他规则
                pass
        return compiled if compiled else default
    except Exception:
        return default


def strip_number_prefix(text, patterns=None):
    """从文本开头剥离已存在的数字/中文编号前缀。

    Args:
        text: 原始标题文本
        patterns: 预编译正则列表；None 时从 doc_rules.yaml 或内置默认加载

    Returns:
        (prefix, stripped_text)：
            - prefix: 剥离掉的前缀（去尾空白）
            - stripped_text: 剩余文本（去头尾空白）
    """
    if not text:
        return ('', '')
    if patterns is None:
        patterns = _load_yaml_patterns('number_prefix_patterns', _default_rule_list())
    s = text
    prefix_parts = []
    matched = True
    # 多次尝试以防 "1.2.3" 形式的嵌套
    while matched and patterns:
        matched = False
        for p in patterns:
            m = p.match(s)
            if m:
                prefix_parts.append(m.group(0).strip())
                s = s[m.end():]
                matched = True
                break

    # ── 二次清理：剥离主编号后剩余的标点 ──
    # "5.1. 机构管理" → 剥 "5.1" 后剩 ". 机构管理"，继续剥 ". "
    # "1、机构管理" → 剥 "1"（或"1、"?）后剩 "机构管理"
    # 通用：移除开头的标点符号 + 空白
    s = re.sub(r'^\s*[、．.,，:：；;）)\]】」』\-—_/\\]+\s*', '', s)

    return (' '.join(prefix_parts), s.strip())


def normalize_h2_text(text, parent_no, idx):
    """规范化 H2 子标题文本为"5.1 xxx"格式（核心修复函数）。

    解决问题：
        "5.1bm" / "5.1 bm" / "5.1. 机构管理" / "机构管理" →
        "5.1 机构管理"

    实现：
        1) 剥离任何已存在的编号前缀（不依赖具体业务名）
        2) 若剥离后为空（如"5.1"只剩数字），用"组件N"兜底
        3) 重新拼接成"parent_no.idx 剩余文本"

    Args:
        text: 原始 H2 文本（可能含各种格式前缀）
        parent_no: H1 父章节编号（int 或 str）
        idx: 当前 H2 在 H1 下的顺序（1-based）

    Returns:
        规范化后的完整文本，例如"5.1 机构管理"
    """
    if text is None:
        text = ''
    s = str(text).strip()
    patterns = _load_yaml_patterns('number_prefix_patterns', _default_rule_list())
    _, body = strip_number_prefix(s, patterns)
    # 兜底：若剥离后为空，使用通用占位（不硬编码业务名）
    if not body:
        body = f'组件{idx}'
    return f'{parent_no}.{idx} {body}'


def normalize_h3_text(text, parent_no, parent_idx, idx):
    """规范化 H3 子标题文本为"5.1.1 xxx"格式。

    用于系统组件下的 H3（功能描述/关键技术/提供的接口/需要的接口）。
    """
    if text is None:
        text = ''
    s = str(text).strip()
    patterns = _load_yaml_patterns('number_prefix_patterns', _default_rule_list())
    _, body = strip_number_prefix(s, patterns)
    if not body:
        body = '子章节'
    return f'{parent_no}.{parent_idx}.{idx} {body}'


def has_number_prefix(text, patterns=None):
    """检查文本是否以编号前缀开头（用于决定是否需要规范化）"""
    if not text:
        return False
    if patterns is None:
        patterns = _load_yaml_patterns('number_prefix_patterns', _default_rule_list())
    s = text.lstrip()
    return any(p.match(s) for p in patterns)
