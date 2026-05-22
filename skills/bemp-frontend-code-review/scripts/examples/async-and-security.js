/**
 * BEMP 前端代码审查 — 异步错误处理与安全编码示例
 *
 * 包含规范 §24-25 的正确/错误对照代码
 */

// ============ §24 异步错误处理规范 ============

// ❌ 无错误处理
async loadData() {
  const res = await this.$api.post('/query', params);
  this.tableData = res.data;
}

// ✅ 完整的错误处理
async loadData() {
  try {
    const res = await this.$api.post('/query', params);
    if (res.retCode === '000000') {
      this.tableData = res.data;
    } else {
      this.$message.error(res.retMsg || '查询失败');
    }
  } catch (e) {
    this.$message.error('网络异常，请稍后重试');
    console.error('查询异常：', e);
  }
}

// ✅ Promise.allSettled 处理部分失败
const results = await Promise.allSettled([
  this.loadUserInfo(),
  this.loadRoleList()
]);
results.forEach(result => {
  if (result.status === 'rejected') {
    this.$message.error('部分数据加载失败');
  }
});

// ============ §25 安全编码规范 ============

// ❌ 密钥硬编码
const secretKey = 'abc123';
const token = 'eyJhbGciOiJIUzI1NiJ9...';

// ✅ 从安全存储获取
const token = this.$store.getters.token;

// ❌ 无校验上传
// <h-upload action="/api/upload" />

// ✅ 限制类型和大小
// <h-upload action="/api/upload" accept=".pdf,.jpg,.png" :beforeUpload="beforeUpload" />
// beforeUpload 中校验 file.size <= 10 * 1024 * 1024
