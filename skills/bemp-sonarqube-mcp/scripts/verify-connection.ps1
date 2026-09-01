# BEMP SonarQube MCP 连接验证脚本
# 用途：验证 SonarQube 服务器状态和 MCP 工具是否可用
# 使用：在 Trae 终端中运行此脚本，确认服务器和 MCP 连接状态

param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\scan_config.json"
)

# Token 解析链与占位符解析统一走技能侧共享模块（内部已加载 _shared/Resolve-EnvConfig.ps1）
# 解析链：环境变量 SONARQUBE_TOKEN/SONAR_TOKEN > _shared/env-config.json#environmentDefaults.SONARQUBE_TOKEN > 键名文本搜索兜底
. (Join-Path $PSScriptRoot "resolve-sonar-token.ps1")

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BEMP SonarQube MCP 连接验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: 读取配置
if (Test-Path $ConfigPath) {
    $config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $sqConfig = $config.sonarqube_server
    # port 值可能是 ${ENV:SONARQUBE_PORT} 占位符或数字，统一经三层解析后转 int
    $port = 0
    if (-not [int]::TryParse([string](Resolve-SqPlaceholder $sqConfig.port), [ref]$port)) { $port = 9000 }
    # 禁止向只读自动变量 $host 赋值（PS 中 $host 是宿主信息对象，上轮降级记录已点名的同类缺陷），改用 $sqHost
    $sqHost = Resolve-SqPlaceholder $sqConfig.host
    $javaHome = Resolve-SqPlaceholder $sqConfig.java_home
    $projectKey = if ($config.project -and $config.project.key) { $config.project.key } else {
        $defaults = (Get-GlobalEnvConfig).environmentDefaults
        if ($defaults -and $defaults.BANK_SONAR_PROJECT_KEY) { $defaults.BANK_SONAR_PROJECT_KEY } else { "bemp-ext-hnnxbank" }
    }
    Write-Host "[OK] scan_config.json loaded" -ForegroundColor Green
    Write-Host "  SonarQube Host : $sqHost" -ForegroundColor Gray
    Write-Host "  SonarQube Port : $port" -ForegroundColor Gray
    Write-Host "  JAVA_HOME      : $javaHome" -ForegroundColor Gray
} else {
    Write-Host "[警告] 配置文件不存在: $ConfigPath" -ForegroundColor Red
    $sharedConfigPath = Join-Path $PSScriptRoot "..\..\_shared\env-config.json"
    if (Test-Path $sharedConfigPath) {
        $sharedConfig = Get-Content $sharedConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $port = 0
        if (-not [int]::TryParse([string](Resolve-SqPlaceholder $sharedConfig.services.sonarqube.port), [ref]$port)) { $port = 9000 }
        $sqHost = Resolve-SqPlaceholder $sharedConfig.services.sonarqube.host
    } else {
        $port = 9000
        $sqHost = "http://localhost:9000"
    }
    $config = $null
    $defaults = (Get-GlobalEnvConfig).environmentDefaults
    if ($defaults -and $defaults.BANK_SONAR_PROJECT_KEY) {
        $projectKey = $defaults.BANK_SONAR_PROJECT_KEY
    } else {
        $projectKey = "bemp-ext-hnnxbank"
    }
    $javaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME_SONAR")
    if ([string]::IsNullOrEmpty($javaHome)) {
        $defaults = (Get-GlobalEnvConfig).environmentDefaults
        if ($defaults) { $javaHome = $defaults.JAVA_HOME_SONAR }
    }
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
        $response = Invoke-WebRequest -Uri "$sqHost/api/system/status" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
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

# Step 3: Token 解析链检查 + 有效性实测
# 解析链：环境变量 SONARQUBE_TOKEN/SONAR_TOKEN > _shared/env-config.json#environmentDefaults.SONARQUBE_TOKEN（唯一配置入口，会话无关兜底）
# > 仅结构解析失败时按键名文本搜索。实测端点 /api/authentication/validate，401 即视为 Token 无效。
Write-Host "--- Token 解析链检查 ---" -ForegroundColor Yellow

Write-Host "  SONARQUBE_URL   : $env:SONARQUBE_URL"
$tokenResult = Resolve-AndTestSonarToken -BaseUrl $sqHost

if ($tokenResult.Token) {
    $masked = $tokenResult.Token.Substring(0, [Math]::Min(8, $tokenResult.Token.Length)) + "***"
    Write-Host "  Token 来源      : $($tokenResult.Source)" -ForegroundColor Gray
    Write-Host "  Token 值        : $masked" -ForegroundColor Gray
    if ($tokenResult.Valid) {
        Write-Host "[通过] Token 有效性实测: $($tokenResult.Detail)" -ForegroundColor Green
    } else {
        Write-Host "[未通过] Token 有效性实测: $($tokenResult.Detail)" -ForegroundColor Red
        Write-Host "  修复建议：在 SonarQube Web 界面生成新的 Global Analysis Token 后更新 _shared/env-config.json 的 environmentDefaults.SONARQUBE_TOKEN" -ForegroundColor Yellow
    }
} else {
    Write-Host "[未通过] Token 解析失败: $($tokenResult.Detail)" -ForegroundColor Red
    Write-Host "  修复建议（按序任选其一）：" -ForegroundColor Yellow
    Write-Host "  1. 会话临时设置: `$env:SONARQUBE_TOKEN = '<token值>'" -ForegroundColor Yellow
    Write-Host "  2. 永久兜底（推荐）: 在 _shared/env-config.json 的 environmentDefaults.SONARQUBE_TOKEN 填入真实值" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: MCP 工具验证提示
Write-Host "--- MCP 工具验证 ---" -ForegroundColor Yellow
Write-Host "  需在 Trae Agent 中执行以下调用：" -ForegroundColor White
Write-Host "  1. search_my_sonarqube_projects(q='BEMP')" -ForegroundColor White
Write-Host "  2. get_project_quality_gate_status(projectKey='$($projectKey)')" -ForegroundColor White
Write-Host ""
Write-Host "  预期结果：" -ForegroundColor White
Write-Host "  - 项目列表包含 $projectKey" -ForegroundColor White
Write-Host "  - 质量门禁状态返回 OK 或 ERROR" -ForegroundColor White
