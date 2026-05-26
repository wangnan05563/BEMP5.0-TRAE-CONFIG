# bemp-jmeter-test 反向构建提示词

## 核心功能
BEMP JMeter性能测试技能，支持测试脚本管理(JMX)、命令行非GUI模式执行、结果分析(JTL解析)和报告生成(HTML/Markdown)。集成JMeter CLI，提供完整性能测试工作流：环境检查→创建测试计划→执行压测→结果分析→报告生成。

## 关键实现逻辑
- 环境检查：读取config/jmeter-config.yml获取JMeter路径，验证Java和JMeter版本，运行时安全校验(生产环境黑名单拒绝执行)
- 封装脚本：`scripts/run-jmeter.ps1` 自动读取配置、处理CSV格式、生成报告
- 非GUI模式执行：`jmeter -n -t test.jmx -l results.jtl [-e -o reports/] [-Jkey=value...]`
- 结果分析：计算TPS/QPS、平均/P90/P95/P99响应时间、错误率、吞吐量；连接与延迟时间拆解(Connect/Latency/Elapsed/IdleTime)；事务级独立统计
- 报告生成回退链：JMeter HTML→Markdown自定义→CSV摘要→错误摘要

## 输入输出参数
- 输入：JMX测试计划文件、config/jmeter-config.yml(路径/环境/预设/安全)、-J参数(threads/rampUp/duration)
- 输出：JTL结果文件、HTML报告(-e -o)、Markdown报告、基线文件(output/baselines/)
- 测试预设：smoke(10/5/60)/baseline(50/10/300)/load(100/30/600)/stress(200/60/900)/endurance(150/60/3600)/spike(500/5/120)

## 主要业务流程
1. 环境检查：JMeter/Java版本、目标地址安全校验(黑名单匹配拒绝)
2. 创建/选择测试计划：ThreadGroup+HTTPRequestDefaults+HTTPRequest+ResponseAssertion+Listeners
3. 执行压测：非GUI模式，确保jmeter.properties含output_format=csv
4. 结果分析：关键指标计算+时间维度拆解+事务级统计+服务器资源采集
5. 报告生成：按回退链逐级生成，支持历史基线对比

## 技术特性
- 复杂业务场景：TransactionController组合多步骤+JSONExtractor提取动态值+CookieManager会话保持+ConstantTimer/GaussianRandomTimer思考时间
- 参数化：用户自定义变量/CSV Data Set Config/函数助手/正则提取/JSON Extractor
- 多环境配置：dev/staging/prod-like，-Jenv切换
