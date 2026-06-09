'use strict';

const fs = require('fs');
const path = require('path');

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const BANKS_DIR = path.join(SKILL_ROOT, 'config', 'banks');

/**
 * BankConfigLoader —— 银行级配置加载器
 *
 * 职责：
 *   1. 根据 bankCode 加载 config/banks/{bankCode}.json
 *   2. 提供封面占位替换、模板路径、测试源路径、字体等配置
 *   3. 支持用户参数覆盖银行默认值
 *   4. 零硬编码：所有银行特定参数从配置文件读取
 *
 * 使用方式：
 *   const loader = new BankConfigLoader('<银行代码>');
 *   const config = loader.load();
 *   config.coverPlaceholders  // { "XXX信息系统": "项目名称", ... }
 *   config.getDesignTemplate()  // 绝对路径
 *   config.getTestSource('<需求模块名>')  // 精确测试目录
 *   config.getTestFilter('<需求模块名>')  // 类名过滤列表
 */
class BankConfigLoader {
    /**
     * @param {string} bankCode 银行代码（如 '<银行代码>'）
     */
    constructor(bankCode) {
        this.bankCode = bankCode;
        this._config = null;
    }

    /**
     * 加载银行配置
     * @returns {BankConfig} 银行配置对象
     * @throws {Error} 银行配置文件不存在时抛出
     */
    load() {
        if (this._config) return this._config;

        const configPath = path.join(BANKS_DIR, `${this.bankCode}.json`);
        if (!fs.existsSync(configPath)) {
            throw new Error(`银行配置文件不存在: ${configPath}。可用银行: ${this.listAvailableBanks().join(', ')}`);
        }

        const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this._config = new BankConfig(raw, this.bankCode);
        return this._config;
    }

    /**
     * 列出所有可用的银行配置
     * @returns {string[]} 银行代码列表
     */
    listAvailableBanks() {
        if (!fs.existsSync(BANKS_DIR)) return [];
        return fs.readdirSync(BANKS_DIR)
            .filter(f => f.endsWith('.json') && !f.startsWith('_'))
            .map(f => f.replace('.json', ''));
    }

    /**
     * 检查银行配置是否存在
     * @param {string} bankCode
     * @returns {boolean}
     */
    static exists(bankCode) {
        return fs.existsSync(path.join(BANKS_DIR, `${bankCode}.json`));
    }
}

/**
 * BankConfig —— 银行配置封装类
 *
 * 提供类型安全的配置访问方法，所有路径解析为绝对路径
 */
class BankConfig {
    constructor(raw, bankCode) {
        this.raw = raw;
        this.bankCode = bankCode;
        this.bankName = raw.bankName || bankCode;
        this.projectName = raw.projectName || '';
        this.coverPlaceholders = raw.coverPlaceholders || {};
        this.font = raw.font || { name: '宋体', size: 10.5 };
        this.contentDefaults = raw.contentDefaults || {};
        this.qualityGate = raw.qualityGate || {};
        this.testSource = raw.testSource || {};
        this.templates = raw.templates || {};
    }

    /**
     * 获取封面占位替换字符串（CLI --cover-placeholders 格式）
     * @returns {string} 如 "XXX信息系统=<项目名>;XXX=<银行名>;2018=2026"
     */
    getCoverPlaceholdersString() {
        return Object.entries(this.coverPlaceholders)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}=${v}`)
            .join(';');
    }

    /**
     * 获取设计文档模板绝对路径
     * @returns {string|null}
     */
    getDesignTemplate() {
        return this._resolveTemplatePath(this.templates.design);
    }

    /**
     * 获取概要设计模板绝对路径
     * @returns {string|null}
     */
    getOutlineDesignTemplate() {
        return this._resolveTemplatePath(this.templates.outlineDesign);
    }

    /**
     * 获取单元测试报告模板绝对路径
     * @returns {string|null}
     */
    getUnitTestReportTemplate() {
        return this._resolveTemplatePath(this.templates.unitTestReport);
    }

    /**
     * 获取指定需求的精确测试代码目录
     * @param {string} moduleName 需求模块名
     * @returns {string|null} 绝对路径，未配置时返回 null
     */
    getTestSource(moduleName) {
        const paths = this.testSource.unitTestPaths || {};
        const relPath = paths[moduleName];
        if (!relPath) return null;
        return this._resolveProjectPath(relPath);
    }

    /**
     * 获取测试源基础目录
     * @returns {string|null}
     */
    getTestSourceBase() {
        if (!this.testSource.baseDir) return null;
        return this._resolveProjectPath(this.testSource.baseDir);
    }

    /**
     * 获取指定需求的测试类名过滤列表
     * @param {string} moduleName 需求模块名
     * @returns {string[]} 类名关键词列表
     */
    getTestFilter(moduleName) {
        const filters = this.testSource.testFilters || {};
        return filters[moduleName] || [];
    }

    /**
     * 合并用户参数与银行默认值（用户参数优先）
     * @param {Object} userParams 用户传入的参数
     * @returns {Object} 合并后的参数
     */
    mergeWithDefaults(userParams) {
        return {
            project: userParams.project || this.contentDefaults.project,
            component: userParams.component || this.contentDefaults.component,
            tester: userParams.tester || this.contentDefaults.tester,
            designer: userParams.designer || this.contentDefaults.designer,
            cycle: userParams.cycle || this.contentDefaults.cycle,
            ...userParams
        };
    }

    // === 内部方法 ===

    _resolveTemplatePath(relPath) {
        if (!relPath) return null;
        if (path.isAbsolute(relPath)) return relPath;
        // 相对于项目根目录解析
        return this._resolveProjectPath(relPath);
    }

    _resolveProjectPath(relPath) {
        const projectRoot = path.resolve(SKILL_ROOT, '..', '..', '..');
        return path.resolve(projectRoot, relPath);
    }
}

module.exports = { BankConfigLoader, BankConfig, BANKS_DIR };
