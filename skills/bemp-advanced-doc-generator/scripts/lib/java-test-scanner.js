const fs = require('fs');
const path = require('path');
const { BempDocError, ERROR_CODES } = require('../../config/default');

class JavaTestScanner {
    constructor(options = {}) {
        this.options = {
            maxDepth: 15,
            /**
             * 类名过滤关键词列表 —— 仅保留 className 包含任一关键词的测试类
             * 来源：config/banks/{bank}.json 的 testSource.testFilters[moduleName]
             * 或 CLI --test-filter 参数
             */
            classFilters: options.classFilters || null,
            ...options
        };
        this.testMethodPattern = /@Test\b[\s\S]*?(?:public|protected|private)?\s+void\s+(\w+)\s*\(/g;
        this.classPattern = /(?:public|private|protected)?\s+class\s+(\w+)/g;
    }

    /**
     * 扫描测试代码目录
     * @param {string} testSourceDir 测试代码根目录
     * @param {Object} [filterOptions] 过滤选项（覆盖构造时的 classFilters）
     * @param {string[]} [filterOptions.classFilters] 类名关键词过滤列表
     * @returns {Object} 扫描结果
     */
    scan(testSourceDir, filterOptions) {
        if (!testSourceDir) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, '--test-source 目录不能为空');
        }
        const resolvedDir = path.isAbsolute(testSourceDir)
            ? testSourceDir
            : path.resolve(process.cwd(), testSourceDir);
        if (!fs.existsSync(resolvedDir)) {
            throw new BempDocError(ERROR_CODES.INVALID_PARAMS, `测试代码目录不存在: ${resolvedDir}`);
        }

        // 过滤器优先级：filterOptions.classFilters > 构造时 classFilters
        const effectiveFilters = (filterOptions && filterOptions.classFilters)
            || this.options.classFilters
            || null;

        const javaFiles = this._collectJavaFiles(resolvedDir);
        const testMethods = [];
        let filteredOut = 0;

        for (const javaFile of javaFiles) {
            const content = fs.readFileSync(javaFile, 'utf-8');
            const className = this._extractClassName(content) || path.basename(javaFile, '.java');

            // 类名过滤：如果配置了 classFilters，仅保留 className 包含任一关键词的类
            if (effectiveFilters && effectiveFilters.length > 0) {
                const matchesFilter = effectiveFilters.some(filter =>
                    className.includes(filter)
                );
                if (!matchesFilter) {
                    filteredOut++;
                    continue;
                }
            }

            const methods = this._extractTestMethods(content);
            for (const methodName of methods) {
                testMethods.push({
                    className,
                    methodName,
                    filePath: javaFile,
                    relPath: path.relative(resolvedDir, javaFile).replace(/\\/g, '/')
                });
            }
        }

        testMethods.sort((a, b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className);
            return a.methodName.localeCompare(b.methodName);
        });

        const result = {
            testSourceDir: resolvedDir,
            fileCount: javaFiles.length,
            testMethodCount: testMethods.length,
            testMethods,
            groupByClass: this._groupByClass(testMethods)
        };

        // 过滤统计信息
        if (effectiveFilters && filteredOut > 0) {
            result.filterInfo = {
                applied: true,
                filters: effectiveFilters,
                totalFiles: javaFiles.length,
                matchedFiles: javaFiles.length - filteredOut,
                filteredOutFiles: filteredOut
            };
        }

        return result;
    }

    _collectJavaFiles(rootDir) {
        const result = [];
        const stack = [{ dir: rootDir, depth: 0 }];
        while (stack.length) {
            const { dir, depth } = stack.pop();
            if (depth > this.options.maxDepth) continue;
            let entries = [];
            try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
                    stack.push({ dir: fullPath, depth: depth + 1 });
                } else if (entry.isFile() && entry.name.endsWith('.java')) {
                    result.push(fullPath);
                }
            }
        }
        return result;
    }

    _extractClassName(content) {
        const match = this.classPattern.exec(content);
        this.classPattern.lastIndex = 0;
        return match ? match[1] : null;
    }

    _extractTestMethods(content) {
        const methods = [];
        this.testMethodPattern.lastIndex = 0;
        let m;
        while ((m = this.testMethodPattern.exec(content)) !== null) {
            methods.push(m[1]);
        }
        return methods;
    }

    _groupByClass(testMethods) {
        const groups = {};
        for (const tm of testMethods) {
            if (!groups[tm.className]) groups[tm.className] = [];
            groups[tm.className].push(tm);
        }
        return groups;
    }
}

module.exports = { JavaTestScanner };
