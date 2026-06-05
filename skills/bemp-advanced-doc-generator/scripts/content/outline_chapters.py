"""
概要设计章节内容生成器（outline_chapters.py）

每个函数对应概要设计文档中的一个章节，接收 scan_data 字典，
返回文本字符串（text类型）或二维列表（table类型）。

设计原则：
  - 所有内容从 scan_data 动态生成，不硬编码任何业务
  - 每个函数独立，互不依赖
  - 返回 None 表示该章节不适用（由调用方决定填充占位还是跳过）
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

def build_purpose_text(scan):
    """编写目的：从需求文档提取业务背景生成"""
    module_name = ensure_module_name(scan)
    business_modules = scan.get('businessModules', [])
    module_names = ', '.join([bm.get('name', '') for bm in business_modules if bm.get('name')]) or module_name

    lines = [
        f'本文档旨在对{module_name}的{module_names}功能进行概要设计说明，',
        f'明确系统的整体架构、模块划分、接口定义和技术方案。',
        f'本文档的预期读者包括项目管理人员、开发人员、测试人员及运维人员，',
        f'为后续的详细设计、编码实现和测试工作提供依据。',
    ]
    return '\n'.join(lines)


def build_readers_text(scan):
    """读者对象"""
    return (
        '本文档的主要读者包括：\n'
        '1. 项目管理人员：了解系统整体架构和技术方案，进行项目进度和资源管理；\n'
        '2. 开发人员：理解模块划分和接口定义，指导编码实现；\n'
        '3. 测试人员：了解系统功能边界和接口规范，设计测试用例；\n'
        '4. 运维人员：了解系统部署架构和运行环境要求。'
    )


def build_scope_text(scan):
    """使用范围：从业务模块动态生成"""
    module_name = ensure_module_name(scan)
    business_modules = scan.get('businessModules', [])

    if business_modules:
        module_names = '、'.join([
            bm.get('name', '') for bm in business_modules if bm.get('name')
        ])
        lines = [
            f'本文档适用于{module_name}的以下功能模块：',
            f'',
            f'{module_names}。',
            f'',
            f'文档内容涵盖上述功能模块的概要设计，包括系统架构、模块划分、',
            f'接口定义、数据库设计及关键技术方案。',
        ]
    else:
        lines = [
            f'本文档适用于{module_name}的概要设计，',
            f'涵盖系统架构、模块划分、接口定义、数据库设计及关键技术方案。',
        ]
    return '\n'.join(lines)


def build_design_goal_text(scan):
    """设计目标"""
    module_name = ensure_module_name(scan)

    lines = [
        f'{module_name}的设计目标如下：',
        '',
        '1. 功能完整性：满足业务需求文档中定义的所有功能要求，确保业务流程的完整闭环；',
        '2. 高可用性：系统应具备7×24小时不间断运行能力，关键业务接口响应时间不超过3秒；',
        '3. 可扩展性：系统架构应支持未来业务功能的扩展，新增模块不影响现有功能；',
        '4. 安全性：系统应满足金融行业安全标准，确保数据传输和存储的安全性；',
        '5. 可维护性：代码结构清晰，模块划分合理，便于后续维护和升级。',
    ]
    return '\n'.join(lines)


def build_design_strategy_text(scan):
    """设计策略"""
    module_name = ensure_module_name(scan)

    lines = [
        f'{module_name}采用以下设计策略：',
        '',
        '1. 分层架构：采用表现层、业务逻辑层、数据访问层的三层架构，各层职责明确；',
        '2. 微服务架构：基于Spring Boot构建独立微服务，通过RESTful API对外提供服务；',
        '3. 配置驱动：业务规则、界面展示等采用配置化方式，减少硬编码，提高灵活性；',
        '4. 前后端分离：前端采用Vue框架，后端提供RESTful API，前后端通过JSON格式交互；',
        '5. 数据库设计：遵循第三范式设计，合理使用索引和缓存，保证数据一致性和查询性能。',
    ]
    return '\n'.join(lines)


def build_design_constraint_text(scan):
    """设计约束"""
    module_name = ensure_module_name(scan)

    lines = [
        f'{module_name}的设计约束如下：',
        '',
        '1. 技术约束：系统基于Java 8+开发，使用Spring Boot框架，数据库使用Oracle/MySQL；',
        '2. 运行环境约束：系统需部署在Linux服务器上，依赖Redis、ZooKeeper等中间件；',
        '3. 接口约束：对外接口遵循RESTful规范，使用JSON格式进行数据交换；',
        '4. 安全约束：接口需进行身份认证和权限校验，敏感数据需加密存储；',
        '5. 性能约束：核心业务接口响应时间不超过3秒，系统支持不少于100并发用户。',
    ]
    return '\n'.join(lines)


def build_external_interface_text(scan):
    """外部接口"""
    module_name = ensure_module_name(scan)

    lines = [
        f'{module_name}涉及以下外部接口：',
        '',
        '1. 核心系统接口：与银行核心系统进行数据交互，获取客户信息、账户信息等；',
        '2. 信贷系统接口：与信贷管理系统对接，获取授信额度、担保信息等；',
        '3. 柜面系统接口：与柜面系统对接，接收柜面发起的业务请求；',
        '4. ESB服务总线：通过ESB进行服务注册和消息路由，实现系统间解耦。',
    ]
    return '\n'.join(lines)


def build_tech_impl_text(scan):
    """技术实现（关键技术）"""
    tech_info = build_tech_stack_text(scan)
    module_name = tech_info['module_name']
    tech_stack = tech_info['tech_stack']

    # 技术模板：描述与实际业务场景关联
    tech_templates = {
        'Spring Boot': '基于 Spring Boot 框架构建独立微服务，通过 RESTful API 对外提供{module}相关服务。',
        'MyBatis': '使用 MyBatis 作为数据访问层，管理{module}相关的数据持久化操作。',
        'Dubbo RPC': '服务间通过 Dubbo RPC 进行通信，使用 ZooKeeper 实现服务注册与发现。',
        'Redis': '缓存{module}相关的高频访问数据，通过 Redis 哨兵模式保证高可用。',
    }

    lines = [f'{module_name}采用以下关键技术实现：', '']
    for idx, tech in enumerate(tech_stack, 1):
        desc = tech_templates.get(tech, f'采用{tech}技术框架实现相关功能。')
        desc = desc.format(module=module_name)
        lines.append(f'{idx}. {tech}：{desc}')
        lines.append('')

    # 业务特性技术
    business_modules = scan.get('businessModules', [])
    next_idx = len(tech_stack) + 1
    if business_modules:
        lines.append(f'{next_idx}. 业务校验：基于{module_name}的业务规则，在服务层实现核心逻辑校验与状态流转控制。')
        lines.append('')
        next_idx += 1
        lines.append(f'{next_idx}. 审计日志：通过 AOP 拦截关键业务方法，记录{module_name}的操作人、操作时间、操作内容到审计表。')
    else:
        lines.append(f'{next_idx}. 数据库事务：基于 Spring 声明式事务管理，确保业务操作的原子性。')
        lines.append('')
        lines.append(f'{next_idx + 1}. 审计日志：通过 AOP 拦截关键业务方法，记录操作人、操作时间、操作内容到审计表。')
    return '\n'.join(lines)


def build_non_functional_text(scan):
    """非功能性设计"""
    return (
        '1. 性能设计\n'
        '   - 核心业务接口响应时间不超过3秒\n'
        '   - 系统支持不少于100并发用户同时在线操作\n'
        '   - 数据库查询合理使用索引，避免全表扫描\n\n'
        '2. 安全性设计\n'
        '   - 接口需进行身份认证和权限校验\n'
        '   - 敏感数据加密存储和传输\n'
        '   - 操作日志记录完整，支持审计追溯\n\n'
        '3. 可靠性设计\n'
        '   - 关键服务采用集群部署，避免单点故障\n'
        '   - 数据库采用主备架构，支持故障自动切换\n'
        '   - 缓存采用哨兵模式，保证高可用\n\n'
        '4. 可维护性设计\n'
        '   - 代码遵循统一编码规范\n'
        '   - 模块划分清晰，职责单一\n'
        '   - 日志输出规范，便于问题定位\n\n'
        '5. 可扩展性设计\n'
        '   - 采用微服务架构，支持独立扩展\n'
        '   - 接口设计遵循开闭原则\n'
        '   - 业务规则配置化，便于调整'
    )


def build_module_reuse_text(scan):
    """模块复用分析"""
    return (
        '本系统在以下方面实现了模块复用：\n\n'
        '1. 公共组件复用：认证授权、日志记录、异常处理等公共组件可被各业务模块复用；\n'
        '2. 数据访问层复用：基于MyBatis的通用CRUD操作可被各业务模块复用；\n'
        '3. 前端组件复用：通用查询、表格展示、表单验证等前端组件可跨页面复用；\n'
        '4. 工具类复用：日期处理、字符串操作、校验工具等通用工具类可被各模块复用。'
    )


def build_appendix_text(scan):
    """附录"""
    return (
        '附录内容包含以下部分：\n\n'
        '1. 接口清单：列出系统对外提供的所有接口及其说明；\n'
        '2. 数据表清单：列出系统涉及的主要数据表及其说明；\n'
        '3. 错误码清单：列出系统定义的错误码及其说明。'
    )


def build_module_list_text(scan):
    """组件内部的模块列表及说明"""
    business_modules = scan.get('businessModules', [])
    if not business_modules:
        return '暂无模块列表。'

    lines = []
    for i, bm in enumerate(business_modules, 1):
        name = bm.get('name', f'模块{i}')
        desc = bm.get('description', '')
        lines.append(f'{i}. {name}')
        if desc:
            lines.append(f'   说明：{desc}')
        subsections = bm.get('subsections', [])
        if subsections:
            sub_names = [s.get('name', '') for s in subsections if s.get('name')]
            if sub_names:
                lines.append(f'   包含功能：{"、".join(sub_names)}')
        lines.append('')
    return '\n'.join(lines)


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