const fs = require('fs');
const path = require('path');
const { paths, BempDocError, ERROR_CODES } = require('../../config/default');

// 通用业务模块分组（不含银行特定前缀），银行个性化前缀从 profile.bankTablePrefixes 读取
const DEFAULT_BUSINESS_MODULE_GROUPS = {
    '核心业务': { prefixes: ['TB_BILL_INFO', 'TB_TRANS_INFO', 'TB_AGREEMENT', 'TB_CUSTOMER'], label: '核心业务ER关系图' },
    '票据承兑': { prefixes: ['TE_CE_', 'TE_ACPT_', 'TB_ACPT_'], label: '票据承兑ER关系图' },
    '票据贴现': { prefixes: ['TE_DI_', 'TE_DISC_', 'TB_DISC_'], label: '票据贴现ER关系图' },
    '票据交易': { prefixes: ['TE_SA_', 'TE_TRADE_', 'TE_REPO_', 'TE_CPP_', 'TE_STD_', 'TE_REDISC_', 'TE_REBUY_', 'TE_SALE_', 'TE_QUOTE_', 'TE_CLICK_', 'TE_ANONY_'], label: '票据交易ER关系图' },
    '审批流程': { prefixes: ['TB_WF_', 'TB_APPROVAL_', 'TB_FLOW_', 'TF_'], label: '审批流程ER关系图' },
    '授信管理': { prefixes: ['TE_CREDIT_', 'TB_CREDIT_', 'TB_LIMIT_', 'TM_LIMIT_', 'TM_CREDIT_'], label: '授信管理ER关系图' },
    '科目账务': { prefixes: ['TB_ACCOUNT_', 'TB_SUBJECT_', 'TB_LEDGER_', 'TB_ACCT_', 'TM_ACCT_', 'TM_SETTLE_', 'TM_FEE_', 'TM_FUND_'], label: '科目账务ER关系图' },
    '票据池化': { prefixes: ['TE_PL_', 'TE_PB_', 'TB_POOL_'], label: '票据池化ER关系图' },
    'ECDS对接': { prefixes: ['TE_ECDS_', 'TB_ECDS_', 'TB_MESSAGE_', 'TM_CPES_'], label: 'ECDS对接ER关系图' },
    '系统管理': { prefixes: ['TM_USER_', 'TM_ROLE_', 'TM_MENU_', 'TM_ORG_', 'TM_PARAM_', 'TM_DICT_', 'TM_LOG_', 'TM_BRANCH_', 'TB_USER_', 'TB_ROLE_', 'TB_MENU_', 'TB_ORG_', 'TB_PARAM_', 'TB_DICT_', 'TB_LOG_'], label: '系统管理ER关系图' },
    '客户管理': { prefixes: ['TM_CUST_', 'TM_CORP_', 'TM_LEGALPERSON_', 'TM_BANK_'], label: '客户管理ER关系图' },
    '风险管理': { prefixes: ['TM_RISK_', 'TB_RISK_', 'TB_BAN_', 'TE_BAN_'], label: '风险管理ER关系图' },
    '影像管理': { prefixes: ['TB_IMG_', 'TB_ATTACH_', 'TE_FILE_', 'TE_PRINT_', 'TE_TEMPLATE_'], label: '影像管理ER关系图' },
    '银行个性化': { prefixes: [], label: '银行个性化ER关系图' },
};

const MAX_GROUPS = 35;
const MAX_ENTITIES_PER_GROUP = 50;

