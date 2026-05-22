const fs = require('fs');
const path = require('path');
const { COMPANY_DEFAULTS } = require('../config/default');

class SRSConverter {
    constructor(options = {}) {
        this.lines = [];
        this.currentLine = 0;
        this.company = options.company || COMPANY_DEFAULTS.company;
        this.product = options.product || COMPANY_DEFAULTS.product;
        this.version = options.version || COMPANY_DEFAULTS.version;
        this.department = options.department || COMPANY_DEFAULTS.department;
    }

    load(mdPath) {
        this.content = fs.readFileSync(mdPath, 'utf-8');
        this.lines = this.content.split('\n');
        this.currentLine = 0;
    }

    peek(offset = 0) { return this.currentLine + offset < this.lines.length ? this.lines[this.currentLine + offset] : ''; }
    advance(n = 1) { this.currentLine += n; return this.peek(-1); }

    findSection(title, maxSearch = 800) {
        const start = this.currentLine;
        for (let i = start; i < Math.min(start + maxSearch, this.lines.length); i++) {
            const line = this.lines[i];
            if (line.trim().startsWith('#') && line.includes(title)) { this.currentLine = i; return true; }
        }
        return false;
    }

    findSubSection(title, maxSearch = 300) {
        const start = this.currentLine;
        for (let i = start; i < Math.min(start + maxSearch, this.lines.length); i++) {
            const line = this.lines[i];
            if (line.trim().match(/^##\s/) && line.includes(title)) { this.currentLine = i; return true; }
            if (line.trim().match(/^###\s/) && line.includes(title)) { this.currentLine = i; return true; }
        }
        return false;
    }

    extractContentUntil(nextHeading, maxLines = 2000) {
        const paragraphs = [];
        let count = 0;
        this.advance();
        while (this.currentLine < this.lines.length && count < maxLines) {
            const line = this.lines[this.currentLine];
            if (line.trim().match(/^#{1,6}\s/)) {
                const hText = line.replace(/^#+\s*/, '');
                if (nextHeading.some(h => hText.includes(h))) break;
                this.advance();
                count++;
                continue;
            }
            const trimmed = line.trim();
            if (trimmed && !trimmed.match(/^\s*$/)) {
                if (trimmed.startsWith('![')) {
                    const altMatch = trimmed.match(/^!\[([^\]]*)\]/);
                    const altText = altMatch ? altMatch[1] : '附件';
                    paragraphs.push(`[${altText}，详见原始文档]`);
                } else if (!trimmed.match(/^\d+\.\d+\.\d+/)) {
                    paragraphs.push(trimmed);
                }
            }
            this.advance();
            count++;
        }
        return paragraphs.join('\n');
    }

    extractTable() {
        const tableLines = [];
        let count = 0;
        while (this.currentLine < this.lines.length && count < 100) {
            const line = this.lines[this.currentLine];
            if (line.trim().startsWith('|')) {
                tableLines.push(line);
            } else if (tableLines.length > 0) {
                break;
            }
            this.advance();
            count++;
        }
        return tableLines;
    }

    parseRows(tableLines) {
        if (tableLines.length < 3) return [];
        const headerLine = tableLines[0];
        const headerCells = headerLine.split('|').map(c => c.trim()).filter(Boolean);
        const headerSep = tableLines[1];
        const headerCellCount = headerSep.split('|').filter(c => c.trim() === '---' || /^:?-+:?$/.test(c.trim())).length;
        const rows = [];
        for (let i = 2; i < tableLines.length; i++) {
            let cells = tableLines[i].split('|');
            if (cells.length > 1 && cells[0].trim() === '') cells = cells.slice(1);
            if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells = cells.slice(0, -1);
            cells = cells.map(c => c.trim());
            while (cells.length < headerCellCount) cells.push('');

            const isHeaderRepeat = cells.length >= 2 && headerCells.length >= 2
                && cells[0] === headerCells[0] && cells[1] === headerCells[1];
            if (isHeaderRepeat) continue;

            if (cells.length > 0 && !cells.every(c => c === '---' || c === '--' || c === '')) {
                rows.push(cells);
            }
        }
        return rows;
    }

    convertToSRS(mdPath, moduleName) {
        this.load(mdPath);

        const coverPage = {
            title: `${moduleName}-需求规格说明书`,
            company: this.company,
            product: this.product,
            version: this.version,
            documentType: '需求规格说明书',
            department: this.department,
            date: new Date().toLocaleDateString('zh-CN')
        };

        const revisionHistory = {
            headers: ['版本', '发布日期', '修订人', '修订说明'],
            rows: [
                ['V1.0', new Date().toLocaleDateString('zh-CN'), '', '初始版本']
            ]
        };

        const chapters = [];

        this.currentLine = 0;

        // === 第一章 引言 ===
        const ch1 = { title: '第一章 引言', sections: [] };

        let businessBg = '', businessGoal = '', businessImpact = '';

        if (this.findSection('业务背景')) {
            businessBg = this.extractContentUntil(['业务目标', '业务影响分析', '面向用户群体'], 100);
        }
        if (this.findSection('业务目标')) {
            businessGoal = this.extractContentUntil(['业务影响分析', '面向用户群体'], 60);
        }
        if (this.findSection('业务影响分析')) {
            businessImpact = this.extractContentUntil(['面向用户群体'], 100);
        }

        ch1.sections.push({ title: '1.1 背景', content: { description: businessBg || '（待补充）' } });
        ch1.sections.push({ title: '1.2 目的', content: { description: `本文档旨在明确${moduleName}的功能需求和非功能性需求，为后续的设计、开发、测试和验收提供依据。` } });
        ch1.sections.push({ title: '1.3 范围', content: { description: '（根据需求文档内容补充功能范围）' } });

        // 术语
        this.currentLine = 0;
        let termRows = [];
        if (this.findSection('定义和术语')) {
            const tbl = this.extractTable();
            termRows = this.parseRows(tbl);
        }
        if (termRows.length > 0) {
            ch1.sections.push({
                title: '1.4 术语和缩略语',
                content: { headers: ['术语', '说明'], rows: termRows, colWidths: [2000, 8000] }
            });
        } else {
            ch1.sections.push({ title: '1.4 术语和缩略语', content: { description: 'BEMP：HUNDSUN票据交易管理平台；BBSP：HUNDSUN电子商业汇票综合处理平台软件。' } });
        }

        // 参考资料
        this.currentLine = 0;
        let refContent = '';
        if (this.findSection('标准规范及资料')) {
            refContent = this.extractContentUntil(['定义和术语', '功能需求'], 60);
        }
        ch1.sections.push({
            title: '1.5 参考资料',
            content: {
                headers: ['文档名称', '版本', '说明'],
                rows: [
                    ['中国票据业务系统直连接口规范', 'V1.3', '上海票据交易所接口规范'],
                    ['提示付款拒付通知文件功能投产上线通知', '票交所发〔2024〕92号', '上海票据交易所通知'],
                    [refContent || '2024年8月12日票交所更新通知', 'V1.3', '接口规范升级依据']
                ]
            }
        });
        chapters.push(ch1);

        // === 第二章 项目概述 ===
        this.currentLine = 0;
        let userGroupRows = [];
        if (this.findSection('面向用户群体')) {
            const tbl = this.extractTable();
            userGroupRows = this.parseRows(tbl);
        }

        const ch2 = {
            title: '第二章 项目概述',
            sections: [
                { title: '2.1 项目介绍', content: { description: `本项目为${moduleName}模块的功能优化开发。` } },
                { title: '2.2 项目目标', content: { description: businessGoal || '（待补充项目目标）' } },
                { title: '2.3 项目范围影响分析', content: { description: businessImpact || '（根据项目实际情况补充）' } },
                { title: '2.4 运行环境', content: { description: '（根据项目实际情况补充）' } },
                {
                    title: '2.5 面向用户群体',
                    content: userGroupRows.length > 0
                        ? { headers: ['用户类型', '角色', '工作范围'], rows: userGroupRows, colWidths: [2000, 2000, 6000] }
                        : { description: '行内用户（经办、复核、客户经理）、客户（操作员）。' }
                },
                { title: '2.6 假定和约束', content: { description: '（根据项目实际情况补充）' } }
            ]
        };
        chapters.push(ch2);

        // === 第三章 功能需求 ===
        this.currentLine = 0;

        // 业务功能列表
        let funcSummary = '';
        if (this.findSection('功能需求综述')) {
            funcSummary = this.extractContentUntil(['业务功能列表'], 80);
        }

        let funcListRows = [];
        if (this.findSection('业务功能列表')) {
            this.advance();

            let tblContinue = true;
            while (tblContinue && this.currentLine < this.lines.length) {
                const tbl = this.extractTable();
                const rows = this.parseRows(tbl);
                rows.forEach(r => {
                    if (r[0] !== '序号' && r[1] !== '主功能' && r.length >= 2) {
                        funcListRows.push([r[0] || '', r[1] || '', r[2] || '', r[3] || '', r[4] || '']);
                    }
                });

                const nextLine = this.peek();
                if (nextLine && nextLine.trim().startsWith('|')) {
                    continue;
                }
                tblContinue = false;
            }
        }

        // 详细功能需求子章节 - 解析接口规范1.3, 提示付款拒付通知, 其他优化需求的详细内容
        const funcDetailSections = [];

        this.currentLine = 0;
        let inFuncSection = false;
        let inFuncList = false;
        let currentFuncName = '';
        let currentFuncContent = [];

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            const trimmed = line.trim();

            if (trimmed === '# 功能需求') {
                inFuncSection = true;
                continue;
            }
            if (trimmed.match(/^#\s/) && !trimmed.match(/^##/) && inFuncSection && trimmed !== '# 功能需求') {
                if (currentFuncName && currentFuncContent.join('\n').trim().length > 0) {
                    funcDetailSections.push({
                        title: currentFuncName,
                        content: currentFuncContent.join('\n')
                    });
                }
                break;
            }

            if (!inFuncSection) continue;

            if (trimmed === '## 业务功能列表') {
                inFuncList = true;
                continue;
            }

            if (inFuncList && trimmed.match(/^##\s+/)) {
                inFuncList = false;
            }

            if (inFuncList) continue;

            const h2Match = trimmed.match(/^##\s+(.+)/);
            if (h2Match) {
                if (currentFuncName && currentFuncContent.join('\n').trim().length > 0) {
                    funcDetailSections.push({
                        title: currentFuncName,
                        content: currentFuncContent.join('\n')
                    });
                }
                currentFuncName = h2Match[1].trim();
                currentFuncContent = [];
                continue;
            }

            const h3Match = trimmed.match(/^###\s+(.+)/);
            if (h3Match) {
                currentFuncContent.push(`\n【${h3Match[1].trim()}】`);
                continue;
            }

            const h4Match = trimmed.match(/^####\s+(.+)/);
            if (h4Match) {
                currentFuncContent.push(`\n【【${h4Match[1].trim()}】】`);
                continue;
            }

            const h5Match = trimmed.match(/^#####\s+(.+)/);
            if (h5Match) {
                currentFuncContent.push(`\n【【【${h5Match[1].trim()}】】】`);
                continue;
            }

            const h6Match = trimmed.match(/^######\s+(.+)/);
            if (h6Match) {
                currentFuncContent.push(`\n【【【${h6Match[1].trim()}】】】`);
                continue;
            }

            if (currentFuncName) {
                if (trimmed) {
                    if (trimmed.startsWith('![')) {
                        const altMatch = trimmed.match(/^!\[([^\]]*)\]/);
                        const altText = altMatch ? altMatch[1] : '附件';
                        currentFuncContent.push(`[${altText}，详见原始文档]`);
                    } else {
                        currentFuncContent.push(trimmed);
                    }
                }
            }
        }

        // 构建功能需求章节
        const funcDetailContent = funcDetailSections.map((fd, idx) => ({
            title: `${idx + 1}. ${fd.title}`,
            content: fd.content
        }));

        const ch3 = {
            title: '第三章 功能需求',
            sections: [
                {
                    title: '3.1 功能需求综述',
                    content: { description: funcSummary || '（根据需求文档补充功能需求综述）' }
                },
                {
                    title: '3.2 功能结构及列表',
                    content: funcListRows.length > 0
                        ? { headers: ['序号', '主功能', '子功能', '需求分类', '功能要求'], rows: funcListRows, colWidths: [800, 1800, 3000, 1800, 1400] }
                        : { description: '（详见业务功能列表）' }
                }
            ]
        };

        if (funcDetailContent.length > 0) {
            const detailSections = funcDetailContent.map(fd => ({
                title: fd.title,
                content: { description: fd.content }
            }));
            ch3.sections.push({
                title: '3.3 功能需求详情',
                content: { description: '以下对各功能模块进行详细需求描述，完整详情请参见原始业务需求说明书。' },
                subSections: detailSections
            });
        }

        chapters.push(ch3);

        // === 第三章补充：反洗钱/监管报送/报表/新技术 ===
        this.currentLine = 0;
        let antiMoneyLaundering = '', regulatoryReporting = '', reportRequirement = '', newTech = '';
        if (this.findSection('反洗钱需求')) {
            antiMoneyLaundering = this.extractContentUntil(['监管报送需求'], 30);
        }
        if (this.findSection('监管报送需求')) {
            regulatoryReporting = this.extractContentUntil(['报表需求'], 30);
        }
        if (this.findSection('报表需求')) {
            reportRequirement = this.extractContentUntil(['新技术应用需求'], 30);
        }
        if (this.findSection('新技术应用需求')) {
            newTech = this.extractContentUntil(['第三章质量需求', '数据标准化要求', '数据质量'], 50);
        }
        ch3.sections.push({ title: '3.4 反洗钱需求', content: { description: antiMoneyLaundering || '需评估业务是否涉及反洗钱（客户信息、交易信息、账户信息）。' } });
        ch3.sections.push({ title: '3.5 监管报送需求', content: { description: regulatoryReporting || '需评估业务是否涉及监管报送（1104、人行大集中、利率报备、金融基础数据、EAST等）。' } });
        ch3.sections.push({ title: '3.6 报表需求', content: { description: reportRequirement || '需评估是否需出具报表（固定报表、明细查询、营销分析等）。' } });
        ch3.sections.push({ title: '3.7 新技术应用需求', content: { description: newTech || '需评估是否采用大数据、RPA等新技术。' } });

        // === 第四章 非功能性需求 ===
        this.currentLine = 0;

        let businessVolume = '', userCount = '', securityReq = '', sysEnvReq = '', dataStandard = '';
        if (this.findSection('业务量说明')) {
            businessVolume = this.extractContentUntil(['用户数量说明'], 50);
        }
        if (this.findSection('用户数量说明')) {
            userCount = this.extractContentUntil(['业务处理安全性要求'], 50);
        }
        if (this.findSection('业务处理安全性要求')) {
            securityReq = this.extractContentUntil(['系统软硬件及运行要求'], 80);
        }
        if (this.findSection('系统软硬件及运行要求')) {
            sysEnvReq = this.extractContentUntil(['流程图', '第四章流程图'], 80);
        }
        if (this.findSection('数据标准化要求')) {
            dataStandard = this.extractContentUntil(['数据质量', '数据标准', '数据场景'], 40);
        }

        // 安全检查子节：从安全要求中提取分类信息
        const hasPwdMgmt = securityReq.includes('密码') || securityReq.includes('锁定');
        const hasAuthMethod = securityReq.includes('登录') || securityReq.includes('认证') || securityReq.includes('USBKey');

        const securitySubSections = [];
        if (hasAuthMethod) {
            securitySubSections.push({ title: '4.7.1 用户身份鉴别', content: { description: '支持客户号、密码、短信、USBKey证书等多种登录验证方式；支持单因素、双因素、三因素认证机制。' } });
        }
        if (hasPwdMgmt) {
            securitySubSections.push({ title: '4.7.2 密码管理', content: { description: '支持密码最小长度6-10位配置；支持字母、数字、特殊字符组合；输错密码锁定机制。' } });
        }
        securitySubSections.push({ title: '4.7.3 数据分级与机密性', content: { description: '区分非敏感数据与敏感数据；敏感数据（如密码等）加密传输与存储；应用系统使用密钥保护。' } });

        const ch4 = {
            title: '第四章 非功能性需求',
            sections: [
                { title: '4.1 数据标准化要求', content: { description: dataStandard || '（根据项目实际情况补充）' } },
                { title: '4.2 用户界面需求', content: { description: '统一的页面框架，包含顶部导航、左侧菜单、主操作区；交互方式包含表单提交、弹出框操作、批量操作、分页展示。' } },
                { title: '4.3 软硬件环境要求', content: { description: sysEnvReq || '服务器：CPU X核/内存XG/硬盘XG；操作系统：Linux/Windows；浏览器：Chrome 80+/Edge 80+；数据库：Oracle/MySQL。' } },
                { title: '4.4 接口需求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.5 业务量说明', content: { description: businessVolume || '需根据业务发展规划预估日均业务量，并预估未来1-3年的日均业务量。当前阶段日均业务量需评估量级（100笔以下/100-1000笔/1000-1万笔等）。' } },
                { title: '4.6 用户数量说明', content: { description: userCount || '需预估当前阶段及未来1-3年系统涉及的使用用户总数，包括行内柜员、客户经理、管理人员及客户。' } },
                {
                    title: '4.7 业务处理安全性要求',
                    content: { description: securityReq || '系统需支持多种用户身份鉴别方式，包含密码管理机制（密码复杂度、锁定策略），区分数据分级，确保数据机密性。' },
                    subSections: securitySubSections
                },
                { title: '4.8 系统软硬件及运行要求', content: { description: '需评估与第三方机构互联情况；确定系统对外服务运行时间（7×24小时/5×8小时）；识别业务重要性（重要业务/次重要业务/一般业务）。' } },
                { title: '4.9 性能需求', content: { description: '（根据项目实际情况补充）' } },
                { title: '4.10 品质需求', content: { description: '系统稳定可靠，故障率低；界面友好，操作便捷；代码规范，文档齐全。' } },
                {
                    title: '4.11 运维需求',
                    content: { description: '（根据项目实际情况补充）' },
                    subSections: [
                        { title: '4.11.1 运行需求', content: { description: '（根据项目实际情况补充）' } },
                        { title: '4.11.2 监控需求', content: { description: '（根据项目实际情况补充）' } },
                        { title: '4.11.3 数据管理需求', content: { description: '（根据项目实际情况补充）' } },
                        { title: '4.11.4 容灾需求', content: { description: '（根据项目实际情况补充）' } },
                        { title: '4.11.5 故障处理需求', content: { description: '（根据项目实际情况补充）' } }
                    ]
                },
                { title: '4.12 政策和法律要求', content: { description: '需遵循《电子签名法》、《票据法》、信息安全等级保护等相关法律法规。' } },
                { title: '4.13 设计约束', content: { description: '必须使用JAVA语言开发，基于Spring Boot框架；遵循BEMP平台架构规范；遵循行内编码规范和命名规范。' } }
            ]
        };
        chapters.push(ch4);

        // === 第五章 附录 ===
        this.currentLine = 0;
        let flowChartContent = '';
        if (this.findSection('流程图')) {
            flowChartContent = this.extractContentUntil([], 30);
        } else if (this.findSection('第四章流程图')) {
            flowChartContent = this.extractContentUntil([], 30);
        }

        const ch5 = {
            title: '第五章 附录',
            sections: [
                { title: '5.1 流程图图示', content: { description: flowChartContent || '详细流程图参见原始业务需求说明书。流程图使用标准符号：终结符（开始/结束）、判定符（条件分支）、进程/活动、文档、多文档、数据、连接线等。' } },
                { title: '5.2 补充说明', content: { description: `本文档基于${moduleName}业务需求说明书生成。完整需求细节、界面设计截图及详细数据字段描述请参见原始业务需求说明书。` } }
            ]
        };
        chapters.push(ch5);

        return { coverPage, revisionHistory, chapters };
    }
}

module.exports = { SRSConverter };
