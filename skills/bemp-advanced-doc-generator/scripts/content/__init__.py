"""
文档内容按需加载模块（Content Module）

设计原则：
  - 每个文档类型（概要设计/详细设计/测试用例等）独立一个子模块
  - 各模块之间数据与逻辑完全隔离，互不干扰
  - 通过 ContentRegistry 实现按需加载，避免一次性加载所有内容
  - 提供内容索引与导航（ContentIndex），便于快速定位章节与生成器

使用方式：
  from content import get_content_registry
  registry = get_content_registry()
  generator = registry.get_generator('outline', '编写目的')
  text = generator(scan_data)

架构：
  content/
  ├── __init__.py          # 本文件：注册中心 + 索引 + 懒加载
  ├── common.py            # 共享工具（build_tech_stack_text 等）
  ├── outline_chapters.py  # 概要设计章节内容生成器
  └── detail_chapters.py   # 详细设计章节内容生成器
"""
import sys
import os
import importlib
from typing import Dict, List, Optional, Any, Callable


# ── 内容索引（Content Index） ──────────────────────────────────
# 定义每个文档类型下有哪些章节，以及对应的生成器函数名
# 用于快速导航和内容查找
CONTENT_INDEX = {
    'outline': {
        'label': '概要设计说明书',
        'chapters': {
            '编写目的': {
                'module': 'outline_chapters',
                'generator': 'build_purpose_text',
                'type': 'text',
                'description': '说明文档编写的目的和背景',
            },
            '读者对象': {
                'module': 'outline_chapters',
                'generator': 'build_readers_text',
                'type': 'text',
                'description': '说明文档的目标读者',
            },
            '使用范围': {
                'module': 'outline_chapters',
                'generator': 'build_scope_text',
                'type': 'text',
                'description': '说明文档的适用范围和业务模块',
            },
            '术语和缩写': {
                'module': 'outline_chapters',
                'generator': 'build_glossary_table',
                'type': 'table',
                'description': '术语和缩写定义表',
            },
            '参考资料': {
                'module': 'outline_chapters',
                'generator': 'build_references_table',
                'type': 'table',
                'description': '参考资料列表',
            },
            '设计目标': {
                'module': 'outline_chapters',
                'generator': 'build_design_goal_text',
                'type': 'text',
                'description': '设计目标和原则',
            },
            '设计策略': {
                'module': 'outline_chapters',
                'generator': 'build_design_strategy_text',
                'type': 'text',
                'description': '设计策略说明',
            },
            '设计约束': {
                'module': 'outline_chapters',
                'generator': 'build_design_constraint_text',
                'type': 'text',
                'description': '设计约束条件',
            },
            '外部接口': {
                'module': 'outline_chapters',
                'generator': 'build_external_interface_text',
                'type': 'text',
                'description': '外部接口说明',
            },
            '组件汇总表': {
                'module': 'outline_chapters',
                'generator': 'build_component_summary_table',
                'type': 'table',
                'description': '系统组件汇总表',
            },
            '技术实现': {
                'module': 'outline_chapters',
                'generator': 'build_tech_impl_text',
                'type': 'text',
                'description': '关键技术实现描述',
            },
            '非功能性设计': {
                'module': 'outline_chapters',
                'generator': 'build_non_functional_text',
                'type': 'text',
                'description': '非功能性设计要求',
            },
            '模块复用分析': {
                'module': 'outline_chapters',
                'generator': 'build_module_reuse_text',
                'type': 'text',
                'description': '模块复用分析',
            },
            '附录': {
                'module': 'outline_chapters',
                'generator': 'build_appendix_text',
                'type': 'text',
                'description': '附录内容',
            },
            '组件内部的模块列表及说明': {
                'module': 'outline_chapters',
                'generator': 'build_module_list_text',
                'type': 'text',
                'description': '组件内部模块列表及说明',
            },
        },
    },
    'detail': {
        'label': '详细设计说明书',
        'chapters': {
            '概述': {
                'module': 'detail_chapters',
                'generator': 'build_overview_text',
                'type': 'text',
                'description': '项目概述',
            },
            '目的': {
                'module': 'detail_chapters',
                'generator': 'build_purpose_text',
                'type': 'text',
                'description': '编写目的',
            },
            '读者对象': {
                'module': 'detail_chapters',
                'generator': 'build_readers_text',
                'type': 'text',
                'description': '目标读者',
            },
            '适用范围': {
                'module': 'detail_chapters',
                'generator': 'build_scope_text',
                'type': 'text',
                'description': '适用范围',
            },
            '术语定义': {
                'module': 'detail_chapters',
                'generator': 'build_glossary_table',
                'type': 'table',
                'description': '术语和缩写定义',
            },
            '参考资料': {
                'module': 'detail_chapters',
                'generator': 'build_references_table',
                'type': 'table',
                'description': '参考资料',
            },
            '设计目标': {
                'module': 'detail_chapters',
                'generator': 'build_design_goal_text',
                'type': 'text',
                'description': '设计目标',
            },
            '设计策略': {
                'module': 'detail_chapters',
                'generator': 'build_design_strategy_text',
                'type': 'text',
                'description': '设计策略',
            },
            '设计约束': {
                'module': 'detail_chapters',
                'generator': 'build_design_constraint_text',
                'type': 'text',
                'description': '设计约束',
            },
            '外部接口': {
                'module': 'detail_chapters',
                'generator': 'build_external_interface_text',
                'type': 'text',
                'description': '外部接口',
            },
            '组件汇总': {
                'module': 'detail_chapters',
                'generator': 'build_component_summary_table',
                'type': 'table',
                'description': '组件汇总',
            },
            '关键技术': {
                'module': 'detail_chapters',
                'generator': 'build_tech_impl_text',
                'type': 'text',
                'description': '关键技术',
            },
            '接口设计': {
                'module': 'detail_chapters',
                'generator': 'build_interface_design_text',
                'type': 'text',
                'description': '接口设计',
            },
            '附录': {
                'module': 'detail_chapters',
                'generator': 'build_appendix_text',
                'type': 'text',
                'description': '附录',
            },
        },
    },
}


