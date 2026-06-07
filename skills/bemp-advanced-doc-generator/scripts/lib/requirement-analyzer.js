const fs = require('fs');
const path = require('path');
const { BempDocError, ERROR_CODES } = require('../../config/default');

function getDefaultCodeDir() {
    try {
        const envConfigPath = path.join(__dirname, '..', '..', '_shared', 'env-config.json');
        if (fs.existsSync(envConfigPath)) {
            const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf-8'));
            const bankDir = envConfig.bank && envConfig.bank.projectDir;
            if (bankDir) return `banks/${bankDir}`;
        }
    } catch (e) { /* fallthrough */ }
    return 'banks/ext-hnnxbank';
}

class RequirementAnalyzer {
    /**
     * 深合并两个对象，source 覆盖 target 的同名字段，target 中 source 未定义的字段保留
     */
    static _deepMerge(target, source) {
        if (!target || typeof target !== 'object' || Array.isArray(target)) return source;
        if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
                target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                result[key] = RequirementAnalyzer._deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    static loadProfile(moduleName) {
        const configDir = path.join(__dirname, '..', 'config', 'modules');
        const defaultProfile = RequirementAnalyzer._loadDefaultProfile() || {};
        if (!fs.existsSync(configDir)) return defaultProfile;
        const cleanName = moduleName ? moduleName.replace(/[\\/:*?"<>|]/g, '_') : '';
        let candidates = [
            cleanName ? path.join(configDir, `${cleanName}.json`) : null,
        ].filter(Boolean);
        if (cleanName) {
            try {
                const existingFiles = fs.readdirSync(configDir).filter(f => f.endsWith('.json') && f !== 'default-profile.json');
                for (const file of existingFiles) {
                    const fileBase = file.replace('.json', '');
                    if (cleanName.includes(fileBase) || fileBase.includes(cleanName)) {
                        candidates.unshift(path.join(configDir, file));
                        break;
                    }
                }
            } catch (e) { /* fuzzy match failed, use exact candidates */ }
        }
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                try {
                    const moduleProfile = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
                    // 深合并：模块 profile 覆盖默认 profile，默认 profile 中模块未定义的字段保留
                    return RequirementAnalyzer._deepMerge(defaultProfile, moduleProfile);
                } catch (e) { /* continue to next candidate */ }
            }
        }
        return defaultProfile;
    }

    static listProfiles() {
        const configDir = path.join(__dirname, '..', 'config', 'modules');
        if (!fs.existsSync(configDir)) return [];
        try {
            return fs.readdirSync(configDir)
                .filter(f => f.endsWith('.json'))
                .map(f => {
                    const filePath = path.join(configDir, f);
                    try {
                        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        return {
                            file: f,
                            name: f.replace('.json', ''),
                            description: data._description || '',
                            isDefault: f === 'default-profile.json',
                            schemaVersion: data._schemaVersion || '未知'
                        };
                    } catch (e) {
                        return { file: f, name: f.replace('.json', ''), description: '(解析失败)', isDefault: false, schemaVersion: '未知' };
                    }
                });
        } catch (e) { return []; }
    }
    static _loadDefaultProfile() {
        const defaultPath = path.join(__dirname, '..', 'config', 'modules', 'default-profile.json');
        if (fs.existsSync(defaultPath)) {
            try { return JSON.parse(fs.readFileSync(defaultPath, 'utf-8')); } catch (e) {}
        }
        return null;
    }

    constructor(options = {}) {
        this.options = {
            ...options
        };
        this.profile = options.profile || RequirementAnalyzer._loadDefaultProfile() || {};
    }

    analyzeRequirement(mdContent) {
        const testPoints = this._extractTestPoints(mdContent);
        const testCases = this._generateTestCases(testPoints);
        return {
            testPoints,
            testCases,
            summary: {
                totalTestPoints: testPoints.length,
                totalTestCases: testCases.length,
                positiveCases: testCases.filter(tc => tc.nature === '正例').length,
                negativeCases: testCases.filter(tc => tc.nature === '反例').length,
                boundaryCases: testCases.filter(tc => tc.nature === '边界').length
            }
        };
    }

    _filterByModule(mdContent, moduleName) {
        if (!moduleName) return mdContent;
        const lines = mdContent.split('\n');
        const moduleStartIdx = [];
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^###\s+(.+)/);
            if (match) moduleStartIdx.push({ idx: i, title: match[1].trim() });
        }
        let targetIdx = -1;
        for (const item of moduleStartIdx) {
            if (item.title.includes(moduleName) || moduleName.includes(item.title)) {
                targetIdx = item.idx;
                break;
            }
        }
        if (targetIdx === -1) {
            for (const item of moduleStartIdx) {
                const simplified = item.title.replace(/[（）()\s]/g, '');
                const simplifiedModule = moduleName.replace(/[（）()\s]/g, '');
                if (simplified.includes(simplifiedModule) || simplifiedModule.includes(simplified)) {
                    targetIdx = item.idx;
                    break;
                }
            }
        }
        if (targetIdx === -1) return mdContent;
        const nextIdx = moduleStartIdx.find(item => item.idx > targetIdx);
        const endIdx = nextIdx ? nextIdx.idx : lines.length;
        return lines.slice(targetIdx, endIdx).join('\n');
    }

