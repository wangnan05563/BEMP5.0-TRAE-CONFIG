const path = require('path');
// dotenv 安装在 scripts/node_modules 下，从 config/ 目录需通过相对路径引用
const dotenv = require('../scripts/node_modules/dotenv');

const SKILL_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(SKILL_ROOT, '.env') });

const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const MARGIN = { top: 1440, bottom: 1440, left: 1800, right: 1800 };

const FONT = { SONG: 'SimSun', HEI: 'SimHei', CODE: 'Consolas' };
const SIZE = { ER: 44, SAN: 32, SI: 28, XIAOSI: 24, WU: 21, LIU: 18 };

const DOC_STYLES = {
    default: {
        document: { run: { font: FONT.SONG, size: SIZE.XIAOSI } }
    },
    paragraphStyles: [
        {
            id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: SIZE.SAN, bold: true, font: FONT.HEI },
            paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 }
        },
        {
            id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: SIZE.SI, bold: true, font: FONT.HEI },
            paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 }
        },
        {
            id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: SIZE.XIAOSI, bold: true, font: FONT.HEI },
            paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 }
        }
    ]
};

const TABLE_BORDER = { style: 'single', size: 1, color: '000000' };
const TABLE_BORDERS = { top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER };
const TABLE_HEADER_BG = 'D9E2F3';

const ERROR_CODES = {
    TEMPLATE_NOT_FOUND: 'E001',
    REQUIREMENT_NOT_FOUND: 'E002',
    GENERATION_FAILED: 'E003',
    OUTPUT_FAILED: 'E004',
    VALIDATION_FAILED: 'E005',
    INVALID_PARAMS: 'E006',
    // === v8.0 xlsx 模板填充新增错误码 ===
    /** E101: 模板表头未识别（前 N 行无关键词命中） */
    HEADER_NOT_DETECTED: 'E101',
    /** E102: 列填充率不达标（必含主键或全列 < 100%） */
    COLUMN_UNDERFILLED: 'E102',
    /** E103: 输出路径解析失败 */
    OUTPUT_PATH_INVALID: 'E103',
    /** E104: 必含主键缺失（如 id/name 不在 schema.columns 中） */
    REQUIRED_KEY_MISSING: 'E104',
    /** E105: 模板工作表缺失（按 sheetName 找不到） */
    SHEET_MISSING: 'E105',
    /** E106: 数据源为空（Scanner 未提取出 testcases） */
    DATA_SOURCE_EMPTY: 'E106',
    /** E107: 模板 Sheet 名称未指定（无法定位主工作表） */
    TEMPLATE_INVALID: 'E107',
    /** E108: 自定义 SEMANTIC_RULES 加载失败 */
    SEMANTIC_MAP_INVALID: 'E108'
};

class BempDocError extends Error {
    constructor(code, message, detail) {
        super(message);
        this.code = code;
        this.detail = detail;
        this.name = 'BempDocError';
    }
}

function createBempDocError(code, message, detail) {
    return new BempDocError(code, message, detail);
}

const paths = {
    skillRoot: SKILL_ROOT,
    projectRoot: path.resolve(SKILL_ROOT, '..', '..', '..'),
    templateDir: path.join(SKILL_ROOT, 'assets', 'templates'),
    assetDir: path.join(SKILL_ROOT, 'assets'),
    outputDir: path.join(SKILL_ROOT, 'output'),
    libDir: path.join(SKILL_ROOT, 'scripts', 'lib'),
    scriptsDir: path.join(SKILL_ROOT, 'scripts'),
    configDir: path.join(SKILL_ROOT, 'config'),
    // 概要设计模板路径：优先环境变量 BEMP_OUTLINE_TEMPLATE，否则使用通用默认模板
    get outlineDesignTemplate() {
        const envTpl = process.env.BEMP_OUTLINE_TEMPLATE;
        if (envTpl) {
            return path.isAbsolute(envTpl) ? envTpl : path.resolve(SKILL_ROOT, envTpl);
        }
        return path.join(SKILL_ROOT, 'assets', 'template-outline-design.docx');
    },
    // 详细设计模板路径：优先环境变量 BEMP_DESIGN_TEMPLATE，否则回退到 docs/07 标准模板
    // 该路径在 cli.js 中作为 design 类型的 .docx 模板默认值；不存在时 build 流程会自动回退
    get designTemplate() {
        const envTpl = process.env.BEMP_DESIGN_TEMPLATE;
        if (envTpl) {
            return path.isAbsolute(envTpl) ? envTpl : path.resolve(SKILL_ROOT, envTpl);
        }
        // 优先级：项目内 docs/07【模板】详细设计说明书.docx > skill 内置差异化模板 > null
        const projectTpl = path.join(SKILL_ROOT, '..', '..', '..', 'docs', '07【模板】详细设计说明书.docx');
        if (require('fs').existsSync(projectTpl)) {
            return projectTpl;
        }
        const innerTpl = path.join(SKILL_ROOT, 'assets', 'templates', 'XX银行-XX项目-差异化需求详细设计模板.docx');
        if (require('fs').existsSync(innerTpl)) {
            return innerTpl;
        }
        return null;
    }
};

const validTypes = ['design', 'testcase', 'testreport', 'testcase-excel', 'testcase-md', 'testreport-md', 'design-md', 'outline-design', 'unit-test-report', 'unit-test-report-xlsx', 'excel-custom'];
const validFormats = ['docx', 'md', 'excel'];

const defaultTemplateMap = {
    design: path.join(SKILL_ROOT, 'assets', '详细设计文档模板.json'),
    testcase: path.join(SKILL_ROOT, 'assets', '测试用例模板.json'),
    testreport: path.join(SKILL_ROOT, 'assets', '测试报告模板.json'),
    'unit-test-report': path.join(SKILL_ROOT, 'assets', '单元测试报告模板.json')
};

const processon = {
    apiKey: process.env.PROCESSON_API_KEY || '',
    apiBase: process.env.PROCESSON_API_BASE || 'https://www.processon.com',
    retryCount: parseInt(process.env.PROCESSON_RETRY_COUNT) || 3,
    retryDelay: parseInt(process.env.PROCESSON_RETRY_DELAY) || 1000
};

module.exports = {
    A4_WIDTH, A4_HEIGHT, MARGIN,
    FONT, SIZE,
    DOC_STYLES, TABLE_BORDER, TABLE_BORDERS, TABLE_HEADER_BG,
    ERROR_CODES, BempDocError, createBempDocError,
    paths, processon,
    validTypes, validFormats, defaultTemplateMap
};
