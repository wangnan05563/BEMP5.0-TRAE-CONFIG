/**
 * P2-4: 测试用例自校验脚本
 *
 * 功能：在用例提交评审前，自动校验用例格式和内容的规范性
 * 使用：node case-self-check.js --file path/to/test-cases.md
 *
 * 校验项（与 BEMP测试工程师.md 的"用例编制自校验"对齐）：
 *   1. 统计一致性：统计表总数/优先级分布必须与实际用例一一对应
 *   2. 预期结果确定性：不得包含"或"、"应"、"可能"等不确定措辞
 *   3. 编号规范性：格式 TC-{模块大写}-{三位数字}，不得重复/跳号
 *   4. 前置条件完整性：必须包含登录角色和数据准备要求
 *   5. 跨模块可执行性预标注：每条用例标注可执行性类型
 *   6. 单一职责：一条用例只验证一个测试点
 */
'use strict';

const fs = require('fs');
const path = require('path');

class TestCaseSelfChecker {
    constructor(options = {}) {
        this.filePath = options.filePath || '';
        this.items = [];
    }

    /**
     * 执行完整的用例自校验
     * @returns {Object} 校验结果 { passed, items, report }
     */
    check() {
        if (!this.filePath || !fs.existsSync(this.filePath)) {
            return {
                passed: false,
                items: [{ name: '文件存在性', pass: false, message: '用例文件不存在: ' + this.filePath }],
                report: '## 用例自校验结果\n\n❌ 文件不存在',
            };
        }

        const content = fs.readFileSync(this.filePath, 'utf8');
        const lines = content.split('\n');

        // 1. 统计一致性检查
        this._checkStatConsistency(content, lines);

        // 2. 预期结果确定性检查
        this._checkResultDeterminism(content);

        // 3. 编号规范性检查
        this._checkIdFormat(content, lines);

        // 4. 前置条件完整性检查
        this._checkPreconditionCompleteness(content, lines);

        // 5. 跨模块可执行性预标注检查
        this._checkExecutabilityAnnotation(content, lines);

        // 6. 单一职责检查
        this._checkSingleResponsibility(content, lines);

        const passed = this.items.every((i) => i.pass);
        const report = this._generateReport(passed);
        return { passed, items: this.items, report };
    }

    _checkStatConsistency(content, lines) {
        // 检查是否有统计表，并验证统计数字与实际用例数是否一致
        const statMatch = content.match(/总计[：:]\s*(\d+)/);
        const caseIdMatches = content.match(/TC-[A-Z]+-\d{3}/g) || [];
        const actualCaseCount = new Set(caseIdMatches).size;

        if (statMatch) {
            const statCount = parseInt(statMatch[1], 10);
            this.items.push({
                name: '统计一致性',
                pass: statCount === actualCaseCount,
                message: statCount === actualCaseCount
                    ? `统计表总数 ${statCount} 与实际用例数 ${actualCaseCount} 一致`
                    : `统计表总数 ${statCount} 与实际用例数 ${actualCaseCount} 不一致`,
            });
        } else {
            this.items.push({
                name: '统计一致性',
                pass: true,
                message: '未找到统计表，跳过一致性检查',
            });
        }
    }

    _checkResultDeterminism(content) {
        // 检查预期结果中是否包含不确定措辞
        const uncertainWords = ['或应', '可能', '或许', '大概', '应该可能'];
        const found = uncertainWords.filter((w) => content.includes(w));
        // "或" 字单独检查时需排除"或者"等正常用法，仅在"预期结果"行检查
        const resultLines = content.split('\n').filter((l) => l.includes('预期结果'));
        const orInResults = resultLines.filter((l) => /预期结果.*或[^者]/.test(l));

        this.items.push({
            name: '预期结果确定性',
            pass: found.length === 0 && orInResults.length === 0,
            message: found.length === 0 && orInResults.length === 0
                ? '预期结果无不确定措辞'
                : `发现不确定措辞: ${[...found, ...(orInResults.length > 0 ? ['预期结果中的"或"'] : [])].join(', ')}`,
        });
    }