class ERDiagramGenerator {
    constructor(options = {}) {
        this.outputDir = options.outputDir || paths.outputDir;
        this.maxEntitiesPerGroup = options.maxEntitiesPerGroup || MAX_ENTITIES_PER_GROUP;
        this.maxGroups = options.maxGroups || MAX_GROUPS;
        // 2026-06-03 优化：仅生成需求相关表（支持白名单/关键字匹配）
        this.relevantTableKeywords = options.relevantTableKeywords || [];
        this.relevantTableNames = options.relevantTableNames || null; // null=不过滤
        this.styleConfig = options.styleConfig || {
            diagramPadding: 20,
            layoutDirection: 'TB',
            minEntityWidth: 100,
            minEntityHeight: 75,
            entityPadding: 15,
            stroke: 'gray',
            fill: 'honeydew',
            fontSize: 12
        };
        // 从 profile 读取银行个性化表前缀，合并到模块分组
        const bankTablePrefixes = options.bankTablePrefixes || [];
        this.moduleGroups = JSON.parse(JSON.stringify(DEFAULT_BUSINESS_MODULE_GROUPS));
        if (bankTablePrefixes.length > 0) {
            this.moduleGroups['银行个性化'].prefixes = bankTablePrefixes;
        }
    }

    _isTableRelevant(tableName) {
        // 白名单模式：精准匹配
        if (Array.isArray(this.relevantTableNames) && this.relevantTableNames.length > 0) {
            return this.relevantTableNames.includes(tableName);
        }
        // 关键字模式：表名包含任意关键字
        if (Array.isArray(this.relevantTableKeywords) && this.relevantTableKeywords.length > 0) {
            const upper = tableName.toUpperCase();
            return this.relevantTableKeywords.some(kw => upper.includes(kw.toUpperCase()));
        }
        return true; // 无过滤条件时全部保留
    }

    generateFromSchema(dbSchema) {
        this._cleanOldErFiles();

        const allTables = dbSchema.tables || [];
        // 2026-06-03 优化：先按需求相关表过滤
        const tables = allTables.filter(t => this._isTableRelevant(t));
        const skipped = allTables.length - tables.length;
        if (skipped > 0) {
            console.log(`  需求过滤ER表: ${allTables.length} → ${tables.length} (排除${skipped}个非相关表)`);
        }
        const tableColumns = dbSchema.tableColumns || {};
        const primaryKeys = dbSchema.primaryKeys || {};
        const foreignKeys = dbSchema.foreignKeys || [];

        const grouped = this._groupTablesByModule(tables);
        const results = [];

        let groupIndex = 1;
        let overflowTables = [];
        for (const [groupName, groupTables] of Object.entries(grouped)) {
            if (groupTables.length === 0) continue;
            if (groupIndex > this.maxGroups) {
                overflowTables.push(...groupTables);
                continue;
            }

            const enrichedTables = groupTables.map(t => ({
                name: t,
                columns: tableColumns[t] || [],
                primaryKey: primaryKeys[t] || [],
            }));

            const groupForeignKeys = foreignKeys.filter(fk =>
                groupTables.includes(fk.fkTable) || groupTables.includes(fk.pkTable)
            );

            const mermaidCode = this._buildMermaidER(enrichedTables, groupForeignKeys);
            let label = this.moduleGroups[groupName]?.label;
            if (!label) {
                const baseGroup = Object.entries(this.moduleGroups).find(([k]) => groupName.startsWith(k + '_'));
                const baseLabel = baseGroup ? baseGroup[1].label.replace('ER关系图', '') : '';
                const subPart = groupName.includes('_') ? groupName.split('_').slice(1).join('_') : groupName;
                label = baseLabel ? `${baseLabel}${subPart}ER关系图` : `${groupName}ER关系图`;
            }

            const fileName = `ER_${String(groupIndex).padStart(2, '0')}_${label}`;
            const mmdPath = path.join(this.outputDir, `${fileName}.mmd`);
            fs.writeFileSync(mmdPath, mermaidCode, 'utf-8');

            const htmlContent = this._buildHtmlViewer(label, mermaidCode);
            const htmlPath = path.join(this.outputDir, `${fileName}.html`);
            fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

            results.push({
                groupName,
                label,
                tableCount: groupTables.length,
                tables: groupTables,
                mermaidCode,
                mmdPath,
                htmlPath,
                fileUrl: `file:///${htmlPath.replace(/\\/g, '/')}`,
            });

            groupIndex++;
        }

        if (overflowTables.length > 0) {
            const lastResult = results[results.length - 1];
            if (lastResult) {
                const allTables = [...lastResult.tables, ...overflowTables];
                const enrichedTables = allTables.map(t => ({
                    name: t,
                    columns: tableColumns[t] || [],
                    primaryKey: primaryKeys[t] || [],
                }));
                const groupForeignKeys = foreignKeys.filter(fk =>
                    allTables.includes(fk.fkTable) || allTables.includes(fk.pkTable)
                );
                lastResult.mermaidCode = this._buildMermaidER(enrichedTables, groupForeignKeys);
                lastResult.tableCount = allTables.length;
                lastResult.tables = allTables;

                fs.writeFileSync(lastResult.mmdPath, lastResult.mermaidCode, 'utf-8');
                const htmlContent = this._buildHtmlViewer(lastResult.label + '(含溢出)', lastResult.mermaidCode);
                fs.writeFileSync(lastResult.htmlPath, htmlContent, 'utf-8');

                console.warn(`  ⚠ ER分组达上限${this.maxGroups}，${overflowTables.length}个表合并至末组"${lastResult.label}"`);
            }
        }

        return results;
    }

