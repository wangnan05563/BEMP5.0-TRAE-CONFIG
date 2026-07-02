"""
统一路径常量模块 - 消除脚本中的硬编码绝对路径

所有路径基于 SKILL_ROOT 自动推导，支持通过环境变量覆盖：
  BEMP_SKILL_ROOT   - 技能根目录（默认：本文件所在目录的上级）
  BEMP_PROJECT_ROOT - 项目根目录（默认：SKILL_ROOT 往上 4 级）
  BEMP_OUTPUT_DIR   - 输出目录（默认：SKILL_ROOT/output）
"""
import os
from pathlib import Path

# ── 核心路径 ──────────────────────────────────────────────
# SKILL_ROOT: bemp-advanced-doc-generator 目录
SKILL_ROOT = Path(os.environ.get(
    'BEMP_SKILL_ROOT',
    str(Path(__file__).resolve().parent.parent)
)).resolve()

# PROJECT_ROOT: BEMP5.0DEV 目录（SKILL_ROOT 往上 4 级：scripts → bemp-advanced-doc-generator → .trae → skills → .trae → 项目根）
# 更稳健：从 SKILL_ROOT 逐级向上查找含 pom.xml 的目录
_project_root_env = os.environ.get('BEMP_PROJECT_ROOT')
if _project_root_env:
    PROJECT_ROOT = Path(_project_root_env).resolve()
else:
    # 从 SKILL_ROOT 向上查找：匹配目录名含 BEMP 但排除技能目录自身
    _candidate = SKILL_ROOT.parent  # 从父级开始，避免匹配到技能目录自身
    while _candidate != _candidate.parent:
        if 'BEMP' in _candidate.name.upper():
            PROJECT_ROOT = _candidate
            break
        _candidate = _candidate.parent
    else:
        # 回退：SKILL_ROOT 往上 4 级
        PROJECT_ROOT = SKILL_ROOT.parents[3]

# ── 派生路径 ──────────────────────────────────────────────
SCRIPTS_DIR = SKILL_ROOT / 'scripts'
# 2026-07-02 优化：输出目录统一收敛到项目根 output
# 优先级：环境变量 BEMP_OUTPUT_DIR > PROJECT_ROOT/output > SKILL_ROOT/output（兜底）
_default_output = os.environ.get('BEMP_OUTPUT_DIR') or str(PROJECT_ROOT / 'output') or str(SKILL_ROOT / 'output')
OUTPUT_DIR = Path(_default_output).resolve()
ASSETS_DIR = SKILL_ROOT / 'assets'
CONFIG_DIR = SKILL_ROOT / 'config'
DIAGRAMS_DIR = OUTPUT_DIR / 'diagrams'
LIB_DIR = SCRIPTS_DIR / 'lib'

# ── 项目级路径 ────────────────────────────────────────────
# 银行个性化需求目录：环境变量 BEMP_REQUIREMENTS_DIR 指定，否则自动探测 docs 目录
_env_req_dir = os.environ.get('BEMP_REQUIREMENTS_DIR')
if _env_req_dir:
    _bank_req_candidates = [PROJECT_ROOT / _env_req_dir]
else:
    _bank_req_candidates = [PROJECT_ROOT / 'docs']
BANK_REQUIREMENTS_DIR = next(
    (d for d in _bank_req_candidates if d.exists()),
    PROJECT_ROOT / 'docs'  # 默认值
)

# ── 常用文件路径（函数形式，延迟求值） ──────────────────────
# 模板路径优先级：环境变量 > 通用默认模板
# 环境变量：BEMP_OUTLINE_TEMPLATE / BEMP_DETAIL_TEMPLATE
# 用户应在对话中通过 --template 参数或环境变量指定银行特定模板
def outline_design_template():
    """概要设计模板路径（优先使用环境变量指定的模板）"""
    env_tpl = os.environ.get('BEMP_OUTLINE_TEMPLATE')
    if env_tpl:
        p = Path(env_tpl)
        if p.is_absolute():
            return p
        return (SKILL_ROOT / p).resolve()
    return ASSETS_DIR / 'template-outline-design.docx'

