const fs = require('fs');
const path = require('path');

class ProjectScanner {
    constructor(projectRoot, options = {}) {
        this.projectRoot = projectRoot;
        this.options = options;
        this.result = {
            projectName: '',
            projectVersion: '',
            projectDescription: '',
            modules: [],
            techStack: [],
            dbTechStack: [],
            interfaces: [],
            components: [],
            externalDeps: [],
            subsystems: [],
            frontendModules: [],
            dbInfo: [],
            dbSchema: {
                tables: [],
                tableColumns: {},
                primaryKeys: {},
                foreignKeys: [],
            },
        };
    }

    scan() {
        this._scanProjectName();
        this._scanMavenModules();
        this._scanBackendInterfaces();
        this._scanFrontendModules();
        this._scanTechStack();
        this._scanSubsystems();
        this._scanExternalDeps();
        this._scanDbInfo();
        this._scanGeneratorXml();
        return this.result;
    }

    _scanProjectName() {
        const rootPom = path.join(this.projectRoot, 'pom.xml');
        if (fs.existsSync(rootPom)) {
            try {
                const content = fs.readFileSync(rootPom, 'utf-8');
                const nameMatch = content.match(/<name>([^<]+)<\/name>/);
                const artifactMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
                const versionMatch = content.match(/<version>([^<]+)<\/version>/);
                const descMatch = content.match(/<description>([^<]+)<\/description>/);
                this.result.projectName = nameMatch ? nameMatch[1] : (artifactMatch ? artifactMatch[1] : path.basename(this.projectRoot));
                if (versionMatch) this.result.projectVersion = versionMatch[1];
                if (descMatch) this.result.projectDescription = descMatch[1];
            } catch (e) {
                this.result.projectName = path.basename(this.projectRoot);
            }
        } else {
            this.result.projectName = path.basename(this.projectRoot);
        }
    }

    _scanMavenModules() {
        const moduleDirs = ['served', 'framework', 'adapter', 'banks', 'deploy'];
        for (const dir of moduleDirs) {
            const dirPath = path.join(this.projectRoot, dir);
            if (!fs.existsSync(dirPath)) continue;
            const pomPath = path.join(dirPath, 'pom.xml');
            if (fs.existsSync(pomPath)) {
                try {
                    const content = fs.readFileSync(pomPath, 'utf-8');
                    const moduleMatches = content.matchAll(/<module>([^<]+)<\/module>/g);
                    for (const m of moduleMatches) {
                        const subPom = path.join(dirPath, m[1], 'pom.xml');
                        let description = '';
                        if (fs.existsSync(subPom)) {
                            try {
                                const subContent = fs.readFileSync(subPom, 'utf-8');
                                const descMatch = subContent.match(/<description>([^<]+)<\/description>/);
                                if (descMatch) description = descMatch[1];
                            } catch (e) {}
                        }
                        this.result.modules.push({
                            group: dir,
                            name: m[1],
                            path: `${dir}/${m[1]}`,
                            description,
                        });
                    }
                } catch (e) {}
            }
        }
    }

