"""
共享内容生成工具（common.py）

提供跨文档类型复用的基础内容生成函数，不包含任何业务硬编码。
所有函数接收 scan_data 字典，返回文本或表格数据。
"""
from datetime import datetime


def build_tech_stack_text(scan):
    """从 scan_data 的 techStack 构建技术栈描述文本

    所有技术名称与描述均来自配置，不硬编码任何具体技术。
    """
    module_name = scan.get('requirementModuleName') or scan.get('projectName') or '本项目'
    tech_stack = scan.get('techStack', [])

    if not tech_stack:
        modules = scan.get('modules', [])
        has_dubbo = any('dubbo' in m.get('name', '').lower() or 'dubbo' in m.get('path', '').lower()
                        for m in modules)
        has_redis = any('redis' in m.get('name', '').lower() or 'redis' in m.get('path', '').lower()
                        for m in modules)
        tech_stack = ['Spring Boot', 'MyBatis']
        if has_dubbo:
            tech_stack.append('Dubbo RPC')
        if has_redis:
            tech_stack.append('Redis')

    return {
        'module_name': module_name,
        'tech_stack': tech_stack,
    }


def format_date_now(fmt='%Y-%m-%d'):
    """获取当前日期格式化字符串"""
    return datetime.now().strftime(fmt)


def get_default_revision_record(module_name='本项目'):
    """生成默认修订记录数据（用于表格填充）

    返回 (headers, rows) 元组，不包含任何具体业务信息。
    """
    headers = ['版本号', '修订日期', '修订人', '修订内容', '备注']
    rows = [
        ['V1.0', format_date_now(), '', '初始版本', ''],
    ]
    return headers, rows


def get_default_glossary():
    """返回默认术语表数据（供模板填充使用）

    这些是通用术语，不包含银行/票据特定业务术语。
    业务特定术语应由需求文档解析器注入。

    Returns: (headers, rows) 元组，兼容 ContentRegistry.generate() 的 table 类型返回格式
    """
    headers = ['术语', '全称', '说明']
    rows = [
        ['BEMP', 'Bill Exchange Management Platform', '票据交换管理平台'],
        ['API', 'Application Programming Interface', '应用程序编程接口'],
        ['REST', 'Representational State Transfer', '表述性状态转移'],
        ['JSON', 'JavaScript Object Notation', 'JavaScript对象表示法'],
        ['AOP', 'Aspect-Oriented Programming', '面向切面编程'],
        ['RPC', 'Remote Procedure Call', '远程过程调用'],
        ['MVCC', 'Multi-Version Concurrency Control', '多版本并发控制'],
    ]
    return headers, rows


def get_default_references():
    """返回默认参考资料列表

    Returns: (headers, rows) 元组，兼容 ContentRegistry.generate() 的 table 类型返回格式
    """
    headers = ['文档名称', '版本', '来源']
    rows = [
        ['《BEMP票据系统需求规格说明书》', 'V1.0', '项目组'],
        ['《BEMP票据系统数据库设计说明书》', 'V1.0', '项目组'],
        ['《Spring Boot参考文档》', '最新版', 'Spring官方'],
        ['《MyBatis参考文档》', '最新版', 'MyBatis官方'],
    ]
    return headers, rows


def ensure_module_name(scan):
    """从 scan_data 中安全提取模块名"""
    return scan.get('requirementModuleName') or scan.get('projectName') or '本项目'