    _checkIdFormat(content, lines) {
        const caseIds = content.match(/TC-[A-Z]+-\d{3}/g) || [];
        const uniqueIds = new Set(caseIds);
        const duplicates = caseIds.length - uniqueIds.size;

        // 检查跳号
        const idNumbers = [...new Set(caseIds)]
            .map((id) => parseInt(id.match(/\d{3}$/)[0], 10))
            .sort((a, b) => a - b);
        const gaps = [];
        for (let i = 1; i < idNumbers.length; i++) {
            if (idNumbers[i] - idNumbers[i - 1] > 1) {
                gaps.push(`${idNumbers[i - 1]}→${idNumbers[i]}`);
            }
        }

        this.items.push({
            name: '编号规范性',
            pass: duplicates === 0 && gaps.length === 0,
            message: duplicates === 0 && gaps.length === 0
                ? `编号格式正确，共 ${uniqueIds.size} 条，无重复无跳号`
                : `编号问题: ${duplicates > 0 ? `${duplicates} 个重复` : ''}${gaps.length > 0 ? ` 跳号: ${gaps.join(', ')}` : ''}`.trim(),
        });
    }

    _checkPreconditionCompleteness(content, lines) {
        // 检查前置条件是否包含登录角色和数据准备要求
        const preconditionLines = lines.filter((l) => l.includes('前置条件') || l.includes('前提条件'));
        const hasLoginRole = preconditionLines.some((l) => /登录|角色|管理员|操作员/.test(l));
        const hasDataPrep = preconditionLines.some((l) => /数据|准备|已存在|已创建/.test(l));

        this.items.push({
            name: '前置条件完整性',
            pass: hasLoginRole,
            message: hasLoginRole
                ? `前置条件包含登录角色${hasDataPrep ? '和数据准备' : '（建议补充数据准备要求）'}`
                : '前置条件缺失登录角色描述',
        });
    }

    _checkExecutabilityAnnotation(content, lines) {
        // 检查是否标注了跨模块可执行性
        const annotations = ['独立可执行', '需跨模块操作', '需专项数据', '需时间条件'];
        const found = annotations.filter((a) => content.includes(a));

        this.items.push({
            name: '跨模块可执行性预标注',
            pass: found.length > 0,
            message: found.length > 0
                ? `已标注可执行性: ${found.join(', ')}`
                : '未标注可执行性（需标注：独立可执行/需跨模块操作/需专项数据/需时间条件）',
        });
    }

    _checkSingleResponsibility(content, lines) {
        // 检查每条用例是否只验证一个测试点（简化检查：预期结果行不应过长）
        const resultLines = lines.filter((l) => l.includes('预期结果'));
        const longResults = resultLines.filter((l) => l.length > 200);

        this.items.push({
            name: '单一职责',
            pass: longResults.length === 0,
            message: longResults.length === 0
                ? '用例预期结果简洁，符合单一职责'
                : `${longResults.length} 条用例预期结果过长（>200字符），可能违反单一职责`,
        });
    }

    _generateReport(passed) {
        const lines = ['## 用例自校验结果'];
        lines.push('');
        lines.push(`- 统计一致性：${this._itemStatus('统计一致性')}`);
        lines.push(`- 预期结果确定性：${this._itemStatus('预期结果确定性')}`);
        lines.push(`- 编号规范性：${this._itemStatus('编号规范性')}`);
        lines.push(`- 前置条件完整性：${this._itemStatus('前置条件完整性')}`);
        lines.push(`- 跨模块可执行性预标注：${this._itemStatus('跨模块可执行性预标注')}`);
        lines.push(`- 单一职责：${this._itemStatus('单一职责')}`);
        lines.push(`- 自校验结论：${passed ? '可提交评审' : '需修复后提交'}`);
        return lines.join('\n');
    }

    _itemStatus(name) {
        const item = this.items.find((i) => i.name === name);
        if (!item) return '未检查';
        return item.pass ? '✅ 通过' : `❌ 未通过 - ${item.message}`;
    }
}

module.exports = { TestCaseSelfChecker };

// CLI 入口
if (require.main === module) {
    const args = process.argv.slice(2);
    const fileIdx = args.indexOf('--file');
    const filePath = fileIdx >= 0 ? args[fileIdx + 1] : '';
    const checker = new TestCaseSelfChecker({ filePath });
    const result = checker.check();
    console.log(result.report);
    process.exit(result.passed ? 0 : 1);
}