    _scanBackendInterfaces() {
        const bankDir = this._findBankDir();
        if (!bankDir) return;
        const javaFiles = this._findFiles(bankDir, '.java');
        for (const file of javaFiles) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const relPath = path.relative(this.projectRoot, file).replace(/\\/g, '/');
                const controllerMatch = content.match(/@(RestController|Controller)\s*(?:\([^)]*\))?\s*\n\s*(?:@(?:RequestMapping|PostMapping|GetMapping)\s*\([^)]*\)\s*\n\s*)*(?:public\s+)?class\s+(\w+)/);
                if (!controllerMatch) continue;
                const controllerName = controllerMatch[2];
                const baseUrlMatch = content.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
                const baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';
                const methodMatches = content.matchAll(/@(PostMapping|GetMapping|PutMapping|DeleteMapping|RequestMapping)\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/gi);
                for (const mm of methodMatches) {
                    this.result.interfaces.push({
                        controller: controllerName,
                        method: mm[1].replace('Mapping', ''),
                        path: baseUrl + mm[2],
                        source: relPath,
                    });
                }
            } catch (e) {}
        }
    }

    _scanFrontendModules() {
        const frontendDir = path.join(this.projectRoot, 'frontend');
        if (!fs.existsSync(frontendDir)) return;
        const routerFile = path.join(frontendDir, 'src', 'router', 'index.js');
        if (fs.existsSync(routerFile)) {
            try {
                const content = fs.readFileSync(routerFile, 'utf-8');
                const routeMatches = content.matchAll(/path\s*:\s*['"]([^'"]+)['"][\s\S]*?name\s*:\s*['"]([^'"]+)['"]/g);
                for (const m of routeMatches) {
                    this.result.frontendModules.push({
                        path: m[1],
                        name: m[2],
                    });
                }
            } catch (e) {}
        }
        const storeDir = path.join(frontendDir, 'src', 'store', 'bank');
        if (fs.existsSync(storeDir)) {
            try {
                const files = fs.readdirSync(storeDir).filter(f => f.endsWith('.js'));
                for (const f of files) {
                    this.result.frontendModules.push({
                        path: `store/bank/${f}`,
                        name: f.replace('.js', ''),
                    });
                }
            } catch (e) {}
        }
    }

    _scanTechStack() {
        const beTechStack = [];
        const feTechStack = [];
        const dbTechStack = [];

        const pomFiles = this._findFiles(path.join(this.projectRoot, 'framework'), '.xml')
            .filter(f => f.endsWith('pom.xml'));
        pomFiles.push(path.join(this.projectRoot, 'pom.xml'));
        const beTechMap = {
            'spring-boot': 'Spring Boot',
            'spring-cloud': 'Spring Cloud',
            'spring-mvc': 'Spring MVC',
            'mybatis': 'MyBatis',
            'mybatis-plus': 'MyBatis-Plus',
            'dubbo': 'Apache Dubbo',
            'zookeeper': 'ZooKeeper',
            'redis': 'Redis',
            'jedis': 'Jedis',
            'shiro': 'Apache Shiro',
            'spring-security': 'Spring Security',
            'thymeleaf': 'Thymeleaf',
            'freemarker': 'FreeMarker',
            'jackson': 'Jackson',
            'fastjson': 'FastJSON',
            'poi': 'Apache POI',
            'easyexcel': 'EasyExcel',
            'lombok': 'Lombok',
            'slf4j': 'SLF4J',
            'logback': 'Logback',
            'log4j': 'Log4j',
            'junit': 'JUnit',
            'mockito': 'Mockito',
            'activiti': 'Activiti',
            'flowable': 'Flowable',
            'quartz': 'Quartz',
            'xxl-job': 'XXL-JOB',
            'rocketmq': 'RocketMQ',
            'kafka': 'Kafka',
            'rabbitmq': 'RabbitMQ',
            'nacos': 'Nacos',
            'sentinel': 'Sentinel',
            'feign': 'OpenFeign',
            'hystrix': 'Hystrix',
            'swagger': 'Swagger',
            'knife4j': 'Knife4j',
            'hutool': 'Hutool',
            'guava': 'Guava',
        };
        for (const pomFile of pomFiles) {
            try {
                const content = fs.readFileSync(pomFile, 'utf-8');
                for (const [keyword, name] of Object.entries(beTechMap)) {
                    if (content.toLowerCase().includes(keyword) && !beTechStack.includes(name)) {
                        beTechStack.push(name);
                    }
                }
                const dbCheck = content.toLowerCase();
                if (dbCheck.includes('oracle') && !dbTechStack.includes('Oracle')) dbTechStack.push('Oracle');
                if (dbCheck.includes('mysql') && !dbTechStack.includes('MySQL')) dbTechStack.push('MySQL');
                if (dbCheck.includes('mybatis') && !dbTechStack.includes('MyBatis')) dbTechStack.push('MyBatis');
            } catch (e) {}
        }

        const frontendPkg = path.join(this.projectRoot, 'frontend', 'package.json');
        if (fs.existsSync(frontendPkg)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(frontendPkg, 'utf-8'));
                const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
                const feTechMap = {
                    'vue': 'Vue.js',
                    'vue-router': 'Vue Router',
                    'vuex': 'Vuex',
                    'element-ui': 'Element UI',
                    'view-design': 'View Design',
                    'ant-design-vue': 'Ant Design Vue',
                    'axios': 'Axios',
                    'webpack': 'Webpack',
                    'vite': 'Vite',
                    'babel': 'Babel',
                    'eslint': 'ESLint',
                    'sass': 'Sass/SCSS',
                    'less': 'Less',
                    'echarts': 'ECharts',
                    'lodash': 'Lodash',
                    'moment': 'Moment.js',
                    'dayjs': 'Day.js',
                    'xlsx': 'SheetJS',
                    'jszip': 'JSZip',
                    'file-saver': 'FileSaver',
                };
                for (const [keyword, name] of Object.entries(feTechMap)) {
                    for (const dep of Object.keys(deps)) {
                        if (dep.toLowerCase().includes(keyword)) {
                            if (!feTechStack.includes(name)) feTechStack.push(name);
                            break;
                        }
                    }
                }
            } catch (e) {}
        }

        this.result.techStack = [...beTechStack, ...feTechStack];
        this.result.dbTechStack = dbTechStack;
    }

    _scanSubsystems() {
        const servedDir = path.join(this.projectRoot, 'served');
        if (!fs.existsSync(servedDir)) return;
        try {
            const subDirs = fs.readdirSync(servedDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);
            const subsystemMap = this.options.subsystemMap || {};
            for (const dir of subDirs) {
                const asDir = path.join(servedDir, dir);
                const asSubDirs = fs.readdirSync(asDir, { withFileTypes: true })
                    .filter(d => d.isDirectory())
                    .map(d => d.name);
                const apiModules = asSubDirs.filter(d => d.endsWith('-api'));
                const asModules = asSubDirs.filter(d => d.endsWith('-as'));
                this.result.subsystems.push({
                    code: dir,
                    name: subsystemMap[dir] || dir,
                    apiModules: apiModules.map(m => m.replace('-api', '')),
                    asModules: asModules.map(m => m.replace('-as', '')),
                });
            }
        } catch (e) {}
    }

    _scanExternalDeps() {
        const adapterDir = path.join(this.projectRoot, 'adapter');
        if (!fs.existsSync(adapterDir)) return;
        try {
            const subDirs = fs.readdirSync(adapterDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);
            for (const dir of subDirs) {
                if (dir === 'api' || dir === 'client-api') continue;
                this.result.externalDeps.push({
                    name: dir,
                    type: dir.includes('adapter') ? '适配器' : '外部系统',
                });
            }
        } catch (e) {}
    }

    _scanDbInfo() {
        const deployBase = this.options.deployBase || path.join(this.projectRoot, 'deploy', 'bemp-script', 'src', 'main', 'resources');
        if (!fs.existsSync(deployBase)) {
            this.result.dbSchema.tables = this.result.dbInfo.map(d => d.tableName);
            return;
        }
        const versionDirs = fs.readdirSync(deployBase, { withFileTypes: true })
            .filter(d => d.isDirectory() && d.name.match(/^v\d+\./))
            .map(d => path.join(deployBase, d.name));

        const initSqlFiles = [];
        for (const vDir of versionDirs) {
            const oracleDir = path.join(vDir, 'all', 'oracle');
            if (!fs.existsSync(oracleDir)) continue;
            try {
                const files = fs.readdirSync(oracleDir)
                    .filter(f => f.endsWith('.sql') && f.includes('init') && !f.includes('初始化'))
                    .map(f => ({ name: f, path: path.join(oracleDir, f), mtime: fs.statSync(path.join(oracleDir, f)).mtime }))
                    .sort((a, b) => b.mtime - a.mtime);
                if (files.length > 0) initSqlFiles.push(files[0].path);
            } catch (e) {}
        }

        for (const f of initSqlFiles) {
            try {
                const stat = fs.statSync(f);
                if (stat.size > 50 * 1024 * 1024) continue;
                const content = fs.readFileSync(f, 'utf-8');
                const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(\w+)/gi);
                for (const m of tableMatches) {
                    if (!this.result.dbInfo.some(d => d.tableName === m[1])) {
                        this.result.dbInfo.push({
                            tableName: m[1],
                            source: path.relative(this.projectRoot, f).replace(/\\/g, '/'),
                        });
                    }
                }
                const columnMatches = content.matchAll(/^\s*(\w+)\s+(VARCHAR2|NUMBER|DATE|CLOB|CHAR|INTEGER|TIMESTAMP|VARCHAR)\s*(\([^)]*\))?/gim);
                for (const cm of columnMatches) {
                    const tableName = this._extractTableName(content, cm.index);
                    if (tableName && !this.result.dbSchema.tableColumns[tableName]) {
                        this.result.dbSchema.tableColumns[tableName] = [];
                    }
                    if (tableName) {
                        this.result.dbSchema.tableColumns[tableName].push({
                            name: cm[1],
                            dataType: cm[2],
                            nullable: true,
                        });
                    }
                }
                const pkMatches = content.matchAll(/CONSTRAINT\s+(\w+)\s+PRIMARY\s+KEY\s*\(([^)]+)\)/gi);
                for (const pm of pkMatches) {
                    const tableName = this._extractTableName(content, pm.index);
                    if (tableName) {
                        const pkCols = pm[2].split(',').map(c => c.trim().replace(/"/g, ''));
                        this.result.dbSchema.primaryKeys[tableName] = pkCols;
                    }
                }
                const fkMatches = content.matchAll(/CONSTRAINT\s+(\w+)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\w+)\s*\(([^)]+)\)/gi);
                for (const fm of fkMatches) {
                    const fkTable = this._extractTableName(content, fm.index);
                    if (fkTable) {
                        this.result.dbSchema.foreignKeys.push({
                            constraintName: fm[1],
                            fkTable: fkTable,
                            fkColumn: fm[2].trim().replace(/"/g, ''),
                            pkTable: fm[3],
                            pkColumn: fm[4].trim().replace(/"/g, ''),
                        });
                    }
                }
            } catch (e) {}
        }
        this.result.dbSchema.tables = this.result.dbInfo.map(d => d.tableName);
    }

    _scanGeneratorXml() {
        const codegenDirs = ['codegen', 'codeGen'];
        const searchRoots = ['served', 'banks', 'adapter'];
        const xmlFiles = [];

        for (const root of searchRoots) {
            const rootPath = path.join(this.projectRoot, root);
            if (!fs.existsSync(rootPath)) continue;
            try {
                const subDirs = fs.readdirSync(rootPath, { withFileTypes: true })
                    .filter(d => d.isDirectory()).map(d => d.name);
                for (const sub of subDirs) {
                    const subPath = path.join(rootPath, sub);
                    let asDirs = [];
                    try {
                        asDirs = fs.readdirSync(subPath, { withFileTypes: true })
                            .filter(d => d.isDirectory()).map(d => d.name);
                    } catch (e) { continue; }
                    for (const asDir of asDirs) {
                        for (const cg of codegenDirs) {
                            const cgPath = path.join(subPath, asDir, 'src', 'test', 'resources', cg, 'generator.xml');
                            if (fs.existsSync(cgPath)) xmlFiles.push(cgPath);
                        }
                    }
                }
            } catch (e) {}
        }

        for (const f of xmlFiles) {
            try {
                const content = fs.readFileSync(f, 'utf-8');
                const tableMatches = content.matchAll(/tableName="(\w+)"/g);
                for (const m of tableMatches) {
                    const tableName = m[1];
                    if (!this.result.dbInfo.some(d => d.tableName === tableName)) {
                        this.result.dbInfo.push({
                            tableName,
                            source: `generator:${path.relative(this.projectRoot, f).replace(/\\/g, '/')}`,
                        });
                    }
                    if (!this.result.dbSchema.tables.includes(tableName)) {
                        this.result.dbSchema.tables.push(tableName);
                    }
                    if (!this.result.dbSchema.tableColumns[tableName]) {
                        this.result.dbSchema.tableColumns[tableName] = [];
                    }
                    const domainMatch = content.match(new RegExp(`tableName="${tableName}"[\\s\\S]*?domainObjectName="(\\w+)"`));
                    if (domainMatch) {
                        if (!this.result.dbSchema.tableColumns[tableName].length) {
                            this.result.dbSchema.tableColumns[tableName].push({
                                name: 'id',
                                dataType: 'GENERATED',
                                nullable: false,
                                _domainObject: domainMatch[1],
                            });
                        }
                    }
                }
            } catch (e) {}
        }
    }

    _extractTableName(content, index) {
        const before = content.substring(0, index);
        const createMatch = before.match(/CREATE\s+TABLE\s+(\w+)/gi);
        if (!createMatch) return null;
        const lastMatch = createMatch[createMatch.length - 1];
        const nameMatch = lastMatch.match(/CREATE\s+TABLE\s+(\w+)/i);
        return nameMatch ? nameMatch[1] : null;
    }

    loadOracleSchema(schemaData) {
        if (!schemaData) return;
        if (schemaData.tables) {
            this.result.dbSchema.tables = [...new Set([...this.result.dbSchema.tables, ...schemaData.tables])];
        }
        if (schemaData.tableColumns) {
            Object.assign(this.result.dbSchema.tableColumns, schemaData.tableColumns);
        }
        if (schemaData.primaryKeys) {
            Object.assign(this.result.dbSchema.primaryKeys, schemaData.primaryKeys);
        }
        if (schemaData.foreignKeys) {
            const existingFkKeys = new Set(this.result.dbSchema.foreignKeys.map(fk => `${fk.fkTable}.${fk.fkColumn}`));
            for (const fk of schemaData.foreignKeys) {
                if (!existingFkKeys.has(`${fk.fkTable}.${fk.fkColumn}`)) {
                    this.result.dbSchema.foreignKeys.push(fk);
                }
            }
        }
        const schemaTables = this.result.dbSchema.tables;
        for (const t of schemaTables) {
            if (!this.result.dbInfo.some(d => d.tableName === t)) {
                this.result.dbInfo.push({ tableName: t, source: 'oracle-mcp' });
            }
        }
    }

    _findBankDir() {
        const banksDir = path.join(this.projectRoot, 'banks');
        if (!fs.existsSync(banksDir)) return null;
        try {
            const dirs = fs.readdirSync(banksDir, { withFileTypes: true })
                .filter(d => d.isDirectory() && d.name.startsWith('ext-'));
            const envConfigPath = path.join(this.projectRoot, '.trae', 'skills', '_shared', 'env-config.json');
            let preferredBank = null;
            if (fs.existsSync(envConfigPath)) {
                try {
                    const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf-8'));
                    preferredBank = envConfig.bank && envConfig.bank.projectDir;
                } catch (e) {}
            }
            if (preferredBank) {
                const preferredPath = path.join(banksDir, preferredBank);
                if (fs.existsSync(preferredPath)) return preferredPath;
            }
            for (const d of dirs) {
                const srcDir = path.join(banksDir, d.name);
                const subDirs = fs.readdirSync(srcDir, { withFileTypes: true })
                    .filter(sd => sd.isDirectory());
                for (const sd of subDirs) {
                    if (sd.name.endsWith('-as') || sd.name.endsWith('-api')) {
                        if (fs.existsSync(path.join(srcDir, sd.name, 'src'))) return srcDir;
                    }
                }
            }
            return dirs.length > 0 ? path.join(banksDir, dirs[0].name) : null;
        } catch (e) { return null; }
    }

    _findFiles(dir, ext, maxDepth = 20, depth = 0) {
        if (depth > maxDepth) return [];
        const results = [];
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'target' && entry.name !== 'del.properties' && entry.name !== 'increment-backup' && entry.name !== 'banks') {
                    results.push(...this._findFiles(fullPath, ext, maxDepth, depth + 1));
                } else if (entry.isFile() && entry.name.endsWith(ext)) {
                    results.push(fullPath);
                }
            }
        } catch (e) {}
        return results;
    }
}

module.exports = { ProjectScanner };
