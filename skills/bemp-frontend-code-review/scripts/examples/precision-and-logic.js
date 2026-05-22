/**
 * BEMP 前端代码审查 — 数值精度与条件逻辑示例
 *
 * 包含规范 §22-23 的正确/错误对照代码
 */

// ============ §22 数值精度规范 ============

// ❌ 浮点数精度丢失
const total = 0.1 + 0.2;  // 0.30000000000000004
if (amount === 1.0) { /* ... */ }  // 浮点数比较不可靠

// ✅ 方式1：转为整数（分）运算
const totalFen = Math.round(0.1 * 100) + Math.round(0.2 * 100);  // 30
const displayYuan = (totalFen / 100).toFixed(2);  // "0.30"

// ✅ 方式2：使用 toFixed 后比较
if (parseFloat(amount.toFixed(2)) === 1.0) { /* ... */ }

// ============ §23 条件逻辑规范 ============

// ❌ 双重否定
if (!!isNotDisabled) { /* ... */ }

// ✅ 简化
if (isEnabled) { /* ... */ }

// ❌ 相同分支
if (type === 'A') {
  this.submit();
} else {
  this.submit();
}

// ✅ 修正：移除无效条件
this.submit();

// ❌ 非严格比较
if (status == '1') { /* ... */ }

// ✅ 严格比较
if (status === '1') { /* ... */ }
