/**
 * 需求驱动 UML 抽取器
 *
 * 从需求 Markdown 文档中抽取 5 种图表所需的结构化数据：
 * 1. 类图（classDiagram）：从业务实体（机构、管理员、用户、角色）生成类与关系
 * 2. 顺序图（sequenceDiagram）：从"操作"动词触发词提取消息流
 * 3. 活动图（activityDiagram）：从业务规则中的步骤编号生成活动节点与判断
 * 4. 业务流程图（businessFlow）：从跨角色交互（用户/系统/数据库）生成泳道
 * 5. 时序图（timingDiagram）：从操作状态变化（导入中→校验中→成功/失败）生成时间轴
 *
 * 输入：需求 Markdown 文本
 * 输出：5 个图表的中间数据结构 + 可选基于关键词的兜底
 */

const fs = require('fs');

// =====================================================================
// 1. 业务实体词典（基于 BEMP 票据系统常见名词）
// =====================================================================

/**
 * 业务实体识别词典
 * 命中后生成对应类（含典型属性和方法）
 */
const ENTITY_DICT = {
    '机构': {
        name: 'Org',
        stereotype: 'entity',
        attributes: [
            { name: 'orgId', type: 'String', visibility: 'public' },
            { name: 'orgCode', type: 'String', visibility: 'public' },
            { name: 'orgName', type: 'String', visibility: 'public' },
            { name: 'orgLevel', type: 'Integer', visibility: 'public' },
            { name: 'parentOrgId', type: 'String', visibility: 'public' },
            { name: 'pjOrgCode', type: 'String', visibility: 'public' },
            { name: 'accOrgCode', type: 'String', visibility: 'public' },
            { name: 'orgCodeCredit', type: 'String', visibility: 'public' },
        ],
        methods: [
            { name: 'add', params: [], returnType: 'void', visibility: 'public' },
            { name: 'delete', params: [{ name: 'orgId', type: 'String' }], returnType: 'void', visibility: 'public' },
            { name: 'update', params: [], returnType: 'void', visibility: 'public' },
            { name: 'query', params: [{ name: 'condition', type: 'String' }], returnType: 'List<Org>', visibility: 'public' },
            { name: 'batchImport', params: [{ name: 'file', type: 'MultipartFile' }], returnType: 'ImportResult', visibility: 'public' },
            { name: 'downloadTemplate', params: [], returnType: 'void', visibility: 'public' },
        ],
    },
    '机构管理员': {
        name: 'OrgAdmin',
        stereotype: 'entity',
        attributes: [
            { name: 'adminId', type: 'String', visibility: 'public' },
            { name: 'userCode', type: 'String', visibility: 'public' },
            { name: 'userName', type: 'String', visibility: 'public' },
            { name: 'orgId', type: 'String', visibility: 'public' },
            { name: 'password', type: 'String', visibility: 'private' },
            { name: 'status', type: 'String', visibility: 'public' },
            { name: 'valid', type: 'Boolean', visibility: 'public' },
        ],
        methods: [
            { name: 'add', params: [], returnType: 'void', visibility: 'public' },
            { name: 'delete', params: [{ name: 'adminId', type: 'String' }], returnType: 'void', visibility: 'public' },
            { name: 'update', params: [], returnType: 'void', visibility: 'public' },
            { name: 'query', params: [{ name: 'condition', type: 'String' }], returnType: 'List<OrgAdmin>', visibility: 'public' },
            { name: 'resetPassword', params: [], returnType: 'void', visibility: 'public' },
            { name: 'batchImport', params: [{ name: 'file', type: 'MultipartFile' }], returnType: 'ImportResult', visibility: 'public' },
            { name: 'downloadTemplate', params: [], returnType: 'void', visibility: 'public' },
        ],
    },
    '角色': {
        name: 'Role',
        stereotype: 'entity',
        attributes: [
            { name: 'roleId', type: 'String', visibility: 'public' },
            { name: 'roleCode', type: 'String', visibility: 'public' },
            { name: 'roleName', type: 'String', visibility: 'public' },
            { name: 'roleType', type: 'String', visibility: 'public' },
            { name: 'orgId', type: 'String', visibility: 'public' },
        ],
        methods: [
            { name: 'assign', params: [{ name: 'orgId', type: 'String' }, { name: 'adminId', type: 'String' }], returnType: 'void', visibility: 'public' },
            { name: 'unassign', params: [], returnType: 'void', visibility: 'public' },
            { name: 'copy', params: [{ name: 'fromOrgId', type: 'String' }, { name: 'toOrgId', type: 'String' }], returnType: 'CopyResult', visibility: 'public' },
        ],
    },
    '用户': {
        name: 'User',
        stereotype: 'entity',
        attributes: [
            { name: 'userId', type: 'String', visibility: 'public' },
            { name: 'userCode', type: 'String', visibility: 'public' },
            { name: 'userName', type: 'String', visibility: 'public' },
            { name: 'orgId', type: 'String', visibility: 'public' },
        ],
        methods: [
            { name: 'login', params: [{ name: 'userCode', type: 'String' }, { name: 'password', type: 'String' }], returnType: 'LoginResult', visibility: 'public' },
            { name: 'resetPassword', params: [], returnType: 'void', visibility: 'public' },
        ],
    },
    // ===== BEMP 票据系统业务实体（扩展词典）=====
    '票据': {
        name: 'Bill',
        stereotype: 'entity',
        attributes: [
            { name: 'billNo', type: 'String', visibility: 'public' },
            { name: 'billType', type: 'String', visibility: 'public' },
            { name: 'amount', type: 'BigDecimal', visibility: 'public' },
            { name: 'drawerOrgId', type: 'String', visibility: 'public' },
            { name: 'drawerName', type: 'String', visibility: 'public' },
            { name: 'acceptorOrgId', type: 'String', visibility: 'public' },
            { name: 'issueDate', type: 'Date', visibility: 'public' },
            { name: 'dueDate', type: 'Date', visibility: 'public' },
            { name: 'status', type: 'String', visibility: 'public' },
        ],
        methods: [
            { name: 'register', params: [], returnType: 'BillResult', visibility: 'public' },
            { name: 'discount', params: [{ name: 'orgId', type: 'String' }], returnType: 'DiscountResult', visibility: 'public' },
            { name: 'endorse', params: [{ name: 'toOrgId', type: 'String' }], returnType: 'EndorseResult', visibility: 'public' },
            { name: 'redeem', params: [], returnType: 'RedeemResult', visibility: 'public' },
        ],
    },
    '客户': {
        name: 'Customer',
        stereotype: 'entity',
        attributes: [
            { name: 'customerId', type: 'String', visibility: 'public' },
            { name: 'customerCode', type: 'String', visibility: 'public' },
            { name: 'customerName', type: 'String', visibility: 'public' },
            { name: 'customerType', type: 'String', visibility: 'public' },
            { name: 'creditLimit', type: 'BigDecimal', visibility: 'public' },
            { name: 'orgId', type: 'String', visibility: 'public' },
            { name: 'status', type: 'String', visibility: 'public' },
        ],
        methods: [
            { name: 'add', params: [], returnType: 'void', visibility: 'public' },
            { name: 'update', params: [], returnType: 'void', visibility: 'public' },
            { name: 'query', params: [{ name: 'condition', type: 'String' }], returnType: 'List<Customer>', visibility: 'public' },
            { name: 'calculateCredit', params: [], returnType: 'BigDecimal', visibility: 'public' },
        ],
    },
    '产品': {
        name: 'Product',
        stereotype: 'entity',
        attributes: [
            { name: 'productId', type: 'String', visibility: 'public' },
            { name: 'productCode', type: 'String', visibility: 'public' },
            { name: 'productName', type: 'String', visibility: 'public' },
            { name: 'productType', type: 'String', visibility: 'public' },
            { name: 'rate', type: 'BigDecimal', visibility: 'public' },
            { name: 'validFrom', type: 'Date', visibility: 'public' },
            { name: 'validTo', type: 'Date', visibility: 'public' },
        ],
        methods: [
            { name: 'create', params: [], returnType: 'void', visibility: 'public' },
            { name: 'query', params: [{ name: 'condition', type: 'String' }], returnType: 'List<Product>', visibility: 'public' },
            { name: 'price', params: [{ name: 'amount', type: 'BigDecimal' }], returnType: 'BigDecimal', visibility: 'public' },
        ],
    },
    '合同': {
        name: 'Contract',
        stereotype: 'entity',
        attributes: [
            { name: 'contractId', type: 'String', visibility: 'public' },
            { name: 'contractNo', type: 'String', visibility: 'public' },
            { name: 'customerId', type: 'String', visibility: 'public' },
            { name: 'signDate', type: 'Date', visibility: 'public' },
            { name: 'expireDate', type: 'Date', visibility: 'public' },
            { name: 'amount', type: 'BigDecimal', visibility: 'public' },
            { name: 'status', type: 'String', visibility: 'public' },
        ],
        methods: [
            { name: 'sign', params: [], returnType: 'SignResult', visibility: 'public' },
            { name: 'query', params: [{ name: 'condition', type: 'String' }], returnType: 'List<Contract>', visibility: 'public' },
            { name: 'terminate', params: [], returnType: 'void', visibility: 'public' },
        ],
    },
    '授信': {
        name: 'Credit',
        stereotype: 'entity',
        attributes: [
            { name: 'creditId', type: 'String', visibility: 'public' },
            { name: 'customerId', type: 'String', visibility: 'public' },
            { name: 'totalAmount', type: 'BigDecimal', visibility: 'public' },
            { name: 'usedAmount', type: 'BigDecimal', visibility: 'public' },
            { name: 'availableAmount', type: 'BigDecimal', visibility: 'public' },
            { name: 'expireDate', type: 'Date', visibility: 'public' },
        ],
        methods: [
            { name: 'occupy', params: [{ name: 'amount', type: 'BigDecimal' }], returnType: 'void', visibility: 'public' },
            { name: 'release', params: [{ name: 'amount', type: 'BigDecimal' }], returnType: 'void', visibility: 'public' },
            { name: 'query', params: [{ name: 'customerId', type: 'String' }], returnType: 'Credit', visibility: 'public' },
        ],
    },
    '批次': {
        name: 'Batch',
        stereotype: 'entity',
        attributes: [
            { name: 'batchId', type: 'String', visibility: 'public' },
            { name: 'batchNo', type: 'String', visibility: 'public' },
            { name: 'totalCount', type: 'Integer', visibility: 'public' },
            { name: 'successCount', type: 'Integer', visibility: 'public' },
            { name: 'failCount', type: 'Integer', visibility: 'public' },
            { name: 'createTime', type: 'Date', visibility: 'public' },
            { name: 'status', type: 'String', visibility: 'public' },
        ],
        methods: [
            { name: 'importData', params: [{ name: 'file', type: 'MultipartFile' }], returnType: 'BatchResult', visibility: 'public' },
            { name: 'query', params: [{ name: 'condition', type: 'String' }], returnType: 'List<Batch>', visibility: 'public' },
        ],
    },
    '凭证': {
        name: 'Voucher',
        stereotype: 'entity',
        attributes: [
            { name: 'voucherId', type: 'String', visibility: 'public' },
            { name: 'voucherNo', type: 'String', visibility: 'public' },
            { name: 'bizType', type: 'String', visibility: 'public' },
            { name: 'debitAmount', type: 'BigDecimal', visibility: 'public' },
            { name: 'creditAmount', type: 'BigDecimal', visibility: 'public' },
            { name: 'accountDate', type: 'Date', visibility: 'public' },
        ],
        methods: [
            { name: 'generate', params: [{ name: 'bizEvent', type: 'BizEvent' }], returnType: 'Voucher', visibility: 'public' },
            { name: 'post', params: [], returnType: 'PostResult', visibility: 'public' },
        ],
    },
};