    _cleanOldErFiles() {
        if (!fs.existsSync(this.outputDir)) return;
        // 2026-06-03 优化：保留 hash 缓存（ER_XX_*.png#hash 形式），仅清理旧ER PNG
        const oldFiles = fs.readdirSync(this.outputDir).filter(f =>
            f.startsWith('ER_') && !f.includes('#') &&
            (f.endsWith('.png') || f.endsWith('.mmd') || f.endsWith('.html') || f.endsWith('.meta'))
        );
        for (const f of oldFiles) {
            try { fs.unlinkSync(path.join(this.outputDir, f)); } catch (e) {}
        }
        if (oldFiles.length > 0) {
            console.log(`  清理旧ER文件: ${oldFiles.length}个 (保留hash缓存以加速重复生成)`);
        }
    }

    // 2026-06-03 优化：ER图缓存检测 - mermaidCode hash 命中时跳过渲染
    _computeHash(content) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
    }

    _tryReadCachedPng(mmdPath, mermaidCode) {
        const hash = this._computeHash(mermaidCode);
        const cacheKey = path.basename(mmdPath, '.mmd') + '#' + hash;
        const cachedPng = path.join(this.outputDir, cacheKey + '.png');
        const cacheMeta = path.join(this.outputDir, cacheKey + '.meta');
        if (fs.existsSync(cachedPng) && fs.statSync(cachedPng).size > 1024) {
            // 复制为正式文件名
            const finalPng = mmdPath.replace('.mmd', '.png');
            try {
                fs.copyFileSync(cachedPng, finalPng);
                return finalPng;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    _saveToCache(mmdPath, mermaidCode, pngPath) {
        try {
            const hash = this._computeHash(mermaidCode);
            const cacheKey = path.basename(mmdPath, '.mmd') + '#' + hash;
            const cachedPng = path.join(this.outputDir, cacheKey + '.png');
            fs.copyFileSync(pngPath, cachedPng);
        } catch (e) {}
    }

    _tryReadAllCachedPngs() {
        // 检查 outputDir 中是否有任何 *#hash.png 的缓存文件
        if (!fs.existsSync(this.outputDir)) return false;
        const cachedFiles = fs.readdirSync(this.outputDir).filter(f => /^ER_\d+_.*#.*\.png$/.test(f));
        return cachedFiles.length > 0;
    }

    _clearCacheForGroup(label) {
        // 清理指定 group 的旧缓存（不清理当前ER_XX_*.png，只清理#hash变体）
        if (!fs.existsSync(this.outputDir)) return;
        const files = fs.readdirSync(this.outputDir).filter(f => f.startsWith(`ER_`) && f.includes('#') && f.includes(label));
        for (const f of files) {
            try { fs.unlinkSync(path.join(this.outputDir, f)); } catch (e) {}
        }
    }

    _groupTablesByModule(tables) {
        const grouped = {};
        for (const groupName of Object.keys(this.moduleGroups)) {
            grouped[groupName] = [];
        }
        grouped['其他'] = [];

        for (const tableName of tables) {
            let matched = false;
            for (const [groupName, config] of Object.entries(this.moduleGroups)) {
                for (const prefix of config.prefixes) {
                    if (tableName.toUpperCase().startsWith(prefix.toUpperCase()) ||
                        tableName.toUpperCase().includes(prefix.toUpperCase())) {
                        grouped[groupName].push(tableName);
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
            if (!matched) {
                grouped['其他'].push(tableName);
            }
        }

        const result = {};
        for (const [groupName, groupTables] of Object.entries(grouped)) {
            if (groupTables.length === 0) continue;
            if (groupTables.length > this.maxEntitiesPerGroup) {
                this._splitBySubPrefix(result, groupName, groupTables);
            } else {
                result[groupName] = groupTables;
            }
        }
        return result;
    }

    _splitBySubPrefix(result, groupName, tables) {
        const subGroups = {};
        for (const tableName of tables) {
            const subPrefix = this._extractSubPrefix(tableName);
            if (!subGroups[subPrefix]) {
                subGroups[subPrefix] = [];
            }
            subGroups[subPrefix].push(tableName);
        }

        const sortedSubs = Object.entries(subGroups).sort((a, b) => b[1].length - a[1].length);
        let currentGroup = null;
        let currentTables = [];

        for (const [subPrefix, subTables] of sortedSubs) {
            if (subTables.length > this.maxEntitiesPerGroup) {
                if (currentGroup && currentTables.length > 0) {
                    result[currentGroup] = currentTables;
                    currentGroup = null;
                    currentTables = [];
                }
                let batchIdx = 1;
                for (let i = 0; i < subTables.length; i += this.maxEntitiesPerGroup) {
                    const batch = subTables.slice(i, i + this.maxEntitiesPerGroup);
                    const baseLabel = groupName === '其他'
                        ? `${subPrefix}相关`
                        : `${groupName}_${subPrefix}`;
                    const batchLabel = subTables.length > this.maxEntitiesPerGroup
                        ? `${baseLabel}_${batchIdx}`
                        : baseLabel;
                    result[batchLabel] = batch;
                    batchIdx++;
                }
                continue;
            }

            if (!currentGroup || currentTables.length + subTables.length > this.maxEntitiesPerGroup) {
                if (currentGroup && currentTables.length > 0) {
                    result[currentGroup] = currentTables;
                }
                const label = groupName === '其他'
                    ? `${subPrefix}相关`
                    : `${groupName}_${subPrefix}`;
                currentGroup = label;
                currentTables = [...subTables];
            } else {
                currentTables.push(...subTables);
            }
        }
        if (currentGroup && currentTables.length > 0) {
            result[currentGroup] = currentTables;
        }
    }

    _extractSubPrefix(tableName) {
        const upper = tableName.toUpperCase();
        const match = upper.match(/^([A-Z]+)_([A-Z]+(?:_[A-Z]+)?)_/);
        if (match) {
            return match[2].substring(0, Math.min(match[2].length, 10));
        }
        if (upper.length > 3) {
            return upper.substring(0, 3);
        }
        return 'MISC';
    }

    _buildMermaidER(tables, foreignKeys) {
        const lines = ['erDiagram'];

        for (const table of tables) {
            lines.push(`    ${table.name} {`);
            for (const col of table.columns) {
                const pk = table.primaryKey.includes(col.name) ? ' PK' : '';
                const typeStr = col.dataType ? ` ${col.dataType}` : '';
                const comment = col.comment ? ` "${col.comment}"` : '';
                lines.push(`        ${col.dataType ? col.dataType.toLowerCase() : 'varchar'} ${col.name}${pk}${comment}`);
            }
            lines.push('    }');
        }

        for (const fk of foreignKeys) {
            const tableA = fk.pkTable;
            const tableB = fk.fkTable;
            const fkCol = fk.fkColumn || 'ID';
            if (tables.some(t => t.name === tableA) && tables.some(t => t.name === tableB)) {
                lines.push(`    ${tableA} ||--o{ ${tableB} : "1对多 ${fkCol}"`);
            }
        }

        if (foreignKeys.length === 0 && tables.length > 1) {
            const inferredRelations = this._inferRelationships(tables);
            for (const rel of inferredRelations) {
                lines.push(`    ${rel.tableA} ||--o{ ${rel.tableB} : "${rel.label}"`);
            }
        }

        return lines.join('\n') + '\n';
    }

    _inferRelationships(tables) {
        const relations = [];
        const idFields = new Map();

        for (const table of tables) {
            for (const col of table.columns) {
                const colNameUpper = col.name.toUpperCase();
                if (colNameUpper.endsWith('_ID') && colNameUpper !== 'ID') {
                    if (!idFields.has(colNameUpper)) {
                        idFields.set(colNameUpper, []);
                    }
                    idFields.get(colNameUpper).push(table.name);
                }
            }
        }

        for (const [idField, refTables] of idFields) {
            if (refTables.length < 2) continue;
            const baseTableName = idField.replace('_ID', '');
            const matchingTables = tables.filter(t =>
                t.name.toUpperCase().endsWith('_' + baseTableName) ||
                t.name.toUpperCase() === baseTableName
            );
            if (matchingTables.length > 0) {
                for (const refTable of refTables) {
                    if (matchingTables.some(mt => mt.name === refTable)) continue;
                    relations.push({
                        tableA: matchingTables[0].name,
                        tableB: refTable,
                        label: `推断 1对多 ${idField}`,
                    });
                }
            }
        }

        return relations;
    }

    _buildHtmlViewer(title, mermaidCode) {
        const styleConfig = this.styleConfig;
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            er: {
                diagramPadding: ${styleConfig.diagramPadding},
                layoutDirection: '${styleConfig.layoutDirection}',
                minEntityWidth: ${styleConfig.minEntityWidth},
                minEntityHeight: ${styleConfig.minEntityHeight},
                entityPadding: ${styleConfig.entityPadding},
                stroke: '${styleConfig.stroke}',
                fill: '${styleConfig.fill}',
                fontSize: ${styleConfig.fontSize}
            }
        });
    </script>
    <style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; background: #f5f5f5; }
        .er-container { margin: 20px auto; max-width: 1400px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #333; margin-bottom: 20px; }
        .mermaid { display: flex; justify-content: center; overflow-x: auto; }
        .info-bar { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="er-container">
        <h2>${title}</h2>
        <pre class="mermaid">
${mermaidCode}
        </pre>
        <div class="info-bar">
            生成时间: ${new Date().toLocaleString('zh-CN')} | 样式: ${styleConfig.layoutDirection} | 字号: ${styleConfig.fontSize}px
        </div>
    </div>
</body>
</html>`;
    }

    generateDocxInsertMarkers(erResults) {
        const markers = [];
        for (const result of erResults) {
            markers.push({
                sectionName: '数据库设计',
                markerType: 'er-diagram',
                title: result.label,
                description: `包含${result.tableCount}个数据表的关系图`,
                mermaidCode: result.mermaidCode,
                htmlPath: result.htmlPath,
                groupName: result.groupName,
            });
        }
        return markers;
    }
}

module.exports = { ERDiagramGenerator, DEFAULT_BUSINESS_MODULE_GROUPS };