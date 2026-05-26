# bemp-backend-code-review 反向构建提示词

## 核心功能
审查BEMP银行个性化后端Java代码是否符合项目规范，涵盖22项审查规则：目录结构、注解使用(@CustomizedBean/@CloudComponent)、Controller/Service/DTO规范、参数传递、依赖注入、日志异常、Null安全、安全性、性能资源、事务并发、集合流、Java惯用法、SQL数据库、票据业务专项、BEMP项目规范。支持多银行配置切换。

## 关键实现逻辑
- 银行配置：`config/bank-config.json`，切换`currentBank`即可，占位符自动替换(bankName/bankCode/sourceDir/packagePath/classPrefix/dtoPrefix/urlPrefixes)
- 自动扫描脚本：`scripts/auto-scan.ps1` 检测16项阻塞级问题
- 三种审查模式：快速自检(仅阻塞级)、增量审查(git diff变更文件)、全量审查(sourceDir下所有Java)
- 审查5阶段：前置检查→代码规范→质量与安全→Maven编译→输出报告
- 报告模板：`templates/report-template.md`，按阻塞/严重/警告三级分类

## 输入输出参数
- 输入：银行配置(bank-config.json)、待审查Java文件列表或git diff范围
- 输出：审查报告保存至 `reports/{bankCode}_YYYY-MM-DD_HHmmss_[full|incremental]_report.md`

## 主要业务流程
1. 读取bank-config.json确定当前银行配置
2. 阶段1前置检查：文件位置、包结构、类名前缀、注解、路径前缀、DTO规范
3. 阶段2代码规范：Controller/API设计/参数传递/服务调用
4. 阶段3质量与安全：Null安全/异常/日志/安全/性能/并发/集合/SQL/票据业务/BEMP规范
5. 阶段4 Maven编译验证
6. 阶段5输出分级报告

## 技术特性
- 核心判断规则：extends产品实现类→@CustomizedBean+@CloudComponent；仅implements接口→仅@CloudComponent；Controller不加@CustomizedBean
- 参数传递优先级：新功能→DTO对象 > 兼容旧代码→BaseRequest > 少用@RequestBody
- 依赖注入：远程@CloudReference，本地@Autowired（禁止@Resource）
- 票据业务专项：金额计算、保证金扣款、日终分页、流水号唯一性、分录配置
