/**
 * yaml-loader.js - doc_rules.yaml 配置加载器（v7.1 新增）
 *
 * 职责：
 *   1. 加载并缓存 scripts/doc_rules.yaml
 *   2. 暴露 getUmlRules() / getChartEngineRules() / getTechDescriptionRules() 等便捷方法
 *   3. 兜底：YAML 解析失败时返回内嵌默认配置（与 Python 端 doc_formatter._DEFAULT_RULES 保持一致）
 *
 * 依赖：js-yaml（package.json 已声明）；缺失时降级为内嵌默认
 */

const fs = require('fs');
const path = require('path');

let _yamlLib = null;
try {
    _yamlLib = require('js-yaml');
} catch (e) {
    // 优先用 js-yaml；缺失时降级为内嵌 yaml-mini 解析器
    try {
        _yamlLib = require('./yaml-mini');
    } catch (e2) {
        _yamlLib = null;
    }
}

const _RULES_CACHE = {};

// ═══════════════════════════════════════════════════════════════
// 兜底默认（与 Python 端 doc_formatter._DEFAULT_RULES 保持一致）
// v7.1：仅保留兜底关键键，避免 JS 端重复维护所有配置
// ═══════════════════════════════════════════════════════════════
const _FALLBACK = {
    uml: {
        enable: true,
        keywords: ['类图', '顺序图', '活动图', '状态图', '组件图'],
        required_headings: ['类图', '顺序图', '活动图'],
        file_matchers: {
            '类图': ['class-diagram.png', 'uml-类图.png', 'uml-类.png'],
            '顺序图': ['sequence-*.png', 'uml-顺序图.png', 'uml-顺序.png'],
            '活动图': ['activity-*.png', 'uml-活动图.png', 'uml-活动.png'],
        },
        placeholder_cleaners: [
            '类图待补充', '顺序图待补充', '活动图待补充',
            '建议使用工具', '请在详细设计阶段补充', '建议在详细设计阶段',
        ],
        min_diagram_size_kb: 10,
        fallback_class_diagram: {
            title: '业务实体类图',
            classes: [
                { name: 'Controller', stereotype: 'control' },
                { name: 'Service', stereotype: 'service' },
                { name: 'Repository', stereotype: 'dataAccess' },
                { name: 'Entity', stereotype: 'entity' },
                { name: 'DTO', stereotype: 'data' },
            ],
            relations: [
                { from: 'Controller', to: 'Service', label: '调用' },
                { from: 'Service', to: 'Repository', label: '使用' },
                { from: 'Service', to: 'DTO', label: '转换' },
                { from: 'Repository', to: 'Entity', label: '操作' },
            ],
        },
        fallback_sequence_diagram: {
            title: '登录鉴权顺序图',
            name: '登录鉴权',
            actors: [
                { id: '用户', label: '用户' },
                { id: '前端UI', label: '前端UI' },
                { id: 'AuthController', label: 'AuthController' },
                { id: 'AuthService', label: 'AuthService' },
                { id: 'TokenManager', label: 'TokenManager' },
                { id: 'UserRepository', label: 'UserRepository' },
                { id: '数据库', label: '数据库' },
            ],
            messages: [
                { from: '用户', to: '前端UI', message: '输入账号密码' },
                { from: '前端UI', to: 'AuthController', message: 'POST /auth/login' },
                { from: 'AuthController', to: 'AuthService', message: 'login(username, password)' },
                { from: 'AuthService', to: 'UserRepository', message: 'findByUsername(username)' },
                { from: 'UserRepository', to: '数据库', message: 'SELECT * FROM T_USER WHERE USERNAME=?' },
                { from: '数据库', to: 'UserRepository', message: '返回用户记录', type: 'return' },
                { from: 'UserRepository', to: 'AuthService', message: '返回User对象', type: 'return' },
                { from: 'AuthService', to: 'AuthService', message: '密码加盐校验' },
                { from: 'AuthService', to: 'TokenManager', message: 'generateToken(userId, roles)' },
                { from: 'TokenManager', to: 'AuthService', message: '返回Token字符串', type: 'return' },
                { from: 'AuthService', to: 'AuthController', message: '返回LoginResult', type: 'return' },
                { from: 'AuthController', to: '前端UI', message: 'JSON响应(含Token)' },
                { from: '前端UI', to: '用户', message: '跳转首页' },
            ],
            notes: [
                { at: 'AuthService', text: '校验规则：\n1. 密码BCrypt加盐比对\n2. 失败计数+锁定（5次/15min）\n3. Token有效期8h' },
            ],
        },
        fallback_activity_diagram: {
            title: '业务处理活动图',
            name: '业务处理流程',
            nodes: [
                { id: 'start', label: '开始', type: 'start' },
                { id: 'receive', label: '接收请求', type: 'action' },
                { id: 'validate', label: '参数校验', type: 'action' },
                { id: 'checkValid', label: '校验通过？', type: 'decision' },
                { id: 'reject', label: '返回错误信息', type: 'action' },
                { id: 'endReject', label: '结束', type: 'end' },
                { id: 'auth', label: '权限校验', type: 'action' },
                { id: 'checkAuth', label: '有权限？', type: 'decision' },
                { id: 'denied', label: '返回权限不足', type: 'action' },
                { id: 'endDenied', label: '结束', type: 'end' },
                { id: 'process', label: '执行业务逻辑', type: 'action' },
                { id: 'persist', label: '数据持久化', type: 'action' },
                { id: 'result', label: '返回处理结果', type: 'action' },
                { id: 'endSuccess', label: '结束', type: 'end' },
            ],
            edges: [
                { from: 'start', to: 'receive' },
                { from: 'receive', to: 'validate' },
                { from: 'validate', to: 'checkValid' },
                { from: 'checkValid', to: 'reject', label: '否' },
                { from: 'checkValid', to: 'auth', label: '是' },
                { from: 'reject', to: 'endReject' },
                { from: 'auth', to: 'checkAuth' },
                { from: 'checkAuth', to: 'denied', label: '否' },
                { from: 'checkAuth', to: 'process', label: '是' },
                { from: 'denied', to: 'endDenied' },
                { from: 'process', to: 'persist' },
                { from: 'persist', to: 'result' },
                { from: 'result', to: 'endSuccess' },
            ],
        },
    },
    chart_engine: {
        enable: true,
        engine_priority: ['antv', 'matplotlib'],
        uml_engine: 'graphviz',
        fallback_strategy: 'reuse_then_placeholder',
        antv_timeout_ms: 60000,
        min_diagram_size_kb: 10,
        parallel: true,
        graphviz_dot_cmd: 'dot',
        output_dir: 'output/diagrams',
    },
    tech_description: {
        enable: true,
        type_keywords: {
            query: ['查询', '检索', '浏览', '列表', '详情', '统计', '报表'],
            write: ['新增', '修改', '删除', '保存', '提交', '编辑', '录入'],
            batch: ['批量', '导入', '导出', '同步', '迁移', '上载', '下发'],
            approval: ['审批', '审核', '流程', '复核', '签批', '授权'],
            integration: ['对接', '接入', '集成', '外部', '三方', '前置', '网关'],
        },
        subset_size: [5, 7],
        fallback_tech_stack: [
            'Spring Boot', 'MyBatis', 'Redis', 'MySQL',
            'ZooKeeper', 'Logback', 'Swagger',
        ],
    },
};

