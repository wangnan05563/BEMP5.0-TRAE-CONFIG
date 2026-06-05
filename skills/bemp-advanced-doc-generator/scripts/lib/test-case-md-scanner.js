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

        const blockPattern = /###\s+(TC-[A-Z0-9_-]+)\s+([^\n]+)\n([\s\S]*?)(?=\n###\s+TC-|\n##\s+|\n#\s+|\Z)/g;
        let m;
        while ((m = blockPattern.exec(content)) !== null) {
            const matchStart = m.index;
            const chapter = this._findChapter(chapterRanges, matchStart);
            const tc = this._parseCaseBlock(m[1], m[2], m[3], chapter);
            if (tc) {
                testcases.push(tc);
                if (!groupByChapter[chapter]) groupByChapter[chapter] = [];
                groupByChapter[chapter].push(tc);
            }
        }

        testcases.sort((a, b) => a.id.localeCompare(b.id));

        const priorityStat = this._calcPriorityStat(testcases);
        const categoryStat = this._calcCategoryStat(testcases);

        return {
            testCasesPath: resolved,
            fileCount: 1,
            testCaseCount: testcases.length,
            testcases,
            groupByChapter,
            chapterCount: chapterRanges.length,
            priorityStat,
            categoryStat
        };
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

    _parseCaseBlock(id, name, body, chapter) {
        const yamlMatch = body.match(/```yaml\s*\n([\s\S]*?)```/);
        if (!yamlMatch) {
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
        const yaml = yamlMatch[1];
        const data = this._parseSimpleYaml(yaml);
        return {
            id: data['用例编号'] || id.trim(),
            name: data['用例名称'] || name.trim(),
            priority: data['优先级'] || 'P1',
            chapter,
            preconditions: data['前置条件'] || [],
            steps: data['测试步骤'] || [],
            expected: this._arrayToText(data['预期结果']) || '',
            actual: data['实际结果'] || '[待填写]',
            status: data['测试状态'] || '[待填写]',
            screenshot: data['截图凭证'] || '[待填写]',
            consoleError: data['控制台错误'] || '[待填写]'
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
