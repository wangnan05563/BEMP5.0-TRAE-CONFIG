/**
 * BEMP 简单机构功能文档生成器
 * 生成详细设计文档和测试用例文档（Word格式）
 */

const fs = require('fs');
const path = require('path');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, PageNumber, HeadingLevel,
    BorderStyle, WidthType, ShadingType, PageBreak, VerticalAlign
} = require('docx');

const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const MARGIN_TOP = 1440;
const MARGIN_BOTTOM = 1440;
const MARGIN_LEFT = 1800;
const MARGIN_RIGHT = 1800;

// 样式常量
const FONT_SONG = 'SimSun';
const FONT_HEI = 'SimHei';
const SIZE_SAN = 32;    // 三号
const SIZE_SI = 28;     // 四号
const SIZE_XIAOSI = 24; // 小四号
const SIZE_WU = 21;     // 五号
const SIZE_ER = 44;     // 二号

// 表格边框
const TABLE_BORDER = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

function createHeaderCell(text) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text, bold: true, font: FONT_HEI, size: SIZE_WU })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 }
        })],
        verticalAlign: VerticalAlign.CENTER,
        shading: { type: ShadingType.CLEAR, fill: 'D9E2F3' },
        borders: TABLE_BORDER,
    });
}

function createCell(text, opts = {}) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: text || '', font: FONT_SONG, size: SIZE_WU, ...opts })],
            alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 40, after: 40 }
        })],
        verticalAlign: VerticalAlign.CENTER,
        borders: TABLE_BORDER,
        width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    });
}

function createTable(headers, rows, colWidths) {
    const headerRow = new TableRow({
        children: headers.map((h, i) => {
            const cell = createHeaderCell(h);
            return colWidths ? new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: h, bold: true, font: FONT_HEI, size: SIZE_WU })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 }
                })],
                verticalAlign: VerticalAlign.CENTER,
                shading: { type: ShadingType.CLEAR, fill: 'D9E2F3' },
                borders: TABLE_BORDER,
                width: { size: colWidths[i], type: WidthType.DXA },
            }) : createHeaderCell(h);
        }),
        tableHeader: true,
    });

    const dataRows = rows.map(row => new TableRow({
        children: row.map((cell, i) => {
            if (colWidths) {
                return new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({ text: cell || '', font: FONT_SONG, size: SIZE_WU })],
                        spacing: { before: 40, after: 40 }
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    borders: TABLE_BORDER,
                    width: { size: colWidths[i], type: WidthType.DXA },
                });
            }
            return createCell(cell);
        }),
    }));

    return new Table({
        rows: [headerRow, ...dataRows],
        width: { size: A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT, type: WidthType.DXA },
        borders: TABLE_BORDER,
    });
}

function heading1(text) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, font: FONT_HEI, size: SIZE_SAN })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 240 },
    });
}

function heading2(text) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, font: FONT_HEI, size: SIZE_SI })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 160 },
    });
}

function heading3(text) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, font: FONT_HEI, size: SIZE_XIAOSI })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 120 },
    });
}

function bodyText(text) {
    return new Paragraph({
        children: [new TextRun({ text, font: FONT_SONG, size: SIZE_XIAOSI })],
        spacing: { line: 360, before: 60, after: 60 },
    });
}

function codeBlock(text) {
    return new Paragraph({
        children: [new TextRun({ text, font: 'Courier New', size: 18 })],
        spacing: { line: 276, before: 40, after: 40 },
        indent: { left: 480 },
    });
}

function pageBreak() {
    return new Paragraph({ children: [new PageBreak()] });
}

// ========== 详细设计文档内容 ==========