# ── 内容注册中心（Lazy Content Registry） ─────────────────────
class ContentRegistry:
    """按需加载的内容注册中心

    特性：
      - 懒加载：仅在首次访问时加载对应模块
      - 模块隔离：每个模块独立，互不干扰
      - 缓存：加载后的模块缓存，避免重复加载
      - 兜底：生成器不存在时返回 None，调用方自行处理
    """

    def __init__(self):
        self._loaded = {}          # module_name -> module object
        self._generator_cache = {}  # (doc_type, chapter) -> callable or None

    def _load_module(self, module_name: str):
        """按需加载指定模块，返回模块对象"""
        if module_name in self._loaded:
            return self._loaded[module_name]
        try:
            mod = importlib.import_module(f'.{module_name}', package='content')
            self._loaded[module_name] = mod
            return mod
        except ImportError as e:
            print(f'[WARN] 内容模块加载失败: {module_name} - {e}', file=sys.stderr)
            self._loaded[module_name] = None
            return None

    def get_generator(self, doc_type: str, chapter: str) -> Optional[Callable]:
        """获取指定章节的内容生成器函数

        Args:
            doc_type: 文档类型 ('outline' | 'detail')
            chapter:  章节名称（如 '编写目的'、'设计目标'）

        Returns:
            callable(scan_data) -> str | list[list] | None
        """
        cache_key = (doc_type, chapter)
        if cache_key in self._generator_cache:
            return self._generator_cache[cache_key]

        doc_index = CONTENT_INDEX.get(doc_type, {})
        chapters = doc_index.get('chapters', {})
        chapter_info = chapters.get(chapter)

        if not chapter_info:
            # 模糊匹配：尝试在章节名中查找关键词
            for ch_name, ch_info in chapters.items():
                if ch_name in chapter or chapter in ch_name:
                    chapter_info = ch_info
                    break

        if not chapter_info:
            self._generator_cache[cache_key] = None
            return None

        module_name = chapter_info.get('module')
        generator_name = chapter_info.get('generator')

        if not module_name or not generator_name:
            self._generator_cache[cache_key] = None
            return None

        mod = self._load_module(module_name)
        if mod is None:
            self._generator_cache[cache_key] = None
            return None

        generator = getattr(mod, generator_name, None)
        self._generator_cache[cache_key] = generator
        return generator

    def list_chapters(self, doc_type: str) -> List[Dict[str, Any]]:
        """列出指定文档类型的所有章节

        Returns:
            [{'name': '编写目的', 'type': 'text', 'description': '...'}, ...]
        """
        doc_index = CONTENT_INDEX.get(doc_type, {})
        chapters = doc_index.get('chapters', {})
        return [
            {'name': name, **info}
            for name, info in chapters.items()
        ]

    def get_chapter_info(self, doc_type: str, chapter: str) -> Optional[Dict[str, Any]]:
        """获取指定章节的详细信息"""
        doc_index = CONTENT_INDEX.get(doc_type, {})
        chapters = doc_index.get('chapters', {})
        return chapters.get(chapter)

    def is_loaded(self, module_name: str) -> bool:
        """检查模块是否已加载"""
        return module_name in self._loaded and self._loaded[module_name] is not None

    def generate(self, doc_type: str, chapter: str, scan_data: dict):
        """按需加载并调用内容生成器

        这是 ContentRegistry 的主要入口方法，供外部调用方（如
        outline-design-generator.py）使用。它负责：
          1. 查找对应章节的生成器函数
          2. 按需加载对应模块
          3. 调用生成器函数并返回结果

        Args:
            doc_type:  文档类型 ('outline' | 'detail')
            chapter:   章节名称（如 '编写目的'、'设计目标'）
            scan_data: 扫描数据字典

        Returns:
            text 类型: str | None
            table 类型: (headers, rows) tuple | None
            None: 表示未找到生成器或生成失败
        """
        generator = self.get_generator(doc_type, chapter)
        if generator is None:
            return None
        try:
            return generator(scan_data)
        except Exception as e:
            print(f'[WARN] 内容生成器调用失败: {doc_type}/{chapter} - {e}', file=sys.stderr)
            return None

    def get_loaded_modules(self) -> List[str]:
        """返回已加载的模块名列表"""
        return [name for name, mod in self._loaded.items() if mod is not None]

    def reload_module(self, module_name: str):
        """重新加载指定模块（用于热更新）"""
        if module_name in self._loaded:
            mod = self._loaded[module_name]
            if mod is not None:
                importlib.reload(mod)
            self._loaded.pop(module_name, None)
        # 清除相关缓存
        to_clear = []
        for (dt, ch), _ in self._generator_cache.items():
            doc_index = CONTENT_INDEX.get(dt, {})
            chapters = doc_index.get('chapters', {})
            chapter_info = chapters.get(ch, {})
            if chapter_info.get('module') == module_name:
                to_clear.append((dt, ch))
        for key in to_clear:
            self._generator_cache.pop(key, None)


# ── 全局单例 ──────────────────────────────────────────────────
_registry: Optional[ContentRegistry] = None


def get_content_registry() -> ContentRegistry:
    """获取全局内容注册中心单例"""
    global _registry
    if _registry is None:
        _registry = ContentRegistry()
    return _registry


def print_content_index(doc_type: str = None):
    """打印内容索引导航（调试用）"""
    if doc_type:
        types = [doc_type]
    else:
        types = list(CONTENT_INDEX.keys())

    for dt in types:
        doc_info = CONTENT_INDEX.get(dt, {})
        print(f"\n{'='*60}")
        print(f"  文档类型: {doc_info.get('label', dt)} ({dt})")
        print(f"{'='*60}")
        chapters = doc_info.get('chapters', {})
        for i, (name, info) in enumerate(chapters.items(), 1):
            print(f"  {i:2d}. {name:20s} [{info.get('type', '?')}]  {info.get('description', '')}")


if __name__ == '__main__':
    print_content_index()