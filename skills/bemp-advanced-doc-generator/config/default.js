const path = require('path');
const dotenv = require('dotenv');

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
    INVALID_PARAMS: 'E006'
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
    libDir: path.join(SKILL_ROOT, 'lib')
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
    paths, processon
};