function generateDesignDoc() {
    const children = [];

    // 封面
    children.push(new Paragraph({ spacing: { before: 4000 } }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '简单机构功能', bold: true, font: FONT_HEI, size: SIZE_ER })],
        alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '详细设计文档', bold: true, font: FONT_HEI, size: SIZE_ER })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: 'HUNDSUN 票据交易管理平台软件', font: FONT_SONG, size: SIZE_SI })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '版本：V5.0', font: FONT_SONG, size: SIZE_SI })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '河南农信个性化', font: FONT_SONG, size: SIZE_SI })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '2026年5月', font: FONT_SONG, size: SIZE_SI })],
        alignment: AlignmentType.CENTER,
    }));
    children.push(pageBreak());

    // 修订记录
    children.push(heading1('修订记录'));
    children.push(createTable(
        ['版本', '修订人', '修订说明', '批准人', '发布日期'],
        [
            ['V1.0', 'BEMP开发团队', '初始版本，简单机构功能详细设计', '', '2026-05-11'],
        ],
        [1200, 1500, 4000, 1500, 1800]
    ));
    children.push(pageBreak());

    // 第一章 系统概述
    children.push(heading1('第一章 系统概述'));

    children.push(heading2('1.1 业务背景'));
    children.push(bodyText('当前BEMP系统中，上级机构无法为下级机构（分理处）进行企业信息报备，导致下级机构开户客户无法收票。具体问题如下：'));
    children.push(bodyText('1. 分理处作为最基层的营业网点，通常只有简单的柜面业务能力，没有独立的票交所机构代码和业务人员配置。'));
    children.push(bodyText('2. 分理处开户的企业客户，其企业信息报备需要由上级支行代为处理，但现有系统不支持这种代报备机制。'));
    children.push(bodyText('3. 企业信息报备查询范围未做机构层级限制，可能导致越权查看其他机构数据的安全风险。'));
    children.push(bodyText('为解决上述问题，引入"简单机构"概念：将不具备独立票交所业务能力的机构标记为简单机构，其企业账号签约开户时自动上移到上级非简单机构处理，同时限制企业信息报备相关查询范围为本机构及下级机构。'));

    children.push(heading2('1.2 设计目标'));
    children.push(createTable(
        ['目标类型', '目标描述'],
        [
            ['功能目标', '机构管理增加"是否简单机构"字段，支持新增/修改/同步/批量导入/模板下载'],
            ['功能目标', '企业账号同步保存时，简单机构开户自动上移到上级非简单机构'],
            ['功能目标', '企业信息报备相关4个查询界面限制为本机构及下级机构'],
            ['性能目标', '简单机构上移查找逻辑设置最大遍历深度（10层），防止死循环'],
            ['性能目标', '机构过滤查询使用IN条件批量查询，避免多次数据库访问'],
            ['质量目标', '复用TM_BRANCH表RESERVE2字段存储，不新增数据库字段'],
            ['质量目标', '遵循BEMP个性化开发规范，所有代码在个性化目录下开发'],
        ],
        [2000, 8000]
    ));

    children.push(heading2('1.3 范围说明'));
    children.push(createTable(
        ['范围类型', '说明'],
        [
            ['纳入范围', '机构管理新增/修改/同步界面增加"是否简单机构"字段'],
            ['纳入范围', '机构管理批量导入增加"是否简单机构"列及校验'],
            ['纳入范围', '机构管理导入模板增加"是否简单机构"列'],
            ['纳入范围', '企业账号同步保存时简单机构开户自动上移'],
            ['纳入范围', '企业信息报备查询限制本机构及下级机构'],
            ['纳入范围', '企业信息报备复核查询限制本机构及下级机构'],
            ['纳入范围', '企业信息报备记录查询限制本机构及下级机构'],
            ['纳入范围', '企业信息在线查询限制本机构及下级机构'],
            ['排除范围', '机构树结构变更、机构层级调整'],
            ['排除范围', '票交所报备接口协议变更'],
        ],
        [2000, 8000]
    ));
    children.push(pageBreak());

    // 第二章 功能模块划分
    children.push(heading1('第二章 功能模块划分'));

    children.push(heading2('2.1 模块划分'));
    children.push(createTable(
        ['子模块', '功能', '说明'],
        [
            ['机构管理模块', '简单机构标识维护', '在机构新增/修改/同步/批量导入界面增加"是否简单机构"字段，复用RESERVE2字段存储'],
            ['账号上移模块', '简单机构开户自动上移', '企业账号同步保存时，若开户机构为简单机构，自动向上查找第一个非简单机构作为签约开户机构'],
            ['报备查询过滤模块', '机构范围查询限制', '企业信息报备相关的4个查询界面，将单机构过滤替换为本机构及下级机构列表过滤'],
        ],
        [2500, 3000, 4500]
    ));

    children.push(heading2('2.2 模块职责'));
    children.push(bodyText('1. 机构管理模块：负责"是否简单机构"标识的录入、展示和存储。前端在新增/修改/同步弹窗中增加下拉选择框（是/否），在列表和导入预览中增加展示列。后端在批量导入校验中解析"是否简单机构"值，导入模板增加对应列。'));
    children.push(bodyText('2. 账号上移模块：负责在企业账号同步保存时检测开户机构是否为简单机构，若是则向上遍历机构树找到第一个非简单机构，替换开户机构号。覆盖collCustAcct和queryAndCollCustAcct两个入口方法，确保所有保存路径都经过简单机构检查。'));
    children.push(bodyText('3. 报备查询过滤模块：负责在4个企业信息报备相关查询中，将产品化的单机构过滤（brchNo等值查询）替换为本机构及下级机构列表过滤（brchNos的IN查询）。通过个性化Controller拦截请求，调用BranchService.getBegatsBranch获取下级机构列表。'));

    children.push(heading2('2.3 接口边界'));
    children.push(createTable(
        ['接口名称', '接口类型', '调用方向', '说明'],
        [
            ['BranchService.getBegatsBranch', 'RPC服务', 'Controller -> Service', '获取当前机构及所有下级机构列表'],
            ['BranchService.getCacheBranch', 'RPC服务', 'Service -> Service', '根据机构号获取机构信息（含reserve2字段）'],
            ['/hnnxbank/sm/auth/branch/branch/*', 'HTTP接口', '前端 -> 后端', '机构管理个性化接口（含批量导入、模板下载）'],
            ['/hnnxbank/bm/cpes/custsign/*', 'HTTP接口', '前端 -> 后端', '企业信息报备查询个性化接口'],
            ['/hnnxbank/bm/cpes/custsignaudit/*', 'HTTP接口', '前端 -> 后端', '企业信息报备复核查询个性化接口'],
            ['/hnnxbank/bm/sign/cpes/custInfoOnlineQuery/*', 'HTTP接口', '前端 -> 后端', '企业信息在线查询个性化接口'],
        ],
        [3000, 1500, 2500, 3000]
    ));
    children.push(pageBreak());

    // 第三章 核心业务流程
    children.push(heading1('第三章 核心业务流程'));

    children.push(heading2('3.1 简单机构开户自动上移流程'));
    children.push(bodyText('当企业账号同步保存时，系统检测开户机构是否为简单机构，若是则自动向上查找非简单机构进行替换：'));
    children.push(bodyText('1. 获取账号的开户机构号（openBrchNo）'));
    children.push(bodyText('2. 根据机构号查询机构信息，检查reserve2字段是否为"1"（简单机构）'));
    children.push(bodyText('3. 若为简单机构，获取其上级机构号（parentBrchNo），继续向上查找'));
    children.push(bodyText('4. 重复步骤2-3，直到找到第一个reserve2不为"1"的机构，或到达机构树根节点（parentBrchNo="0000"），或达到最大遍历深度（10层）'));
    children.push(bodyText('5. 将找到的非简单机构号替换原开户机构号'));
    children.push(bodyText('6. 若未找到非简单机构，保持原机构号不变'));

    children.push(heading2('3.2 企业信息报备查询机构过滤流程'));
    children.push(bodyText('4个企业信息报备相关查询界面均采用相同的机构过滤策略：'));
    children.push(bodyText('1. 从UserContext获取当前用户的机构号（brchNo）和法人编号（legalNo）'));
    children.push(bodyText('2. 调用BranchService.getBegatsBranch获取当前机构的所有下级机构列表'));
    children.push(bodyText('3. 将本机构号加入列表头部，构建完整的机构号列表（brchNos）'));
    children.push(bodyText('4. 将查询条件中的单机构过滤（brchNo）置空，替换为机构号列表（brchNos）'));
    children.push(bodyText('5. 底层SQL使用IN条件进行批量查询，实现本机构及下级机构的数据过滤'));

    children.push(heading2('3.3 关键节点说明'));
    children.push(createTable(
        ['节点编号', '节点名称', '处理逻辑', '业务规则'],
        [
            ['N1', '简单机构检测', '查询开户机构的reserve2字段', 'reserve2="1"表示简单机构'],
            ['N2', '上级机构遍历', '沿parentBrchNo向上查找非简单机构', '最大遍历深度10层，防止死循环'],
            ['N3', '开户机构替换', '将openBrchNo替换为非简单机构号', '记录替换日志，便于问题排查'],
            ['N4', '下级机构获取', '调用getBegatsBranch获取所有下级机构', '始终包含本机构号'],
            ['N5', '查询条件替换', '将brchNo等值查询替换为brchNos的IN查询', 'brchNo置空，brchNos设置机构列表'],
            ['N6', 'ThreadLocal清理', '在线查询场景下清理ThreadLocal中的机构列表', '防止内存泄漏，在finally块中执行'],
        ],
        [1200, 2000, 3500, 3300]
    ));
    children.push(pageBreak());

    // 第四章 数据模型设计
    children.push(heading1('第四章 数据模型设计'));

    children.push(heading2('4.1 数据存储设计'));
    children.push(bodyText('本功能复用TM_BRANCH表的RESERVE2字段存储"是否简单机构"标识，不新增数据库字段。选择复用而非新增字段的原因：避免数据库表结构变更带来的迁移风险，RESERVE2字段为产品预留字段，个性化使用符合BEMP规范。'));

    children.push(heading2('4.2 字段定义'));
    children.push(createTable(
        ['字段名称', '字段代码', '类型', '存储值', '含义', '说明'],
        [
            ['是否简单机构', 'RESERVE2', 'VARCHAR2', '"1"', '是', '该机构为简单机构，开户自动上移'],
            ['是否简单机构', 'RESERVE2', 'VARCHAR2', '"0"', '否', '该机构为非简单机构（默认值）'],
            ['是否简单机构', 'RESERVE2', 'VARCHAR2', 'NULL', '否', '空值等同于"0"，按非简单机构处理'],
        ],
        [1500, 1500, 1500, 1200, 2000, 2300]
    ));

    children.push(heading2('4.3 前端数据映射'));
    children.push(createTable(
        ['界面元素', '数据字段', '映射规则', '备注'],
        [
            ['新增/修改/同步弹窗-下拉框', 'addForm.reserve2', '直接绑定，"1"=是，"0"=否', '默认值"0"'],
            ['机构列表-展示列', 'reserve2', 'render函数转换，"1"显示"是"，"0"或空显示"否"', '空值默认显示"否"'],
            ['导入预览-展示列', 'reserve2', 'render函数转换，同列表展示', '导入时"是"转"1"，"否"转"0"'],
            ['批量导入-Excel列', '第12列', '"是"转"1"，"否"转"0"，空默认"0"', '列标题为"是否简单机构"'],
        ],
        [2500, 2000, 3000, 2500]
    ));
    children.push(pageBreak());

    // 第五章 接口定义
    children.push(heading1('第五章 接口定义'));

    children.push(heading2('5.1 个性化接口清单'));
    children.push(createTable(
        ['接口路径', '请求方式', '所属模块', '个性化说明'],
        [
            ['/hnnxbank/sm/auth/branch/branch/func_querySubBranchAndSelf', 'POST', '机构管理', '查询机构列表（含reserve2字段展示）'],
            ['/hnnxbank/sm/auth/branch/branch/func_downloadModel', 'POST', '机构管理', '导入模板下载（含"是否简单机构"列）'],
            ['/hnnxbank/sm/auth/branch/branch/func_batchImportValidate', 'POST', '机构管理', '批量导入校验（含reserve2解析校验）'],
            ['/hnnxbank/sm/auth/branch/branch/func_batchImport', 'POST', '机构管理', '批量导入执行'],
            ['/hnnxbank/bm/cpes/custsign/custCorpSign/func_queryCustCorpInfoByPage', 'POST', '企业信息报备', '报备查询（增加机构过滤）'],
            ['/hnnxbank/bm/cpes/custsign/custCorpSign/func_queryCustCorpSignRecordByPage', 'POST', '企业信息报备', '报备记录查询（增加机构过滤）'],
            ['/hnnxbank/bm/cpes/custsignaudit/func_queryCustSignAuditByPage', 'POST', '企业信息报备', '报备复核查询（增加机构过滤）'],
            ['/hnnxbank/bm/sign/cpes/custInfoOnlineQuery/func_queryCustInfoByPage', 'POST', '企业信息在线查询', '在线查询（增加机构过滤）'],
        ],
        [3500, 1000, 1500, 3000]
    ));

    children.push(heading2('5.2 机构过滤接口详情'));
    children.push(heading3('5.2.1 企业信息报备查询'));
    children.push(bodyText('接口路径：/hnnxbank/bm/cpes/custsign/custCorpSign/func_queryCustCorpInfoByPage'));
    children.push(bodyText('请求参数：CustSignQueryDto（含brchNos字段，由Controller自动注入）'));
    children.push(bodyText('处理逻辑：'));
    children.push(bodyText('  1. Controller层获取当前用户信息，调用getSubBranchNos构建机构号列表'));
    children.push(bodyText('  2. 将brchNo置空，brchNos设置为机构号列表'));
    children.push(bodyText('  3. Service层使用Criteria构建查询，添加createBrchNo IN条件'));
    children.push(bodyText('  4. 返回过滤后的分页结果'));

    children.push(heading3('5.2.2 企业信息在线查询'));
    children.push(bodyText('接口路径：/hnnxbank/bm/sign/cpes/custInfoOnlineQuery/func_queryCustInfoByPage'));
    children.push(bodyText('请求参数：CustCorpQueryDto'));
    children.push(bodyText('处理逻辑：'));
    children.push(bodyText('  1. Controller层获取机构号列表，通过ThreadLocal传递给Service'));
    children.push(bodyText('  2. Service层从ThreadLocal获取机构号列表，添加operBrchNo IN条件'));
    children.push(bodyText('  3. 在finally块中清理ThreadLocal，防止内存泄漏'));
    children.push(bodyText('  4. 返回过滤后的分页结果'));
    children.push(bodyText('说明：由于CustCorpQueryDto没有brchNos字段，采用ThreadLocal方式传递机构号列表，这是在线查询场景的特殊处理。'));

    children.push(heading2('5.3 简单机构上移接口详情'));
    children.push(bodyText('涉及方法：HnnxbankCustAcctServiceImpl.collCustAcct / queryAndCollCustAcct'));
    children.push(bodyText('入参：BaseRequest<CustAcctDto>（含acctListJson或单笔custAcctDto）'));
    children.push(bodyText('处理逻辑：'));
    children.push(bodyText('  1. 解析账号列表（批量从acctListJson解析，单笔直接使用）'));
    children.push(bodyText('  2. 对每个账号调用replaceSimpleBranchOpenBrchNo检查并替换开户机构'));
    children.push(bodyText('  3. 调用产品化Atom层方法完成保存'));
    children.push(bodyText('  4. 替换时记录INFO级别日志，包含账号、原机构、替换后机构'));
    children.push(pageBreak());

    // 第六章 异常处理机制
    children.push(heading1('第六章 异常处理机制'));

    children.push(heading2('6.1 错误码定义'));
    children.push(createTable(
        ['错误码', '错误信息', '触发场景', '处理方式'],
        [
            ['EX_0BE229905511', '批量导入校验失败', '导入数据格式或内容校验不通过', '返回校验错误详情，提示用户修正'],
            ['EX_0BE229905512', '批量导入执行失败', '机构新增失败', '返回失败机构列表及原因'],
            ['0BE229905101', '客户账号不存在', '同步核心账号时未找到对应账号', '抛出业务异常，提示用户检查'],
            ['-', '是否简单机构值错误', '批量导入时"是否简单机构"列值非"是"/"否"', '提示第N行是否简单机构值错误'],
            ['-', '机构未找到', '向上查找非简单机构时机构不存在', '记录WARN日志，停止查找，保持原机构'],
        ],
        [2000, 2000, 3000, 3000]
    ));

    children.push(heading2('6.2 异常处理策略'));
    children.push(bodyText('1. 简单机构上移查找：设置最大遍历深度（MAX_BRANCH_TRAVERSE_DEPTH=10），防止因数据异常（如机构树循环引用）导致死循环。到达最大深度后保持原机构号不变。'));
    children.push(bodyText('2. 机构信息查询失败：若getCacheBranch返回null，记录WARN日志并停止向上查找，保持原机构号不变，不抛出异常。'));
    children.push(bodyText('3. 批量导入校验：逐行校验，收集所有错误信息后一次性返回，避免用户反复修正。'));
    children.push(bodyText('4. ThreadLocal泄漏防护：在线查询Service中使用try-finally确保ThreadLocal在请求结束后清理。'));

    children.push(heading2('6.3 恢复策略'));
    children.push(bodyText('1. 简单机构上移失败时，不阻断业务流程，保持原机构号继续执行保存操作。'));
    children.push(bodyText('2. 机构过滤查询失败时，降级为仅查询本机构数据（brchNo等值查询），确保用户至少能看到本机构数据。'));
    children.push(bodyText('3. 批量导入部分失败时，成功的机构正常入库，失败的机构汇总返回错误信息。'));
    children.push(pageBreak());

    // 第七章 安全策略
    children.push(heading1('第七章 安全策略'));

    children.push(heading2('7.1 访问控制'));
    children.push(bodyText('1. 企业信息报备相关4个查询界面限制为本机构及下级机构，防止越权查看其他机构数据。'));
    children.push(bodyText('2. 机构号列表由后端根据当前登录用户自动生成，前端无法篡改查询范围。'));
    children.push(bodyText('3. 机构管理界面的按钮权限通过authObj控制，不同用户类型看到不同操作按钮。'));

    children.push(heading2('7.2 数据安全'));
    children.push(bodyText('1. 简单机构上移操作记录INFO级别日志，包含账号、原机构号、替换后机构号，便于审计追溯。'));
    children.push(bodyText('2. 机构过滤条件在Controller层强制注入，Service层无法绕过。'));
    children.push(bodyText('3. ThreadLocal中存储的机构号列表在请求结束后立即清理，防止信息泄漏。'));

    children.push(heading2('7.3 操作审计'));
    children.push(bodyText('1. 机构管理新增/修改/同步操作走产品化复核流程，简单机构标识变更需经过复核。'));
    children.push(bodyText('2. 批量导入操作逐条执行，失败记录包含机构名称和失败原因。'));
    children.push(pageBreak());

    // 第八章 技术实现细节
    children.push(heading1('第八章 技术实现细节'));

    children.push(heading2('8.1 核心算法'));
    children.push(heading3('8.1.1 简单机构上移查找算法'));
    children.push(bodyText('算法描述：从指定机构开始，沿机构树向上查找第一个非简单机构。'));
    children.push(codeBlock('findNonSimpleParentBrchNo(legalNo, brchNo):'));
    children.push(codeBlock('  currentBrchNo = brchNo'));
    children.push(codeBlock('  maxDepth = 10'));
    children.push(codeBlock('  while currentBrchNo != null and maxDepth-- > 0:'));
    children.push(codeBlock('    branch = branchService.getCacheBranch(legalNo, currentBrchNo)'));
    children.push(codeBlock('    if branch == null: break  // 机构不存在，停止查找'));
    children.push(codeBlock('    if branch.reserve2 != "1": return currentBrchNo  // 非简单机构'));
    children.push(codeBlock('    currentBrchNo = branch.parentBrchNo  // 继续向上'));
    children.push(codeBlock('    if currentBrchNo == "0000": break  // 到达根节点'));
    children.push(codeBlock('  return brchNo  // 未找到非简单机构，保持原值'));

    children.push(heading3('8.1.2 下级机构列表获取算法'));
    children.push(codeBlock('getSubBranchNos(userInfo):'));
    children.push(codeBlock('  brchNo = userInfo.brchNo'));
    children.push(codeBlock('  legalNo = userInfo.legalNo'));
    children.push(codeBlock('  subBranches = branchService.getBegatsBranch(legalNo, brchNo)'));
    children.push(codeBlock('  brchNos = [brchNo]  // 始终包含本机构'));
    children.push(codeBlock('  for branch in subBranches:'));
    children.push(codeBlock('    if branch.brchNo != brchNo:  // 避免重复'));
    children.push(codeBlock('      brchNos.add(branch.brchNo)'));
    children.push(codeBlock('  return brchNos'));

    children.push(heading2('8.2 代码实现清单'));
    children.push(createTable(
        ['类名', '方法名', '说明', '代码行数'],
        [
            ['HnnxbankCustAcctServiceImpl', 'collCustAcct', '批量账号同步保存（含简单机构上移）', '约10行'],
            ['HnnxbankCustAcctServiceImpl', 'queryAndCollCustAcct', '单笔账号同步保存（含简单机构上移）', '约30行'],
            ['HnnxbankCustAcctServiceImpl', 'replaceSimpleBranchOpenBrchNo', '简单机构开户机构替换', '约15行'],
            ['HnnxbankCustAcctServiceImpl', 'findNonSimpleParentBrchNo', '向上查找非简单机构', '约25行'],
            ['HnnxCustSignController', 'queryCustCorpInfoByPage', '报备查询（含机构过滤）', '约10行'],
            ['HnnxCustSignController', 'queryCustCorpSignRecordByPage', '报备记录查询（含机构过滤）', '约10行'],
            ['HnnxCustSignAuditController', 'queryCustSignAuditByPage', '报备复核查询（含机构过滤）', '约10行'],
            ['HnnxCustInfoOnlineQueryController', 'queryCustInfoByPage', '在线查询（含机构过滤）', '约10行'],
            ['HnnxCustCorpSignServiceImpl', 'queryCustSignInfoWithBrchNos', '报备查询Criteria构建', '约40行'],
            ['HnnxCustCorpQueryServiceImpl', 'queryCustInfoByPage', '在线查询Criteria构建', '约30行'],
            ['HnnxBankBranchController', 'downloadModel', '导入模板（含简单机构列）', '约25行'],
            ['HnnxBankBranchController', 'batchImportValidate', '批量导入校验（含简单机构解析）', '约30行'],
        ],
        [3000, 2800, 2200, 1000]
    ));

    children.push(heading2('8.3 性能优化'));
    children.push(createTable(
        ['优化项', '优化策略', '预期效果'],
        [
            ['机构信息缓存', '使用branchService.getCacheBranch获取机构信息', '避免重复数据库查询，利用产品化缓存机制'],
            ['IN条件批量查询', '使用brchNos的IN条件替代多次单机构查询', '减少数据库访问次数，一次查询获取所有下级机构数据'],
            ['遍历深度限制', 'MAX_BRANCH_TRAVERSE_DEPTH=10', '防止数据异常导致死循环，保障系统稳定性'],
            ['ThreadLocal及时清理', '在finally块中清理ThreadLocal', '防止内存泄漏，保障长时间运行稳定性'],
        ],
        [2500, 3500, 3000]
    ));

    children.push(heading2('8.4 开发规范'));
    children.push(createTable(
        ['规范类型', '规范要求', '说明'],
        [
            ['代码目录', '后端代码在banks/ext-hnnxbank目录', '遵循个性化开发规范，禁止修改产品化代码'],
            ['前端目录', '前端代码在frontend/src/views/bizViews/banks/hnnxbank', '遵循前端个性化目录规范'],
            ['路径映射', '在hnnxbankIndex.js中维护路径映射', '确保个性化Vue组件正确加载'],
            ['国际化', '在zh-CN.js中维护中文标签', '使用$hnnxbank.m.i.auth.isSimpleBranch'],
            ['注解使用', '使用@CustomizedBean注解注册个性化Bean', '确保Spring容器正确管理个性化组件'],
            ['字段复用', '复用RESERVE2字段存储简单机构标识', '不新增数据库字段，降低迁移风险'],
            ['日志规范', '关键操作记录INFO日志，异常记录WARN日志', '便于问题排查和审计追溯'],
        ],
        [2000, 3500, 3500]
    ));

    children.push(heading2('8.5 偏差记录'));
    children.push(bodyText('以下为需求与实际实现之间的偏差说明：'));
    children.push(createTable(
        ['偏差编号', '偏差描述', '需求描述', '实际实现', '偏差原因'],
        [
            ['DEV-001', '客户号弹出框查询增加机构过滤', '需求10个功能点中未包含客户号弹出框查询', 'HnnxCustCorpController.pageQueryCustCorpList也增加了本机构及下级机构过滤', '客户号弹出框是企业信息报备的关联入口，若不过滤则报备查询的机构过滤可被绕过，属于安全加固'],
            ['DEV-002', '企业账号查询增加机构过滤', '需求未明确提及企业账号查询的机构过滤', 'HnnxbankCustAcctServiceImpl.pageQueryCustAcctList增加了本机构及下级机构过滤', '与报备查询保持一致，防止通过账号查询绕过机构限制'],
        ],
        [1200, 2500, 2000, 2500, 1800]
    ));

    return new Document({
        sections: [{
            properties: {
                page: {
                    size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: 'portrait' },
                    margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
                },
            },
            children,
        }],
    });
}

