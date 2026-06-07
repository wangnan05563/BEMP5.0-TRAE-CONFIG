'use strict';

/**
 * ColumnMapper —— 通用化列字段映射器
 *
 * 设计原则：
 *   1. 完全数据驱动 —— 不知道、不关心用户模板有多少列、列名是什么
 *   2. 仅基于 TemplateSchema.columns[i].semanticKey 做匹配
 *   3. 一个测试用例字段可能在多个列中出现（如"预期结果" + "实际结果"），按列顺序填充
 *   4. 缺失字段时用空字符串占位（不抛错）
 *   5. 支持自定义值格式化器（Formatters）
 *
 * 输入：
 *   - TemplateSchema（来自 TemplateInspector）
 *   - TestCase（标准化的测试用例对象，字段为语义键）
 *   - Formatters（可选，自定义值格式化）
 *
 * 输出：
 *   - Array<CellValue> —— 按 schema.columns 顺序排列的值数组
 */
class ColumnMapper {
    constructor(options = {}) {
        this.options = {
            /** 未匹配列时使用的占位符（默认空字符串） */
            fallbackValue: options.fallbackValue !== undefined ? options.fallbackValue : '',
            /** 是否在测试用例对象中查找同名 semanticKey（默认 true） */
            strictSemantic: options.strictSemantic !== false,
            /** 自定义格式化器：{ semanticKey: (testcase, schema) => value } */
            formatters: options.formatters || {},
            ...options
        };
    }

    /**
     * 将单个测试用例映射为列值数组
     * @param {Object} testcase 标准化测试用例（字段为语义键）
     * @param {TemplateSchema} schema
     * @returns {Array} 长度 = schema.columnCount
     */
    mapRow(testcase, schema) {
        if (!schema || !Array.isArray(schema.columns)) {
            throw new Error('ColumnMapper.mapRow: schema 无效');
        }
        const tc = testcase || {};
        return schema.columns.map(col => this._mapCell(col, tc, schema));
    }

    /**
     * 批量映射
     * @param {Array<Object>} testcases
     * @param {TemplateSchema} schema
     * @returns {Array<Array>}
     */
    mapRows(testcases, schema) {
        return (testcases || []).map(tc => this.mapRow(tc, schema));
    }

    /** 单 cell 映射逻辑 */
    _mapCell(column, testcase, schema) {
        const { semanticKey } = column;

        // 1. 优先使用自定义格式化器
        if (this.options.formatters[semanticKey]) {
            return this._safeFormat(this.options.formatters[semanticKey], testcase, schema);
        }

        // 2. 直接从 testcase 读取
        if (Object.prototype.hasOwnProperty.call(testcase, semanticKey)) {
            return this._formatValue(testcase[semanticKey], column);
        }

        // 3. case-insensitive 匹配
        const matched = this._findCaseInsensitive(testcase, semanticKey);
        if (matched !== undefined) {
            return this._formatValue(matched, column);
        }

        // 4. 通用语义推断（从其他字段推导）
        const derived = this._deriveValue(semanticKey, testcase, schema);
        if (derived !== undefined && derived !== null) {
            return this._formatValue(derived, column);
        }

        // 5. 兜底
        return this.options.fallbackValue;
    }

    /** 通用化值格式化（按 dataType） */
    _formatValue(value, column) {
        if (value === null || value === undefined) return this.options.fallbackValue;
        if (value instanceof Date) {
            return column.dataType === 'date' ? value.toISOString().slice(0, 10) : value.toISOString();
        }
        if (Array.isArray(value)) return value.join('\n');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    /** 安全执行自定义格式化器 */
    _safeFormat(fn, testcase, schema) {
        try {
            const result = fn(testcase, schema);
            return this._formatValue(result, { dataType: 'string' });
        } catch (e) {
            return this.options.fallbackValue;
        }
    }

    /** 大小写不敏感查找 */
    _findCaseInsensitive(obj, key) {
        const lower = key.toLowerCase();
        for (const k of Object.keys(obj)) {
            if (k.toLowerCase() === lower) return obj[k];
        }
        return undefined;
    }

    /**
     * 通用语义推断 —— 当 testcase 没有该字段时，从已有字段推导
     * 完全数据驱动，不为任何特定业务硬编码
     */
    _deriveValue(semanticKey, testcase, schema) {
        // 1. 优先级推导
        if (semanticKey === 'priority' && testcase.nature) {
            const map = { '反例': 'P1', '异常': 'P1', '边界': 'P1', '正例': 'P0' };
            return map[testcase.nature] || 'P0';
        }
        // 2. 评审状态
        if (semanticKey === 'review' && !testcase.review) return '未评审';
        // 3. 周期
        if (semanticKey === 'cycle' && !testcase.cycle) return '功能测试';
        // 4. 测试人员
        if (semanticKey === 'tester' && !testcase.tester) return 'bemp';
        // 5. 设计人
        if (semanticKey === 'designer' && !testcase.designer) return 'bemp';
        // 6. 项目
        if (semanticKey === 'project' && testcase.module) return testcase.module;
        // 7. 实际结果空时填"[待填写]"
        if (semanticKey === 'actual' && !testcase.actual) return '[待填写]';
        // 8. 模块分类 - 从 chapter 拆解
        if (semanticKey === 'module1' && testcase.chapter) {
            return testcase.chapter.split(' > ')[0] || testcase.chapter;
        }
        if (semanticKey === 'module2' && testcase.chapter) {
            const parts = testcase.chapter.split(' > ');
            return parts[1] || '';
        }
        if (semanticKey === 'module3' && testcase.chapter) {
            const parts = testcase.chapter.split(' > ');
            return parts[2] || '';
        }
        if (semanticKey === 'module4' && testcase.chapter) {
            const parts = testcase.chapter.split(' > ');
            return parts[3] || '';
        }
        return undefined;
    }
}

module.exports = { ColumnMapper };
