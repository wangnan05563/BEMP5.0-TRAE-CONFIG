# BEMP SonarQube MCP 连接验证脚本
# 用途：验证 SonarQube 服务器状态和 MCP 工具是否可用
# 使用：在 Trae 终端中运行此脚本，确认服务器和 MCP 连接状态

param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\scan_config.json"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BEMP SonarQube MCP 连接验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: 读取配置
if (Test-Path $ConfigPath) {
    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    $sqConfig = $config.sonarqube_server
    $port = $sqConfig.port
    $host = $sqConfig.host
    $javaHome = $sqConfig.java_home
    Write-Host "[配置] 已加载 scan_config.json" -ForegroundColor Green
    Write-Host "  SonarQube Host : $host" -ForegroundColor Gray
    Write-Host "  SonarQube Port : $port" -ForegroundColor Gray
    Write-Host "  JAVA_HOME      : $javaHome" -ForegroundColor Gray
} else {
    Write-Host "[警告] 配置文件不存在: $ConfigPath" -ForegroundColor Red
    $port = 9000
    $host = "http://localhost:9000"
}

Write-Host ""

# Step 2: 检查 SonarQube 服务器状态
Write-Host "--- 服务器状态检查 ---" -ForegroundColor Yellow

$portListening = $false
try {
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conn) { $portListening = $true }
    }
} catch {
    $netstatResult = netstat -ano 2>$null | Select-String ":$port\s" | Select-String "LISTENING"
    if ($netstatResult) { $portListening = $true }
}

if ($portListening) {
    Write-Host "[通过] 端口 $port 正在监听" -ForegroundColor Green
    
    try {
        $response = Invoke-WebRequest -Uri "$host/api/system/status" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $body = $response.Content | ConvertFrom-Json
        Write-Host "[通过] 健康检查: status=$($body.status), version=$($body.version)" -ForegroundColor Green
    } catch {
        Write-Host "[警告] 端口监听但健康检查失败: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[未通过] 端口 $port 未监听，SonarQube 服务未启动" -ForegroundColor Red
    Write-Host "  请执行启动脚本：" -ForegroundColor Yellow
    Write-Host "  .\start-sonarqube.ps1" -ForegroundColor White
}

Write-Host ""

# Step 3: 检查环境变量
Write-Host "--- 环境变量检查 ---" -ForegroundColor Yellow

$envPath = $env:SONARQUBE_URL
$envToken = if ($env:SONARQUBE_TOKEN) { "***已配置***" } else { "***未配置***" }

Write-Host "  SONARQUBE_URL   : $envPath"
Write-Host "  SONARQUBE_TOKEN : $envToken"

if (-not $env:SONARQUBE_TOKEN) {
    Write-Host "[警告] SONARQUBE_TOKEN 未设置，MCP 工具可能无法使用" -ForegroundColor Red
    Write-Host "  请设置环境变量：`$env:SONARQUBE_TOKEN = 'your_token'" -ForegroundColor Yellow
} else {
    Write-Host "[通过] 环境变量已配置" -ForegroundColor Green
}

Write-Host ""

# Step 4: MCP 工具验证提示
Write-Host "--- MCP 工具验证 ---" -ForegroundColor Yellow
Write-Host "  需在 Trae Agent 中执行以下调用：" -ForegroundColor White
Write-Host "  1. search_my_sonarqube_projects(q='BEMP')" -ForegroundColor White
Write-Host "  2. get_project_quality_gate_status(projectKey='bemp-ext-hnnxbank')" -ForegroundColor White
Write-Host ""
Write-Host "  预期结果：" -ForegroundColor White
Write-Host "  - 项目列表包含 bemp-ext-hnnxbank" -ForegroundColor White
Write-Host "  - 质量门禁状态返回 OK 或 ERROR" -ForegroundColor White