// ========== 测试用例文档内容 ==========

function generateTestcaseDoc() {
    const children = [];

    // 封面
    children.push(new Paragraph({ spacing: { before: 4000 } }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '简单机构功能', bold: true, font: FONT_HEI, size: SIZE_ER })],
        alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '测试用例文档', bold: true, font: FONT_HEI, size: SIZE_ER })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: 'HUNDSUN 票据交易管理平台软件', font: FONT_SONG, size: SIZE_SI })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '版本：V5.0', font: FONT_SONG, size: SIZE_SI })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '河南农信个性化', font: FONT_SONG, size: SIZE_SI })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: '2026年5月', font: FONT_SONG, size: SIZE_SI })],
        alignment: AlignmentType.CENTER,
    }));
    children.push(pageBreak());

    // 第一章 引言
    children.push(heading1('第一章 引言'));

    children.push(heading2('1.1 编写目的'));
    children.push(bodyText('本文档用于指导BEMP系统"简单机构"功能的测试执行，明确测试范围、测试用例和验收标准，确保功能符合需求规格，覆盖所有10个功能点的正向、反向和边界场景。'));

    children.push(heading2('1.2 背景说明'));
    children.push(bodyText('上级机构无法为下级机构（分理处）进行企业信息报备，导致下级机构开户客户无法收票。通过引入"简单机构"概念，实现开户自动上移和查询范围限制。'));

    children.push(heading2('1.3 定义'));
    children.push(createTable(
        ['术语', '定义'],
        [
            ['简单机构', '不具备独立票交所业务能力的机构，RESERVE2="1"标识'],
            ['开户上移', '简单机构开户时自动将签约开户机构替换为上级非简单机构'],
            ['机构过滤', '查询范围限制为本机构及下级机构，防止越权查看'],
            ['RESERVE2', 'TM_BRANCH表预留字段，复用存储"是否简单机构"标识'],
        ],
        [2500, 7500]
    ));

    children.push(heading2('1.4 参考资料'));
    children.push(createTable(
        ['文档名称', '文档版本', '说明'],
        [
            ['简单机构功能需求规格', 'V1.0', '功能需求定义'],
            ['BEMP项目开发规范', 'V5.0', '编码规范文档'],
            ['简单机构功能详细设计文档', 'V1.0', '详细设计说明'],
        ],
        [3500, 1500, 5000]
    ));
    children.push(pageBreak());

    // 第二章 测试计划
    children.push(heading1('第二章 测试计划'));

    children.push(heading2('2.1 测试范围'));
    children.push(createTable(
        ['范围类型', '说明'],
        [
            ['纳入范围', '功能点1-5：机构管理"是否简单机构"字段相关功能'],
            ['纳入范围', '功能点6：企业账号同步保存时简单机构开户自动上移'],
            ['纳入范围', '功能点7-10：企业信息报备相关查询机构过滤'],
            ['排除范围', '产品化机构管理基础功能（非个性化部分）'],
            ['排除范围', '票交所报备接口通信功能'],
        ],
        [2000, 8000]
    ));

    children.push(heading2('2.2 测试目标'));
    children.push(createTable(
        ['测试类型', '目标描述', '验收标准'],
        [
            ['功能测试', '验证10个功能点的正确实现', '所有功能点测试通过'],
            ['异常测试', '验证异常场景的处理和容错能力', '异常不导致系统崩溃'],
            ['边界测试', '验证边界条件下的系统行为', '边界场景全部通过'],
            ['集成测试', '验证前后端交互和模块间协作', '端到端流程正常'],
        ],
        [2000, 4000, 4000]
    ));

    children.push(heading2('2.3 测试资源'));
    children.push(createTable(
        ['资源类型', '配置说明'],
        [
            ['硬件', '开发环境服务器：CPU 8核/内存16G'],
            ['软件', 'JDK 1.8、Spring Boot、Vue 2.x、Element UI'],
            ['人员', '测试工程师1名、开发工程师1名'],
        ],
        [2000, 8000]
    ));

    children.push(heading2('2.4 测试进度'));
    children.push(createTable(
        ['测试阶段', '测试内容', '预计时间'],
        [
            ['功能测试', '机构管理简单机构字段相关5个功能点', '2天'],
            ['功能测试', '简单机构开户自动上移', '1天'],
            ['功能测试', '企业信息报备查询过滤4个功能点', '2天'],
            ['异常与边界测试', '异常场景和边界值测试', '1天'],
            ['集成测试', '端到端流程验证', '1天'],
        ],
        [2500, 5000, 2500]
    ));
    children.push(pageBreak());

    // 第三章 测试环境
    children.push(heading1('第三章 测试环境'));
    children.push(heading2('3.1 软件环境'));
    children.push(createTable(
        ['软件名称', '版本', '用途'],
        [
            ['操作系统', 'Windows 10', '运行环境'],
            ['JDK', '1.8', 'Java运行环境'],
            ['Node.js', '12+', '前端构建'],
            ['Spring Boot', '2.x', '应用框架'],
            ['Oracle', '11g', '数据库'],
        ],
        [3000, 2000, 5000]
    ));
    children.push(pageBreak());

    // 第四章 功能测试用例
    children.push(heading1('第四章 功能测试用例'));

    // 4.1 机构管理模块
    children.push(heading2('4.1 机构管理-简单机构字段测试'));
    children.push(createTable(
        ['用例编号', '用例标题', '前置条件', '测试类型', '执行步骤', '预期结果', '优先级'],
        [
            ['TC-BR-001', '新增机构-选择"是简单机构"', '进入机构管理页面，选择父机构', '正向', '1.点击新增 2.填写机构信息 3.是否简单机构选择"是" 4.提交', '机构保存成功，列表中"是否简单机构"列显示"是"', 'P0'],
            ['TC-BR-002', '新增机构-选择"否简单机构"', '进入机构管理页面，选择父机构', '正向', '1.点击新增 2.填写机构信息 3.是否简单机构选择"否" 4.提交', '机构保存成功，列表中"是否简单机构"列显示"否"', 'P0'],
            ['TC-BR-003', '新增机构-默认值验证', '进入机构管理页面，选择父机构', '正向', '1.点击新增 2.不修改是否简单机构字段 3.提交', '默认值为"否"，保存后显示"否"', 'P1'],
            ['TC-BR-004', '修改机构-回显简单机构值', '机构列表中存在简单机构记录', '正向', '1.选择一个简单机构 2.点击修改', '弹窗中"是否简单机构"字段正确回显原值', 'P0'],
            ['TC-BR-005', '修改机构-修改简单机构值', '机构列表中存在记录', '正向', '1.选择一个非简单机构 2.点击修改 3.将"是否简单机构"改为"是" 4.提交', '修改成功，列表显示更新后的值', 'P0'],
            ['TC-BR-006', '同步机构-显示简单机构字段', '进入机构管理页面', '正向', '1.点击同步 2.输入机构号并同步 3.设置是否简单机构 4.提交', '同步成功，简单机构标识正确保存', 'P1'],
            ['TC-BR-007', '列表展示-简单机构列显示', '机构列表中存在不同简单机构标识的记录', '正向', '1.查看机构列表', 'reserve2="1"显示"是"，"0"或空显示"否"', 'P0'],
            ['TC-BR-008', '批量导入-含简单机构列', '准备含"是否简单机构"列的Excel文件', '正向', '1.下载导入模板 2.填写数据含"是否简单机构"列 3.导入', '导入成功，简单机构标识正确保存', 'P0'],
            ['TC-BR-009', '导入模板-含简单机构列', '进入机构管理页面', '正向', '1.点击导入模板下载', '模板中包含"是否简单机构"列（第12列）', 'P1'],
            ['TC-BR-010', '批量导入-简单机构值错误', '准备"是否简单机构"列填写非"是"/"否"值的Excel', '反向', '1.上传含错误值的Excel 2.校验', '提示第N行"是否简单机构[xxx]错误，应为是或否"', 'P1'],
            ['TC-BR-011', '批量导入-简单机构为空', '准备"是否简单机构"列为空的Excel', '边界', '1.上传简单机构列为空的Excel 2.导入', '空值默认为"0"（否），导入成功', 'P1'],
        ],
        [1100, 2000, 1800, 800, 2000, 1800, 500]
    ));

    // 4.2 简单机构上移测试
    children.push(heading2('4.2 简单机构开户自动上移测试'));
    children.push(createTable(
        ['用例编号', '用例标题', '前置条件', '测试类型', '执行步骤', '预期结果', '优先级'],
        [
            ['TC-UP-001', '简单机构开户-自动上移到上级', '存在简单机构A（reserve2=1），其上级B为非简单机构', '正向', '1.在简单机构A开户企业账号 2.同步保存', '开户机构自动替换为上级B，日志记录替换信息', 'P0'],
            ['TC-UP-002', '多层简单机构-上移到最上层非简单机构', 'A(简单)->B(简单)->C(非简单)', '正向', '1.在简单机构A开户 2.同步保存', '开户机构自动替换为C（跳过中间简单机构B）', 'P0'],
            ['TC-UP-003', '非简单机构开户-不替换', '开户机构为非简单机构', '正向', '1.在非简单机构开户 2.同步保存', '开户机构保持不变', 'P0'],
            ['TC-UP-004', '单笔同步-简单机构上移', '存在简单机构', '正向', '1.执行单笔核心账号同步（queryAndCollCustAcct）', '开户机构自动上移到上级非简单机构', 'P0'],
            ['TC-UP-005', '批量同步-简单机构上移', '存在多个账号，部分属于简单机构', '正向', '1.执行批量账号同步（collCustAcct）', '仅简单机构的账号开户机构被替换，其他保持不变', 'P0'],
            ['TC-UP-006', '全链路简单机构-保持原值', 'A(简单)->B(简单)->根节点，无非简单机构', '反向', '1.在A开户 2.同步保存', '到达根节点仍未找到非简单机构，保持原机构A不变', 'P1'],
            ['TC-UP-007', '机构不存在-保持原值', '开户机构在系统中不存在', '反向', '1.使用不存在的机构号开户 2.同步保存', 'getCacheBranch返回null，保持原机构号不变，记录WARN日志', 'P1'],
            ['TC-UP-008', '空开户机构-不处理', '账号的开户机构号为空', '边界', '1.开户机构号为空 2.同步保存', '不进行简单机构检查，直接保存', 'P2'],
        ],
        [1100, 2200, 1800, 800, 1800, 1800, 500]
    ));

    // 4.3 报备查询过滤测试
    children.push(heading2('4.3 企业信息报备查询机构过滤测试'));
    children.push(createTable(
        ['用例编号', '用例标题', '前置条件', '测试类型', '执行步骤', '预期结果', '优先级'],
        [
            ['TC-QY-001', '报备查询-仅显示本机构及下级数据', '用户属于机构A，A有下级机构B、C', '正向', '1.进入企业信息报备页面 2.查询', '仅显示A、B、C机构的数据，不显示其他机构数据', 'P0'],
            ['TC-QY-002', '报备复核查询-仅显示本机构及下级数据', '用户属于机构A，A有下级机构B', '正向', '1.进入企业信息报备复核页面 2.查询', '仅显示A、B机构的待复核数据', 'P0'],
            ['TC-QY-003', '报备记录查询-仅显示本机构及下级数据', '用户属于机构A', '正向', '1.进入企业信息报备记录页面 2.查询', '仅显示本机构及下级机构的报备记录', 'P0'],
            ['TC-QY-004', '在线查询-仅显示本机构及下级数据', '用户属于机构A，A有下级机构B', '正向', '1.进入企业信息在线查询页面 2.查询', '仅显示A、B机构的在线查询记录', 'P0'],
            ['TC-QY-005', '在线查询-重置恢复默认机构', '用户属于机构A', '正向', '1.修改查询机构为其他机构 2.点击重置', '机构号恢复为当前用户机构A', 'P1'],
            ['TC-QY-006', '总行用户-查看所有机构数据', '用户属于总行（顶级机构）', '正向', '1.以总行用户登录 2.查询报备信息', '显示所有下级机构的数据', 'P1'],
            ['TC-QY-007', '分理处用户-仅查看本机构数据', '用户属于最底层分理处（无下级机构）', '边界', '1.以分理处用户登录 2.查询', '仅显示本机构数据', 'P1'],
        ],
        [1100, 2200, 1800, 800, 1800, 1800, 500]
    ));
    children.push(pageBreak());

    // 第五章 集成测试用例
    children.push(heading1('第五章 集成测试用例'));

    children.push(heading2('5.1 端到端测试'));
    children.push(createTable(
        ['用例编号', '用例名称', '前置条件', '测试步骤', '预期结果', '优先级'],
        [
            ['TC-INT-001', '简单机构开户全流程', '1.存在简单机构A 2.上级B为非简单机构', '1.在A新增企业客户 2.同步企业账号 3.查看账号开户机构', '开户机构为B而非A，报备查询中B机构可见该客户', 'P0'],
            ['TC-INT-002', '报备查询过滤全流程', '1.机构A有下级B、C 2.不同机构有不同客户', '1.以A机构用户登录 2.查询报备信息 3.切换为其他机构用户查询', 'A用户可见A/B/C数据，其他机构用户仅可见本机构及下级', 'P0'],
            ['TC-INT-003', '批量导入+开户上移联动', '1.通过批量导入创建简单机构 2.在简单机构开户', '1.批量导入含简单机构标识的机构 2.在导入的简单机构开户 3.查看开户机构', '开户机构自动上移到上级非简单机构', 'P1'],
        ],
        [1100, 2000, 2000, 2500, 2000, 500]
    ));
    children.push(pageBreak());

    // 第六章 性能测试用例
    children.push(heading1('第六章 性能测试用例'));
    children.push(createTable(
        ['用例编号', '用例名称', '测试条件', '预期结果', '优先级'],
        [
            ['TC-PERF-001', '简单机构上移查找性能', '机构层级5层，前4层为简单机构', '查找耗时<50ms，不影响保存操作响应时间', 'P2'],
            ['TC-PERF-002', '下级机构列表获取性能', '机构下级数量100+', 'getBegatsBranch调用耗时<200ms', 'P2'],
            ['TC-PERF-003', '报备查询IN条件性能', '机构列表50+，数据量10000+', '查询响应时间<3s', 'P2'],
        ],
        [1200, 2500, 2500, 2500, 500]
    ));
    children.push(pageBreak());

    // 第七章 安全测试用例
    children.push(heading1('第七章 安全测试用例'));
    children.push(createTable(
        ['用例编号', '用例名称', '测试步骤', '预期结果', '优先级'],
        [
            ['TC-SEC-001', '越权查询防护', '1.以机构A用户登录 2.尝试构造请求查询机构B的数据', '请求被机构过滤拦截，无法查看非本机构及下级的数据', 'P0'],
            ['TC-SEC-002', 'ThreadLocal泄漏验证', '1.执行在线查询 2.检查ThreadLocal是否清理', '请求结束后ThreadLocal中的机构列表已清理', 'P1'],
            ['TC-SEC-003', '批量导入注入防护', '1.上传含特殊字符的"是否简单机构"值 2.校验', '校验拒绝非法值，提示错误信息', 'P1'],
        ],
        [1200, 2500, 3000, 2500, 500]
    ));
    children.push(pageBreak());

    // 第八章 测试执行结果
    children.push(heading1('第八章 测试执行结果'));

    children.push(heading2('8.1 测试执行情况'));
    children.push(createTable(
        ['统计项', '数量', '占比'],
        [
            ['总用例数', '29', '100%'],
            ['机构管理模块', '11', '37.9%'],
            ['开户上移模块', '8', '27.6%'],
            ['查询过滤模块', '7', '24.1%'],
            ['集成测试', '3', '10.3%'],
            ['已通过', '0', '0%'],
            ['已失败', '0', '0%'],
            ['未执行', '29', '100%'],
        ],
        [3000, 2000, 2000]
    ));

    children.push(heading2('8.2 缺陷统计'));
    children.push(createTable(
        ['严重程度', '数量', '修复状态'],
        [
            ['严重', '0', '-'],
            ['一般', '0', '-'],
            ['轻微', '0', '-'],
        ],
        [3000, 2000, 3000]
    ));

    children.push(heading2('8.3 测试结论'));
    children.push(bodyText('待测试执行完成后填写。'));

    return new Document({
        sections: [{
            properties: {
                page: {
                    size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: 'portrait' },
                    margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
                },
            },
            children,
        }],
    });
}

// ========== 主函数 ==========

async function main() {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成详细设计文档
    console.log('正在生成简单机构功能详细设计文档...');
    const designDoc = generateDesignDoc();
    const designBuffer = await Packer.toBuffer(designDoc);
    const designPath = path.join(outputDir, 'V5.0-系统管理-简单机构功能-详细设计.docx');
    fs.writeFileSync(designPath, designBuffer);
    console.log(`详细设计文档已生成: ${designPath}`);

    // 生成测试用例文档
    console.log('正在生成简单机构功能测试用例文档...');
    const testcaseDoc = generateTestcaseDoc();
    const testcaseBuffer = await Packer.toBuffer(testcaseDoc);
    const testcasePath = path.join(outputDir, 'V5.0-系统管理-简单机构功能-测试用例.docx');
    fs.writeFileSync(testcasePath, testcaseBuffer);
    console.log(`测试用例文档已生成: ${testcasePath}`);

    console.log('\n文档生成完成！');
}

main().catch(err => {
    console.error('文档生成失败:', err);
    process.exit(1);
});