    analyzeForDesign(mdContent, moduleName) {
        const filteredContent = this._filterByModule(mdContent, moduleName);
        const lines = filteredContent.split('\n');
        const prof = this.profile;
        const company = prof.company || {};
        const secRules = prof.securityRules || {};
        const targets = prof.designTargets || {};
        const subsystemKeywords = prof.subsystemKeywords || ['系统管理子系统', '业务管理子系统', '场内交易子系统', '场内业务子系统'];
        const menuPath = this._extractMenuPath(filteredContent, subsystemKeywords);
        const sections = this._splitBySubFeatureHeadings(lines);

        const background = this._extractBackground(filteredContent, moduleName);
        const modules = this._extractModules(sections, menuPath);
        const businessRules = this._collectBusinessRules(sections);
        const dataFields = this._collectDataFields(sections);
        const interfaces = this._extractInterfaces(sections, menuPath);
        const errorCodes = this._extractErrorCodes(businessRules);
        const securityRules = this._extractSecurityRules(businessRules);

        const date = new Date().toLocaleDateString('zh-CN');

        return {
            coverPage: {
                title: `${moduleName || menuPath.level3 || '模块'}详细设计文档`,
                company: company.name || '恒生电子股份有限恒生股份有限恒生股份有限恒生股份有限公司',
                product: company.product || '票据交易管理平台软件平台软件平台软件平台软件',
                version: company.version || 'V5.0',
                documentType: '设计说明书',
                department: company.department || '业务部门',
                date
            },
            revisionHistory: {
                headers: ['版本', '修订人', '修订说明', '批准人', '发布日期'],
                rows: [['V1.0', '', '初始版本', '', date]]
            },
            chapters: [
                {
                    id: 1,
                    title: '第一章 系统概述',
                    sections: [
                        { id: '1.1', title: '1.1 业务背景', content: { description: background } },
                        { id: '1.2', title: '1.2 设计目标', content: {
                            headers: ['目标类型', '目标描述'],
                            rows: [
                                ['功能目标', `实现${menuPath.level3 || moduleName}的核心业务功能，包括${modules.map(m => m[0]).join('、')}等，确保数据一致性和完整性`],
                                ['性能目标', `保证接口响应速度和系统稳定性，${targets.performance || '核心操作响应时间<500ms'}`],
                                ['质量目标', `确保代码规范、测试覆盖全面、文档完整，${targets.quality || '业务规则100%正确执行'}`]
                            ]
                        }},
                        { id: '1.3', title: '1.3 范围说明', content: {
                            headers: ['范围类型', '说明'],
                            rows: [
                                ['纳入范围', modules.map(m => m[0]).join('；')],
                                ['排除范围', prof.excludedScope || '外围系统消息发送、产品服务接口内部实现']
                            ]
                        }}
                    ]
                },
                {
                    id: 2,
                    title: '第二章 功能模块划分',
                    sections: [
                        { id: '2.1', title: '2.1 模块划分', content: {
                            headers: ['子模块', '功能', '说明'],
                            rows: modules
                        }},
                        { id: '2.2', title: '2.2 模块职责', content: { description: `${menuPath.level3 || moduleName}包含以下核心职责：${modules.map(m => `${m[0]}负责${m[2]}`).join('；')}。模块间通过服务接口调用，数据通过数据库表关联。` }},
                        { id: '2.3', title: '2.3 接口边界', content: {
                            headers: ['接口名称', '接口类型', '调用方向', '说明'],
                            rows: interfaces
                        }}
                    ]
                },
                {
                    id: 3,
                    title: '第三章 核心业务流程',
                    sections: [
                        { id: '3.1', title: '3.1 业务流程图', content: { description: `${menuPath.level3 || moduleName}核心业务流程：数据查询→数据录入→数据校验→数据提交→结果确认。详细流程图参见需求文档。` }},
                        { id: '3.2', title: '3.2 时序图', content: { description: `主流程时序：用户发起操作→系统校验必填项→保存数据→返回操作结果。异常流程：校验不通过→返回错误提示；操作失败→回滚数据。` }},
                        { id: '3.3', title: '3.3 关键节点说明', content: {
                            headers: ['节点编号', '节点名称', '处理逻辑', '业务规则'],
                            rows: this._buildKeyNodes(businessRules)
                        }}
                    ]
                },
                {
                    id: 4,
                    title: '第四章 数据模型设计',
                    sections: [
                        { id: '4.1', title: '4.1 字段映射关系', content: { description: '以下为需求文档中定义的界面栏位与系统字段的映射关系。' }},
                        { id: '4.2', title: '4.2 数据结构定义', content: {
                            headers: ['字段名称', '字段代码', '类型', '长度', '必填', '说明'],
                            rows: dataFields
                        }}
                    ]
                },
                {
                    id: 5,
                    title: '第五章 接口定义',
                    sections: [
                        { id: '5.1', title: '5.1 API 接口清单', content: {
                            headers: ['接口名称', '服务码', '接口类型', '说明'],
                            rows: interfaces.map(iff => [iff[0], '', iff[1] === 'RPC接口' ? 'RPC服务' : 'HTTP接口', iff[3]])
                        }},
                        { id: '5.2', title: '5.2 接口详情', content: { description: '各接口的请求参数、响应参数、调用示例、错误处理等详见接口设计文档。' }}
                    ]
                },
                {
                    id: 6,
                    title: '第六章 异常处理机制',
                    sections: [
                        { id: '6.1', title: '6.1 错误码定义', content: {
                            headers: ['错误码', '错误信息', '触发场景', '处理方式'],
                            rows: errorCodes
                        }},
                        { id: '6.2', title: '6.2 处理流程', content: { description: '异常分类：业务逻辑异常（校验不通过、数据不存在）、系统异常（网络超时、数据库异常）。处理策略：业务异常返回明确错误提示，系统异常记录日志并返回通用错误信息。' }},
                        { id: '6.3', title: '6.3 恢复策略', content: { description: '数据操作采用数据库事务保证原子性，失败自动回滚。并发场景使用行级锁(SELECT FOR UPDATE)防止数据不一致。' }},
                    ]
                },
                {
                    id: 7,
                    title: '第七章 安全策略',
                    sections: [
                        { id: '7.1', title: '7.1 认证授权', content: { description: securityRules.length > 0 ? securityRules.join('；') : (secRules.defaultRule || '基于项目框架统一认证，申请岗和复核岗权限分离，复核岗不可操作申请数据，申请岗不可执行复核。') }},
                        { id: '7.2', title: '7.2 数据加密', content: { description: `传输层使用HTTPS加密，敏感字段（${secRules.sensitiveFields || '敏感业务数据'}）在日志中脱敏处理，数据库存储不加密。` }},
                        { id: '7.3', title: '7.3 访问控制', content: { description: securityRules.length > 0 ? securityRules.join('；') : (secRules.roleAccessRule || '基于角色的访问控制(RBAC)，申请岗仅可操作申请数据，复核岗仅可操作复核。操作审计日志记录所有关键操作。') }}
                    ]
                },
                {
                    id: 8,
                    title: '第八章 技术实现细节',
                    sections: [
                        { id: '8.1', title: '8.1 核心算法', content: { description: `${moduleName || menuPath.level3 || '模块'}核心业务处理逻辑：基于需求文档中的业务规则实现数据校验、状态流转和业务处理。数据操作采用数据库事务保证原子性，失败自动回滚。` }},
                        { id: '8.2', title: '8.2 代码示例', content: {
                            headers: ['类名', '方法名', '说明', '代码行数'],
                            rows: this._buildCodeExamples(sections, moduleName)
                        }},
                        { id: '8.3', title: '8.3 性能优化', content: {
                            headers: ['优化项', '优化策略', '预期效果'],
                            rows: this._buildPerformanceOptRows(sections, moduleName)
                        }},
                        { id: '8.4', title: '8.4 开发规范', content: {
                            headers: ['规范类型', '规范要求', '说明'],
                            rows: (prof.devSpecs || [
                                ['代码目录', `后端代码在${getDefaultCodeDir()}目录`, '遵循个性化开发规范'],
                                ['注解使用', '使用@Component注解注册组件', '确保Spring容器正确管理'],
                                ['工具类复用', '复用项目已有工具类', '避免重复代码'],
                                ['注释规范', '关键逻辑添加中文注释', '提高代码可读性']
                            ]).map(row => {
                                if (typeof row[1] === 'string' && row[1].includes('${codeDir}')) {
                                    return [row[0], row[1].replace('${codeDir}', prof.codeDir || getDefaultCodeDir()), row[2]];
                                }
                                return row;
                            })
                        }}
                    ]
                }
            ],
            appendix: {
                references: [...(prof.references || ['项目开发规范文档']), `${moduleName || ''}需求规格说明书`],
                glossary: this._buildGlossary(menuPath, moduleName, businessRules)
            }
        };
    }