// =====================================================================
// 2. 操作动词映射（生成顺序图）
// =====================================================================

const OPERATION_KEYWORDS = {
    '批量导入': {
        name: '批量导入',
        actors: ['用户', '前端UI', 'OrgController', 'OrgService', 'ExcelParser', 'OrgRepository', '数据库'],
        steps: [
            { from: '用户', to: '前端UI', message: '点击"批量导入"按钮' },
            { from: '前端UI', to: '前端UI', message: '弹出文件选择框', type: 'self' },
            { from: '用户', to: '前端UI', message: '选择Excel文件' },
            { from: '前端UI', to: 'OrgController', message: '上传文件（multipart/form-data）' },
            { from: 'OrgController', to: 'OrgService', message: '调用 batchImport(file)' },
            { from: 'OrgService', to: 'ExcelParser', message: '解析Excel数据' },
            { from: 'ExcelParser', to: 'OrgService', message: '返回List<OrgDTO>', type: 'return' },
            { from: 'OrgService', to: 'OrgService', message: '逐条校验：必输/唯一/层级' },
            { from: 'OrgService', to: 'OrgRepository', message: '批量插入合法记录' },
            { from: 'OrgRepository', to: '数据库', message: 'INSERT INTO T_ORG ...' },
            { from: '数据库', to: 'OrgRepository', message: '返回受影响行数', type: 'return' },
            { from: 'OrgService', to: 'OrgController', message: '返回ImportResult(成功/失败明细)', type: 'return' },
            { from: 'OrgController', to: '前端UI', message: 'JSON响应' },
            { from: '前端UI', to: '用户', message: '提示导入结果' },
        ],
        notes: [
            { at: 'OrgService', text: '校验规则：\n1. 上级机构必选\n2. 机构号/名称/核算机构号/组织机构代码不可重复\n3. 票交所机构代码非必输\n4. 层级≤4级' },
        ],
    },
    '模版下载': {
        name: '模版下载',
        actors: ['用户', '前端UI', 'OrgController', 'TemplateService', '文件系统'],
        steps: [
            { from: '用户', to: '前端UI', message: '点击"模版下载"按钮' },
            { from: '前端UI', to: 'OrgController', message: 'GET /org/downloadTemplate' },
            { from: 'OrgController', to: 'TemplateService', message: '获取导入模版' },
            { from: 'TemplateService', to: '文件系统', message: '读取"机构信息导入模版.xls"' },
            { from: '文件系统', to: 'TemplateService', message: '返回字节流', type: 'return' },
            { from: 'TemplateService', to: 'OrgController', message: '包装为Resource', type: 'return' },
            { from: 'OrgController', to: '前端UI', message: '设置Content-Disposition: attachment' },
            { from: '前端UI', to: '用户', message: '浏览器下载文件' },
        ],
    },
    '批量复制角色': {
        name: '批量复制角色',
        actors: ['用户', '前端UI', 'RoleController', 'RoleService', 'RoleRepository', '数据库'],
        steps: [
            { from: '用户', to: '前端UI', message: '点击"批量复制角色"按钮' },
            { from: '前端UI', to: '前端UI', message: '弹出"批量复制角色"对话框', type: 'self' },
            { from: '用户', to: '前端UI', message: '点击"目标机构号"超链接' },
            { from: '前端UI', to: 'RoleController', message: 'GET /org/tree 查询机构树' },
            { from: 'RoleController', to: '用户', message: '弹出"机构名称"选择界面', type: 'return' },
            { from: '用户', to: '前端UI', message: '选择目标机构' },
            { from: '前端UI', to: '前端UI', message: '反显目标机构号/机构名称', type: 'self' },
            { from: '用户', to: '前端UI', message: '点击"确定"' },
            { from: '前端UI', to: 'RoleController', message: 'POST /role/copyRole 携带目标机构IDs' },
            { from: 'RoleController', to: 'RoleService', message: 'copyRole(fromOrgId, toOrgIds)' },
            { from: 'RoleService', to: 'RoleRepository', message: '查询原机构角色列表' },
            { from: 'RoleRepository', to: '数据库', message: 'SELECT * FROM T_ORG_ROLE WHERE ORG_ID=?' },
            { from: '数据库', to: 'RoleRepository', message: '返回角色列表', type: 'return' },
            { from: 'RoleService', to: 'RoleService', message: '校验：要删除的关联角色是否有柜员使用' },
            { from: 'RoleService', to: 'RoleRepository', message: '删除目标机构旧角色' },
            { from: 'RoleService', to: 'RoleRepository', message: '新增原机构角色到目标机构' },
            { from: 'RoleService', to: 'RoleController', message: '返回CopyResult', type: 'return' },
            { from: 'RoleController', to: '前端UI', message: 'JSON响应' },
            { from: '前端UI', to: '用户', message: '提示复制完成，刷新查询界面' },
        ],
        notes: [
            { at: 'RoleService', text: '业务规则：\n1. 用新角色覆盖旧角色\n2. 做关联角色的新增和删除\n3. 若待删除角色被柜员使用则报错："角色[xxx]为机构下用户使用不能去除与当前机构关系"' },
        ],
    },
    // ===== BEMP 票据系统业务操作（扩展顺序图模板）=====
    '票据贴现': {
        name: '票据贴现',
        actors: ['企业客户', '网银/柜面', 'BillController', 'BillService', 'CreditService', 'BillRepository', '数据库'],
        steps: [
            { from: '企业客户', to: '网银/柜面', message: '发起贴现申请（票号/金额/利率）' },
            { from: '网银/柜面', to: 'BillController', message: 'POST /bill/discount' },
            { from: 'BillController', to: 'BillService', message: 'discount(billNo, orgId, amount)' },
            { from: 'BillService', to: 'BillRepository', message: '查询票据信息（票号/状态）' },
            { from: 'BillRepository', to: '数据库', message: 'SELECT * FROM T_BILL WHERE BILL_NO=?' },
            { from: '数据库', to: 'BillRepository', message: '返回票据记录', type: 'return' },
            { from: 'BillService', to: 'CreditService', message: 'checkCredit(customerId, amount)' },
            { from: 'CreditService', to: '数据库', message: 'SELECT USED/TOTAL FROM T_CREDIT' },
            { from: '数据库', to: 'CreditService', message: '返回授信余额', type: 'return' },
            { from: 'CreditService', to: 'BillService', message: '返回授信校验结果', type: 'return' },
            { from: 'BillService', to: 'BillService', message: '计算贴现利息 = 票面*利率*天数/360' },
            { from: 'BillService', to: 'BillRepository', message: '更新票据状态=已贴现' },
            { from: 'BillService', to: 'BillController', message: '返回DiscountResult(实付金额/利息)', type: 'return' },
            { from: 'BillController', to: '网银/柜面', message: 'JSON响应' },
            { from: '网银/柜面', to: '企业客户', message: '显示贴现成功' },
        ],
        notes: [
            { at: 'BillService', text: '贴现规则：\n1. 票据状态必须为"已签发/可流通"\n2. 到期日>贴现日\n3. 贴现利息按天数计算\n4. 占用客户授信额度' },
        ],
    },
    '票据承兑': {
        name: '票据承兑',
        actors: ['出票人', '网银/柜面', 'AcceptController', 'AcceptService', 'BillRepository', '数据库'],
        steps: [
            { from: '出票人', to: '网银/柜面', message: '提交承兑申请（票号/收款人/金额）' },
            { from: '网银/柜面', to: 'AcceptController', message: 'POST /bill/accept' },
            { from: 'AcceptController', to: 'AcceptService', message: 'accept(billNo, acceptorOrgId)' },
            { from: 'AcceptService', to: 'BillRepository', message: '查询票据' },
            { from: 'BillRepository', to: '数据库', message: 'SELECT * FROM T_BILL' },
            { from: '数据库', to: 'BillRepository', message: '返回票据', type: 'return' },
            { from: 'AcceptService', to: 'AcceptService', message: '校验承兑人资质/账户余额' },
            { from: 'AcceptService', to: 'BillRepository', message: '更新票据状态=已承兑' },
            { from: 'AcceptService', to: 'AcceptController', message: '返回AcceptResult', type: 'return' },
            { from: 'AcceptController', to: '网银/柜面', message: 'JSON响应' },
        ],
    },
    '票据背书转让': {
        name: '票据背书转让',
        actors: ['持票人', '被背书人', '网银/柜面', 'EndorseController', 'EndorseService', 'BillRepository', '数据库'],
        steps: [
            { from: '持票人', to: '网银/柜面', message: '提交背书申请（票号/被背书人）' },
            { from: '网银/柜面', to: 'EndorseController', message: 'POST /bill/endorse' },
            { from: 'EndorseController', to: 'EndorseService', message: 'endorse(billNo, fromOrgId, toOrgId)' },
            { from: 'EndorseService', to: 'BillRepository', message: '查询票据当前持有人' },
            { from: 'BillRepository', to: '数据库', message: 'SELECT HOLDER FROM T_BILL' },
            { from: '数据库', to: 'BillRepository', message: '返回持有人', type: 'return' },
            { from: 'EndorseService', to: 'EndorseService', message: '校验：持票人==fromOrgId' },
            { from: 'EndorseService', to: 'BillRepository', message: '更新票据持有人=toOrgId' },
            { from: 'EndorseService', to: 'EndorseController', message: '返回EndorseResult', type: 'return' },
            { from: 'EndorseController', to: '网银/柜面', message: 'JSON响应' },
            { from: '网银/柜面', to: '被背书人', message: '通知背书成功' },
        ],
    },
    '票据质押': {
        name: '票据质押',
        actors: ['持票人', '质权人', 'PledgeController', 'PledgeService', 'BillRepository', '数据库'],
        steps: [
            { from: '持票人', to: 'PledgeController', message: 'POST /bill/pledge 提交质押申请' },
            { from: 'PledgeController', to: 'PledgeService', message: 'pledge(billNo, pledgeeOrgId)' },
            { from: 'PledgeService', to: 'BillRepository', message: '查询票据状态' },
            { from: 'BillRepository', to: '数据库', message: 'SELECT * FROM T_BILL' },
            { from: '数据库', to: 'BillRepository', message: '返回票据', type: 'return' },
            { from: 'PledgeService', to: 'PledgeService', message: '校验票据可质押（未质押/未冻结）' },
            { from: 'PledgeService', to: 'BillRepository', message: '更新票据状态=已质押' },
            { from: 'PledgeService', to: 'PledgeController', message: '返回PledgeResult', type: 'return' },
        ],
    },
    '票据到期托收': {
        name: '票据到期托收',
        actors: ['持票人', 'CollectController', 'CollectService', 'BillRepository', 'VoucherService', '数据库'],
        steps: [
            { from: '持票人', to: 'CollectController', message: 'POST /bill/collect 到期托收' },
            { from: 'CollectController', to: 'CollectService', message: 'collect(billNo)' },
            { from: 'CollectService', to: 'BillRepository', message: '查询票据（票号/到期日）' },
            { from: 'BillRepository', to: '数据库', message: 'SELECT * FROM T_BILL' },
            { from: '数据库', to: 'BillRepository', message: '返回票据', type: 'return' },
            { from: 'CollectService', to: 'CollectService', message: '校验：到期日<=当前日' },
            { from: 'CollectService', to: 'VoucherService', message: '生成托收凭证' },
            { from: 'VoucherService', to: '数据库', message: 'INSERT INTO T_VOUCHER' },
            { from: 'VoucherService', to: 'CollectService', message: '返回凭证号', type: 'return' },
            { from: 'CollectService', to: 'CollectController', message: '返回CollectResult', type: 'return' },
        ],
    },
    '客户授信': {
        name: '客户授信',
        actors: ['客户经理', 'CreditController', 'CreditService', 'CreditRepository', '数据库'],
        steps: [
            { from: '客户经理', to: 'CreditController', message: 'POST /credit/grant 授信申请' },
            { from: 'CreditController', to: 'CreditService', message: 'grant(customerId, amount, term)' },
            { from: 'CreditService', to: 'CreditRepository', message: '查询客户当前授信' },
            { from: 'CreditRepository', to: '数据库', message: 'SELECT * FROM T_CREDIT WHERE CUSTOMER_ID=?' },
            { from: '数据库', to: 'CreditRepository', message: '返回授信记录', type: 'return' },
            { from: 'CreditService', to: 'CreditService', message: '校验：金额>0 / 客户状态正常' },
            { from: 'CreditService', to: 'CreditRepository', message: '新增/更新授信记录' },
            { from: 'CreditRepository', to: '数据库', message: 'INSERT/UPDATE T_CREDIT' },
            { from: 'CreditService', to: 'CreditController', message: '返回CreditResult', type: 'return' },
        ],
    },
};

