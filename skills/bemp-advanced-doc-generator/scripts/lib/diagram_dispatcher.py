"""diagram_dispatcher.py - 统一图表生成入口（v7.1 新增）

职责：
    1. 接收图表生成请求（类型：ER/架构/拓扑/部署/UML）
    2. 根据 doc_rules.yaml 中 chart_engine 配置选择引擎
    3. 调用对应引擎生成（AntV / matplotlib / Graphviz）
    4. 引擎不可用时按 fallback_strategy 降级

设计原则：
    - 零硬编码：所有配置从 doc_formatter.load_doc_rules() 读取
    - 单一入口：Python / Node 端均通过 DiagramDispatcher 调用
    - 可扩展：新增图表类型只需注册 dispatch_<type> 方法
"""
from __future__ import annotations

import os
import sys
import json
import glob as _glob
from typing import Dict, List, Optional, Tuple

try:
    import doc_formatter
except ImportError:
    # 把 scripts 目录加入 sys.path，使 import doc_formatter 可工作
    _SCRIPTS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _SCRIPTS_DIR not in sys.path:
        sys.path.insert(0, _SCRIPTS_DIR)
    import doc_formatter  # type: ignore


# 图表类型枚举（与 doc_rules.yaml 的 file_matchers 键对应）
DIAGRAM_TYPES = ('er', 'architecture', 'topology', 'deployment', 'uml')


