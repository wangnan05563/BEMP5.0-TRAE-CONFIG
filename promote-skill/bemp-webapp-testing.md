# bemp-webapp-testing 反向构建提示词

## 核心功能
基于Playwright实现BEMP票据系统Web端自动化测试，覆盖服务健康检查、登录态管理、页面功能验证、个性化路径校验、控制台错误检测、组件交互测试。通过配置驱动支持多银行环境无缝切换。是BEMP测试流程中"用例执行"环节的唯一执行技能，接收bemp-testcase-generator编写的测试用例并执行验证。

## 关键实现逻辑
- Python脚本驱动Playwright：run_test.py(通用运行器)、test_accept_bank_credit.py(承兑行额度E2E)、login_manager.py(会话复用storage_state持久化)、health_check.py(服务健康+配置校验)、common.py(选择器解析/截图/日志)
- 多银行配置：config/test_config.json的active_bank决定默认银行，--bank参数覆盖，新增银行只需在banks节点添加配置
- 会话管理：LoginManager自动处理登录，storage_state持久化复用，state_max_age=1800s
- 代码预检：前端代码必检项(@on-click/@views/Col:)，多银行时确认glob匹配active_bank
- 输出统一：项目根目录aotutests-playwright/(报告/截图/会话/日志)

## 输入输出参数
- 输入：config/test_config.json(银行/服务/选择器/会话/错误过滤)、test-data/test-accounts.json(测试账号)、--test指定测试模块、--bank切换银行、--role切换角色
- 输出：报告(aotutests-playwright/reports/{bank_id}/YYYY-MM/)、截图(screenshots/)、会话(session_states/)、日志(logs/)
- 判定：PASS(功能正常无致命JS错误)/FAIL(不符预期或致命错误)/BLOCKED(服务不可达/登录失败/数据缺失)

## 主要业务流程
1. 代码预检：前端必检项+glob匹配当前active_bank
2. 环境预检：health_check.py确认后端(8010)/前端(8091)/Redis/ZK
3. 测试数据：Oracle MCP查询/补充
4. 登录：LoginManager自动处理(storage_state复用)
5. 导航：Vue懒加载路由须菜单点击注册
6. 测试执行：弹窗交互/DataGrid查询/控制台错误检测
7. 报告生成：Markdown格式+Token消耗统计

## 技术特性
- sync_playwright()同步脚本，完成后关闭浏览器
- BEMP Chrome模式密码字段可能为tempPassword，登录按钮可能含空格"登 录"
- 弹窗操作：先截图后断言，关闭弹窗前不导航
- 错误过滤：critical(TypeError/ReferenceError)/ignorable分类
- 清理：cleanup.py定期清理过期产物(--dry-run预览)