// =====================================================================
// 3. 业务流程模板（泳道图）
// =====================================================================

const DEFAULT_LANES = [
    { id: 'user', label: '用户', role: '法人管理员/操作员' },
    { id: 'frontend', label: '前端UI', role: 'Web/移动端' },
    { id: 'backend', label: '后端服务', role: 'Controller/Service层' },
    { id: 'storage', label: '数据存储', role: '数据库/文件系统' },
];

/**
 * 业务规则 → 泳道任务映射
 */
const BUSINESS_FLOW_TEMPLATES = {
    '机构管理': {
        title: '机构管理业务流程',
        lanes: DEFAULT_LANES,
        tasks: [
            { id: 't1', label: '进入机构管理菜单', lane: 'user', type: 'start' },
            { id: 't2', label: '展示机构列表', lane: 'frontend' },
            { id: 't3', label: '查询机构数据', lane: 'backend' },
            { id: 't4', label: '返回结果集', lane: 'storage' },
            { id: 't5', label: '选择操作（新增/修改/删除/导入/复制）', lane: 'user' },
            { id: 't6', label: '提交操作请求', lane: 'frontend' },
            { id: 't7', label: '执行业务逻辑', lane: 'backend' },
            { id: 't8', label: '持久化到数据库', lane: 'backend' },
            { id: 't9', label: '返回操作结果', lane: 'storage' },
            { id: 't10', label: '反馈给用户', lane: 'frontend' },
            { id: 't11', label: '操作完成', lane: 'user', type: 'end' },
        ],
        flows: [
            { from: 't1', to: 't2' },
            { from: 't2', to: 't3' },
            { from: 't3', to: 't4' },
            { from: 't4', to: 't5' },
            { from: 't5', to: 't6' },
            { from: 't6', to: 't7' },
            { from: 't7', to: 't8' },
            { from: 't8', to: 't9' },
            { from: 't9', to: 't10' },
            { from: 't10', to: 't11' },
        ],
    },
    '机构管理员管理': {
        title: '机构管理员管理业务流程',
        lanes: DEFAULT_LANES,
        tasks: [
            { id: 'a1', label: '进入机构管理员管理菜单', lane: 'user', type: 'start' },
            { id: 'a2', label: '展示管理员列表', lane: 'frontend' },
            { id: 'a3', label: '查询管理员数据', lane: 'backend' },
            { id: 'a4', label: '返回结果集', lane: 'storage' },
            { id: 'a5', label: '选择操作（新增/删除/重置/导入/复制）', lane: 'user' },
            { id: 'a6', label: '提交操作请求', lane: 'frontend' },
            { id: 'a7', label: '执行业务逻辑', lane: 'backend' },
            { id: 'a8', label: '持久化到数据库', lane: 'backend' },
            { id: 'a9', label: '返回操作结果', lane: 'storage' },
            { id: 'a10', label: '反馈给用户', lane: 'frontend' },
            { id: 'a11', label: '操作完成', lane: 'user', type: 'end' },
        ],
        flows: [
            { from: 'a1', to: 'a2' },
            { from: 'a2', to: 'a3' },
            { from: 'a3', to: 'a4' },
            { from: 'a4', to: 'a5' },
            { from: 'a5', to: 'a6' },
            { from: 'a6', to: 'a7' },
            { from: 'a7', to: 'a8' },
            { from: 'a8', to: 'a9' },
            { from: 'a9', to: 'a10' },
            { from: 'a10', to: 'a11' },
        ],
    },
};