def detail_design_template():
    """详细设计模板路径（优先使用环境变量指定的模板）"""
    # 2026-07-02 修复：环境变量名误用 BEMP_DETAIL_TEMPLATE（实际项目用 BEMP_DESIGN_TEMPLATE）
    env_tpl = os.environ.get('BEMP_DESIGN_TEMPLATE') or os.environ.get('BEMP_DETAIL_TEMPLATE')
    if env_tpl:
        p = Path(env_tpl)
        if p.is_absolute():
            return p
        return (SKILL_ROOT / p).resolve()
    # 修正回退逻辑：项目内 docs/07 标准模板 > skill 内置差异化模板 > null
    project_tpl = PROJECT_ROOT / 'docs' / '07【模板】详细设计说明书.docx'
    if project_tpl.exists():
        return project_tpl
    inner_tpl = SKILL_ROOT / 'assets' / 'templates' / 'XX银行-XX项目-差异化需求详细设计模板.docx'
    if inner_tpl.exists():
        return inner_tpl
    return None

def scan_data_path():
    """扫描数据缓存路径"""
    return OUTPUT_DIR / '_scan-data.json'

def requirement_parsed_path():
    """需求解析结果路径"""
    return OUTPUT_DIR / '_requirement-parsed.json'

def er_diagrams_path():
    """ER图数据路径"""
    return OUTPUT_DIR / '_er-diagrams.json'

def mcp_chart_configs_path():
    """MCP图表配置路径"""
    return OUTPUT_DIR / '_mcp-chart-configs.json'

# ── 工具函数 ──────────────────────────────────────────────
def ensure_output_dir():
    """确保输出目录存在"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR

def resolve_path(path_str, base=None):
    """将路径字符串解析为绝对路径（支持相对路径和环境变量）"""
    p = Path(os.path.expandvars(os.path.expanduser(str(path_str))))
    if not p.is_absolute():
        p = (base or SKILL_ROOT) / p
    return p.resolve()


# ── 2026-07-02 新增：输出路径校验（与 Node 端 paths.js validateOutputPath 语义一致） ──
class OutputPathInvalid(Exception):
    """输出路径不合法时抛出的异常"""
    def __init__(self, message, allowed_root=None, actual_path=None):
        super().__init__(message)
        self.code = 'OUTPUT_PATH_INVALID'
        self.allowed_root = allowed_root
        self.actual_path = actual_path


def validate_output_path(output_path, explicit_root=False):
    """
    校验 output_path 是否在 PROJECT_ROOT/output 下。
    explicit_root=True 时放行任意绝对路径（用户显式声明）。
    返回规范化后的绝对路径(Path)；不合法时抛 OutputPathInvalid。
    """
    if not output_path or not isinstance(output_path, (str, Path)):
        raise OutputPathInvalid('validate_output_path: output_path 必须是非空字符串')
    p = Path(os.path.expandvars(os.path.expanduser(str(output_path))))
    if not p.is_absolute():
        p = (Path.cwd() / p).resolve()
    else:
        p = p.resolve()
    if explicit_root:
        return p
    allowed_root = (PROJECT_ROOT / 'output').resolve()
    # Windows: 大小写不敏感
    if str(p).lower().startswith(str(allowed_root).lower()):
        return p
    raise OutputPathInvalid(
        f'输出路径必须在 {allowed_root} 下，当前为 {p}。'
        f'如需显式指定其他位置，请使用 --output-root 参数并显式声明。',
        allowed_root=str(allowed_root),
        actual_path=str(p),
    )


def detect_dual_output():
    """检测技能内 output 与项目根 output 是否同时存在"""
    skill_output = (SKILL_ROOT / 'output').resolve()
    project_output = (PROJECT_ROOT / 'output').resolve()
    both_exist = (
        skill_output.exists() and project_output.exists()
        and str(skill_output).lower() != str(project_output).lower()
    )
    return {
        'skill_output': str(skill_output),
        'project_output': str(project_output),
        'both_exist': both_exist,
    }


# ── 打印路径信息（调试用） ────────────────────────────────
if __name__ == '__main__':
    print(f'SKILL_ROOT     = {SKILL_ROOT}')
    print(f'PROJECT_ROOT   = {PROJECT_ROOT}')
    print(f'SCRIPTS_DIR    = {SCRIPTS_DIR}')
    print(f'OUTPUT_DIR     = {OUTPUT_DIR}')
    print(f'ASSETS_DIR     = {ASSETS_DIR}')
    print(f'CONFIG_DIR     = {CONFIG_DIR}')
    print(f'DIAGRAMS_DIR   = {DIAGRAMS_DIR}')
    print(f'BANK_REQ_DIR   = {BANK_REQUIREMENTS_DIR}')
    print(f'outline_tpl    = {outline_design_template()}')
    print(f'detail_tpl     = {detail_design_template()}')
    print(f'scan_data      = {scan_data_path()}')
    print(f'project_output = {PROJECT_ROOT / "output"}')
    print(f'dual_output    = {detect_dual_output()}')