function _defaultPath() {
    return path.join(__dirname, '..', 'doc_rules.yaml');
}

function _deepMerge(base, override) {
    if (!override || typeof override !== 'object') return base;
    if (Array.isArray(override)) return override.slice();
    const out = Array.isArray(base) ? base.slice() : { ...(base || {}) };
    for (const [k, v] of Object.entries(override)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = _deepMerge(out[k] || {}, v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

function loadDocRules(yamlPath) {
    const target = yamlPath || _defaultPath();
    if (_RULES_CACHE[target]) return _RULES_CACHE[target];
    let merged = JSON.parse(JSON.stringify(_FALLBACK));
    try {
        if (fs.existsSync(target) && _yamlLib) {
            const raw = fs.readFileSync(target, 'utf-8');
            // js-yaml 暴露 load；yaml-mini 暴露 parseMiniYaml
            const parseFn = _yamlLib.load || _yamlLib.parseMiniYaml;
            const loaded = parseFn(raw) || {};
            merged = _deepMerge(merged, loaded);
        } else if (!fs.existsSync(target)) {
            // 静默回退
        }
    } catch (e) {
        // 静默回退
    }
    _RULES_CACHE[target] = merged;
    return merged;
}

// 便捷访问
function getUmlRules(yamlPath) {
    return loadDocRules(yamlPath).uml || _FALLBACK.uml;
}

function getChartEngineRules(yamlPath) {
    return loadDocRules(yamlPath).chart_engine || _FALLBACK.chart_engine;
}

function getTechDescriptionRules(yamlPath) {
    return loadDocRules(yamlPath).tech_description || _FALLBACK.tech_description;
}

function clearCache() {
    for (const k of Object.keys(_RULES_CACHE)) delete _RULES_CACHE[k];
}

module.exports = {
    loadDocRules,
    getUmlRules,
    getChartEngineRules,
    getTechDescriptionRules,
    clearCache,
    _FALLBACK,
};