// =====================================================================
// 4. 时序图模板（状态随时间变化）
// =====================================================================

const TIMING_TEMPLATES = {
    '批量导入': {
        title: '批量导入操作时序',
        participants: [
            {
                id: 'import',
                label: '导入任务',
                states: [
                    { from: 0, to: 1, state: 'idle' },
                    { from: 1, to: 3, state: 'parsing' },
                    { from: 3, to: 5, state: 'validating' },
                    { from: 5, to: 7, state: 'persisting' },
                    { from: 7, to: 9, state: 'success' },
                ],
            },
            {
                id: 'validate',
                label: '校验阶段',
                states: [
                    { from: 0, to: 3, state: 'waiting' },
                    { from: 3, to: 5, state: 'active' },
                    { from: 5, to: 9, state: 'idle' },
                ],
            },
            {
                id: 'persist',
                label: '持久化',
                states: [
                    { from: 0, to: 5, state: 'waiting' },
                    { from: 5, to: 7, state: 'active' },
                    { from: 7, to: 9, state: 'idle' },
                ],
            },
        ],
        timeMarkers: [
            { time: 0, label: 't0:开始' },
            { time: 1, label: 't1:文件接收' },
            { time: 3, label: 't3:解析完成' },
            { time: 5, label: 't5:校验通过' },
            { time: 7, label: 't7:持久化完成' },
            { time: 9, label: 't9:任务结束' },
        ],
    },
    '批量复制角色': {
        title: '批量复制角色时序',
        participants: [
            {
                id: 'copy',
                label: '复制任务',
                states: [
                    { from: 0, to: 1, state: 'idle' },
                    { from: 1, to: 3, state: 'querying' },
                    { from: 3, to: 5, state: 'checking' },
                    { from: 5, to: 7, state: 'deleting' },
                    { from: 7, to: 8, state: 'inserting' },
                    { from: 8, to: 10, state: 'success' },
                ],
            },
            {
                id: 'check',
                label: '使用方校验',
                states: [
                    { from: 0, to: 3, state: 'waiting' },
                    { from: 3, to: 5, state: 'active' },
                    { from: 5, to: 10, state: 'idle' },
                ],
            },
        ],
        timeMarkers: [
            { time: 0, label: 't0:点击确定' },
            { time: 1, label: 't1:接收参数' },
            { time: 3, label: 't3:查询原角色' },
            { time: 5, label: 't5:校验通过' },
            { time: 7, label: 't7:删除旧角色' },
            { time: 8, label: 't8:新增新角色' },
            { time: 10, label: 't10:完成' },
        ],
    },
};

