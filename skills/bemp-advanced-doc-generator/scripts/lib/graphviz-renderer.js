/**
 * Graphviz 渲染器
 *
 * 调用 dot.exe 渲染 DOT 源码为 PNG
 * 多引擎备选策略：
 * 1. 优先：系统 PATH 中的 dot 命令
 * 2. 次选：C:\Program Files\Graphviz\bin\dot.exe（Windows 常见安装路径）
 * 3. 兜底：Python graphviz 包
 * 4. 终极兜底：返回失败并提示用户安装
 *
 * 输出：与 DOT 同名的 .png 文件
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

class GraphvizRenderer {
    constructor(options = {}) {
        this.outputDir = options.outputDir || path.join(process.cwd(), 'output', 'diagrams', 'uml');
        this.timeout = options.timeout || 30000;
        this.fallbackToPython = options.fallbackToPython !== false;
        this.dotPath = options.dotPath || this._findDotExecutable();

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * 智能查找 dot 可执行文件
     * 查找顺序：1.传入路径 → 2.PATH → 3.常见 Windows 路径 → 4.包管理器路径
     */
    _findDotExecutable() {
        const candidates = [
            process.env.GRAPHVIZ_DOT,
            'C:\\Program Files\\Graphviz\\bin\\dot.exe',
            'C:\\Program Files (x86)\\Graphviz\\bin\\dot.exe',
            'C:\\ProgramData\\chocolatey\\bin\\dot.exe',
            '/usr/local/bin/dot',
            '/usr/bin/dot',
            '/opt/homebrew/bin/dot',
            'dot',
        ].filter(Boolean);

        for (const candidate of candidates) {
            try {
                execFileSync(candidate, ['-V'], { stdio: 'pipe', encoding: 'utf-8', timeout: 5000 });
                return candidate;
            } catch (e) {
                // 继续尝试下一个
            }
        }
        return null;
    }

    /**
     * 渲染单个 DOT 文件为 PNG
     * @param {string} dotFile - DOT 源文件路径
     * @param {string} outName - 输出 PNG 文件名（可选，默认同 basename）
     * @returns {Promise<{success, filePath?, size?, source, errorMessage?}>}
     */
    async renderDotToPng(dotFile, outName) {
        if (!fs.existsSync(dotFile)) {
            return { success: false, errorMessage: `DOT文件不存在: ${dotFile}` };
        }
        const baseName = path.basename(dotFile, '.dot');
        const pngName = outName || `${baseName}.png`;
        const pngPath = path.join(this.outputDir, pngName);

        // 1. 优先用 dot.exe
        if (this.dotPath) {
            try {
                const stat = this._renderWithDot(this.dotPath, dotFile, pngPath);
                if (stat) {
                    return { success: true, filePath: pngPath, size: stat.size, source: `dot(${path.basename(this.dotPath)})` };
                }
            } catch (e) {
                // 失败则降级
                this._lastError = e.message;
            }
        }

        // 2. 兜底：Python graphviz 包
        if (this.fallbackToPython) {
            const pyResult = await this._renderWithPython(dotFile, pngPath);
            if (pyResult.success) return pyResult;
        }

        return {
            success: false,
            errorMessage: this.dotPath
                ? `dot渲染失败（${this._lastError || '未知错误'}），Python 兜底也失败`
                : 'Graphviz dot 未安装，请从 https://graphviz.org/download/ 下载并安装',
        };
    }

    /**
     * 用 dot.exe 渲染
     */
    _renderWithDot(dotExe, dotFile, pngPath) {
        try {
            execFileSync(dotExe, [
                '-Tpng',
                `-Gdpi=110`,
                dotFile,
                '-o',
                pngPath,
            ], { encoding: 'utf-8', timeout: this.timeout, stdio: 'pipe' });
            if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 1024) {
                return fs.statSync(pngPath);
            }
            return null;
        } catch (e) {
            this._lastError = e.message || String(e);
            return null;
        }
    }

    /**
     * 用 Python graphviz 兜底
     */
    async _renderWithPython(dotFile, pngPath) {
        const script = `
import sys
from graphviz import Source
try:
    with open(r'${dotFile.replace(/\\/g, '\\\\')}', 'r', encoding='utf-8') as f:
        src = f.read()
    s = Source(src, format='png')
    out = s.render(filename=r'${pngPath.replace(/\\/g, '\\\\').replace(/\.png$/, '')}', cleanup=True)
    print('OK')
except Exception as e:
    print('ERR:' + str(e))
    sys.exit(1)
`;
        const scriptPath = path.join(this.outputDir, '_render_tmp.py');
        fs.writeFileSync(scriptPath, script, 'utf-8');
        try {
            const out = execFileSync('python', [scriptPath], { encoding: 'utf-8', timeout: this.timeout, stdio: 'pipe' });
            if (out.includes('OK') && fs.existsSync(pngPath) && fs.statSync(pngPath).size > 1024) {
                return { success: true, filePath: pngPath, size: fs.statSync(pngPath).size, source: 'python-graphviz' };
            }
            return { success: false, errorMessage: 'Python graphviz 渲染失败' };
        } catch (e) {
            return { success: false, errorMessage: `Python graphviz 兜底失败: ${e.message || e}` };
        } finally {
            try { fs.unlinkSync(scriptPath); } catch (_) {}
        }
    }

    /**
     * 批量渲染多个 DOT 文件
     * @param {string[]} dotFiles
     * @returns {Promise<Array<{file, png?, success, errorMessage?}>>}
     */
    async renderBatch(dotFiles) {
        const results = [];
        for (const f of dotFiles) {
            const r = await this.renderDotToPng(f);
            results.push({ file: f, ...r });
        }
        return results;
    }

    /**
     * 健康检查：返回渲染器状态
     */
    healthCheck() {
        return {
            dotPath: this.dotPath,
            dotAvailable: !!this.dotPath,
            pythonAvailable: this._checkPythonGraphviz(),
            outputDir: this.outputDir,
        };
    }

    _checkPythonGraphviz() {
        try {
            execFileSync('python', ['-c', 'import graphviz; print("OK")'], { stdio: 'pipe', timeout: 5000 });
            return true;
        } catch (_) {
            return false;
        }
    }

    getOutputDir() {
        return this.outputDir;
    }
}

module.exports = { GraphvizRenderer };
