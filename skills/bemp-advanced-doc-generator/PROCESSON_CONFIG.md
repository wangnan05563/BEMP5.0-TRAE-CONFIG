# ProcessOn API 配置说明

## 环境配置

### 1. API Key 配置
在使用可视化文档生成功能前，需要配置 ProcessOn API Key：

1. 访问 [ProcessOn 官网](https://www.processon.com/)
2. 登录您的账户
3. 进入个人设置页面获取 API Key
4. 在项目根目录创建 `.env` 文件：

```env
PROCESSON_API_KEY=your_api_key_here
```

或者在系统环境中设置：
- Windows: `set PROCESSON_API_KEY=your_api_key_here`
- Linux/Mac: `export PROCESSON_API_KEY=your_api_key_here`

### 2. 依赖安装

确保已安装所需依赖：

```bash
cd d:\code\QJ\BEMP5.0DEV\.trae\skills\bemp-advanced-doc-generator\scripts
npm install
```

### 3. MCP 服务

文档生成器会自动启动 MCP 服务来调用 ProcessOn API，无需手动启动。

## 使用说明

### 1. 生成带可视化文档的详细设计

```bash
node cli.js --type design --module "模块名称" --visualization true
```

### 2. 生成带可视化文档的测试用例

```bash
node cli.js --type testcase --module "模块名称" --visualization true
```

## 故障排除

### 1. API Key 未配置错误

错误信息：`ProcessOn API Key 未配置，请设置 PROCESSON_API_KEY 环境变量`

解决方案：
- 检查是否已设置 PROCESSON_API_KEY 环境变量
- 检查 `.env` 文件是否存在且配置正确

### 2. MCP 服务启动失败

错误信息：`MCP 服务启动失败` 或 `MCP 服务启动超时`

解决方案：
- 确保 Node.js 环境正常
- 检查网络连接
- 确认 `mcp-server-processon` 包已正确安装

### 3. API 调用失败

错误信息：`ProcessOn API 调用失败`

解决方案：
- 检查 API Key 是否有效
- 确认账户权限是否足够
- 检查网络连接是否正常

## 注意事项

1. **API 限制**：请遵守 ProcessOn API 的使用频率限制
2. **网络要求**：需要网络连接才能调用在线 API
3. **权限要求**：确保 API Key 具有创建文档的权限
4. **安全注意**：不要在公共场合暴露 API Key

## 支持

如遇到其他问题，请联系技术支持或查阅相关文档。