// =====================================================================
// 5. 需求文本解析器
// =====================================================================

class RequirementUmlExtractor {
    constructor(options = {}) {
        this.options = options;
    }

    /**
     * 主入口：从需求文本生成 5 种图表所需数据
     * @param {string} requirementText
     * @returns {Object} 包含 classDiagram / sequenceDiagrams / activityDiagrams / businessFlows / timingDiagrams
     */
    extract(requirementText) {
        if (!requirementText || typeof requirementText !== 'string') {
            return this._empty();
        }

        return {
            classDiagram: this.extractClassDiagram(requirementText),
            sequenceDiagrams: this.extractSequenceDiagrams(requirementText),
            activityDiagrams: this.extractActivityDiagrams(requirementText),
            businessFlows: this.extractBusinessFlows(requirementText),
            timingDiagrams: this.extractTimingDiagrams(requirementText),
        };
    }

    /**
     * 抽取类图数据
     * 策略：扫描业务实体关键词 → 命中预定义类 → 推断关系
     */
    extractClassDiagram(text) {
        const classes = [];
        const relations = [];
        const found = new Set();

        for (const [keyword, classDef] of Object.entries(ENTITY_DICT)) {
            if (text.includes(keyword) && !found.has(classDef.name)) {
                found.add(classDef.name);
                classes.push({
                    name: classDef.name,
                    stereotype: classDef.stereotype,
                    attributes: classDef.attributes,
                    methods: classDef.methods,
                });
            }
        }

        // 关系推导
        if (found.has('Org') && found.has('OrgAdmin')) {
            relations.push({
                from: 'OrgAdmin',
                to: 'Org',
                type: 'association',
                label: 'belongs to',
                fromMultiplicity: '*',
                toMultiplicity: '1',
            });
        }
        if (found.has('Org') && found.has('Role')) {
            relations.push({
                from: 'Org',
                to: 'Role',
                type: 'aggregation',
                label: 'owns',
                fromMultiplicity: '1',
                toMultiplicity: '*',
            });
        }
        if (found.has('OrgAdmin') && found.has('User')) {
            relations.push({
                from: 'OrgAdmin',
                to: 'User',
                type: 'inheritance',
                label: 'extends',
            });
        }
        if (found.has('OrgAdmin') && found.has('Role')) {
            relations.push({
                from: 'OrgAdmin',
                to: 'Role',
                type: 'association',
                label: 'has',
                fromMultiplicity: '*',
                toMultiplicity: '*',
            });
        }

        return {
            title: '业务实体类图',
            classes,
            relations,
        };
    }