    _extractBackground(content, moduleName) {
        const lines = content.split('\n');
        const bgParts = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') && bgParts.length > 0) break;
            if (trimmed.length > 10 && !trimmed.startsWith('|') && !trimmed.startsWith('---') && !trimmed.startsWith('#')) {
                bgParts.push(trimmed);
            }
            if (bgParts.length >= 5) break;
        }
        const moduleLabel = moduleName || '本';
        return bgParts.length > 0
            ? `当前系统存在以下业务需求：${bgParts.join('；')}。${moduleLabel}功能旨在解决上述业务需求，确保数据一致性和完整性。`
            : '（待补充业务背景）';
    }

    _extractModules(sections, menuPath) {
        const moduleMap = new Map();
        const level3 = menuPath.level3 || '模块';
        for (const sec of sections) {
            // 2026-06-06 修复：业务子模块必须是 H4/H5 且有 H6 子节
            // 仅有描述性 H5（如"业务模块额度使用规则"）不应被识别为业务子模块
            const isCandidate = sec.level >= 4 && sec.level <= 5 && sec.title;
            const hasSub = sec.level <= 4 || sec.hasSubsection === true;
            if (isCandidate && hasSub) {
                const parentTitle = sec.parentTitle || sec.title;
                if (!moduleMap.has(parentTitle)) {
                    moduleMap.set(parentTitle, [parentTitle, sec.content ? sec.content.substring(0, 60).trim() : '']);
                }
            }
        }
        if (moduleMap.size === 0) {
            // 硬编码默认值已移除：从 profile 读取，无配置时回退到空数组
            const defaults = this.profile.defaultModules || [];
            for (const dm of defaults) moduleMap.set(dm[0], [dm[0], dm[1] || '']);
        }
        return Array.from(moduleMap.entries()).map(([name, desc]) => [
            name, desc[0], desc[1] || `${name}相关功能`
        ]);
    }

    _collectBusinessRules(sections) {
        const rules = [];
        for (const sec of sections) {
            const secRules = this._extractBusinessRules(sec.content);
            for (const rule of secRules) {
                rules.push({ source: sec.title, rule });
            }
        }
        return rules;
    }

    _collectDataFields(sections) {
        const allFields = [];
        const seen = new Set();
        for (const sec of sections) {
            const fields = this._extractFieldDescriptions(sec.content);
            for (const f of fields) {
                if (!seen.has(f.name)) {
                    seen.add(f.name);
                    allFields.push([
                        f.name,
                        f.name.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').substring(0, 20) || f.name,
                        f.io === '输入' ? 'S(32)' : 'S(64)',
                        '32',
                        f.required ? '是' : '否',
                        f.constraint || ''
                    ]);
                }
            }
        }
        return allFields.length > 0 ? allFields : [['（待补充）', '', '', '', '', '']];
    }

    _extractInterfaces(sections, menuPath) {
        const moduleNames = new Set();
        for (const sec of sections) {
            // 2026-06-06 修复：接口清单对应业务子模块，H5 需有 H6 子节才收集
            const isCandidate = sec.level >= 4 && sec.level <= 5;
            const hasSub = sec.level <= 4 || sec.hasSubsection === true;
            if (isCandidate && hasSub) {
                moduleNames.add(sec.title);
            }
        }
        const interfaces = [];
        for (const name of moduleNames) {
            interfaces.push([`${name}接口`, 'RPC接口', '调用', `${name}相关业务操作`]);
        }
        if (interfaces.length === 0) {
            // 硬编码默认值已移除：从 profile 读取，无配置时回退到空数组
            const defs = this.profile.defaultInterfaces || [];
            for (const d of defs) interfaces.push(d);
        }
        return interfaces;
    }

    _extractErrorCodes(businessRules) {
        const codes = [];
        let codeIdx = 1;
        const seenTypes = new Set();
        for (const br of businessRules) {
            const rule = br.rule;
            let type = '';
            if (rule.includes('不能') || rule.includes('不可')) type = '操作限制';
            else if (rule.includes('必须') || rule.includes('必输')) type = '校验不通过';
            else if (rule.includes('提示')) type = '提示信息';
            else if (rule.includes('超过') || rule.includes('大于')) type = '越界校验';
            if (type && !seenTypes.has(type)) {
                seenTypes.add(type);
                codes.push([`E${String(codeIdx++).padStart(3, '0')}`, type, rule.substring(0, 50), '返回错误提示，操作回滚']);
            }
            if (codes.length >= 8) break;
        }
        if (codes.length === 0) {
            const defs = this.profile.defaultErrorCodes || [
                ['E001', '必填校验', '关键字段未填写', '返回错误提示'],
                ['E002', '数据不存在', '选中数据已删除', '返回错误提示'],
                ['E003', '状态校验', '操作状态不允许', '返回错误提示']
            ];
            for (const d of defs) codes.push(d);
        }
        return codes;
    }

    _extractSecurityRules(businessRules) {
        const rules = [];
        for (const br of businessRules) {
            const rule = br.rule;
            if (rule.includes('权限') || rule.includes('岗位') || rule.includes('角色') || rule.includes('复核')) {
                rules.push(rule);
            }
        }
        return rules;
    }

    _buildKeyNodes(businessRules) {
        const nodes = [];
        let idx = 1;
        const seenNames = new Set();
        for (const br of businessRules) {
            const source = br.source || '';
            if (!seenNames.has(source) && source.length > 0) {
                seenNames.add(source);
                const ruleSummary = br.rule ? br.rule.substring(0, 40) : '';
                nodes.push([`N${idx}`, source, `${source}相关业务处理`, ruleSummary]);
                idx++;
            }
            if (nodes.length >= 7) break;
        }
        if (nodes.length === 0) {
            const defs = this.profile.defaultKeyNodes || [
                ['N1', '数据查询', '查询列表数据', '查询条件校验'],
                ['N2', '数据新增', '新增业务数据', '必填项校验'],
                ['N3', '数据修改', '修改业务数据', '数据存在性校验'],
                ['N4', '数据删除', '删除业务数据', '关联性校验'],
                ['N5', '提交审批', '提交数据至审批流程', '状态校验']
            ];
            for (const d of defs) nodes.push(d);
        }
        return nodes;
    }

    analyzeForTestCase(mdContent, moduleName) {
        const filteredContent = this._filterByModule(mdContent, moduleName);
        const analysis = this.analyzeRequirement(filteredContent);
        const testCases = analysis.testCases;
        const positiveCases = testCases.filter(tc => tc.nature === '正例');
        const negativeCases = testCases.filter(tc => tc.nature === '反例');
        const tcProf = this.profile;
        const tcSubsystemKeywords = tcProf.subsystemKeywords || [];
        const menuPath = this._extractMenuPath(filteredContent, tcSubsystemKeywords);
        const date = new Date().toLocaleDateString('zh-CN');
        const tcCompany = tcProf.company || {};

        const positiveRows = positiveCases.map(tc => [
            tc.id, tc.level4, tc.precondition, tc.content, '', tc.expected, '高'
        ]);
        const negativeRows = negativeCases.map(tc => [
            tc.id, tc.level4, tc.precondition, tc.content, '', tc.expected, '高'
        ]);

        const boundaryRows = this._generateBoundaryTestCases(filteredContent);
        const fieldMappingRows = this._generateFieldMappingTestCases(filteredContent);
        const integrationRows = this._generateIntegrationTestCases(menuPath);
        const performanceRows = this._generatePerformanceTestCases(menuPath);
        const securityRows = this._generateSecurityTestCases(menuPath);

        const level1 = menuPath.level1 || tcProf.defaultMenuLevel1 || '业务管理子系统';
        const level2 = menuPath.level2 || tcProf.defaultMenuLevel2 || '风险管理';
        const level3 = menuPath.level3 || moduleName || '模块';

        const allTestCases = [...testCases];

        for (const row of boundaryRows) {
            allTestCases.push({
                id: row[0], level1, level2, level3, level4: row[1],
                precondition: row[2], content: row[3], nature: '边界',
                expected: row[5] || row[6] || ''
            });
        }
        for (const row of fieldMappingRows) {
            allTestCases.push({
                id: row[0], level1, level2, level3, level4: `字段映射-${row[1]}`,
                precondition: '进入对应操作页面', content: `验证${row[1]}字段映射，输入${row[3]}`, nature: '正例',
                expected: row[4] || ''
            });
        }
        for (const row of integrationRows) {
            allTestCases.push({
                id: row[0], level1, level2, level3, level4: row[1],
                precondition: row[2], content: row[3], nature: '正例',
                expected: row[5] || ''
            });
        }
        for (const row of performanceRows) {
            allTestCases.push({
                id: row[0], level1, level2, level3, level4: row[1],
                precondition: `并发数${row[2]}，持续${row[3]}`, content: `预期响应时间${row[4]}`, nature: '性能',
                expected: row[5] || ''
            });
        }
        for (const row of securityRows) {
            allTestCases.push({
                id: row[0], level1, level2, level3, level4: row[1],
                precondition: '已登录系统', content: row[2], nature: '安全',
                expected: row[3] || ''
            });
        }

        return {
            coverPage: {
                title: `${moduleName || menuPath.level3 || '模块'}测试用例`,
                company: tcCompany.name || '公司名称',
                product: tcCompany.product || '项目产品名称',
                version: tcCompany.version || 'V1.0',
                documentType: '测试用例说明书',
                department: tcCompany.department || '业务部门',
                date
            },
            revisionHistory: {
                headers: ['版本', '修订人', '修订说明', '批准人', '发布日期'],
                rows: [['V1.0', '', '初始版本', '', date]]
            },
            chapters: [
                {
                    id: 1, title: '第一章 引言',
                    sections: [
                        { id: '1.1', title: '1.1 编写目的', content: { description: `本文档用于指导测试人员执行${moduleName || menuPath.level3}的功能测试、集成测试和异常测试，确保功能符合需求规格。` }},
                        { id: '1.2', title: '1.2 背景说明', content: { description: `项目背景：${moduleName || menuPath.level3}功能优化。菜单位置【${menuPath.level1}】-【${menuPath.level2}】-【${menuPath.level3}】。` }},
                        { id: '1.3', title: '1.3 定义', content: {
                            headers: ['术语', '定义'],
                            rows: this._buildGlossaryRows(menuPath, moduleName)
                        }},
                        { id: '1.4', title: '1.4 参考资料', content: {
                            headers: ['文档名称', '文档版本', '说明'],
                            rows: [
                                [`${moduleName || (tcProf.testCoverPage && tcProf.testCoverPage.refDocumentName) || '需求规格说明书'}`, 'V1.0', '需求定义'],
                                ['项目开发规范', 'V5.0', '编码规范文档'],
                                [(tcProf.references && tcProf.references[1]) || '项目接口规范文档', 'V5.0', '接口定义']
                            ]
                        }}
                    ]
                },
                {
                    id: 2, title: '第二章 测试计划',
                    sections: [
                        { id: '2.1', title: '2.1 测试范围', content: {
                            headers: ['范围类型', '说明'],
                            rows: [
                                ['纳入范围', `${moduleName || menuPath.level3}各功能模块的正常流程、异常流程、边界条件验证`],
                                ['纳入范围', '数据校验、权限控制、状态流转等业务规则验证'],
                                ['排除范围', '外围系统消息发送、产品服务接口内部实现']
                            ]
                        }},
                        { id: '2.2', title: '2.2 测试目标', content: {
                            headers: ['测试类型', '目标描述', '验收标准'],
                            rows: [
                                ['功能测试', (tcProf.testScope && tcProf.testScope.funcTarget) || `验证${level3}各操作的正确性和完整性`, (tcProf.testScope && tcProf.testScope.funcAccept) || '业务流程100%通过'],
                                ['异常测试', '验证异常场景的处理和错误提示', '异常处理覆盖率100%'],
                                ['边界测试', '验证边界条件下的系统行为', '边界场景全部通过'],
                                ['安全测试', '验证岗位分离和权限控制', '越权操作100%被拦截']
                            ]
                        }},
                        { id: '2.3', title: '2.3 测试资源', content: {
                            headers: ['资源类型', '配置说明'],
                            rows: tcProf.testResources || [
                                ['硬件', '开发环境服务器：CPU 8核/内存16G'],
                                ['软件', 'JDK 1.8、Spring Boot 2.7、MySQL'],
                                ['人员', '测试工程师1名、开发工程师1名']
                            ]
                        }},
                        { id: '2.4', title: '2.4 测试进度', content: {
                            headers: ['测试阶段', '测试内容', '预计时间'],
                            rows: [
                                ['功能测试', (tcProf.testScope && tcProf.testScope.schedulePhases) || `${level3}功能测试`, '2天'],
                                ['异常测试', '异常场景覆盖测试', '1天'],
                                ['集成测试', '端到端业务流程测试', '1天'],
                                ['安全测试', '岗位分离与权限测试', '1天']
                            ]
                        }}
                    ]
                },
                {
                    id: 3, title: '第三章 测试环境',
                    sections: [
                        { id: '3.1', title: '3.1 硬件环境', content: {
                            headers: ['设备', '配置', '用途'],
                            rows: tcProf.testEnvHardware || [
                                ['开发服务器', 'CPU 8核/内存16G/硬盘500G', '代码编译和测试执行'],
                                ['测试客户端', 'CPU 4核/内存8G/硬盘256G', '测试工具运行']
                            ]
                        }},
                        { id: '3.2', title: '3.2 软件环境', content: {
                            headers: ['软件名称', '版本', '用途'],
                            rows: tcProf.testEnvSoftware || [
                                ['操作系统', 'Windows 10 / Linux CentOS 7', '运行环境'],
                                ['JDK', '1.8', 'Java运行环境'],
                                ['Spring Boot', '2.7.11', '应用框架'],
                                ['MySQL', '5.7+', '数据库']
                            ]
                        }},
                        { id: '3.3', title: '3.3 测试工具', content: {
                            headers: ['工具名称', '用途', '版本'],
                            rows: tcProf.testTools || [
                                ['Playwright', 'Web端自动化测试', '1.x'],
                                ['JUnit', '单元测试执行', '4.x'],
                                ['IDE', '代码编写和调试', 'IntelliJ IDEA / VS Code']
                            ]
                        }}
                    ]
                },
                {
                    id: 4, title: '第四章 功能测试用例',
                    sections: [
                        { id: '4.1', title: '4.1 正常场景测试', content: {
                            description: `验证${moduleName || menuPath.level3}在正常输入条件下的处理结果。`,
                            headers: ['用例编号', '用例名称', '前置条件', '测试步骤', '测试数据', '预期结果', '优先级'],
                            rows: positiveRows
                        }},
                        { id: '4.2', title: '4.2 异常场景测试', content: {
                            description: `验证${moduleName || menuPath.level3}在异常输入条件下的处理结果。`,
                            headers: ['用例编号', '用例名称', '前置条件', '测试步骤', '测试数据', '预期结果', '优先级'],
                            rows: negativeRows
                        }},
                        { id: '4.3', title: '4.3 边界值测试', content: {
                            description: `验证${moduleName || menuPath.level3}在边界条件下的处理结果。`,
                            headers: ['用例编号', '用例名称', '前置条件', '测试步骤', '测试数据', '预期结果', '优先级'],
                            rows: boundaryRows
                        }},
                        { id: '4.4', title: '4.4 字段映射验证', content: {
                            description: '验证每个字段的映射关系是否正确。',
                            headers: ['用例编号', '界面字段', '系统字段', '测试数据', '预期值', '优先级'],
                            rows: fieldMappingRows
                        }}
                    ]
                },
                {
                    id: 5, title: '第五章 集成测试用例',
                    sections: [
                        { id: '5.1', title: '5.1 端到端测试', content: {
                            description: tcProf.integrationTestDesc || `验证${level3}的完整业务流程。`,
                            headers: ['用例编号', '用例名称', '前置条件', '测试步骤', '测试数据', '预期结果', '优先级'],
                            rows: integrationRows
                        }}
                    ]
                },
                {
                    id: 6, title: '第六章 性能测试用例',
                    sections: [
                        { id: '6.1', title: '6.1 负载测试', content: {
                            description: tcProf.perfTestDesc || `验证在负载条件下的${level3}处理性能。`,
                            headers: ['用例编号', '用例名称', '并发数', '测试时长', '预期响应时间', '预期结果'],
                            rows: performanceRows
                        }}
                    ]
                },
                {
                    id: 7, title: '第七章 安全测试用例',
                    sections: [
                        { id: '7.1', title: '7.1 认证测试', content: {
                            description: tcProf.securityTestDesc || '验证岗位分离和权限控制机制。',
                            headers: ['用例编号', '用例名称', '测试步骤', '预期结果'],
                            rows: securityRows
                        }}
                    ]
                },
                {
                    id: 8, title: '第八章 测试执行结果',
                    sections: [
                        { id: '8.1', title: '8.1 测试执行情况', content: {
                            headers: ['统计项', '数量', '占比'],
                            rows: [
                                ['总用例数', String(allTestCases.length), '100%'],
                                ['正例', String(allTestCases.filter(tc => tc.nature === '正例').length), ((allTestCases.filter(tc => tc.nature === '正例').length / allTestCases.length) * 100).toFixed(1) + '%'],
                                ['反例', String(allTestCases.filter(tc => tc.nature === '反例').length), ((allTestCases.filter(tc => tc.nature === '反例').length / allTestCases.length) * 100).toFixed(1) + '%'],
                                ['边界', String(allTestCases.filter(tc => tc.nature === '边界').length), ((allTestCases.filter(tc => tc.nature === '边界').length / allTestCases.length) * 100).toFixed(1) + '%'],
                                ['性能', String(allTestCases.filter(tc => tc.nature === '性能').length), ((allTestCases.filter(tc => tc.nature === '性能').length / allTestCases.length) * 100).toFixed(1) + '%'],
                                ['安全', String(allTestCases.filter(tc => tc.nature === '安全').length), ((allTestCases.filter(tc => tc.nature === '安全').length / allTestCases.length) * 100).toFixed(1) + '%'],
                                ['已通过', '0', '0%'],
                                ['未执行', String(allTestCases.length), '100%']
                            ]
                        }},
                        { id: '8.2', title: '8.2 缺陷统计', content: {
                            headers: ['严重程度', '数量', '修复状态'],
                            rows: [
                                ['严重', '0', '待修复'],
                                ['一般', '0', '待修复'],
                                ['轻微', '0', '待修复']
                            ]
                        }},
                        { id: '8.3', title: '8.3 测试结论', content: { description: '测试总结：根据测试结果，评估功能质量是否达到上线标准。说明遗留问题和风险。给出发布建议。' }}
                    ]
                }
            ],
            testCases: allTestCases
        };
    }

    _generateBoundaryTestCases(mdContent) {
        const fields = [];
        const lines = mdContent.split('\n');
        let inTable = false;
        let caseId = 1;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('数据名称') && trimmed.startsWith('|')) { inTable = true; continue; }
            if (inTable && trimmed.startsWith('|')) {
                const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
                if (cells.length >= 4 && cells[0] !== '数据名称' && !cells[0].startsWith('-')) {
                    const constraint = cells[4] || '';
                    if (constraint) {
                        fields.push([`TC-BND-${String(caseId++).padStart(3, '0')}`, `${cells[0]}边界值`, '进入对应操作页面', `输入${cells[0]}为${constraint}的边界数据`, constraint, '校验通过或给出明确提示', '中']);
                    }
                }
            } else if (inTable && !trimmed.startsWith('|')) { inTable = false; }
        }
        if (fields.length === 0) {
            const fallback = this.profile.boundaryFallback || [
                ['TC-BND-001', '数据边界值测试', '进入对应操作页面', '输入边界值数据', '边界校验通过或提示', '校验通过或给出明确提示', '中']
            ];
            for (const fb of fallback) fields.push(fb);
        }
        return fields.slice(0, 6);
    }

    _generateFieldMappingTestCases(mdContent) {
        const mappings = [];
        const lines = mdContent.split('\n');
        let inTable = false;
        let caseId = 1;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('数据名称') && trimmed.startsWith('|')) { inTable = true; continue; }
            if (inTable && trimmed.startsWith('|')) {
                const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
                if (cells.length >= 4 && cells[0] !== '数据名称' && !cells[0].startsWith('-') && cells[1] === '输入') {
                    mappings.push([`TC-MAP-${String(caseId++).padStart(3, '0')}`, cells[0], cells[0], `测试${cells[0]}输入`, cells[2] || '正确值', '高']);
                }
            } else if (inTable && !trimmed.startsWith('|')) { inTable = false; }
        }
        if (mappings.length === 0) {
            const fallback = this.profile.fieldMappingFallback || [
                ['TC-MAP-001', '核心字段映射', 'coreField', '测试值', '正确值', '高']
            ];
            for (const fb of fallback) mappings.push(fb);
        }
        return mappings.slice(0, 8);
    }

    _generateIntegrationTestCases(menuPath) {
        const moduleLabel = menuPath.level3 || '模块';
        return [
            ['TC-INT-001', `完整流程-${moduleLabel}操作`, '服务已启动，相关账号已准备', `1.进入${moduleLabel}页面 2.执行新增操作 3.提交数据 4.验证数据保存正确`, '完整业务数据', '全流程正常完成，数据状态正确', '高'],
            ['TC-INT-002', `完整流程-数据修改与查询`, '已有业务数据', `1.查询已有数据 2.修改数据 3.保存 4.重新查询验证修改生效`, '修改数据', '修改后数据正确保存，查询结果一致', '高'],
            ['TC-INT-003', `完整流程-数据删除与恢复验证`, '已有可删除数据', `1.选中数据执行删除 2.确认删除 3.查询验证数据已删除`, '删除数据', '删除成功，数据不再显示', '高']
        ];
    }

    _generatePerformanceTestCases(menuPath) {
        const moduleLabel = menuPath.level3 || '模块';
        return [
            ['TC-PERF-001', `单笔${moduleLabel}操作性能`, '1', '10秒', '<500ms', '所有操作处理成功'],
            ['TC-PERF-002', `批量${moduleLabel}操作`, '10', '60秒', '<2s', '批量操作全部成功'],
            ['TC-PERF-003', `并发${moduleLabel}操作`, '50', '30秒', '<1s', '不出现数据不一致']
        ];
    }

    _generateSecurityTestCases(menuPath) {
        const moduleLabel = menuPath.level3 || '模块';
        return [
            ['TC-SEC-001', '低权限用户越权操作', `1.使用低权限账号登录 2.尝试访问${moduleLabel}高权限功能`, '菜单中不显示或不可访问'],
            ['TC-SEC-002', '跨角色越权操作', `1.使用非本模块角色账号登录 2.尝试执行${moduleLabel}操作`, '操作按钮不可用或接口返回权限不足'],
            ['TC-SEC-003', '未登录访问', `1.不登录直接请求${moduleLabel}接口`, '接口返回未认证错误']
        ];
    }

    analyzeRequirementFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new BempDocError(ERROR_CODES.REQUIREMENT_NOT_FOUND, `需求文件不存在: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return this.analyzeRequirement(content);
    }

    _extractTestPoints(content) {
        const testPoints = [];
        const lines = content.split('\n');
        const subsystemKeywords = this.profile.subsystemKeywords || [];
        const menuPath = this._extractMenuPath(content, subsystemKeywords);
        const level1 = menuPath.level1;
        const level2 = menuPath.level2;
        const level3 = menuPath.level3;

        const sections = this._splitBySubFeatureHeadings(lines);
        for (const section of sections) {
            const tp = this._buildTestPoint(section, level1, level2, level3, content);
            if (tp) testPoints.push(tp);
        }

        if (testPoints.length === 0) {
            testPoints.push(...this._fallbackExtract(content, level1, level2, level3));
        }

        return testPoints;
    }

    _extractMenuPath(content, subsystemKeywords) {
        const regex = /【([^】]+)】/g;
        let match;
        const refs = [];
        while ((match = regex.exec(content)) !== null) refs.push(match[1]);
        const subsystems = refs.filter(ref => subsystemKeywords.includes(ref));
        const modules = refs.filter(ref => !subsystemKeywords.includes(ref));
        return {
            level1: subsystems[0] || this.profile.defaultMenuLevel1 || '业务管理',
            level2: modules[0] || '',
            level3: modules[1] || modules[0] || ''
        };
    }

    _splitBySubFeatureHeadings(lines) {
        const sections = [];
        let currentHeading = '';
        let currentLevel = 0;
        let buffer = [];
        let parentHeadings = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/);

            if (headingMatch) {
                if (buffer.length > 0 && currentHeading) {
                    sections.push({
                        title: currentHeading,
                        level: currentLevel,
                        content: buffer.join('\n'),
                        parentTitle: parentHeadings[currentLevel - 1] || ''
                    });
                }
                currentLevel = headingMatch[1].length;
                currentHeading = headingMatch[2].trim();
                parentHeadings[currentLevel] = currentHeading;
                buffer = [];
            } else {
                buffer.push(line);
            }
        }

        if (buffer.length > 0 && currentHeading) {
            sections.push({
                title: currentHeading,
                level: currentLevel,
                content: buffer.join('\n'),
                parentTitle: parentHeadings[currentLevel - 1] || ''
            });
        }

        // 2026-06-06 修复：标注 H5 是否有 H6 子节
        // 业务子模块的特征是"模块标题"下有 H6 子节（查询/新增/删除等）
        // 仅有描述性 H5（如"业务模块额度使用规则"）不应被识别为业务子模块
        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            if (sec.level === 5) {
                let hasSubsection = false;
                for (let k = i + 1; k < sections.length; k++) {
                    if (sections[k].level <= 5) break; // 遇到同级或更高级标题，结束扫描
                    if (sections[k].level === 6) { hasSubsection = true; break; }
                }
                sec.hasSubsection = hasSubsection;
            }
        }

        return sections;
    }

    _buildTestPoint(section, level1, level2, level3, fullContent) {
        const title = section.title;
        const sectionContent = section.content;

        const skipKeywords = ['需求背景', '需求目标', '需求概述', '优化详情', '问题描述', '业务背景', '分析结果', '版本历史'];
        if (skipKeywords.some(kw => title.includes(kw))) return null;

        const isSubFeature = section.level >= 5;
        const isMidFeature = section.level >= 3 && section.level <= 4;
        if (!isSubFeature && !isMidFeature) return null;

        const hasContent = sectionContent.trim().length > 10;
        if (!hasContent) return null;

        const businessRules = this._extractBusinessRules(sectionContent);
        const validations = this._extractValidations(sectionContent);
        const fieldDescriptions = this._extractFieldDescriptions(sectionContent);

        let level4 = title;
        if (isSubFeature && section.parentTitle) level4 = section.parentTitle + '-' + title;

        const description = businessRules.length > 0 ? businessRules.join('；') : title;

        return {
            level1, level2, level3, level4, description,
            validations: validations.length > 0 ? validations : ['正常流程'],
            businessRules, fieldDescriptions,
            rawText: sectionContent
        };
    }

    _extractBusinessRules(content) {
        const rules = [];
        const lines = content.split('\n');
        const rulePatterns = [/^\s*\d+\.\s+(.+)/, /^\s*[-*+]\s+(.+)/];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            for (const pattern of rulePatterns) {
                const match = trimmed.match(pattern);
                if (match) {
                    const ruleText = match[1].trim();
                    if (ruleText.length > 3 && !ruleText.startsWith('|') && !ruleText.startsWith('---')) {
                        rules.push(ruleText);
                    }
                    break;
                }
            }
        }
        return rules;
    }

    _extractFieldDescriptions(content) {
        const fields = [];
        const lines = content.split('\n');
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.includes('数据名称')) {
                inTable = true;
                continue;
            }
            if (inTable && line.startsWith('|')) {
                const cells = line.split('|').map(c => c.trim()).filter(Boolean);
                if (cells.length >= 4) {
                    const fieldName = cells[0];
                    const ioType = cells[1];
                    const required = cells[3] || '';
                    const constraint = cells[4] || '';
                    if (fieldName && fieldName !== '数据名称' && !fieldName.startsWith('-')) {
                        fields.push({ name: fieldName, io: ioType, required: required.includes('M') || required.includes('必输'), constraint });
                    }
                }
            } else if (inTable && !line.startsWith('|')) {
                inTable = false;
            }
        }
        return fields;
    }

    _extractValidations(text) {
        const validations = [];
        const patterns = [
            { regex: /不可重复|不能重复|唯一|不可与.*重复/g, type: '唯一性校验' },
            { regex: /必[须需输填]|不能为空|不可为空|M\(必输\)/g, type: '必填校验' },
            { regex: /格式[为应]|格式要求|格式校验/g, type: '格式校验' },
            { regex: /不超过|不能超过|最多|最大|最小|至少|必须大于/g, type: '边界校验' },
            { regex: /提示|报错|错误|失败/g, type: '异常提示' },
            { regex: /只能|仅[限能]|不允许|不可以/g, type: '权限校验' },
            { regex: /已存在|重复|冲突/g, type: '重复校验' },
            { regex: /默认|自动/g, type: '默认值校验' },
            { regex: /灰显|不可修改|只读/g, type: '只读校验' },
            { regex: /校验|验证|检查/g, type: '数据校验' },
            { regex: /选中|选择.*数据|未选择/g, type: '选择校验' },
            { regex: /确认|二次确认/g, type: '确认校验' }
        ];

        for (const pattern of patterns) {
            if (pattern.regex.test(text)) validations.push(pattern.type);
        }
        return validations;
    }

    _fallbackExtract(content, level1, level2, level3) {
        const testPoints = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const numberedMatch = line.match(/^\s*\d+\.\s+【([^】]+)】/);
            if (!numberedMatch) continue;

            const featureName = numberedMatch[1];
            const subLines = [];
            for (let j = i + 1; j < lines.length && j < i + 15; j++) {
                const subLine = lines[j].trim();
                const subMatch = subLine.match(/^\s*\d+\.\s+(.+)/);
                if (subMatch && !subLine.match(/^\s*\d+\.\s+【/)) {
                    subLines.push(subMatch[1].trim());
                } else if (subLine.match(/^\s*\d+\.\s+【/)) {
                    break;
                }
            }

            testPoints.push({
                level1, level2, level3,
                level4: featureName,
                description: subLines.length > 0 ? subLines.join('；') : featureName,
                validations: this._extractValidations(subLines.join('\n')),
                businessRules: subLines,
                fieldDescriptions: [],
                rawText: [line, ...subLines].join('\n')
            });
        }
        return testPoints;
    }

    _generateTestCases(testPoints) {
        const testCases = [];
        let caseId = 1;

        for (const tp of testPoints) {
            testCases.push({
                id: caseId++,
                level1: tp.level1, level2: tp.level2, level3: tp.level3, level4: tp.level4,
                precondition: this._generatePrecondition(tp),
                content: this._generatePositiveContent(tp),
                nature: '正例',
                expected: this._generatePositiveExpected(tp)
            });

            const validationTypes = tp.validations.filter(v => v !== '正常流程');
            const limitedValidations = validationTypes.slice(0, 3);

            for (const validation of limitedValidations) {
                const negativeCase = this._generateNegativeCase(tp, validation, caseId);
                if (negativeCase) { testCases.push(negativeCase); caseId++; }
            }

            const specificCases = this._generateSpecificTestCases(tp, caseId);
            for (const tc of specificCases) { testCases.push(tc); caseId++; }
        }

        return testCases;
    }

    _generateSpecificTestCases(tp, startId) {
        const cases = [];
        let id = startId;

        if (tp.businessRules && tp.businessRules.length > 0) {
            for (const rule of tp.businessRules) {
                if (this._isNegativeRule(rule)) {
                    cases.push({
                        id: id++,
                        level1: tp.level1, level2: tp.level2, level3: tp.level3,
                        level4: tp.level4,
                        precondition: this._generatePrecondition(tp),
                        content: rule.length > 80 ? rule.substring(0, 80) + '...' : rule,
                        nature: '反例',
                        expected: this._extractExpectedFromRule(rule)
                    });
                }
            }
        }

        if (tp.fieldDescriptions) {
            const requiredFields = tp.fieldDescriptions.filter(f => f.required);
            for (const field of requiredFields.slice(0, 3)) {
                cases.push({
                    id: id++,
                    level1: tp.level1, level2: tp.level2, level3: tp.level3,
                    level4: `${tp.level4}-${field.name}必填`,
                    precondition: this._generatePrecondition(tp),
                    content: `不填写${field.name}，执行${tp.level4}操作`,
                    nature: '反例',
                    expected: `操作失败，提示${field.name}为必填项`
                });
            }
        }

        return cases;
    }

    _isNegativeRule(rule) {
        const kws = ['不能', '不可', '不允许', '必须', '不可以', '失败', '报错', '提示', '拒绝', '超过', '大于', '小于', '未选择', '若未选择'];
        return kws.some(kw => rule.includes(kw));
    }

    _extractExpectedFromRule(rule) {
        const promptMatch = rule.match(/提示[""「」""]([^""「」""]+)[""「」""]/);
        if (promptMatch) return `提示：${promptMatch[1]}`;
        const errorMatch = rule.match(/报错[""「」""]([^""「」""]+)[""「」""]/);
        if (errorMatch) return `报错：${errorMatch[1]}`;
        if (rule.includes('不能')) return '操作被拒绝，系统给出限制提示';
        if (rule.includes('必须')) return '校验不通过，提示必须满足的条件';
        if (rule.includes('超过')) return '操作失败，提示超出限制';
        return '操作失败，系统给出相应提示';
    }

    _generatePrecondition(tp) {
        const subsystemMap = this.profile.subsystemMap || {};
        const subsystem = subsystemMap[tp.level1] || tp.level1;
        const menuPath = [tp.level2, tp.level3, tp.level4].filter(Boolean).join('-');
        return `已登录${subsystem}，进入${menuPath}菜单`;
    }

    _generatePositiveContent(tp) {
        const desc = tp.description || tp.level4;
        const shortDesc = desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
        return `执行${tp.level4}操作，输入符合要求的数据：${shortDesc}`;
    }

    _generatePositiveExpected(tp) {
        return `${tp.level4}操作成功，数据正确保存并刷新显示`;
    }

    _buildCodeExamples(sections, moduleName) {
        const examples = [];
        const moduleLabel = moduleName || 'Module';
        const seenOps = new Set();
        for (const sec of sections) {
            if (sec.level >= 4 && sec.level <= 5 && sec.title) {
                const opName = sec.title;
                if (!seenOps.has(opName)) {
                    seenOps.add(opName);
                    examples.push([`${moduleLabel}Controller`, `query${opName}`, `${opName}查询`, '约30行']);
                    examples.push([`${moduleLabel}Controller`, `save${opName}`, `${opName}保存`, '约40行']);
                }
            }
            if (examples.length >= 5) break;
        }
        if (examples.length === 0) {
            examples.push(
                [`${moduleLabel}Controller`, 'queryList', '列表查询', '约30行'],
                [`${moduleLabel}Controller`, 'saveData', '数据保存', '约40行'],
                [`${moduleLabel}Service`, 'processBusiness', '业务处理', '约60行']
            );
        }
        return examples;
    }

    _buildPerformanceOptRows(sections, moduleName) {
        const rows = [];
        const moduleLabel = moduleName || '模块';
        const hasBatch = sections.some(sec => sec.content && (sec.content.includes('批量') || sec.title.includes('批量')));
        const hasQuery = sections.some(sec => sec.content && (sec.content.includes('查询') || sec.title.includes('查询') || sec.title.includes('列表')));
        rows.push(['接口响应', '索引优化+分页查询', '列表查询响应<500ms']);
        if (hasBatch) {
            rows.push(['批量操作', '批量处理+事务', '提升批量操作效率']);
        }
        if (hasQuery) {
            rows.push(['数据查询', '缓存热点数据', '减少重复查询开销']);
        }
        rows.push(['并发控制', '行级锁/乐观锁', '防止数据不一致']);
        return rows;
    }

    _buildGlossary(menuPath, moduleName, businessRules) {
        const glossary = [];
        const moduleLabel = moduleName || menuPath.level3 || '模块';
        glossary.push({ term: moduleLabel, definition: `${moduleLabel}相关业务功能` });
        const keywords = new Set();
        for (const br of businessRules) {
            const rule = br.rule || '';
            if (rule.includes('复核') && !keywords.has('复核')) {
                keywords.add('复核');
                glossary.push({ term: '复核', definition: '对操作数据进行二次审核确认' });
            }
            if (rule.includes('批量导入') && !keywords.has('批量导入')) {
                keywords.add('批量导入');
                glossary.push({ term: '批量导入', definition: '通过Excel文件批量导入数据' });
            }
            if (rule.includes('额度') && !keywords.has('额度')) {
                keywords.add('额度');
                glossary.push({ term: '额度', definition: '授信额度，用于控制风险敞口' });
            }
            if (glossary.length >= 5) break;
        }
        return glossary;
    }

    _buildGlossaryRows(menuPath, moduleName) {
        const rows = [];
        const moduleLabel = moduleName || menuPath.level3 || '模块';
        rows.push([moduleLabel, `${moduleLabel}相关业务功能`]);
        rows.push(['批量导入', '通过Excel文件批量导入数据']);
        rows.push(['必填校验', '关键字段未填写时阻止操作']);
        rows.push(['数据校验', '对输入数据进行格式和规则验证']);
        return rows;
    }

    _generateNegativeCase(tp, validationType, caseId) {
        const templates = {
            '唯一性校验': { content: `输入已存在的重复数据进行${tp.level4}操作`, expected: `操作失败，提示数据不可重复` },
            '必填校验': { content: `不填写必填项，执行${tp.level4}操作`, expected: `操作失败，提示必填项不能为空` },
            '格式校验': { content: `输入不符合格式要求的数据，执行${tp.level4}操作`, expected: `操作失败，提示数据格式不正确` },
            '边界校验': { content: `输入超出边界值的数据，执行${tp.level4}操作`, expected: `操作失败，提示数据超出允许范围` },
            '异常提示': { content: `在异常条件下执行${tp.level4}操作`, expected: `系统给出明确的错误提示信息` },
            '权限校验': { content: `在无权限的情况下执行${tp.level4}操作`, expected: `操作被拒绝，提示无权限` },
            '重复校验': { content: `重复提交${tp.level4}操作`, expected: `系统拦截重复操作，提示数据已存在` },
            '默认值校验': { content: `不修改默认值，执行${tp.level4}操作`, expected: `系统使用默认值正确处理` },
            '只读校验': { content: `尝试修改只读字段，执行${tp.level4}操作`, expected: `只读字段不可修改，操作正常完成` },
            '数据校验': { content: `输入不符合校验规则的数据，执行${tp.level4}操作`, expected: `校验不通过，提示具体校验错误信息` },
            '选择校验': { content: `未选择任何数据，执行${tp.level4}操作`, expected: `提示"请选中一条数据"` },
            '确认校验': { content: `执行${tp.level4}操作，在确认弹窗中点击取消`, expected: `操作取消，数据不变` }
        };

        const template = templates[validationType];
        if (!template) return null;

        return {
            id: caseId,
            level1: tp.level1, level2: tp.level2, level3: tp.level3,
            level4: `${tp.level4}-${validationType}`,
            precondition: this._generatePrecondition(tp),
            content: template.content,
            nature: '反例',
            expected: template.expected
        };
    }
}

module.exports = { RequirementAnalyzer };
