"""
详细设计章节内容生成器（detail_chapters.py）

每个函数对应详细设计文档中的一个章节，接收 scan_data 字典，
返回文本字符串（text类型）或二维列表（table类型）。

设计原则：
  - 所有内容从 scan_data 动态生成，不硬编码任何业务
  - 每个函数独立，互不依赖
  - 与 outline_chapters.py 完全独立，数据与逻辑互不干扰
"""
from datetime import datetime
from .common import (
    build_tech_stack_text, format_date_now,
    get_default_revision_record, get_default_glossary,
    get_default_references, ensure_module_name,
)


# ═══════════════════════════════════════════════════════════════
# 文本类型生成器
# ═══════════════════════════════════════════════════════════════

def build_overview_text(scan):
    """项目概述"""
    module_name = ensure_module_name(scan)
    business_modules = scan.get('businessModules', [])
    module_names = ', '.join([bm.get('name', '') for bm in business_modules if bm.get('name')]) or module_name

    lines = [
        f'{module_name}的{module_names}功能是BEMP票据系统的重要组成部分，',
        f'旨在为银行机构提供高效、规范的票据业务管理能力。',
        f'本文档对该功能进行详细设计说明，包括功能模块划分、接口定义、',
        f'数据库设计及实现细节，为编码实现提供完整的技术指导。',
    ]
    return '\n'.join(lines)


def build_purpose_text(scan):
    """编写目的"""
    module_name = ensure_module_name(scan)
    business_modules = scan.get('businessModules', [])
    module_names = ', '.join([bm.get('name', '') for bm in business_modules if bm.get('name')]) or module_name

    lines = [
        f'本文档的编写目的是对{module_name}的{module_names}功能进行详细设计说明，',
        f'明确各功能模块的实现细节、数据结构、接口规范和算法逻辑。',
        f'为开发人员提供清晰的编码指导，为测试人员提供测试依据，',
        f'确保系统实现与需求规格保持一致。',
    ]
    return '\n'.join(lines)


def build_readers_text(scan):
    """读者对象"""
    return (
        '本文档的预期读者包括：\n'
        '1. 开发人员：理解功能模块的详细实现方案，进行编码实现；\n'
        '2. 测试人员：了解功能细节和接口规范，设计测试用例；\n'
        '3. 项目管理人员：了解开发工作量和实现复杂度；\n'
        '4. 维护人员：了解系统实现细节，便于后续维护。'
    )


def build_scope_text(scan):
    """适用范围"""
    module_name = ensure_module_name(scan)
    business_modules = scan.get('businessModules', [])

    if business_modules:
        module_names = '、'.join([
            bm.get('name', '') for bm in business_modules if bm.get('name')
        ])
        lines = [
            f'本文档适用于{module_name}的以下功能模块的详细设计：',
            f'',
            f'{module_names}。',
            f'',
            f'文档内容涵盖功能模块划分、接口定义、数据库设计、',
            f'类图设计、顺序图设计及代码实现要点。',
        ]
    else:
        lines = [
            f'本文档适用于{module_name}的详细设计，',
            f'涵盖功能模块划分、接口定义、数据库设计及代码实现要点。',
        ]
    return '\n'.join(lines)


def build_design_goal_text(scan):
    """设计目标"""
    return (
        '详细设计阶段的设计目标如下：\n\n'
        '1. 明确各功能模块的输入、输出和处理逻辑；\n'
        '2. 定义完整的接口规范，包括请求参数、响应格式和错误码；\n'
        '3. 设计合理的数据结构，确保数据存储的完整性和查询效率；\n'
        '4. 绘制类图和顺序图，清晰展示代码结构和调用关系；\n'
        '5. 制定编码规范和异常处理策略，保证代码质量。'
    )


def build_design_strategy_text(scan):
    """设计策略"""
    module_name = ensure_module_name(scan)

    lines = [
        f'{module_name}详细设计采用以下策略：',
        '',
        '1. 领域驱动设计：以业务领域为核心组织代码结构，按业务模块划分包结构；',
        '2. 接口先行：先定义接口规范（Controller层），再实现业务逻辑（Service层）；',
        '3. 分层解耦：Controller → Service → Mapper 三层架构，层间通过接口解耦；',
        '4. 异常统一处理：通过全局异常处理器统一处理业务异常和系统异常；',
        '5. 日志规范：关键操作记录操作日志，异常记录完整堆栈信息。',
    ]
    return '\n'.join(lines)


def build_design_constraint_text(scan):
    """设计约束"""
    return (
        '1. 技术约束\n'
        '   - 开发语言：Java 8+\n'
        '   - 框架：Spring Boot 2.x\n'
        '   - 数据库：Oracle/MySQL\n'
        '   - 中间件：Redis、ZooKeeper\n\n'
        '2. 编码约束\n'
        '   - 遵循阿里巴巴Java开发手册\n'
        '   - 统一使用StringUtils（lang3）\n'
        '   - 依赖注入使用@Autowired\n'
        '   - 日期处理使用DateTimeFormatter\n\n'
        '3. 架构约束\n'
        '   - Controller层不包含业务逻辑\n'
        '   - Service层使用@Transactional管理事务\n'
        '   - MyBatis映射指定jdbcType\n'
        '   - ThreadLocal在finally块中释放'
    )


