# bemp-testcase-generator 反向构建提示词

## 核心功能
BEMP票据系统测试用例生成技能，基于五步方法论(功能地图→优先级矩阵→P0用例设计→案例集扩展→测试数据准备)，融合11种测试类型与10种组件测试设计，通过Playwright MCP自动探索网站、Oracle/MySQL MCP准备数据，生成高质量测试用例。负责用例编写，执行由bemp-webapp-testing负责，共享资源由bemp-test-common统一管理。

## 关键实现逻辑
- 五步方法论：①功能地图(Playwright MCP探索网站)→②优先级矩阵(核心流程+风险评估)→③P0用例设计(正常/异常/边界/体验)→④案例集扩展(需求影响+边缘+并发+组件)→⑤测试数据准备(Oracle/MySQL MCP)
- 七级按需加载：Level0共享资源→Level1 SKILL.md→Level2指令映射→Level3通用模板→Level4组件测试→Level5输出示例→Level6审查报告，禁止一次性加载全部
- 用例编号：TC-{模块缩写}-{三位序号}，缩写见generator-config.json的case_id_prefixes(24个模块)
- 优先级：P0核心资金流程(全量)/P1核心业务(主流程+关键异常)/P2辅助(常规)/P3管理(基础)

## 输入输出参数
- 输入：config/generator-config.json(目标地址/优先级/银行/编号前缀)、用户需求描述
- 输出：功能地图→bemp-test-common/references/、优先级矩阵→bemp-test-common/references/、用例→bemp-test-common/test-cases/、测试数据→bemp-test-common/test-data/、用例索引→bemp-test-common/test-index.json

## 主要业务流程
1. 功能地图：Playwright MCP遍历菜单→截图+提取元素→输出MD(已有且<30天可复用)
2. 优先级矩阵：核心流程识别+风险评估→P0-P3分级(功能地图未变可复用)
3. P0用例：每模块至少1正常+1异常+边界+体验，覆盖功能+安全+联动测试
4. 案例扩展：需求影响分析+边缘场景+并发+组件级补充(10种组件)
5. 测试数据：Oracle/MySQL MCP查询→识别缺口→生成补充SQL→验证就绪

## 技术特性
- 11种测试类型：功能/安全/联动/接口/UI/性能/兼容/国际化/权限/数据/回归
- 10种组件测试：输入框/下拉/日期/弹窗/列表/表格/树/标签页/上传/搜索
- BEMP特有验证：个性化路径/API前缀/组件覆盖/控制台错误/数据隔离/弹窗关闭三通道
