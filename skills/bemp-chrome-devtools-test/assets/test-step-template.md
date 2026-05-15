# 单步骤操作验证模板

> 用于每次操作的标准验证记录单元

---

## 操作模板

```yaml
步骤编号: Step-{N}
所属阶段: {登录/导航/查询/CRUD/状态流转/验收}
页面路径: {/#/xxx/xxx}

操作类型: {navigate / click / fill / select / evaluate_script / screenshot / snapshot}
操作描述: {用自然语言描述本步骤做了什么}
预期结果: {预期看到的页面状态 / 数据 / 提示}

CDP工具调用:
  - tool: {tool_name}
    params: {参数}
  - tool: {tool_name}
    params: {参数}

验证点:
  - {验证点1}
  - {验证点2}

截图文件: step{N}_{操作描述}.png

状态: [ ] PASS  [ ] FAIL  [ ] BLOCKED

备注: {如有特殊说明}
```

---

## 常用操作模板速查

### 模板：登录
```yaml
步骤编号: Step-1
所属阶段: 登录
页面路径: http://127.0.0.1:8091/#/

操作类型: evaluate_script + click
操作描述: 使用 evaluate_script 填写用户名密码后点击登录
预期结果: 登录成功，进入首页，无登录表单

CDP工具调用:
  - tool: evaluate_script
    params: |
      document.querySelector('input[placeholder*="用户名"]').value = '{username}';
      document.querySelector('input[placeholder*="用户名"]').dispatchEvent(new Event('input', {bubbles:true}));
  - tool: evaluate_script
    params: |
      document.querySelector('input[placeholder*="密码"]').value = '{password}';
      document.querySelector('input[placeholder*="密码"]').dispatchEvent(new Event('input', {bubbles:true}));
  - tool: click
    params: text="登录"
  - tool: take_screenshot
    params: 截图确认

验证点:
  - 页面不再显示登录表单
  - 出现顶部导航栏
  - 左侧菜单可见
  - 无 TypeError/ReferenceError

截图文件: step1_login_success.png
状态: [ ] PASS  [ ] FAIL  [ ] BLOCKED
```

### 模板：页面导航
```yaml
步骤编号: Step-{N}
所属阶段: 导航
页面路径: http://127.0.0.1:8091/#/{target_path}

操作类型: navigate + wait_for + snapshot
操作描述: 导航到目标功能页面
预期结果: 页面正确渲染，查询表单和DataGrid可见

CDP工具调用:
  - tool: navigate_page
    params: type="url", url="http://127.0.0.1:8091/#/{target_path}"
  - tool: wait_for
    params: text="查询"
  - tool: take_snapshot
    params: 获取页面结构
  - tool: take_screenshot
    params: 截图确认

验证点:
  - .h-form-search 查询表单可见
  - 工具栏按钮存在（查询、重置、新增等）
  - .h-datagrid 数据表格可见
  - 无白屏

截图文件: step{N}_{page_name}.png
状态: [ ] PASS  [ ] FAIL  [ ] BLOCKED
```

### 模板：条件查询
```yaml
步骤编号: Step-{N}
所属阶段: 查询
页面路径: {当前页面}

操作类型: click + wait_for + evaluate_script
操作描述: 点击查询按钮执行查询
预期结果: DataGrid加载数据，无报错

CDP工具调用:
  - tool: click
    params: text="查询"
  - tool: wait_for
    params: networkidle timeout=10000
  - tool: evaluate_script
    params: |
      JSON.stringify({
        rows: document.querySelectorAll('.h-datagrid tbody tr').length
      })
  - tool: list_console_messages
    params: 检查无 TypeError/ReferenceError

验证点:
  - DataGrid行数 ≥ 0（无报错即可）
  - 无控制台致命错误

截图文件: step{N}_query_result.png
状态: [ ] PASS  [ ] FAIL  [ ] BLOCKED
```

### 模板：状态变更
```yaml
步骤编号: Step-{N}
所属阶段: 状态流转
页面路径: {当前页面}

操作类型: click + click(确认) + wait_for + evaluate_script + screenshot
操作描述: {提交复核/复核/撤销复核/撤销提交}
预期结果: 状态列文本从"{旧状态}"变为"{新状态}"

CDP工具调用:
  - tool: take_screenshot
    params: 操作前截图
  - tool: click
    params: text="{操作按钮文本}"
  - tool: wait_for
    params: text="确定"
  - tool: click
    params: text="确定"
  - tool: wait_for
    params: networkidle timeout=10000
  - tool: take_screenshot
    params: 操作后截图
  - tool: evaluate_script
    params: |
      JSON.stringify({
        status: document.querySelector('{状态列选择器}')?.textContent?.trim()
      })

验证点:
  - 确认弹窗出现
  - 确认后弹窗关闭
  - 状态列文本 = "{新状态}"
  - 无 TypeError/ReferenceError

截图文件: step{N}_{operation_name}.png
状态: [ ] PASS  [ ] FAIL  [ ] BLOCKED
```

### 模板：控制台验收
```yaml
步骤编号: Step-{N}
所属阶段: 验收
页面路径: {当前页面}

操作类型: list_console_messages
操作描述: 检查控制台错误
预期结果: 0个 TypeError/ReferenceError，0个 ChunkLoadError

CDP工具调用:
  - tool: list_console_messages
    params: 获取完整控制台日志

验证点:
  - TypeError 数量 = 0
  - ReferenceError 数量 = 0
  - ChunkLoadError 数量 = 0
  - 可忽略项已过滤（WebSocket/favicon/chrome-extension）

截图文件: 无（文本验证）
状态: [ ] PASS  [ ] FAIL  [ ] BLOCKED
```