def build_external_interface_text(scan):
    """外部接口

    数据来源：scan_data.externalDeps（项目扫描识别的外部依赖与接口）
    无硬编码业务名；无数据时回退到"不涉及"。
    """
    module_name = ensure_module_name(scan)
    external_deps = scan.get('externalDeps') or []

    if not external_deps:
        return f'{module_name}当前未识别到外部系统接口，本章节不涉及。'

    lines = [f'{module_name}涉及以下外部接口：', '']
    for idx, dep in enumerate(external_deps, 1):
        if isinstance(dep, dict):
            name = dep.get('name') or dep.get('interfaceName') or f'外部接口{idx}'
            desc = dep.get('description') or dep.get('remark') or '与外部系统对接'
            protocol = dep.get('protocol') or dep.get('callType') or 'REST/RPC'
            lines.append(f'{idx}. {name}')
            lines.append(f'   - 调用方式：{protocol}')
            lines.append(f'   - 说明：{desc}')
            lines.append('')
        elif isinstance(dep, str):
            lines.append(f'{idx}. {dep}')
            lines.append(f'   - 调用方式：REST/RPC')
            lines.append(f'   - 说明：与外部系统对接')
            lines.append('')
    return '\n'.join(lines)


def build_tech_impl_text(scan):
    """关键技术"""
    tech_info = build_tech_stack_text(scan)
    module_name = tech_info['module_name']
    tech_stack = tech_info['tech_stack']

    tech_templates = {
        'Spring Boot': '基于 Spring Boot 框架构建 RESTful API，提供{module}相关的 HTTP 接口服务。',
        'MyBatis': '使用 MyBatis 实现{module}相关的数据持久化，通过 XML 映射文件管理 SQL。',
        'Dubbo RPC': '通过 Dubbo RPC 实现{module}相关的服务间通信，使用 ZooKeeper 进行服务注册与发现。',
        'Redis': '使用 Redis 缓存{module}相关的高频查询数据，通过哨兵模式保证高可用。',
    }

    lines = [f'{module_name}采用以下关键技术：', '']
    for idx, tech in enumerate(tech_stack, 1):
        desc = tech_templates.get(tech, f'采用{tech}技术框架实现相关功能。')
        desc = desc.format(module=module_name)
        lines.append(f'{idx}. {tech}：{desc}')
        lines.append('')

    lines.append(f'{len(tech_stack) + 1}. 数据库事务：基于 Spring 声明式事务管理，确保业务操作的原子性。')
    lines.append('')
    lines.append(f'{len(tech_stack) + 2}. 审计日志：通过 AOP 拦截关键业务方法，记录操作信息。')
    return '\n'.join(lines)


def build_interface_design_text(scan):
    """接口设计"""
    module_name = ensure_module_name(scan)
    business_modules = scan.get('businessModules', [])

    lines = [f'{module_name}的接口设计遵循RESTful规范，主要接口如下：', '']

    if business_modules:
        for bm in business_modules:
            name = bm.get('name', '')
            if not name:
                continue
            lines.append(f'### {name}相关接口')
            lines.append('| 接口名称 | HTTP方法 | URL路径 | 说明 |')
            lines.append('|---------|---------|--------|------|')
            subsections = bm.get('subsections', [])
            if subsections:
                for sub in subsections:
                    sub_name = sub.get('name', '')
                    if not sub_name:
                        continue
                    lines.append(f'| {sub_name} | POST | /api/{name.lower()}/{sub_name.lower()} | {sub_name}操作 |')
            else:
                lines.append(f'| 查询 | GET | /api/{name.lower()}/query | 查询{name}信息 |')
                lines.append(f'| 新增 | POST | /api/{name.lower()}/add | 新增{name}记录 |')
            lines.append('')
    else:
        lines.append('| 接口名称 | HTTP方法 | URL路径 | 说明 |')
        lines.append('|---------|---------|--------|------|')
        lines.append(f'| 查询 | GET | /api/{module_name.lower()}/query | 查询{module_name}信息 |')
        lines.append(f'| 新增 | POST | /api/{module_name.lower()}/add | 新增{module_name}记录 |')
        lines.append('')

    return '\n'.join(lines)


def build_appendix_text(scan):
    """附录"""
    return (
        '附录内容包含以下部分：\n\n'
        '1. 接口清单：详细列出系统所有接口的请求参数和响应格式；\n'
        '2. 数据表清单：列出系统涉及的主要数据表及其字段说明；\n'
        '3. 错误码清单：列出系统定义的所有错误码及其说明；\n'
        '4. ER图：展示系统核心数据表之间的实体关系。'
    )


# ═══════════════════════════════════════════════════════════════
# 表格类型生成器
# ═══════════════════════════════════════════════════════════════

def build_glossary_table(scan):
    """术语和缩写表"""
    return get_default_glossary()


def build_references_table(scan):
    """参考资料表"""
    return get_default_references()


def build_component_summary_table(scan):
    """组件汇总表，返回 (headers, rows) 元组"""
    business_modules = scan.get('businessModules', [])
    headers = ['组件名称', '组件说明', '技术栈', '备注']
    if not business_modules:
        return headers, []

    rows = []
    for bm in business_modules:
        name = bm.get('name', '')
        desc = bm.get('description', '')
        if not name:
            continue
        rows.append([name, desc, 'Spring Boot', ''])
    return headers, rows