class DiagramDispatcher:
    """统一图表生成调度器。

    用法：
        dispatcher = DiagramDispatcher(project_root, project_name)
        result = dispatcher.generate('er', scan_data)
        result = dispatcher.generate('architecture', scan_data)
        result = dispatcher.generate('uml', scan_data, diagram_subtype='class')
    """

    def __init__(self, project_root: str, project_name: str = ''):
        self.project_root = os.path.abspath(project_root)
        self.project_name = project_name or os.path.basename(self.project_root)
        self._rules = doc_formatter.load_doc_rules()
        self._chart_engine = self._rules.get('chart_engine', {}) or {}
        self._uml_rules = self._rules.get('uml', {}) or {}
        # 图表输出目录
        output_dir_rel = self._chart_engine.get('output_dir', 'output/diagrams')
        self.output_dir = os.path.normpath(os.path.join(self.project_root, output_dir_rel))
        os.makedirs(self.output_dir, exist_ok=True)
        # UML 子目录
        self.uml_dir = os.path.join(self.output_dir, 'uml')
        os.makedirs(self.uml_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # 公开 API
    # ------------------------------------------------------------------
    def generate(self, diagram_type: str, *args, **kwargs) -> Dict:
        """图表生成统一入口。

        Args:
            diagram_type: er | architecture | topology | deployment | uml
            *args, **kwargs: 透传给具体 dispatch_<type> 方法

        Returns:
            {
                'success': bool,
                'type': str,
                'engine': str,           # antv | matplotlib | graphviz | placeholder
                'output_paths': [str],   # PNG 路径列表
                'errors': [str],
            }
        """
        method_name = f'dispatch_{diagram_type}'
        method = getattr(self, method_name, None)
        if not method:
            return {
                'success': False,
                'type': diagram_type,
                'engine': 'none',
                'output_paths': [],
                'errors': [f'未知图表类型: {diagram_type}; 期望值: {DIAGRAM_TYPES}'],
            }
        try:
            return method(*args, **kwargs)
        except Exception as e:  # 兜底：永不抛异常给调用方
            return {
                'success': False,
                'type': diagram_type,
                'engine': 'error',
                'output_paths': [],
                'errors': [f'{diagram_type} 生成异常: {e}'],
            }

    # ------------------------------------------------------------------
    # 引擎选择（按 chart_engine.engine_priority 优先级）
    # ------------------------------------------------------------------
    def _select_engine(self, diagram_type: str) -> str:
        """按优先级返回可用引擎。"""
        priority = self._chart_engine.get('engine_priority') or ['antv', 'matplotlib']
        for engine in priority:
            if self._is_engine_available(engine):
                return engine
        # UML 走独立引擎
        if diagram_type == 'uml':
            uml_eng = self._chart_engine.get('uml_engine', 'graphviz')
            if self._is_engine_available(uml_eng):
                return uml_eng
        return 'none'

    def _is_engine_available(self, engine: str) -> bool:
        """探测引擎是否可用（AntV MCP / Graphviz / matplotlib）。"""
        if engine == 'antv':
            try:
                # AntV MCP 探测：默认不可用（无 MCP server 注册时）
                # 实际项目可通过环境变量 BEMP_ANTV_AVAILABLE=1 强制启用
                return os.environ.get('BEMP_ANTV_AVAILABLE', '0') == '1'
            except Exception:
                return False
        if engine == 'matplotlib':
            try:
                import matplotlib  # noqa: F401
                return True
            except ImportError:
                return False
        if engine == 'graphviz':
            dot_cmd = self._chart_engine.get('graphviz_dot_cmd', 'dot')
            return _which(dot_cmd) is not None
        return False

    # ------------------------------------------------------------------
    # 各图表类型调度
    # ------------------------------------------------------------------
    def dispatch_er(self, scan_data: dict) -> Dict:
        """ER 图生成调度。

        优先复用已生成的 ER_*.png；否则调用 er-diagram-generator.js
        """
        # 1) 复用已有 ER 图
        existing = self._find_existing('ER_*.png', subdir='.')
        if existing:
            return {
                'success': True,
                'type': 'er',
                'engine': 'reuse',
                'output_paths': existing,
                'errors': [],
            }
        # 2) 引擎调度
        engine = self._select_engine('er')
        if engine == 'antv':
            return self._dispatch_er_antv(scan_data)
        if engine == 'matplotlib':
            return self._dispatch_er_matplotlib(scan_data)
        return self._dispatch_placeholder('er')

    def dispatch_architecture(self, scan_data: dict) -> Dict:
        """架构图生成调度。"""
        return self._dispatch_simple_diagram(
            'architecture', 'architecture-diagram.png', scan_data
        )

    def dispatch_topology(self, scan_data: dict) -> Dict:
        """网络拓扑图生成调度。"""
        return self._dispatch_simple_diagram(
            'topology', 'network-topology.png', scan_data
        )

    def dispatch_deployment(self, scan_data: dict) -> Dict:
        """部署图生成调度。"""
        return self._dispatch_simple_diagram(
            'deployment', 'deployment-diagram.png', scan_data
        )

    def dispatch_uml(self, scan_data: dict, diagram_subtype: str = 'class',
                     business_module: str = '') -> Dict:
        """UML 图生成调度。

        Args:
            scan_data: 项目扫描数据
            diagram_subtype: 类图 | 顺序图 | 活动图 | 状态图 | 组件图
            business_module: 业务模块名（用于差异化生成）
        """
        # 1) 复用 Node 端已生成的图（按 file_matchers 匹配）
        existing = self._find_uml_existing(diagram_subtype)
        if existing:
            return {
                'success': True,
                'type': 'uml',
                'subtype': diagram_subtype,
                'engine': 'reuse',
                'output_paths': existing,
                'errors': [],
            }
        # 2) 引擎调度
        engine = self._select_engine('uml')
        if engine == 'graphviz':
            return self._dispatch_uml_graphviz(diagram_subtype, business_module, scan_data)
        return self._dispatch_placeholder('uml', subtype=diagram_subtype)

    # ------------------------------------------------------------------
    # 内部：通用简单图调度（架构/拓扑/部署）
    # ------------------------------------------------------------------
    def _dispatch_simple_diagram(self, diagram_type: str, expected_file: str,
                                 scan_data: dict) -> Dict:
        existing = self._find_existing(expected_file, subdir='.')
        if existing:
            return {
                'success': True,
                'type': diagram_type,
                'engine': 'reuse',
                'output_paths': existing,
                'errors': [],
            }
        engine = self._select_engine(diagram_type)
        # 实际项目可在此处调用 AntV/matplotlib 生成
        return self._dispatch_placeholder(diagram_type)

    # ------------------------------------------------------------------
    # 内部：AntV / matplotlib ER 图（占位实现，由后续 PR 完善）
    # ------------------------------------------------------------------
    def _dispatch_er_antv(self, scan_data: dict) -> Dict:
        return {
            'success': False,
            'type': 'er',
            'engine': 'antv',
            'output_paths': [],
            'errors': ['ER AntV 生成未在 Python 端实现，请使用 cli.js'],
        }

    def _dispatch_er_matplotlib(self, scan_data: dict) -> Dict:
        return {
            'success': False,
            'type': 'er',
            'engine': 'matplotlib',
            'output_paths': [],
            'errors': ['ER matplotlib 生成未在 Python 端实现，请使用 cli.js'],
        }

    # ------------------------------------------------------------------
    # 内部：Graphviz UML 图（通过外部 Node 端 uml-renderer）
    # ------------------------------------------------------------------
    def _dispatch_uml_graphviz(self, diagram_subtype: str, business_module: str,
                               scan_data: dict) -> Dict:
        try:
            import importlib
            uml_mod = importlib.import_module('uml-renderer')
        except Exception as e:
            return {
                'success': False,
                'type': 'uml',
                'subtype': diagram_subtype,
                'engine': 'graphviz',
                'output_paths': [],
                'errors': [f'uml-renderer 导入失败: {e}'],
            }
        output_name = f'uml-{diagram_subtype.replace("图", "")}.png'
        output_path = os.path.join(self.uml_dir, output_name)
        success = uml_mod.render_uml_auto(
            diagram_subtype, output_path,
            business_module=business_module,
            project_name=self.project_name,
        )
        if success and os.path.exists(output_path):
            return {
                'success': True,
                'type': 'uml',
                'subtype': diagram_subtype,
                'engine': 'graphviz',
                'output_paths': [output_path],
                'errors': [],
            }
        return self._dispatch_placeholder('uml', subtype=diagram_subtype)

    # ------------------------------------------------------------------
    # 内部：占位兜底
    # ------------------------------------------------------------------
    def _dispatch_placeholder(self, diagram_type: str, **kwargs) -> Dict:
        msg = self._chart_engine.get('fallback_message', '【图表待补充】')
        return {
            'success': False,
            'type': diagram_type,
            'engine': 'placeholder',
            'output_paths': [],
            'errors': [msg],
        }

    # ------------------------------------------------------------------
    # 内部：文件查找
    # ------------------------------------------------------------------
    def _find_existing(self, pattern: str, subdir: str = '.') -> List[str]:
        """按 glob 模式查找已存在的 PNG。"""
        base = os.path.join(self.output_dir, subdir) if subdir != '.' else self.output_dir
        if not os.path.isdir(base):
            return []
        min_size_kb = self._chart_engine.get('min_diagram_size_kb', 10)
        min_size = min_size_kb * 1024
        results = []
        for p in _glob.glob(os.path.join(base, pattern)):
            if os.path.getsize(p) > min_size:
                results.append(p)
        return results

    def _find_uml_existing(self, diagram_subtype: str) -> List[str]:
        """按 doc_rules.yaml uml.file_matchers 匹配已存在 UML 图。"""
        matchers = self._uml_rules.get('file_matchers', {}) or {}
        patterns = matchers.get(diagram_subtype) or [f'uml-{diagram_subtype}.png']
        results = []
        for pattern in patterns:
            for p in self._find_existing(pattern, subdir='uml'):
                if p not in results:
                    results.append(p)
        return results


# ----------------------------------------------------------------------
# 工具函数
# ----------------------------------------------------------------------
def _which(cmd: str) -> Optional[str]:
    """跨平台 which 实现（Windows + *nix）。"""
    for dir_ in os.environ.get('PATH', '').split(os.pathsep):
        full = os.path.join(dir_, cmd)
        if os.path.isfile(full):
            return full
        if os.name == 'nt':
            for ext in ('.exe', '.cmd', '.bat'):
                full2 = full + ext
                if os.path.isfile(full2):
                    return full2
    return None


# ----------------------------------------------------------------------
# CLI：独立测试入口
# ----------------------------------------------------------------------
if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser(description='DiagramDispatcher 独立测试')
    p.add_argument('--project-root', default=os.getcwd())
    p.add_argument('--project-name', default='')
    p.add_argument('--type', default='all', choices=list(DIAGRAM_TYPES) + ['all'])
    p.add_argument('--business-module', default='测试业务模块')
    args = p.parse_args()

    dispatcher = DiagramDispatcher(args.project_root, args.project_name)
    types = DIAGRAM_TYPES if args.type == 'all' else (args.type,)

    print(f'[DiagramDispatcher] project={dispatcher.project_name}')
    print(f'  output_dir={dispatcher.output_dir}')
    print(f'  uml_dir={dispatcher.uml_dir}')
    print()
    for t in types:
        if t == 'uml':
            for st in ('类图', '顺序图', '活动图'):
                r = dispatcher.generate('uml', scan_data={}, diagram_subtype=st,
                                        business_module=args.business_module)
                print(f'  {t}/{st}: success={r["success"]} engine={r["engine"]} '
                      f'paths={len(r["output_paths"])} errors={r["errors"]}')
        else:
            r = dispatcher.generate(t, scan_data={})
            print(f'  {t}: success={r["success"]} engine={r["engine"]} '
                  f'paths={len(r["output_paths"])} errors={r["errors"]}')
