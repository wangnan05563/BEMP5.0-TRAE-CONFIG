/**
 * BEMP 前端异步处理代码模板
 *
 * 使用方式：SKILL.md 中引用此文件，Agent 需要代码示例时自行读取。
 * 路径：.trae/skills/bemp-frontend-code-review/scripts/examples/async-patterns.js
 */

// ✅ 正确：async/await + try-catch + 防重复提交
async submitForm() {
  this.submitFlag = true;
  try {
    const res = await post(this.addForm, url);
    if (res && res.data.retCode === "000000") {
      this.$msgTip.success(this);
      this.$refs.datagrid.dataChange();
    } else {
      this.$msgTip.error(this, { info: res.data.retMsg });
    }
  } catch (err) {
    this.$msgTip.error(this, { info: this.$t("m.i.common.netError") });
  } finally {
    this.submitFlag = false;
  }
}

// ✅ 正确：.then() 链式调用 + 防重复提交
handleSubmit() {
  this.submitFlag = true;
  post(this.formData, url)
    .then(res => {
      if (res.data.retCode === "000000") {
        this.$msgTip.success(this);
      }
    })
    .catch(() => {
      this.$msgTip.error(this, { info: this.$t("m.i.common.netError") });
    })
    .finally(() => {
      this.submitFlag = false;
    });
}

// ❌ 错误：未处理 retCode 失败的情况
async submitForm() {
  const res = await post(this.addForm, url);
  this.$msgTip.success(this); // 直接假设成功
}