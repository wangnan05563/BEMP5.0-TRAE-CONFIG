# BEMP 项目规则

## 版本约束
- 【强制】Java 1.8 语法编码
- 【强制】后端框架版本参考 `bom/import-bom/pom.xml`
- 【强制】前端框架版本参考 `frontend/package.json`
- 【强制】新增字段名称优先使用已定义的 Dto 类中的字段名称

## 个性化开发规则
- 【强制】后端代码在 `banks/ext-hnnxbank` 目录下，使用 `@CustomizedBean` 注解
- 【强制】前端代码在以下个性化目录下开发：
  - 页面文件：`frontend/src/views/bizViews/banks/hnnxbank`
  - 组件文件：`frontend/src/components/bank/hnnxbank`
  - 资源文件：`frontend/src/assets/hnnxbank`
  - 工具文件：`frontend/src/utils/banks/hnnxbank`
  - 静态资源：`frontend/static/bank/hnnxbank`
- 【目录匹配规则】所有包含 `/banks/hnnxbank` 或 `/bank/hnnxbank` 路径的目录均为个性化开发目录
- 【强制】个性化类命名：HnnxBank + 原类名，继承原有类
- 【强制】Controller 与 Service 交互必须使用 BaseRequest 作请求参数类
- 【强制】国际化资源在 `frontend/src/views/bizViews/banks/hnnxbank/locale/lang/zh-CN.js` 中维护，并检查生效
- 【强制】前端路径映射在 `frontend/src/api/bank/hnnxbankIndex.js` 中维护，并检查生效
- 【强制】编码后执行代码审查（后端 bemp-backend-code-review / 前端 bemp-frontend-code-review）
- 【强制】编码后 Maven 打包确保编译通过
- 【推荐】使用 bemp-personalized-developer 智能体完成功能开发
- 【强制】前端开发涉及 H-UI 组件使用时，必须先调用 `hui_doc` MCP 查询组件详细文档，包括属性、方法、事件、使用示例及最佳实践，禁止凭记忆或猜测使用组件 API

## 数据库脚本开发目录
- 【强制】增量SQL脚本存放于 `deploy/bemp-script/src/main/resources/banks/{BANK_NAME}/` 目录下
- 【强制】配置中心增量文件存放于 `deploy/bemp-home/src/main/resources/configcenter/banks/{BANK_NAME}/` 目录下
- 【配置】`BANK_NAME` 默认值为"河南农信"，可根据部署环境动态调整
- 【强制】SQL脚本命名遵循 `V{产品版本号}_{日期时间}_{任务编号}_{中文描述}.{脚本类型}.sql` 格式
- 【强制】增量SQL脚本必须采用"先删除后新增"策略，确保幂等可重复执行
- 【强制】DDL与DML脚本分文件管理，不同功能模块（菜单/参数/流程）分文件管理
- 【强制】脚本生成后按检查清单逐项验证（详见 database-guide.md 第六章节）