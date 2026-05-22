/**
 * BEMP 前端代码审查 — 代码质量模式示例
 *
 * 包含规范 §17-20 的正确/错误对照代码
 */

// ============ §17 死代码与无用代码 ============

// ❌ 注释掉的代码
// <!-- <h-button @click="oldHandler">旧按钮</h-button> -->

// ❌ 未使用的导入
import { unusedMethod } from '@/utils/helper';

// ✅ 删除注释代码和未使用的导入

// ============ §18 公共逻辑提取（DRY原则） ============

// ✅ 提取公共校验逻辑为 Mixin
const mixinFormValidator = {
  methods: {
    validateRequired(value, fieldName) {
      if (!value || value.trim() === '') {
        this.$message.error(`${fieldName}不能为空`);
        return false;
      }
      return true;
    }
  }
};

// ❌ 每个组件重复相同的校验逻辑

// ============ §19 常量管理 ============

// ✅ 常量定义
const AUDIT_STATUS = {
  PENDING: '0',
  APPROVED: '1',
  REJECTED: '2'
};
// 使用：if (status === STATUS.DRAFT)

// ❌ 魔法值散落各处
if (status === '0') { /* ... */ }
if (status === '1') { /* ... */ }

// ============ §20 函数式编程与数组操作 ============

// ✅ 函数式写法
const roleNames = this.roleList.map(item => item.roleName);
const activeRoles = this.roleList.filter(item => item.status === '1');

// ❌ 传统 for 循环
const roleNames = [];
for (let i = 0; i < this.roleList.length; i++) {
  roleNames.push(this.roleList[i].roleName);
}

// ✅ computed 替代模板复杂表达式
// computed: { formattedDate() { return this.date ? this.$moment(this.date).format('YYYY-MM-DD') : ''; } }
// 模板中：{{ formattedDate }} 而非 {{ $moment(date).format('YYYY-MM-DD') }}
