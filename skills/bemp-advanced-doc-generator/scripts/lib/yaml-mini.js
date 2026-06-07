/**
 * yaml-mini.js - 极简 YAML 解析器（零依赖，v7.1 新增）
 *
 * 仅支持 doc_rules.yaml 中用到的 YAML 子集：
 *   - key: value          （value 字符串/数字/布尔/null）
 *   - key:                （嵌套开始）
 *       child: value
 *   - - item1
 *     - item2             （列表）
 *   - key: { k: v }       （行内对象）
 *
 * 不支持：多文档、注释、引用、复杂类型。
 *
 * 优点：零依赖、离线可用、性能优于第三方库的小型配置文件
 */

function parseMiniYaml(text) {
    if (!text || typeof text !== 'string') return {};
    const lines = text.split(/\r?\n/);
    const root = {};
    const stack = [{ indent: -1, obj: root, isList: false }];

    const isListItem = (s) => /^\s*-\s+/.test(s);
    const getIndent = (s) => s.match(/^(\s*)/)[1].length;

    for (let raw of lines) {
        // 去除 # 注释（仅在 # 前有空白时）
        let line = raw.replace(/\s+#.*$/, '');
        // 跳过空行
        if (!line.trim()) continue;
        const indent = getIndent(line);
        const trimmed = line.trim();

        // 弹出栈
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }
        const top = stack[stack.length - 1];

        if (isListItem(trimmed)) {
            // 列表项
            const itemContent = trimmed.replace(/^-\s+/, '');
            const newItem = {};
            if (itemContent.includes(':')) {
                const idx = itemContent.indexOf(':');
                const k = itemContent.slice(0, idx).trim();
                const v = itemContent.slice(idx + 1).trim();
                if (v) {
                    newItem[k] = _parseValue(v);
                } else {
                    newItem[k] = {};
                    stack.push({ indent: indent + 2, obj: newItem[k], isList: false });
                }
            }
            if (!Array.isArray(top.obj)) {
                // 父级是 list-like dict 需特殊处理
                // 实际上：list 项应通过父级 - xxx 创建
            }
            // 找到父级是 list
            // 退栈到上一个 isList
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].isList) {
                    stack[i].obj.push(newItem);
                    stack.push({ indent: indent + 2, obj: newItem, isList: false });
                    break;
                }
            }
        } else if (trimmed.includes(':')) {
            const idx = trimmed.indexOf(':');
            const key = trimmed.slice(0, idx).trim();
            const valueStr = trimmed.slice(idx + 1).trim();

            if (valueStr === '') {
                // 嵌套对象 / 列表
                // 先看下一行是不是 - 列表
                const nextLine = _peekNextNonEmpty(lines, lines.indexOf(raw) + 1);
                if (nextLine && isListItem(nextLine.line)) {
                    top.obj[key] = [];
                    stack.push({ indent: nextLine.indent, obj: top.obj[key], isList: true });
                } else {
                    top.obj[key] = {};
                    stack.push({ indent: indent + 2, obj: top.obj[key], isList: false });
                }
            } else {
                top.obj[key] = _parseValue(valueStr);
            }
        }
    }
    return root;
}

function _peekNextNonEmpty(lines, startIdx) {
    for (let i = startIdx; i < lines.length; i++) {
        const l = lines[i].replace(/\s+#.*$/, '').trim();
        if (l) {
            return { line: lines[i], indent: getIndent(lines[i]) };
        }
    }
    return null;
}

function _parseValue(v) {
    if (v === '~' || v === 'null' || v === '') return null;
    if (v === 'true') return true;
    if (v === 'false') return false;
    // 数字
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    // 字符串：去除首尾引号
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
    }
    return v;
}

module.exports = { parseMiniYaml };
