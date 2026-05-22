/**
 * BEMP 前端代码审查 — UI 模式示例
 *
 * 包含规范 §4.1/5.1/26/30/31/32 的正确/错误对照代码
 */

// ============ §4.1 datagrid URL 路径验证 ============

// ✅ 存在个性化 Controller HnnxCustCorpController，使用 /hnnxbank/ 前缀
// <h-datagrid url="/hnnxbank/bm/cust/corp/pageQueryCustCorpList" ...></h-datagrid>

// ✅ 不存在个性化 Controller，使用产品化路径
// <h-datagrid url="/bm/cust/acct/custAcct/func_pageQueryCustAcctList" ...></h-datagrid>

// ❌ 存在个性化 Controller 但未使用 /hnnxbank/ 前缀，请求路由到产品化接口
// <h-datagrid url="/bm/cust/corp/pageQueryCustCorpList" ...></h-datagrid>

// ============ §5.1 组件属性绑定验证 ============

// ❌ showCheckBox 启用多选但 filterable 绑定到业务变量，可能为 false 导致多选失效
// <show-branch :showCheckBox="true" :filterable="isShareCustCropBranch" ...></show-branch>

// ✅ showCheckBox 启用多选时，filterable 必须为 true
// <show-branch :showCheckBox="true" :filterable="true" ...></show-branch>

// ============ §26 弹窗标题国际化 ============

// ✅ 正确
// <p slot="header">
//   <span v-if="type==='add'">{{$t('hnnxbank.m.i.auth.addBranch')}}</span>
// </p>

// ❌ 错误
// <p slot="header">
//   <span v-if="type==='add'">新增机构</span>
// </p>

// ============ §30 $refs 安全调用审查 ============

// ❌ 直接调用 ref 方法，可能导致 TypeError
this.$refs.branchSearchTree.setCheckedNodes(nodes);
this.$refs.dialogForm.resetFields();

// ✅ 检查 ref 和方法存在性 + 降级方案
if (this.$refs.branchSearchTree) {
  const tree = this.$refs.branchSearchTree;
  if (typeof tree.setCheckedNodes === 'function') {
    tree.setCheckedNodes(nodes);
  } else if (typeof tree.setCheckedKeys === 'function') {
    tree.setCheckedKeys(keys);
  }
}

// ✅ nextTick 中访问弹窗内组件
this.dialogVisible = true;
this.$nextTick(() => {
  if (this.$refs.dialogForm) {
    this.$refs.dialogForm.resetFields();
  }
});

// ============ §31 弹框按钮布局审查 ============

// ❌ 按钮放在 h-form-operate 内部，绝对定位溢出
// <h-form-item class="h-form-operate">
//   <h-button type="primary" @click="handleSearch()">查询</h-button>
// </h-form-item>

// ✅ 按钮独立于表单，flex+gap 布局
// <div class="h-modal-search-operate">
//   <h-button type="primary" @click="handleSearch()">查询</h-button>
//   <h-button type="ghost" @click="handleReset()">重置</h-button>
// </div>

// ============ §32 浏览器兼容性审查 ============

// ❌ 使用默认 Chromium
// { "browser": { "channel": null } }

// ✅ 使用本地 Chrome
// { "browser": { "channel": "chrome" } }
