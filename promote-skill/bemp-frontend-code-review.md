# bemp-frontend-code-review 反向构建提示词

## 核心功能
审查BEMP工程各银行个性化前端代码是否符合项目规范，16项审查规则：目录结构、个性化文件、国际化、API调用、组件使用、代码质量、模板、UI组件、路由、状态管理、异步处理、样式、性能、安全性、多语言同步、路由权限。支持配置切换不同银行，自动化脚本一键扫描+人工逐项审查双模式。

## 关键实现逻辑
- 自动化扫描：`scripts/check-all.js` 一键运行3个检测脚本
  - `check-hardcode.js`：硬编码中文检测
  - `check-routes.js`：路由注册完整性
  - `check-i18n.js`：国际化覆盖率(zh-CN.js与en-US.js键值一致性)
- 银行切换：`scripts/review-config.json`的bankName(永久)或`--bank=xxx`(临时)，支持12家银行
- 审查4阶段：第零阶段自动化扫描→第一阶段前置检查→第二阶段规范检查→第三阶段质量检查→第四阶段输出报告
- 报告四级分类：🔴阻塞(必须修复)/🟠严重(强烈建议)/🟡警告(建议)/🟢提示(可选)

## 输入输出参数
- 输入：银行配置(review-config.json)、待审查前端文件
- 输出：审查报告(report-template.md)，按严重程度分类+改进建议

## 主要业务流程
1. 运行check-all.js自动化扫描，修复所有阻塞级问题
2. 前置检查：文件在{bankName}目录、路由映射注册正确
3. 规范检查：国际化($t())/API路径一致/参数格式匹配(extParam禁用)/UI风格一致
4. 质量检查：中文注释/异步错误处理/try-catch/scoped样式/v-for有key/无v-html渲染用户输入
5. 输出分级报告

## 技术特性
- 国际化规则：按钮/标签/弹窗标题用$t()；placeholder/提示信息/确认对话框内容硬编码
- API参数三种场景：①DTO直接传对象 ②BaseRequest用requestDto包装 ③@RequestBody改Content-Type
- 样式强制：`<style scoped>`防污染，复用frame.scss/views.scss，禁止!important(除非覆盖第三方)
- 性能：大列表(>100)用分页，v-for绑唯一:key禁用index，大弹窗动态导入
