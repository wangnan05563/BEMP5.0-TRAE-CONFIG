# DEPRECATED — 历史遗留目录（2026-06-02 标记）

## 状态
本目录为**早期版本**残留代码，**已不再被维护**，根目录的 `cli.js` / `lib/` / `config/` 为当前维护版本。

## 目录结构（2026-06-02 已物理迁移）
- `_legacy/` — 早期版本归档（cli.js、lib/*.js、config/default.js、孤儿 .py/.js/.json/txt）
- `*.py`（除 convert_docx/convert_docx_v2/debug_dedup/document_validator/verify_output 外）— 仍被 `../cli.js` 调用的有效脚本
- `test-*.js` — 当前回归测试集（2026-06-02 新增）
- `DEPRECATED.md` — 本说明

## 内容说明
- `_legacy/` 目录下包含：早期 `cli.js` / `lib/*.js` / `config/default.js`（已无人引用）、孤儿 `.py`（convert_docx.py / convert_docx_v2.py / debug_dedup.py / document_validator.py / verify_output.py）、孤儿 `.js`（test-antv-api.js / test-antv-download.js / test-diagram-service.js / package.json / package-lock.json / antv-test-result.txt）
- `*.py` 顶层目录（5 个）：早期 `cli.js` / `lib/*.js` / `config/default.js` 已被迁移到 `_legacy/`（2026-06-02）

## 有效文件清单（勿删）
以下 Python 脚本仍被 `../cli.js` 通过 `path.join(__dirname, 'scripts', '<name>.py')` 引用：

| 文件 | 调用位置 | 用途 |
|------|---------|------|
| `diagram-generator.py` | `cli.js` step 4 matplotlib 降级 | 网络/架构/部署图降级生成 |
| `document-validator.py` | `cli.js` step 7 文档校验 | 输出 docx 格式/必填节校验 |
| `outline-design-generator.py` | `cli.js` step 5 | 概要设计 docx 生成 |
| `er-diagram-renderer.py` | `cli.js` step 3 | ER 图 PNG 渲染 |
| `doc_utils.py` | 多个 .py 引用 | docx 通用工具（颜色判断/超链接识别） |

`document_validator.py`（注意下划线）是 `document-validator.py`（连字符）的旧版重复，已迁移到 `_legacy/`，勿复用。

## 后续清理计划
- [x] 2026-06-02 完成：将 `lib/*.js` 和 `config/default.js` 全部移入 `scripts/_legacy/`
- [x] 2026-06-02 完成：迁移孤儿 .py/.js/.json/txt 到 `_legacy/`
- [ ] 计划 #TBD：把有效的 `.py` 迁出 scripts/ 到 `python/`（可大幅缩短 cli.js 中的 path.join 路径）
- [ ] 计划 #TBD：彻底删除 `_legacy/` 目录（建议先 Git tag 备份）

## 不要引用本目录的任何 .js 文件
如需在测试或工具中引用根目录 `lib/`，请用 `require('../lib/<name>')` 形式。
