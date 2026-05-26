# bemp-chrome-devtools-test 反向构建提示词

## 核心功能
基于Chrome DevTools MCP实现BEMP票据系统浏览器端自动化功能验证，适用于二轮测试验证、缺陷复现确认、状态流转端到端验证。与bemp-webapp-testing(Playwright一轮测试)互补，本技能专注二轮验证/缺陷确认/探索性测试。

## 关键实现逻辑
- 按需加载指引：根据任务类型选择性读取references文件，非全量加载
- 8大设计原则：先截图后断言、fill_form不可信(HUI组件统一evaluate_script+dispatchEvent)、弹窗=阻塞、双向验证、快照优于选择器、networkidle=完成、菜单点击优先URL(Vue懒加载)、选择后等500ms
- 异常决策树：弹窗残留→强制移除→重试；登录态丢失→new_page重新登录；网络超时→延长等待→BLOCKED；Vue路由未注册→菜单点击
- 统一输出目录：`aotutests-devtools/`（项目根目录），含index.json索引管理

## 输入输出参数
- 输入：config/bemptest-config.json(环境/账号/超时/选择器)、待验证功能模块
- 输出：验证报告(`reports/{日期}/`)、截图(`screenshots/{日期}/{任务ID}/`)、控制台日志(`console-logs/{日期}/`)
- 判定标准：PASS=预期结果+无致命JS错误；FAIL=不符预期或致命错误；BLOCKED=前置不满足

## 主要业务流程
1. 环境预检：确认后端(8010)/前端(8091)/Redis/ZK可达
2. 登录系统：evaluate_script+dispatchEvent填表，禁止fill_form，处理强制登录弹窗
3. 导航到目标页面：方式A直接URL(已注册路由)、方式B菜单点击(Vue懒加载必须)
4. 执行功能操作：查询/下拉选择/弹窗CRUD/状态变更/控制台检查
5. 生成验证报告+归档截图+导出控制台日志+更新索引

## 技术特性
- Chrome DevTools MCP工具：navigate_page/take_snapshot/take_screenshot/evaluate_script/list_console_messages
- 重试上限：同一操作最多2次，连续3次失败→BLOCKED
- 截图命名：step{序号}_{操作}_{状态}.png
- 索引管理：manage-index.ps1维护index.json元数据