    /**
     * 抽取顺序图数据
     * 策略：识别"批量X"、"模板下载"等操作关键词 → 返回对应的消息流模板
     */
    extractSequenceDiagrams(text) {
        const diagrams = [];
        for (const [keyword, op] of Object.entries(OPERATION_KEYWORDS)) {
            if (text.includes(keyword)) {
                diagrams.push({
                    name: op.name,
                    title: `${op.name}顺序图`,
                    actors: op.actors.map(a => ({ id: a, label: a })),
                    messages: op.steps,
                    notes: op.notes || [],
                });
            }
        }
        return diagrams;
    }

    /**
     * 抽取活动图数据
     * 策略：从"业务规则"有序列表提取步骤 + 判断分支
     */
    extractActivityDiagrams(text) {
        const diagrams = [];

        // 模板 1：批量导入的活动图
        if (text.includes('批量导入')) {
            diagrams.push({
                name: '批量导入',
                title: '批量导入活动图',
                nodes: [
                    { id: 'start', label: '开始', type: 'start' },
                    { id: 'selectFile', label: '选择Excel文件', type: 'action' },
                    { id: 'parse', label: '解析Excel数据', type: 'action' },
                    { id: 'checkEmpty', label: '是否有数据？', type: 'decision' },
                    { id: 'end_empty', label: '结束（空文件）', type: 'end' },
                    { id: 'validate', label: '逐条校验（必输/唯一/层级）', type: 'action' },
                    { id: 'checkValid', label: '校验通过？', type: 'decision' },
                    { id: 'persist', label: '批量插入数据库', type: 'action' },
                    { id: 'showResult', label: '显示导入结果（成功/失败明细）', type: 'action' },
                    { id: 'end_success', label: '结束', type: 'end' },
                ],
                edges: [
                    { from: 'start', to: 'selectFile' },
                    { from: 'selectFile', to: 'parse' },
                    { from: 'parse', to: 'checkEmpty' },
                    { from: 'checkEmpty', to: 'end_empty', label: '否' },
                    { from: 'checkEmpty', to: 'validate', label: '是' },
                    { from: 'validate', to: 'checkValid' },
                    { from: 'checkValid', to: 'persist', label: '是' },
                    { from: 'checkValid', to: 'showResult', label: '否' },
                    { from: 'persist', to: 'showResult' },
                    { from: 'showResult', to: 'end_success' },
                ],
                branches: [
                    { from: 'checkEmpty', label: '否', target: 'end_empty' },
                    { from: 'checkEmpty', label: '是', target: 'validate' },
                    { from: 'checkValid', label: '是', target: 'persist' },
                    { from: 'checkValid', label: '否', target: 'showResult' },
                ],
            });
        }

        // 模板 2：批量复制角色的活动图
        if (text.includes('批量复制角色')) {
            diagrams.push({
                name: '批量复制角色',
                title: '批量复制角色活动图',
                nodes: [
                    { id: 'start', label: '开始', type: 'start' },
                    { id: 'clickCopy', label: '点击"批量复制角色"', type: 'action' },
                    { id: 'selectTarget', label: '选择目标机构', type: 'action' },
                    { id: 'checkRequired', label: '必输项已选？', type: 'decision' },
                    { id: 'showErr', label: '提示"必输项未录"', type: 'action' },
                    { id: 'end_cancel', label: '结束（取消）', type: 'end' },
                    { id: 'queryRole', label: '查询原机构角色', type: 'action' },
                    { id: 'checkUsage', label: '角色被柜员使用？', type: 'decision' },
                    { id: 'showRoleErr', label: '报错"角色[xxx]为机构下用户使用不能去除"', type: 'action' },
                    { id: 'deleteOld', label: '删除目标机构旧角色', type: 'action' },
                    { id: 'insertNew', label: '新增原机构角色到目标机构', type: 'action' },
                    { id: 'refresh', label: '刷新查询界面', type: 'action' },
                    { id: 'end_success', label: '结束', type: 'end' },
                ],
                edges: [
                    { from: 'start', to: 'clickCopy' },
                    { from: 'clickCopy', to: 'selectTarget' },
                    { from: 'selectTarget', to: 'checkRequired' },
                    { from: 'checkRequired', to: 'showErr', label: '否' },
                    { from: 'checkRequired', to: 'queryRole', label: '是' },
                    { from: 'showErr', to: 'end_cancel' },
                    { from: 'queryRole', to: 'checkUsage' },
                    { from: 'checkUsage', to: 'showRoleErr', label: '是' },
                    { from: 'checkUsage', to: 'deleteOld', label: '否' },
                    { from: 'showRoleErr', to: 'end_cancel' },
                    { from: 'deleteOld', to: 'insertNew' },
                    { from: 'insertNew', to: 'refresh' },
                    { from: 'refresh', to: 'end_success' },
                ],
                branches: [
                    { from: 'checkRequired', label: '否', target: 'showErr' },
                    { from: 'checkUsage', label: '是', target: 'showRoleErr' },
                ],
            });
        }

        // ===== BEMP 票据系统业务活动图（扩展）=====
        // 模板 3：票据贴现活动图
        if (text.includes('贴现')) {
            diagrams.push({
                name: '票据贴现',
                title: '票据贴现活动图',
                nodes: [
                    { id: 'start', label: '开始', type: 'start' },
                    { id: 'applyDiscount', label: '企业发起贴现申请', type: 'action' },
                    { id: 'checkBill', label: '票据状态合法？', type: 'decision' },
                    { id: 'rejectBill', label: '提示"票据不可贴现"', type: 'action' },
                    { id: 'end_reject', label: '结束（失败）', type: 'end' },
                    { id: 'checkCredit', label: '客户授信充足？', type: 'decision' },
                    { id: 'rejectCredit', label: '提示"授信不足"', type: 'action' },
                    { id: 'end_reject2', label: '结束（失败）', type: 'end' },
                    { id: 'calcInterest', label: '计算贴现利息', type: 'action' },
                    { id: 'persist', label: '更新票据状态=已贴现', type: 'action' },
                    { id: 'genVoucher', label: '生成贴现凭证', type: 'action' },
                    { id: 'notify', label: '通知客户/财务', type: 'action' },
                    { id: 'end_success', label: '结束', type: 'end' },
                ],
                edges: [
                    { from: 'start', to: 'applyDiscount' },
                    { from: 'applyDiscount', to: 'checkBill' },
                    { from: 'checkBill', to: 'rejectBill', label: '否' },
                    { from: 'checkBill', to: 'checkCredit', label: '是' },
                    { from: 'rejectBill', to: 'end_reject' },
                    { from: 'checkCredit', to: 'rejectCredit', label: '否' },
                    { from: 'checkCredit', to: 'calcInterest', label: '是' },
                    { from: 'rejectCredit', to: 'end_reject2' },
                    { from: 'calcInterest', to: 'persist' },
                    { from: 'persist', to: 'genVoucher' },
                    { from: 'genVoucher', to: 'notify' },
                    { from: 'notify', to: 'end_success' },
                ],
            });
        }

        // 模板 4：票据承兑活动图
        if (text.includes('承兑')) {
            diagrams.push({
                name: '票据承兑',
                title: '票据承兑活动图',
                nodes: [
                    { id: 'start', label: '开始', type: 'start' },
                    { id: 'submitAccept', label: '出票人提交承兑申请', type: 'action' },
                    { id: 'checkAcceptor', label: '承兑人资质校验', type: 'action' },
                    { id: 'checkOk', label: '校验通过？', type: 'decision' },
                    { id: 'reject', label: '提示"资质不符"', type: 'action' },
                    { id: 'end_reject', label: '结束（失败）', type: 'end' },
                    { id: 'updateStatus', label: '更新票据状态=已承兑', type: 'action' },
                    { id: 'sign', label: '电子签名/盖章', type: 'action' },
                    { id: 'notify', label: '通知出票人/收款人', type: 'action' },
                    { id: 'end_success', label: '结束', type: 'end' },
                ],
                edges: [
                    { from: 'start', to: 'submitAccept' },
                    { from: 'submitAccept', to: 'checkAcceptor' },
                    { from: 'checkAcceptor', to: 'checkOk' },
                    { from: 'checkOk', to: 'reject', label: '否' },
                    { from: 'checkOk', to: 'updateStatus', label: '是' },
                    { from: 'reject', to: 'end_reject' },
                    { from: 'updateStatus', to: 'sign' },
                    { from: 'sign', to: 'notify' },
                    { from: 'notify', to: 'end_success' },
                ],
            });
        }

        // 模板 5：票据背书转让活动图
        if (text.includes('背书') || text.includes('转让')) {
            diagrams.push({
                name: '票据背书转让',
                title: '票据背书转让活动图',
                nodes: [
                    { id: 'start', label: '开始', type: 'start' },
                    { id: 'submit', label: '持票人提交背书申请', type: 'action' },
                    { id: 'checkHolder', label: '持票人合法？', type: 'decision' },
                    { id: 'reject', label: '提示"非持票人无权背书"', type: 'action' },
                    { id: 'end_reject', label: '结束（失败）', type: 'end' },
                    { id: 'checkStatus', label: '票据可背书？', type: 'decision' },
                    { id: 'rejectStatus', label: '提示"票据已冻结/质押"', type: 'action' },
                    { id: 'end_reject2', label: '结束（失败）', type: 'end' },
                    { id: 'updateHolder', label: '更新票据持有人', type: 'action' },
                    { id: 'genVoucher', label: '生成背书凭证', type: 'action' },
                    { id: 'notify', label: '通知被背书人', type: 'action' },
                    { id: 'end_success', label: '结束', type: 'end' },
                ],
                edges: [
                    { from: 'start', to: 'submit' },
                    { from: 'submit', to: 'checkHolder' },
                    { from: 'checkHolder', to: 'reject', label: '否' },
                    { from: 'checkHolder', to: 'checkStatus', label: '是' },
                    { from: 'reject', to: 'end_reject' },
                    { from: 'checkStatus', to: 'rejectStatus', label: '否' },
                    { from: 'checkStatus', to: 'updateHolder', label: '是' },
                    { from: 'rejectStatus', to: 'end_reject2' },
                    { from: 'updateHolder', to: 'genVoucher' },
                    { from: 'genVoucher', to: 'notify' },
                    { from: 'notify', to: 'end_success' },
                ],
            });
        }

        // 模板 6：客户授信活动图
        if (text.includes('授信')) {
            diagrams.push({
                name: '客户授信',
                title: '客户授信活动图',
                nodes: [
                    { id: 'start', label: '开始', type: 'start' },
                    { id: 'apply', label: '客户经理提交授信申请', type: 'action' },
                    { id: 'checkCust', label: '客户状态正常？', type: 'decision' },
                    { id: 'reject', label: '提示"客户状态异常"', type: 'action' },
                    { id: 'end_reject', label: '结束（失败）', type: 'end' },
                    { id: 'checkAmt', label: '金额合法？', type: 'decision' },
                    { id: 'rejectAmt', label: '提示"金额错误"', type: 'action' },
                    { id: 'end_reject2', label: '结束（失败）', type: 'end' },
                    { id: 'review', label: '风控审核', type: 'action' },
                    { id: 'checkReview', label: '审核通过？', type: 'decision' },
                    { id: 'rejectReview', label: '提示"审核未通过"', type: 'action' },
                    { id: 'end_reject3', label: '结束（失败）', type: 'end' },
                    { id: 'persist', label: '新增/更新授信记录', type: 'action' },
                    { id: 'notify', label: '通知客户经理', type: 'action' },
                    { id: 'end_success', label: '结束', type: 'end' },
                ],
                edges: [
                    { from: 'start', to: 'apply' },
                    { from: 'apply', to: 'checkCust' },
                    { from: 'checkCust', to: 'reject', label: '否' },
                    { from: 'checkCust', to: 'checkAmt', label: '是' },
                    { from: 'reject', to: 'end_reject' },
                    { from: 'checkAmt', to: 'rejectAmt', label: '否' },
                    { from: 'checkAmt', to: 'review', label: '是' },
                    { from: 'rejectAmt', to: 'end_reject2' },
                    { from: 'review', to: 'checkReview' },
                    { from: 'checkReview', to: 'rejectReview', label: '否' },
                    { from: 'checkReview', to: 'persist', label: '是' },
                    { from: 'rejectReview', to: 'end_reject3' },
                    { from: 'persist', to: 'notify' },
                    { from: 'notify', to: 'end_success' },
                ],
            });
        }

        return diagrams;
    }

    /**
     * 抽取业务流程图数据（带泳道）
     */
    extractBusinessFlows(text) {
        const flows = [];
        for (const [keyword, flow] of Object.entries(BUSINESS_FLOW_TEMPLATES)) {
            if (text.includes(keyword) || text.includes(keyword.replace('管理', ''))) {
                flows.push(flow);
            }
        }
        return flows;
    }

    /**
     * 抽取时序图数据
     */
    extractTimingDiagrams(text) {
        const diagrams = [];
        for (const [keyword, tm] of Object.entries(TIMING_TEMPLATES)) {
            if (text.includes(keyword)) {
                diagrams.push(tm);
            }
        }
        return diagrams;
    }

    _empty() {
        return {
            classDiagram: { title: '类图', classes: [], relations: [] },
            sequenceDiagrams: [],
            activityDiagrams: [],
            businessFlows: [],
            timingDiagrams: [],
        };
    }
}

module.exports = {
    RequirementUmlExtractor,
    ENTITY_DICT,
    OPERATION_KEYWORDS,
    BUSINESS_FLOW_TEMPLATES,
    TIMING_TEMPLATES,
};
