# BEMP 常见问题与最佳实践

## 常见问题

### Q1: 个性化 Controller 是否需要 @CustomizedBean 注解？
**A**: 不需要。Controller 使用 Hnnx 前缀命名，与产品化 Controller 并存，无需 @CustomizedBean 注解。Service 实现类需要 @CloudComponent 注解。

### Q2: 前端参数传递用 extParam 还是 requestDto？
**A**: 使用 `requestDto` 格式传递参数，而非 `extParam`。在 Vue 中使用 `this.$api.post()` 方法，参数放在 `requestDto` 字段中。

### Q3: 国际化键值如何命名？
**A**: 遵循 `hnnxbank.[模块].[功能].[标签]` 的命名规范。按钮和标签必须国际化，placeholder 和提示信息保持硬编码。

### Q4: 如何处理多种参数格式兼容？
**A**: 在 Controller 中增强参数获取逻辑，兼容 `extParam`、`requestDto`、直接参数等多种格式：
```java
Object param = req.getExtParam();
if (param == null) {
    param = req.getRequestDto();
}
if (param == null) {
    param = dto;
}
```

### Q5: 前端页面如何与产品化页面共存？
**A**: 在 `hnnxbankIndex.js` 中配置路径映射，将个性化路径指向 `banks/hnnxbank` 目录下的 Vue 文件，产品化路径保持不变。

### Q6: 如何确保 UI 风格一致？
**A**: 参考同目录下已有的个性化实现案例，特别注意超链接风格、输入框风格、按钮样式等。使用 H-UI 组件库的标准组件。

### Q7: 弹框内表单的查询/重置按钮位置异常或与内容重叠怎么办？
**A**: 这是 commonTree 等树形弹框组件的常见布局问题。

**问题原因**：
- 全局样式 `.h-form-operate` 使用 `position: absolute; right: -185px;` 绝对定位
- 按钮放在 `h-form-item class="h-form-operate"` 内部时会被定位到容器外部
- 小窗口下按钮会换行或与树内容重叠

**解决方案**：
1. 将查询/重置按钮从 `h-form` 内部移出，使用独立的 `div` 容器
2. 使用 `display: flex` + `gap` 布局替代 `float`
3. 搜索区域添加独立背景和边框，与树内容视觉分离

**正确写法**：
```vue
<!-- 搜索区域：表单和按钮分离 -->
<div v-if="showSearch" class="h-modal-search-form">
  <h-form :model="searchForm" cols="3" class="h-form-search">
    <h-form-item label="机构号">...</h-form-item>
    <h-form-item label="机构级别">...</h-form-item>
    <h-form-item label="机构名称">...</h-form-item>
  </h-form>
  <!-- 按钮独立一行 -->
  <div class="h-modal-search-operate">
    <h-button type="primary" @click="handleSearch()">查询</h-button>
    <h-button type="ghost" @click="handleReset()">重置</h-button>
  </div>
</div>
```

```css
<style scoped>
.h-modal-search-form {
  padding: 8px 12px;
  background: #f8f8f8;
  border-bottom: 1px solid #e8eaec;
}
.h-modal-search-operate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
</style>
```

详细规范请参考 [frontend-guide.md - 9.2.10 通用树形弹框组件](../assets/guides/frontend-guide.md#9210-通用树形弹框组件commontree)

### Q8: 数据库变更如何管理？
**A**: 所有数据库变更必须通过变更脚本管理，DDL/DML 脚本按版本号命名，存放在指定目录下。禁止直接修改生产数据库。

### Q9: 前端开发中如何使用 H-UI 组件最准确？
**A**: 使用 H-UI 组件前，必须通过 `hui_doc` MCP 服务平台查询该组件的官方文档。具体步骤：
1. 先调用 `mcp_hui_doc_get-components-list` 确认组件是否存在于 HUI 体系中
2. 调用 `mcp_hui_doc_get-base-component("组件名")` 或 `mcp_hui_doc_get-extend-component("组件名")` 获取完整文档
3. 核对组件属性类型、必填项、默认值、事件回调参数格式
4. 参考文档中提供的官方示例代码

**【禁止】** 凭记忆或猜测使用组件 API，组件版本升级可能导致 API 不一致。

### Q10: 同一个页面中使用了多个 H-UI 组件，是否需要逐一查询每个组件的文档？
**A**: **是的，必须逐个查询。** 即使某个组件你之前已经使用过，不同组件间的交互可能存在兼容性问题。查询策略：
- 对每个组件的关键属性确认默认值和类型签名
- 重点确认组件间的数据流传递方式是否正确
- 如果组件在弹窗（`h-msg-box`）中使用，额外确认 `msgBoxWin` 等特殊属性的文档说明

### Q11: 发现 hui_doc MCP 返回的文档与项目现有代码不一致怎么办？
**A**: 以 `hui_doc` MCP 返回的官方文档为准。项目现有代码可能基于旧版本编写，而组件 API 可能已发生变化。如果在确认文档后仍有疑问，应：
1. 查阅 HUI 官方在线文档（`https://hui.hundsun.com/component/`）
2. 检查项目 `package.json` 中 H-UI 版本，确认文档版本匹配
3. 与团队成员讨论确认最佳实践

## 最佳实践

### 后端开发
1. **继承优先**: 优先继承产品化类，重写需要修改的方法
2. **参数校验**: 在 Service 层进行业务校验，Controller 层进行参数非空校验
3. **日志规范**: 使用 SLF4J 记录关键操作日志，不要使用 System.out
4. **异常处理**: 使用 BempRuntimeException 抛出业务异常，不要使用 RuntimeException
5. **事务管理**: 涉及多表操作的方法添加 @Transactional 注解

### 前端开发
1. **组件文档优先**: 使用任何 H-UI 组件前，必须先通过 `hui_doc` MCP 查询官方文档，确保属性签名和事件参数正确
2. **组件复用**: 优先使用 H-UI 和项目已有封装组件，避免自定义样式和重复造轮子
3. **状态管理**: 使用 Vuex 管理全局状态，组件内使用 data 管理局部状态
4. **API 封装**: 统一使用 `this.$api.post/get` 调用接口
5. **错误处理**: 统一使用 `this.$message.error` 显示错误信息
6. **性能优化**: 大列表使用虚拟滚动，图片使用懒加载

### Adapter 接口开发
1. **方向确认**: 先确认是 Client 端（主动发起）还是 Server 端（被动接收）
2. **报文验证**: 开发完成后使用报文示例验证转换逻辑
3. **签名处理**: 涉及资金操作的接口必须添加签名验证
4. **字段映射**: 使用字段映射表维护内外部字段的对应关系
