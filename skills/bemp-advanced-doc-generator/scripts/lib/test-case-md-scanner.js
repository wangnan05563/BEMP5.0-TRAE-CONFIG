const fs = require('fs');
const path = require('path');
const { BempDocError, ERROR_CODES } = require('../../config/default');

class TestCaseMdScanner {
    constructor(options = {}) {
        this.options = { maxDepth: 8, ...options };
        this.caseBlockPattern = /^###\s+(TC-[A-Z0-9_-]+)\s+(.+?)$/gm;
        this.sectionPattern = /^##\s+(.+?)$/gm;
        this.yamlPattern = /```yaml\s*\n([\s\S]*?)```/g;
    }

    scan(testCasesMdPath) {
        if (!testCasesMdPath) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, '--test-cases 路径不能为空');
        }
        const resolved = path.isAbsolute(testCasesMdPath)
            ? testCasesMdPath
            : path.resolve(process.cwd(), testCasesMdPath);
        if (!fs.existsSync(resolved)) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, `功能测试用例文件不存在: ${resolved}`);
        }
        const content = fs.readFileSync(resolved, 'utf-8');
        const chapterRanges = this._buildChapterRanges(content);
        const testcases = [];
        const groupByChapter = {};
        // v8.0：诊断统计
        const diag = {
            totalBlocks: 0,
            yamlBlocks: 0,
            noYamlBlocks: 0,
            detectedKeys: { zh: 0, en: 0, mixed: 0 },
            emptyPreconditions: 0,
            emptySteps: 0,
            nonEmptyPreconditions: 0,
            nonEmptySteps: 0
        };

        const blockPattern = /###\s+(TC-[A-Z0-9_-]+)\s+([^\n]+)\n([\s\S]*?)(?=\n###\s+TC-|\n##\s+|\n#\s+|\Z)/g;
        let m;
        while ((m = blockPattern.exec(content)) !== null) {
            diag.totalBlocks++;
            const matchStart = m.index;
            const chapter = this._findChapter(chapterRanges, matchStart);
            const tc = this._parseCaseBlock(m[1], m[2], m[3], chapter, diag);
            if (tc) {
                testcases.push(tc);
                if (!groupByChapter[chapter]) groupByChapter[chapter] = [];
                groupByChapter[chapter].push(tc);
                if (tc.preconditions && tc.preconditions.length) diag.nonEmptyPreconditions++;
                else diag.emptyPreconditions++;
                if (tc.steps && tc.steps.length) diag.nonEmptySteps++;
                else diag.emptySteps++;
            }
        }

        testcases.sort((a, b) => a.id.localeCompare(b.id));

        const priorityStat = this._calcPriorityStat(testcases);
        const categoryStat = this._calcCategoryStat(testcases);

        // v8.0：扫描完打印诊断信息
        this._printDiagnostic(diag, resolved);

        return {
            testCasesPath: resolved,
            fileCount: 1,
            testCaseCount: testcases.length,
            testcases,
            groupByChapter,
            chapterCount: chapterRanges.length,
            priorityStat,
            categoryStat,
            _diagnostic: diag  // 暴露给上层 verify
        };
    }

    /**
     * v8.0：扫描完成后打印诊断信息
     * 帮助用户发现"为什么 J 列 stepDesc 为空"等隐藏问题
     */
    _printDiagnostic(diag, filePath) {
        if (this.options.silent) return;
        const lines = [];
        lines.push(`\n[TestCaseMdScanner 诊断] ${filePath}`);
        lines.push(`  用例块总数: ${diag.totalBlocks}`);
        lines.push(`  含 yaml 块: ${diag.yamlBlocks} | 无 yaml 块: ${diag.noYamlBlocks}`);
        lines.push(`  yaml key 语言: 中文=${diag.detectedKeys.zh} | 英文=${diag.detectedKeys.en} | 混合=${diag.detectedKeys.mixed}`);
        lines.push(`  前置条件: ${diag.nonEmptyPreconditions} 非空 / ${diag.emptyPreconditions} 空`);
        lines.push(`  测试步骤: ${diag.nonEmptySteps} 非空 / ${diag.emptySteps} 空`);

        // 关键告警：步骤全空 → 模板 J 列将无内容
        if (diag.emptySteps === diag.totalBlocks && diag.totalBlocks > 0) {
            lines.push(`  ⚠ E102 风险: 所有 ${diag.totalBlocks} 个用例的"测试步骤"均为空！`);
            lines.push(`     → 报告中"步骤描述"列将无内容`);
            lines.push(`     → 请检查 MD 文件 yaml 块的 key 是 "测试步骤"（中文）还是 "steps"（英文）`);
        }
        if (diag.emptyPreconditions === diag.totalBlocks && diag.totalBlocks > 0) {
            lines.push(`  ⚠ 建议: 所有用例的"前置条件"为空（不会阻断，但影响报告可读性）`);
        }
        for (const l of lines) console.log(l);
    }

    _buildChapterRanges(content) {
        const lines = content.split('\n');
        const ranges = [];
        let pos = 0;
        let current = null;
        for (const line of lines) {
            if (line.startsWith('## ') && !line.startsWith('### ')) {
                if (current) {
                    current.end = pos;
                    ranges.push(current);
                }
                current = { title: line.slice(3).trim(), start: pos, end: content.length };
            }
            pos += line.length + 1;
        }
        if (current) {
            current.end = content.length;
            ranges.push(current);
        }
        return ranges;
    }

    _findChapter(chapterRanges, offset) {
        for (const r of chapterRanges) {
            if (offset >= r.start && offset < r.end) return r.title;
        }
        return chapterRanges.length > 0 ? chapterRanges[chapterRanges.length - 1].title : '未分类';
    }

    _parseCaseBlock(id, name, body, chapter, diag) {
        const yamlMatch = body.match(/```yaml\s*\n([\s\S]*?)```/);
        if (!yamlMatch) {
            if (diag) diag.noYamlBlocks++;
            return {
                id: id.trim(),
                name: name.trim(),
                priority: 'P1',
                chapter,
                preconditions: [],
                steps: [],
                expected: '',
                actual: '[待填写]',
                status: '[待填写]',
                screenshot: '[待填写]',
                consoleError: '[待填写]'
            };
        }
        if (diag) diag.yamlBlocks++;
        const yaml = yamlMatch[1];
        const data = this._parseSimpleYaml(yaml);

        // v8.0：检测 yaml key 中英文（用于诊断）
        if (diag) {
            const keys = Object.keys(data);
            const hasZh = keys.some(k => /[\u4e00-\u9fa5]/.test(k));
            const hasEn = keys.some(k => /^[A-Za-z][A-Za-z0-9_]*$/.test(k));
            if (hasZh && hasEn) diag.detectedKeys.mixed++;
            else if (hasZh) diag.detectedKeys.zh++;
            else if (hasEn) diag.detectedKeys.en++;
        }

        // === 多语言字段名兼容：英文 key（preconditions/steps）与中文 key（前置条件/测试步骤）===
        const pickList = (...keys) => {
            for (const k of keys) {
                const v = data[k];
                if (Array.isArray(v) && v.length) return v;
                if (typeof v === 'string' && v.trim()) return [v];
            }
            return [];
        };
        return {
            id: data['用例编号'] || data['id'] || id.trim(),
            name: data['用例名称'] || data['name'] || name.trim(),
            priority: data['优先级'] || data['priority'] || 'P1',
            chapter,
            preconditions: pickList('前置条件', 'preconditions', 'Preconditions'),
            steps: pickList('测试步骤', 'steps', 'Steps', '操作步骤', 'procedure'),
            expected: this._arrayToText(data['预期结果'] || data['expected']) || '',
            actual: data['实际结果'] || data['actual'] || '[待填写]',
            status: data['测试状态'] || data['status'] || '[待填写]',
            screenshot: data['截图凭证'] || data['screenshot'] || '[待填写]',
            consoleError: data['控制台错误'] || data['consoleError'] || '[待填写]'
        };
    }

    _parseSimpleYaml(yaml) {
        const result = {};
        const lines = yaml.split('\n');
        let currentKey = null;
        let currentType = null;
        for (const line of lines) {
            if (!line.trim()) continue;
            const kvMatch = line.match(/^([^:]+):\s*(.*)$/);
            if (kvMatch) {
                const key = kvMatch[1].trim();
                const value = kvMatch[2].trim();
                if (!value) {
                    currentKey = key;
                    currentType = 'list';
                    result[key] = [];
                } else {
                    currentKey = key;
                    currentType = 'scalar';
                    result[key] = value;
                }
            } else if (currentType === 'list' && currentKey) {
                const itemMatch = line.match(/^\s*-\s*(.+)$/);
                if (itemMatch) {
                    const v = itemMatch[1].trim();
                    if (Array.isArray(result[currentKey])) {
                        result[currentKey].push(v);
                    }
                }
            }
        }
        return result;
    }

    _arrayToText(val) {
        if (Array.isArray(val)) return val.join('\n');
        return val || '';
    }

    _calcPriorityStat(testcases) {
        const stat = { P0: 0, P1: 0, P2: 0, P3: 0 };
        for (const tc of testcases) {
            const p = (tc.priority || 'P1').toUpperCase();
            if (stat[p] !== undefined) stat[p]++;
            else stat.P1++;
        }
        return stat;
    }

    _calcCategoryStat(testcases) {
        const stat = {
            '正常功能测试': 0,
            '边界值测试': 0,
            '异常场景测试': 0,
            '业务规则验证': 0,
            '状态流转测试': 0,
            total: 0
        };
        for (const tc of testcases) {
            const chap = (tc.chapter || '').toLowerCase();
            const name = (tc.name || '').toLowerCase();
            const combined = chap + ' ' + name;
            if (combined.includes('边界') || combined.includes('异常') || combined.includes('边界值')) {
                stat['边界值测试']++;
            } else if (combined.includes('状态') || combined.includes('流转') || combined.includes('守卫')) {
                stat['状态流转测试']++;
            } else if (combined.includes('规则') || combined.includes('验证') || combined.includes('约束') || combined.includes('业务')) {
                stat['业务规则验证']++;
            } else {
                stat['正常功能测试']++;
            }
        }
        stat.total = testcases.length;
        return stat;
    }
}

module.exports = { TestCaseMdScanner };
