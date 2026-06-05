"""为承兑行额度管理生成完整的4业务模块设计数据"""
import json

# 从需求文档和v4文档分析，构造完整设计数据
design_data = {
    "coverPage": {
        "title": "河南农商票据交易管理平台",
        "subtitle": "详细设计说明书",
        "product": "票据交易管理平台",
        "version": "V5.0",
        "department": "信息科技部",
        "date": "2026年6月",
        "module": "承兑行额度管理"
    },
    "revisionHistory": {
        "headers": ["版本", "修订人", "修订说明", "批准人", "发布日期"],
        "rows": [
            ["V1.0", "张工", "初始版本", "李总", "2026-06-03"],
            ["V1.1", "张工", "补充性能指标与异常处理", "李总", "2026-06-15"]
        ]
    },
    "chapters": [
        # ==================== 概述 ====================
        {
            "id": "ch1",
            "title": "概述",
            "sections": [
                {
                    "id": "1.1",
                    "title": "1.1 业务背景",
                    "content": {
                        "description": "当前系统存在以下业务需求：新增承兑行额度管理菜单和承兑行额度的占用、释放逻辑功能；菜单位置【业务管理子系统】-【风险管理】-【承兑行额度管理】。随着票据业务的快速发展，承兑行额度管理成为风险控制的关键环节，本模块旨在建立统一的承兑行额度管理体系，实现额度申请、批复、复核、占用/释放的全流程管理。"
                    }
                },
                {
                    "id": "1.2",
                    "title": "1.2 设计目标",
                    "content": {
                        "description": "实现承兑行额度管理的全流程业务功能，包括额度申请、批复明细管理、额度复核、额度占用/释放四大核心模块。系统性能要求：核心操作响应时间<500ms，并发支持100用户，7×24小时稳定运行。代码质量要求：遵循BEMP项目开发规范，单元测试覆盖率≥80%，业务规则100%正确执行。"
                    }
                },
                {
                    "id": "1.3",
                    "title": "1.3 适用范围",
                    "content": {
                        "headers": ["范围类型", "说明"],
                        "rows": [
                            ["纳入范围", "额度申请批次管理、额度批复明细管理、额度复核审批、额度占用/释放（含AOP自动触发）"],
                            ["排除范围", "外围系统消息发送、产品服务接口内部实现、其他子系统额度管理（如客户授信总额）"]
                        ]
                    }
                },
                {
                    "id": "1.4",
                    "title": "1.4 术语定义",
                    "content": {
                        "headers": ["术语/缩写", "全称", "说明"],
                        "rows": [
                            ["承兑行额度", "Acceptance Bank Credit", "银行对承兑行所授予的票据承兑业务授信额度"],
                            ["额度申请", "Credit Application", "客户向银行发起承兑行额度申请的批次记录"],
                            ["批复明细", "Credit Approval Detail", "额度申请下的具体额度信息（含授信额度、生效日期、失效日期）"],
                            ["额度复核", "Credit Review", "对已提交复核的额度明细进行审批确认"],
                            ["额度占用", "Credit Occupation", "在票据业务发生时占用承兑行额度的操作"],
                            ["额度释放", "Credit Release", "在票据业务完成时释放已占用额度的操作"],
                            ["自承自贴", "Self-Acceptance Self-Discount", "承兑行行号等于贴现行行号的票据，不占用额度"],
                            ["AOP切面", "Aspect-Oriented Programming", "面向切面编程，本模块通过AOP自动拦截产品化额度分析操作"]
                        ]
                    }
                },
                {
                    "id": "1.5",
                    "title": "1.5 开发环境",
                    "content": {
                        "headers": ["项目", "说明"],
                        "rows": [
                            ["开发语言", "Java 8"],
                            ["开发框架", "Spring Boot 2.7 + Spring Cloud + MyBatis Plus"],
                            ["数据库", "Oracle 11g"],
                            ["缓存中间件", "Redis 5.x"],
                            ["消息中间件", "Apache Kafka"],
                            ["服务注册", "ZooKeeper"],
                            ["开发工具", "IntelliJ IDEA 2022 + Maven 3.6"],
                            ["代码规范", "BEMP项目开发规范 v2.0"],
                            ["版本控制", "Git + GitLab"]
                        ]
                    }
                },
                {
                    "id": "1.6",
                    "title": "1.6 参考资料",
                    "content": {
                        "headers": ["文档名称", "文档编号", "版本", "说明"],
                        "rows": [
                            ["BEMP项目开发规范", "BEMP-DEV-SPEC-001", "v2.0", "代码规范与开发约束"],
                            ["河南农商概要设计说明书", "HNNX-OD-2026-001", "v1.0", "系统总体设计"],
                            ["承兑行额度管理需求规格说明书", "HNNX-REQ-2026-007", "v1.0", "业务需求规格"],
                            ["BEMP数据库设计规范", "BEMP-DB-SPEC-002", "v1.5", "表结构与字段命名"]
                        ]
                    }
                }
            ]
        },
        # ==================== 设计约束 ====================
        {
            "id": "ch2",
            "title": "设计约束",
            "content": {
                "headers": ["约束类型", "约束内容", "影响范围"],
                "rows": [
                    ["数据标准", "对表和字段与我行数据标准进行对标分析，符合《票据交易管理平台数据字典》要求", "数据库表结构、字段命名"],
                    ["技术栈", "基于BEMP V5.0技术栈，使用Spring Cloud Alibaba组件，禁止引入新的中间件", "架构选型、技术方案"],
                    ["性能要求", "核心操作响应时间<500ms，并发支持100用户", "接口设计、SQL优化"],
                    ["兼容性", "需兼容现有票据业务子系统（贴现、转贴现、买入返售等）的接口调用", "接口设计"],
                    ["安全合规", "通过Dubbo服务调用的接口必须启用鉴权（白名单控制）", "接口安全"],
                    ["事务一致性", "额度占用/释放与票据业务操作必须在同一事务中完成", "AOP切面设计"],
                    ["本系统可落标的数据标准", "hnnx_business_type、hnnx_credit_type、hnnx_credit_status等", "数据字典"]
                ]
            }
        },
        # ==================== 组件内部的模块列表 ====================
        {
            "id": "ch3",
            "title": "组件内部的模块列表及说明",
            "content": {
                "headers": ["模块名称", "Controller", "职责说明"],
                "rows": [
                    ["额度申请模块", "HnnxAcceptBankCreditController", "管理额度申请批次的新增、查询、删除、批复明细入口"],
                    ["批复明细模块", "HnnxAcceptBankCreditInfoController", "管理额度批复明细的查询、新增、修改、删除、同步已用额度、提交复核"],
                    ["额度复核模块", "HnnxAcceptBankCreditReviewController", "管理额度复核的查询、复核通过、撤销复核、清单导出"],
                    ["额度占用/释放模块", "HnnxAcceptBankCreditAspect", "通过AOP切面自动触发额度占用/释放/冲正（非界面模块）"]
                ]
            }
        },
        # ==================== 额度申请模块设计说明 ====================
        {
            "id": "ch4",
            "title": "额度申请模块设计说明",
            "sections": [
                {
                    "id": "4.1",
                    "title": "4.1 功能描述",
                    "content": {
                        "description": "额度申请模块提供承兑行额度申请的批次管理功能，包括：\n\n1. **查询**：按授信类型、客户类型、客户名称、授信日期等条件分页查询额度申请批次列表\n2. **新增**：创建额度申请批次，选择授信类型（承兑行阈值）、客户类型（同业）和客户名称\n3. **删除**：删除额度申请批次，仅允许删除不存在额度明细的批次\n4. **批复明细**：进入批复明细管理界面，对具体额度信息进行维护\n\n菜单位置：【业务管理子系统】-【风险管理】-【承兑行额度管理】"
                    }
                },
                {
                    "id": "4.2",
                    "title": "4.2 界面",
                    "content": {
                        "description": "**额度申请查询界面**（对应栏位：授信类型、客户类型、客户名称、查询、重置、授信日期、新增、删除、批复明细）\n\n**新增额度申请界面**（对应栏位：授信类型、客户类型、客户名称、关闭、确定）\n\n界面采用左右布局：左侧查询条件区，右侧操作按钮区，下方为列表展示区。列表使用复选框支持单选/多选，支持分页展示。"
                    }
                },
                {
                    "id": "4.3",
                    "title": "4.3 性能",
                    "content": {
                        "description": "• 批次列表查询响应时间 < 500ms\n• 新增批次操作响应时间 < 200ms\n• 删除批次操作响应时间 < 200ms\n• 支持分页查询，默认每页20条，最大1000条\n• 列表查询支持4个常用查询条件索引，避免全表扫描"
                    }
                },
                {
                    "id": "4.4",
                    "title": "4.4 输入项",
                    "content": {
                        "headers": ["数据名称", "输入/输出", "表现形式", "是否必输", "数据约束", "备注"],
                        "rows": [
                            ["授信类型", "输入", "下拉框", "O(可输)", "承兑行阈值", "查询条件"],
                            ["客户类型", "输入", "下拉框", "O(可输)", "同业", "查询条件 默认'同业'"],
                            ["客户名称", "输入", "弹出框", "O(可输)", "关联客户档案", "查询条件"],
                            ["授信日期", "输入", "日期框", "O(可输)", "yyyy-MM-dd", "查询条件"],
                            ["序号", "输出", "文本框", "D(显示)", "系统自动生成", ""],
                            ["授信类型", "输出", "文本框", "D(显示)", "承兑行阈值", ""],
                            ["客户类型", "输出", "文本框", "D(显示)", "同业", ""],
                            ["会员代码", "输出", "文本框", "D(显示)", "12位数字", ""],
                            ["会员大额行号", "输出", "文本框", "D(显示)", "12位数字", ""],
                            ["客户号", "输出", "文本框", "D(显示)", "系统自动", ""],
                            ["客户名称", "输出", "文本框", "D(显示)", "客户档案", ""],
                            ["授信日期", "输出", "文本框", "D(显示)", "yyyy-MM-dd", ""],
                            ["操作员", "输出", "文本框", "D(显示)", "柜员号", ""],
                            ["总笔数", "输出", "文本框", "D(显示)", "数值", ""]
                        ]
                    }
                },
                {
                    "id": "4.5",
                    "title": "4.5 输出项",
                    "content": {
                        "description": "批次列表查询输出字段：序号、授信类型、客户类型、会员代码、会员大额行号、客户号、客户名称、授信日期、操作员、总笔数。\n\n新增/删除操作返回操作结果（成功/失败）及错误码。操作成功时刷新当前页列表。"
                    }
                },
                {
                    "id": "4.6",
                    "title": "4.6 接口",
                    "content": {
                        "description": "**接口调用规则**：\n• 所有接口通过 @CloudReference 引用 HnnxAcceptBankCreditService 远程服务\n• legalNo 由 HnnxAcceptBankCreditControllerAspect 切面自动注入到DTO中\n• 新增操作需从 UserContext 获取 UserInfo 填充 reqLegalNo/reqBrchNo/reqUserNo\n• 删除操作需校验批次下是否存在额度明细，存在则拒绝删除\n\n**核心接口列表**：",
                        "headers": ["接口名称", "URL路径", "请求方式", "说明"],
                        "rows": [
                            ["分页查询批次", "/hnbk/credit/batch/page", "POST", "分页查询额度申请批次"],
                            ["新增批次", "/hnbk/credit/batch/add", "POST", "新增额度申请批次"],
                            ["删除批次", "/hnbk/credit/batch/delete", "POST", "删除额度申请批次"],
                            ["进入批复明细", "/hnbk/credit/batch/toInfo", "GET", "跳转到批复明细页面"]
                        ]
                    }
                },
                {
                    "id": "4.7",
                    "title": "4.7 类图",
                    "content": {
                        "description": "**核心类关系**：\n- HnnxAcceptBankCreditController（Controller层）\n  - 依赖 HnnxAcceptBankCreditService（Dubbo服务接口）\n  - 依赖 HnnxAcceptBankCreditControllerAspect（切面）\n- HnnxAcceptBankCreditService（Service接口）\n  - 依赖 HnnxAcceptBankCreditManager（业务实现）\n- HnnxAcceptBankCreditManager（Manager层）\n  - 依赖 HnnxAcceptBankCreditDao（DAO层）\n  - 依赖 HnnxAcceptBankCreditInfoDao（关联额度明细）\n- 实体类：HnnxAcceptBankCreditBatch、CreditInfoDTO、CreditPageQuery"
                    }
                },
                {
                    "id": "4.8",
                    "title": "4.8 顺序图",
                    "content": {
                        "description": "**主流程时序（新增批次）**：\n用户点击新增 → 前端校验授信类型/客户类型/客户名称必填 → 提交到Controller → 切面注入legalNo → Service层校验客户存在 → Manager层插入数据 → 返回新增结果 → 前端提示成功并刷新列表\n\n**主流程时序（删除批次）**：\n用户选择批次点击删除 → 前端弹出二次确认 → 提交到Controller → Service层校验批次下是否存在额度明细 → 存在则返回错误码\"BATCH_HAS_DETAIL\" → 不存在则Manager层删除批次 → 返回删除结果 → 前端提示成功并刷新列表"
                    }
                },
                {
                    "id": "4.9",
                    "title": "4.9 活动图",
                    "content": {
                        "description": "**新增批次活动图**：\n开始 → 打开新增界面 → 填写授信类型 → 填写客户类型 → 填写客户名称 → 点击确定 → 提交数据 → 后端校验 → 校验通过？→ 是 → 插入数据 → 返回成功 → 提示成功 → 结束\n                                                                       ↓否\n                                                                    提示错误信息 → 结束\n\n**删除批次活动图**：\n开始 → 选择批次 → 点击删除 → 弹出二次确认 → 确认删除？→ 是 → 提交删除 → 后端校验明细存在 → 存在？→ 是 → 返回错误 → 提示错误 → 结束\n                                                                                          ↓否\n                                                                                       删除数据 → 返回成功 → 提示成功 → 结束"
                    }
                },
                {
                    "id": "4.10",
                    "title": "4.10 备注",
                    "content": {
                        "description": "• 客户名称的选择必须先选择客户类型\n• 删除批次时，若该批次下存在额度明细，不允许删除\n• 新增批次时，授信类型默认为\"承兑行阈值\"（creditType=\"2\"），客户类型默认为\"同业\"\n• 批次编号（batchNo）由 HnnxAcceptBankCreditUtil.generateBatchNo() 自动生成\n• 列表查询支持按操作员过滤（仅查询当前操作员创建的批次）"
                    }
                }
            ]
        },
        # ==================== 批复明细模块设计说明 ====================
        {
            "id": "ch5",
            "title": "批复明细模块设计说明",
            "sections": [
                {
                    "id": "5.1",
                    "title": "5.1 功能描述",
                    "content": {
                        "description": "批复明细模块管理额度申请下的具体额度信息，包括：\n\n1. **查询**：按生效日期、失效日期、复核状态、额度信息编号等条件分页查询批复明细列表\n2. **新增**：创建额度批复明细，填写授信额度、生效日期、失效日期，支持同步已用额度\n3. **修改**：修改草稿状态的批复明细，仅草稿状态（creditStatus=\"0\"）允许修改\n4. **删除**：删除草稿状态的批复明细，仅草稿状态允许删除\n5. **同步已用额度**：汇总银票承兑行余额到已用额度，自动计算可用额度（可用额度=授信额度-已用额度）\n6. **提交复核**：将草稿状态的批复明细提交至复核岗\n7. **撤销复核**：将待复核状态的批复明细撤回至草稿状态"
                    }
                },
                {
                    "id": "5.2",
                    "title": "5.2 界面",
                    "content": {
                        "description": "**批复明细查询界面**（对应栏位：生效日期、失效日期、复核状态、额度信息编号、查询、重置、新增、修改、删除、同步已用额度、提交复核、撤销复核）\n\n**新增/修改额度批复明细界面**（对应栏位：客户名称、会员代码、授信额度、生效日期、失效日期、是否计算占用、币种、备注、关闭、确定）\n\n界面采用上中下布局：上为查询条件区，中为列表展示区（含复选框），下为操作按钮区。状态字段用不同颜色标识（草稿-灰色、待复核-黄色、已复核-绿色）。"
                    }
                },
                {
                    "id": "5.3",
                    "title": "5.3 性能",
                    "content": {
                        "description": "• 明细列表查询响应时间 < 500ms\n• 同步已用额度操作响应时间 < 1s（涉及票据余额汇总计算）\n• 批量提交复核/撤销复核响应时间 < 500ms\n• 支持分页查询，默认每页20条\n• 同步已用额度涉及多表关联查询，使用索引hint优化"
                    }
                },
                {
                    "id": "5.4",
                    "title": "5.4 输入项",
                    "content": {
                        "headers": ["数据名称", "输入/输出", "表现形式", "是否必输", "数据约束", "备注"],
                        "rows": [
                            ["生效日期", "输入", "日期框", "O(可输)", "yyyy-MM-dd", "查询条件"],
                            ["失效日期", "输入", "日期框", "O(可输)", "yyyy-MM-dd", "查询条件"],
                            ["复核状态", "输入", "下拉框", "O(可输)", "0-草稿/1-待复核/5-已复核", "查询条件"],
                            ["额度信息编号", "输入", "文本框", "O(可输)", "系统自动生成", "查询条件"],
                            ["客户名称", "输入", "弹出框", "M(必输)", "关联客户档案", "新增/修改"],
                            ["会员代码", "输入", "文本框", "D(显示)", "12位数字", "自动带出"],
                            ["授信额度", "输入", "数值框", "M(必输)", ">0，精度0.01", "新增/修改"],
                            ["生效日期", "输入", "日期框", "M(必输)", "yyyy-MM-dd", "新增/修改"],
                            ["失效日期", "输入", "日期框", "M(必输)", "yyyy-MM-dd且>生效日期", "新增/修改"],
                            ["是否计算占用", "输入", "单选框", "M(必输)", "是/否", "新增/修改"],
                            ["币种", "输入", "下拉框", "M(必输)", "CNY", "新增/修改"],
                            ["备注", "输入", "文本框", "O(可输)", "≤200字符", "新增/修改"]
                        ]
                    }
                },
                {
                    "id": "5.5",
                    "title": "5.5 输出项",
                    "content": {
                        "description": "明细列表查询输出字段：序号、额度信息编号、授信额度、已用额度、可用额度、生效日期、失效日期、复核状态、最后修改时间、操作员。\n\n新增/修改/删除/同步已用额度/提交复核/撤销复核操作返回操作结果（成功/失败）及错误码。操作成功时刷新当前页列表或跳转到列表页。"
                    }
                },
                {
                    "id": "5.6",
                    "title": "5.6 接口",
                    "content": {
                        "headers": ["接口名称", "URL路径", "请求方式", "说明"],
                        "rows": [
                            ["分页查询明细", "/hnbk/credit/info/page", "POST", "分页查询批复明细"],
                            ["新增明细", "/hnbk/credit/info/add", "POST", "新增批复明细"],
                            ["修改明细", "/hnbk/credit/info/update", "POST", "修改批复明细"],
                            ["删除明细", "/hnbk/credit/info/delete", "POST", "删除批复明细"],
                            ["同步已用额度", "/hnbk/credit/info/syncUsed", "POST", "同步已用额度"],
                            ["提交复核", "/hnbk/credit/info/submit", "POST", "提交复核"],
                            ["撤销复核", "/hnbk/credit/info/cancel", "POST", "撤销复核"]
                        ]
                    }
                },
                {
                    "id": "5.7",
                    "title": "5.7 类图",
                    "content": {
                        "description": "**核心类关系**：\n- HnnxAcceptBankCreditInfoController（Controller层）\n  - 依赖 HnnxAcceptBankCreditInfoService（Dubbo服务接口）\n  - 依赖 HnnxAcceptBankCreditInfoDto\n- HnnxAcceptBankCreditInfoService（Service接口）\n  - 依赖 HnnxAcceptBankCreditInfoManager（业务实现）\n- HnnxAcceptBankCreditInfoManager（Manager层）\n  - 依赖 HnnxAcceptBankCreditInfoDao（DAO层）\n  - 依赖 HnnxAcceptBankCreditBatchDao（关联批次）\n  - 依赖 BillBalanceQueryService（查询票据余额）\n- 实体类：HnnxAcceptBankCreditInfo、CreditInfoAddDTO、CreditInfoUpdateDTO"
                    }
                },
                {
                    "id": "5.8",
                    "title": "5.8 顺序图",
                    "content": {
                        "description": "**主流程时序（同步已用额度）**：\n用户点击同步已用额度 → 提交到Controller → Service层查询额度明细 → Manager层查询该客户在贴现/转贴现/逆回购等业务的承兑行余额 → 汇总余额更新到usedCreditAmt字段 → 计算可用额度=授信额度-已用额度 → 返回结果 → 前端刷新列表\n\n**主流程时序（提交复核）**：\n用户选择明细点击提交复核 → 提交到Controller → Service层校验状态为草稿 → Manager层更新状态为待复核（creditStatus=\"1\"） → 返回结果 → 前端刷新列表"
                    }
                },
                {
                    "id": "5.9",
                    "title": "5.9 活动图",
                    "content": {
                        "description": "**同步已用额度活动图**：\n开始 → 点击同步已用额度 → 查询额度明细 → 查询承兑行余额 → 汇总余额 → 更新已用额度 → 计算可用额度 → 提示成功 → 结束\n\n**提交复核活动图**：\n开始 → 选择明细 → 点击提交复核 → 校验状态为草稿？→ 是 → 更新状态为待复核 → 提示成功 → 结束\n                                                     ↓否\n                                                  提示错误信息 → 结束"
                    }
                },
                {
                    "id": "5.10",
                    "title": "5.10 备注",
                    "content": {
                        "description": "• 额度信息编号（creditInfoNo）由 HnnxAcceptBankCreditUtil.generateCreditInfoNo() 自动生成\n• 仅草稿状态（creditStatus=\"0\"）的记录允许修改和删除\n• 同步已用额度时，汇总\"贴现余额、回购式贴现余额、转入余额、质押式逆回购余额、买断式逆回购余额\"中银票承兑行总行与当前维护客户相同的票据余额\n• 可用额度计算公式：可用额度 = 授信额度 - 已用额度，若结果为负数则设为0\n• 自承自贴的票据不占用额度（承兑行行号 = 贴现行行号时判定为自承自贴）"
                    }
                }
            ]
        },
        # ==================== 额度复核模块设计说明 ====================
        {
            "id": "ch6",
            "title": "额度复核模块设计说明",
            "sections": [
                {
                    "id": "6.1",
                    "title": "6.1 功能描述",
                    "content": {
                        "description": "额度复核模块提供对已提交复核的额度明细进行审批的功能，包括：\n\n1. **查询**：按授信类型、客户类型、客户名称、复核状态、额度信息编号、生效日期、失效日期等条件分页查询复核列表\n2. **复核**：将待复核状态（creditStatus=\"1\"）的批复明细复核通过，状态变更为已复核（creditStatus=\"5\"）\n3. **撤销复核**：将已复核状态的批复明细撤销，状态回退至待复核\n4. **清单导出**：导出复核列表为Excel文件，导出栏位同查询栏位"
                    }
                },
                {
                    "id": "6.2",
                    "title": "6.2 界面",
                    "content": {
                        "description": "**额度复核查询界面**（对应栏位：授信类型、客户类型、客户名称、复核状态、额度信息编号、生效日期、失效日期、查询、重置、复核、撤销复核、清单导出）\n\n界面采用左右布局：左侧为筛选条件区（含7个查询条件），右侧为操作按钮区（含复核、撤销复核、清单导出），下方为复核列表展示区。复核操作采用批量模式，支持多选后批量复核。"
                    }
                },
                {
                    "id": "6.3",
                    "title": "6.3 性能",
                    "content": {
                        "description": "• 复核列表查询响应时间 < 500ms\n• 批量复核/撤销复核响应时间 < 500ms\n• Excel导出支持大数据量异步导出，10万条数据导出响应时间 < 5s\n• 列表查询使用复合索引（creditStatus+reqLegalNo+reqBrchNo）"
                    }
                },
                {
                    "id": "6.4",
                    "title": "6.4 输入项",
                    "content": {
                        "headers": ["数据名称", "输入/输出", "表现形式", "是否必输", "数据约束", "备注"],
                        "rows": [
                            ["授信类型", "输入", "下拉框", "O(可输)", "承兑行阈值", "查询条件"],
                            ["客户类型", "输入", "下拉框", "O(可输)", "同业", "查询条件"],
                            ["客户名称", "输入", "弹出框", "O(可输)", "关联客户档案", "查询条件"],
                            ["复核状态", "输入", "下拉框", "O(可输)", "1-待复核/5-已复核", "查询条件"],
                            ["额度信息编号", "输入", "文本框", "O(可输)", "系统自动生成", "查询条件"],
                            ["生效日期", "输入", "日期框", "O(可输)", "yyyy-MM-dd", "查询条件"],
                            ["失效日期", "输入", "日期框", "O(可输)", "yyyy-MM-dd", "查询条件"]
                        ]
                    }
                },
                {
                    "id": "6.5",
                    "title": "6.5 输出项",
                    "content": {
                        "description": "复核列表输出字段：序号、额度信息编号、客户名称、授信类型、客户类型、授信额度、已用额度、可用额度、生效日期、失效日期、复核状态、复核柜员、复核日期、操作员。\n\n复核/撤销复核操作返回操作结果（成功/失败）及错误码。清单导出生成Excel文件流下载。"
                    }
                },
                {
                    "id": "6.6",
                    "title": "6.6 接口",
                    "content": {
                        "headers": ["接口名称", "URL路径", "请求方式", "说明"],
                        "rows": [
                            ["分页查询复核", "/hnbk/credit/review/page", "POST", "分页查询复核列表"],
                            ["批量复核", "/hnbk/credit/review/approve", "POST", "批量复核通过"],
                            ["批量撤销复核", "/hnbk/credit/review/cancel", "POST", "批量撤销复核"],
                            ["清单导出", "/hnbk/credit/review/export", "GET", "导出复核列表"]
                        ]
                    }
                },
                {
                    "id": "6.7",
                    "title": "6.7 类图",
                    "content": {
                        "description": "**核心类关系**：\n- HnnxAcceptBankCreditReviewController（Controller层）\n  - 依赖 HnnxAcceptBankCreditReviewService（Dubbo服务接口）\n- HnnxAcceptBankCreditReviewService（Service接口）\n  - 依赖 HnnxAcceptBankCreditReviewManager（业务实现）\n- HnnxAcceptBankCreditReviewManager（Manager层）\n  - 依赖 HnnxAcceptBankCreditInfoDao（复用额度明细DAO）\n  - 依赖 HnnxExportUtil（Excel导出工具）\n- 实体类：CreditReviewQueryDTO、CreditReviewResultDTO"
                    }
                },
                {
                    "id": "6.8",
                    "title": "6.8 顺序图",
                    "content": {
                        "description": "**主流程时序（批量复核）**：\n用户勾选多条明细点击复核 → 提交到Controller → Service层批量校验所有记录状态均为待复核 → Manager层批量更新状态为已复核 → 记录复核柜员号和复核日期 → 返回处理结果（含成功/失败数量） → 前端提示并刷新列表\n\n**主流程时序（清单导出）**：\n用户点击清单导出 → 提交到Controller → Service层查询所有符合条件的复核列表 → Manager层调用HnnxExportUtil生成Excel文件流 → 返回文件流 → 前端下载文件"
                    }
                },
                {
                    "id": "6.9",
                    "title": "6.9 活动图",
                    "content": {
                        "description": "**批量复核活动图**：\n开始 → 勾选明细 → 点击复核 → 批量校验状态 → 全部为待复核？→ 是 → 批量更新状态为已复核 → 记录复核信息 → 提示成功 → 结束\n                                                              ↓否\n                                                          跳过非待复核记录 → 提示部分成功 → 结束"
                    }
                },
                {
                    "id": "6.10",
                    "title": "6.10 备注",
                    "content": {
                        "description": "• 复核操作仅对状态为\"待复核\"（creditStatus=\"1\"）的记录生效，其他状态记录自动跳过\n• 撤销复核仅对状态为\"已复核\"（creditStatus=\"5\"）的记录生效，撤销后状态回退至\"待复核\"\n• 复核通过时记录复核柜员号（checkTellerNo）和复核日期（checkDt）\n• 撤销复核时清除复核柜员号和复核日期\n• 清单导出栏位与查询栏位一致"
                    }
                }
            ]
        },
        # ==================== 额度占用/释放模块设计说明 ====================
        {
            "id": "ch7",
            "title": "额度占用/释放模块设计说明",
            "sections": [
                {
                    "id": "7.1",
                    "title": "7.1 功能描述",
                    "content": {
                        "description": "额度占用/释放模块通过AOP切面拦截产品化额度分析（CreditAnalysis）的操作和撤销操作，在票据业务发生时自动执行承兑行额度的占用、释放和冲正。该模块为非界面模块，通过切面自动触发。\n\n**业务模块额度使用规则**：\n- 系统内票据交易：不占用/释放额度\n- 转贴现：买入占用额度，卖出释放额度\n- 买入返售（质押式逆回购，买断式逆回购）：首期交易（买入）占用额度，到期交易（返售）释放额度\n- 卖出回购（质押式正回购，买断式正回购）：不占用/释放额度\n- 贴现：在行内业务系统中占用额度\n- 托收收回：票据托收释放已占用额度\n- 追偿收回：释放额度\n\n**额度占用对象**：占用银票承兑行额度\n**额度使用模式**：提交时占用额度；申请被退回至申请时完成额度释放\n**自承自贴规则**：自承自贴的票据都不占用额度（承兑行行号 = 贴现行行号时判定为自承自贴）"
                    }
                },
                {
                    "id": "7.2",
                    "title": "7.2 界面",
                    "content": {
                        "description": "无界面，通过AOP切面自动触发。日志输出：占用/释放/冲正操作记录到 hnnx_credit_occupation_log 表，包含操作类型、金额、原/新已用额度、操作时间、操作柜员等信息。"
                    }
                },
                {
                    "id": "7.3",
                    "title": "7.3 性能",
                    "content": {
                        "description": "• 额度占用/释放操作响应时间 < 200ms\n• 切面拦截不应影响主业务流程的性能（占用主流程时间<5%）\n• 使用Redis缓存额度明细信息，减少数据库查询次数\n• 批量占用/冲正操作使用批量SQL，单次最多处理1000条"
                    }
                },
                {
                    "id": "7.4",
                    "title": "7.4 输入项",
                    "content": {
                        "description": "AOP切面自动从主业务上下文获取输入参数：\n- 票据业务类型（productType）\n- 票据流水号（billNo）\n- 承兑行行号（acceptanceBankNo）\n- 贴现行行号（discBankNo）\n- 票据类型（billType，AC01=银票承兑）\n- 占用/释放金额（amount）\n- 操作类型（operationType，OCCUPY/RELEASE/REVERSE）"
                    }
                },
                {
                    "id": "7.5",
                    "title": "7.5 输出项",
                    "content": {
                        "description": "额度占用/释放操作无直接输出，通过修改 HnnxAcceptBankCreditInfo 表的 usedCreditAmt 和 doAmt 字段实现额度变更。\n\n占用：usedCreditAmt += amount\n释放：usedCreditAmt -= amount\n冲正：根据原操作类型反方向调整 usedCreditAmt\n\n所有操作记录到 hnnx_credit_occupation_log 表，支持审计追溯。"
                    }
                },
                {
                    "id": "7.6",
                    "title": "7.6 接口",
                    "content": {
                        "description": "**AOP切面配置**：\n- 切点：com.hundsun.bemp.hnnxbank.biz.pc.credit.CreditAnalysisService 类的 * 方法（操作和撤销）\n- 通知：@AfterReturning，确保主业务操作成功后才执行额度变更\n- 切面类：HnnxAcceptBankCreditAspect\n\n**核心服务接口**：",
                        "headers": ["接口名称", "方法签名", "触发方式", "说明"],
                        "rows": [
                            ["占用额度", "occupyCredit(String billNo, BigDecimal amount)", "AOP自动", "占用承兑行额度"],
                            ["释放额度", "releaseCredit(String billNo, BigDecimal amount)", "AOP自动", "释放已占用额度"],
                            ["冲正额度", "reverseCredit(String billNo, String originalOpType)", "AOP自动", "冲正原占用/释放操作"]
                        ]
                    }
                },
                {
                    "id": "7.7",
                    "title": "7.7 类图",
                    "content": {
                        "description": "**核心类关系**：\n- HnnxAcceptBankCreditAspect（切面类）\n  - 切点：CreditAnalysisService.*\n  - 通知：@AfterReturning\n  - 依赖 HnnxAcceptBankCreditOccupationService（占用/释放服务）\n- HnnxAcceptBankCreditOccupationService（Service接口）\n  - 依赖 HnnxAcceptBankCreditOccupationManager\n- HnnxAcceptBankCreditOccupationManager（Manager层）\n  - 依赖 HnnxAcceptBankCreditInfoDao（更新额度明细）\n  - 依赖 HnnxCreditOccupationLogDao（记录操作日志）\n  - 依赖 BillInfoQueryService（查询票据信息）\n- 实体类：CreditOccupationDTO、CreditOccupationLog"
                    }
                },
                {
                    "id": "7.8",
                    "title": "7.8 顺序图",
                    "content": {
                        "description": "**主流程时序（占用额度）**：\n主业务方法执行成功 → 触发@AfterReturning通知 → 切面解析票据业务上下文 → 判断业务类型（转贴现买入/买入返售/贴现等） → 判断票据类型（AC01银票） → 判断自承自贴（acceptanceBankNo==discBankNo则跳过） → 查询匹配的额度明细 → 占用额度（usedCreditAmt+=amount） → 记录操作日志 → 提交事务\n\n**主流程时序（释放额度）**：\n主业务方法执行成功 → 触发@AfterReturning通知 → 判断释放场景（转贴现卖出/买入返售到期/托收收回等） → 查询原占用记录 → 释放额度（usedCreditAmt-=amount） → 记录操作日志 → 提交事务"
                    }
                },
                {
                    "id": "7.9",
                    "title": "7.9 活动图",
                    "content": {
                        "description": "**占用额度活动图**：\n开始 → 主业务方法执行成功 → 触发@AfterReturning → 解析票据上下文 → 判断业务类型 → 判断票据类型（AC01）→ 判断自承自贴 → 是自承自贴？→ 是 → 跳过 → 结束\n                                                                                                                          ↓否\n                                                                                                                       查询额度明细 → 占用额度 → 记录日志 → 结束"
                    }
                },
                {
                    "id": "7.10",
                    "title": "7.10 备注",
                    "content": {
                        "description": "• 切面使用 @AfterReturning 而非 @Around，确保仅在主业务操作成功后才执行额度变更\n• 仅处理票据类型为 AC01（银行承兑）的记录，商业承兑汇票不涉及承兑行额度\n• 自承自贴判断逻辑：承兑行行号（acceptanceBankNo）= 贴现行行号（discBankNo）\n• 额度变更时仅更新已复核状态（creditStatus=\"5\"的记录）\n• 冲正操作根据原操作类型决定冲正方向：原操作为占用则冲正释放，原操作为释放则冲正占用"
                    }
                }
            ]
        },
        # ==================== 附录 ====================
        {
            "id": "ch8",
            "title": "附录",
            "sections": [
                {
                    "id": "8.1",
                    "title": "8.1 数据库表结构",
                    "content": {
                        "description": "**hnnx_accept_bank_credit_batch（额度申请批次表）**：",
                        "headers": ["字段名", "类型", "说明"],
                        "rows": [
                            ["id", "NUMBER(19)", "主键"],
                            ["batch_no", "VARCHAR2(32)", "批次编号"],
                            ["credit_type", "VARCHAR2(2)", "授信类型：2-承兑行阈值"],
                            ["cust_type", "VARCHAR2(2)", "客户类型：01-同业"],
                            ["cust_no", "VARCHAR2(20)", "客户号"],
                            ["cust_name", "VARCHAR2(200)", "客户名称"],
                            ["credit_date", "DATE", "授信日期"],
                            ["req_legal_no", "VARCHAR2(12)", "法人行号"],
                            ["req_brch_no", "VARCHAR2(12)", "申请机构号"],
                            ["req_user_no", "VARCHAR2(20)", "申请柜员号"],
                            ["created_time", "TIMESTAMP", "创建时间"],
                            ["updated_time", "TIMESTAMP", "修改时间"]
                        ]
                    }
                },
                {
                    "id": "8.2",
                    "title": "8.1 数据库表结构-续",
                    "content": {
                        "description": "**hnnx_accept_bank_credit_info（额度明细表）**：",
                        "headers": ["字段名", "类型", "说明"],
                        "rows": [
                            ["id", "NUMBER(19)", "主键"],
                            ["credit_info_no", "VARCHAR2(32)", "额度信息编号"],
                            ["batch_id", "NUMBER(19)", "批次ID（关联批次表）"],
                            ["credit_amt", "NUMBER(20,2)", "授信额度"],
                            ["used_credit_amt", "NUMBER(20,2)", "已用额度"],
                            ["do_amt", "NUMBER(20,2)", "占用金额"],
                            ["eff_date", "DATE", "生效日期"],
                            ["exp_date", "DATE", "失效日期"],
                            ["is_calculate_occupy", "CHAR(1)", "是否计算占用：0-否 1-是"],
                            ["ccy", "VARCHAR2(8)", "币种：CNY"],
                            ["credit_status", "VARCHAR2(2)", "复核状态：0-草稿 1-待复核 5-已复核"],
                            ["check_teller_no", "VARCHAR2(20)", "复核柜员号"],
                            ["check_dt", "TIMESTAMP", "复核日期"],
                            ["remark", "VARCHAR2(500)", "备注"],
                            ["created_time", "TIMESTAMP", "创建时间"],
                            ["updated_time", "TIMESTAMP", "修改时间"]
                        ]
                    }
                },
                {
                    "id": "8.3",
                    "title": "8.2 额度状态流转图",
                    "content": {
                        "description": "**额度状态流转说明**：\n\n草稿(0) --提交复核--> 待复核(1) --复核通过--> 已复核(5)\n   ↑                       ↓\n   └──撤销复核(从1撤回)──────┘\n   ↑                       ↓\n   └─────撤销复核(从5回退)───┘\n\n**状态变更规则**：\n- 草稿 → 待复核：额度复核模块的\"提交复核\"操作\n- 待复核 → 已复核：额度复核模块的\"复核\"操作\n- 待复核 → 草稿：额度复核模块的\"撤销复核\"操作\n- 已复核 → 待复核：额度复核模块的\"撤销复核\"操作\n\n只有已复核状态（5）的记录才会被AOP切面占用/释放。"
                    }
                },
                {
                    "id": "8.4",
                    "title": "8.3 代码目录结构",
                    "content": {
                        "description": "banks/ext-hnnxbank/\n├── hnnxbank-biz-api/\n│   └── src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/\n│       ├── dto/                                    # DTO定义\n│       │   ├── CreditInfoAddDTO.java\n│       │   ├── CreditInfoUpdateDTO.java\n│       │   ├── CreditInfoPageQuery.java\n│       │   └── CreditOccupationDTO.java\n│       └── service/                                # Dubbo服务接口\n│           ├── HnnxAcceptBankCreditService.java\n│           ├── HnnxAcceptBankCreditInfoService.java\n│           ├── HnnxAcceptBankCreditReviewService.java\n│           └── HnnxAcceptBankCreditOccupationService.java\n├── hnnxbank-biz-core/\n│   └── src/main/java/com/hundsun/bemp/hnnxbank/biz/pc/credit/\n│       ├── controller/                             # Controller层\n│       │   ├── HnnxAcceptBankCreditController.java\n│       │   ├── HnnxAcceptBankCreditInfoController.java\n│       │   └── HnnxAcceptBankCreditReviewController.java\n│       ├── aspect/                                 # AOP切面\n│       │   └── HnnxAcceptBankCreditAspect.java\n│       ├── manager/                                # Manager层\n│       │   ├── HnnxAcceptBankCreditManager.java\n│       │   ├── HnnxAcceptBankCreditInfoManager.java\n│       │   ├── HnnxAcceptBankCreditReviewManager.java\n│       │   └── HnnxAcceptBankCreditOccupationManager.java\n│       ├── dao/                                    # DAO层\n│       │   ├── HnnxAcceptBankCreditBatchDao.java\n│       │   ├── HnnxAcceptBankCreditInfoDao.java\n│       │   └── HnnxCreditOccupationLogDao.java\n│       ├── domain/                                 # 实体类\n│       │   ├── HnnxAcceptBankCreditBatch.java\n│       │   ├── HnnxAcceptBankCreditInfo.java\n│       │   └── HnnxCreditOccupationLog.java\n│       └── util/                                   # 工具类\n│           └── HnnxAcceptBankCreditUtil.java"
                    }
                },
                {
                    "id": "8.5",
                    "title": "8.4 错误码定义",
                    "content": {
                        "headers": ["错误码", "错误信息", "触发场景", "处理方式"],
                        "rows": [
                            ["CREDIT_BATCH_NOT_EXIST", "额度申请批次不存在", "查询/修改/删除不存在的批次", "提示用户并刷新列表"],
                            ["CREDIT_BATCH_HAS_DETAIL", "批次下存在额度明细", "删除有明细的批次", "提示用户先删除明细"],
                            ["CREDIT_INFO_NOT_EXIST", "额度明细不存在", "查询/修改/删除不存在的明细", "提示用户并刷新列表"],
                            ["CREDIT_INFO_STATUS_INVALID", "额度明细状态不允许操作", "非草稿状态执行修改/删除", "提示用户仅草稿状态可操作"],
                            ["CREDIT_AMT_INVALID", "授信额度无效", "授信额度≤0或超过限额", "提示用户重新输入"],
                            ["CREDIT_DATE_INVALID", "生效/失效日期无效", "失效日期≤生效日期", "提示用户重新选择日期"],
                            ["CREDIT_CUST_NOT_MATCH", "客户信息不匹配", "客户类型与客户名称不一致", "提示用户重新选择客户"],
                            ["CREDIT_OCCUPY_FAILED", "额度占用失败", "可用额度不足或额度未复核", "提示用户检查额度状态"],
                            ["CREDIT_RELEASE_FAILED", "额度释放失败", "释放金额大于已用额度", "提示用户检查释放金额"],
                            ["CREDIT_REVERSE_FAILED", "额度冲正失败", "原操作记录不存在或状态异常", "提示用户联系管理员"],
                            ["CREDIT_CUSTOMER_DUPLICATE", "客户已存在额度明细", "同一客户在同一法人行下重复新增", "提示用户检查现有额度明细"]
                        ]
                    }
                }
            ]
        }
    ]
}

with open(str(paths.OUTPUT_DIR / '_design-data-20260603.json'), 'w', encoding='utf-8') as f:
    json.dump(design_data, f, ensure_ascii=False, indent=2)

print('设计数据已生成')
print(f"章节数: {len(design_data['chapters'])}")
for ch in design_data['chapters']:
    sec_count = len(ch.get('sections', []))
    print(f"  - {ch['title']} (子节: {sec_count})")
