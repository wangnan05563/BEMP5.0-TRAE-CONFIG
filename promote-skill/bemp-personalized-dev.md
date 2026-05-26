# bemp-personalized-dev 反向构建提示词

## 核心功能
BEMP票据系统个性化开发技能，在指定目录下进行增量功能开发与修改，严格遵循项目编码规范与目录结构。覆盖前端/后端/数据库/Adapter四领域开发，含代码模板、增量SQL脚本生成、HUI组件文档查询、注释项检查、安全调用检查。

## 关键实现逻辑
- 银行配置变量：{BANK_CODE}(目录/包名)、{BANK_CLASS_PREFIX}(类名前缀)、{BANK_NAME}(中文名称)，切换银行仅修改变量
- 占位符三类：{VARIABLE}配置变量运行时替换、[占位名]代码占位符开发者填充、${VARIABLE} SQL模板变量
- 开发指南体系：frontend-guide.md(前端)、backend-guide.md(后端)、database-guide.md(数据库)、adapter-guide.md(Adapter)
- 代码模板：assets/templates/下Controller.java/Service.java/Dto.java + SQL模板(menu-dml/param-dml/table-ddl/flow-dml/pend-item-dml/configcenter.json)
- HUI组件文档：强制通过hui_doc MCP查询组件属性/方法/事件/插槽，禁止凭记忆使用

## 输入输出参数
- 输入：用户需求描述、银行配置变量、开发指南文档
- 输出：后端Java文件(banks/ext-{BANK_CODE}/)、前端Vue文件(frontend/src/views/bizViews/banks/{BANK_CODE}/)、增量SQL脚本(deploy/bemp-script/.../banks/{BANK_NAME}/)、配置中心增量文件

## 主要业务流程
1. 需求分析：理解功能目标→确认个性化范围→识别可复用代码→明确国际化范围
2. 规范检查：检查已有个性化类(@CustomizedBean)/Vue文件/同类功能实现
3. 参考分析：查看产品化代码实现→参考已有个性化案例→注意UI风格一致
4. 开发实施：后端(banks/ext-{BANK_CODE})→前端(banks/{BANK_CODE})→数据库(增量SQL)→Adapter(如需)
5. 增量SQL生成：先删除后新增策略→按类型拆分DDL/DML→命名规范V{版本}_{日期}_{任务号}_{描述}
6. 注释项检查+安全调用检查

## 技术特性
- 后端：Controller继承BaseController不加@CustomizedBean；Service extends产品实现类加@CustomizedBean
- 前端：个性化目录banks/{BANK_CODE}，{BANK_CODE}Index.js维护路径映射，requestDto格式传参
- 国际化：按钮标签$t()，placeholder提示硬编码，zh-CN.js+en-US.js同步
- 增量SQL：幂等可重复执行(先删后增)，按菜单/参数/表结构/流程/待办拆分文件
