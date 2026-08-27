# run-sonar-scanner.ps1
# SonarQube MCP 不可用时的降级扫描脚本
# 使用 sonar-scanner 命令行工具执行代码质量扫描

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Sources = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ConfigPath = "",
    
    [Parameter(Mandatory=$false)]
    [int]$WaitTimeout = 180
)

# 配置文件路径
$SkillRoot = Split-Path -Parent $PSScriptRoot
if ($ConfigPath -eq "") {
    $ConfigPath = Join-Path $SkillRoot "config\scan_config.json"
}

# 读取配置
if (Test-Path $ConfigPath) {
    $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
} else {
    Write-Error "配置文件不存在: $ConfigPath"
    exit 1
}

# 解析环境变量占位符
function ResolveEnvPlaceholder($value) {
    if ($value -match '\$\{ENV:(\w+)\}') {
        $envVar = $Matches[1]
        $envValue = [Environment]::GetEnvironmentVariable($envVar)
        if ($envValue) {
            return $value -replace '\$\{ENV:' + $envVar + '\}', $envValue
        } else {
            Write-Warning "环境变量 $envVar 未设置"
            return $value
        }
    }
    return $value
}

# 解析配置路径
$ScannerHome = ResolveEnvPlaceholder $Config.sonar_scanner.scanner_home
$ScannerBin = Join-Path $ScannerHome $Config.sonar_scanner.scanner_bin
$SonarHost = ResolveEnvPlaceholder $Config.sonarqube_server.host
$SonarPort = $Config.sonarqube_server.port

# 如果参数未提供，使用配置默认值
if ($ProjectKey -eq "") {
    $ProjectKey = ResolveEnvPlaceholder $Config.sonar_scanner.default_project_key
    if ($ProjectKey -eq "") {
        $ProjectKey = $Config.project.key
    }
}
if ($ProjectName -eq "") {
    $ProjectName = $Config.project.name
}
if ($Sources -eq "") {
    $Sources = $Config.sonar_scanner.default_sources
}

# Token 配置
$SonarToken = [Environment]::GetEnvironmentVariable("SONARQUBE_TOKEN")
if ($SonarToken -eq "") {
    Write-Error "SONARQUBE_TOKEN 环境变量未设置"
    Write-Host "请在 SonarQube Web 界面生成 Token 并设置环境变量:"
    Write-Host "  1. 打开 $SonarHost"
    Write-Host "  2. 登录后点击右上角头像 -> My Account -> Security"
    Write-Host "  3. 生成 Global Analysis Token"
    Write-Host "  4. 设置环境变量: `$env:SONARQUBE_TOKEN = 'squ_xxxxxxxx'"
    exit 1
}

# 验证 SonarQube 服务状态
Write-Host "验证 SonarQube 服务状态..."
$HealthUrl = "$SonarHost/api/system/status"
try {
    $Response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 10
    $Status = ($Response.Content | ConvertFrom-Json).status
    if ($Status -ne "UP") {
        Write-Error "SonarQube 服务状态异常: $Status"
        Write-Host "请启动 SonarQube 服务:"
        Write-Host "  cd $SkillRoot\scripts"
        Write-Host "  .\start-sonarqube.ps1"
        exit 1
    }
    Write-Host "SonarQube 服务状态: $Status"
} catch {
    Write-Error "无法连接 SonarQube 服务: $SonarHost"
    Write-Host "请启动 SonarQube 服务:"
    Write-Host "  cd $SkillRoot\scripts"
    Write-Host "  .\start-sonarqube.ps1"
    exit 1
}

# 验证 sonar-scanner 工具
if (-not (Test-Path $ScannerBin)) {
    Write-Error "sonar-scanner 工具不存在: $ScannerBin"
    Write-Host "请安装 sonar-scanner 并设置环境变量 SONAR_SCANNER_HOME"
    exit 1
}

# 生成 sonar-project.properties 配置
$ProjectRoot = Join-Path $SkillRoot "..\..\..\$Config.project.base_path"
$PropertiesFile = Join-Path $ProjectRoot "sonar-project.properties"

Write-Host "生成扫描配置: $PropertiesFile"
$PropertiesContent = @"
# SonarQube项目配置 - 自动生成
sonar.projectKey=$ProjectKey
sonar.projectName=$ProjectName
sonar.sources=$Sources
sonar.host.url=$SonarHost
sonar.token=$SonarToken
"@

Set-Content -Path $PropertiesFile -Value $PropertiesContent -Encoding UTF8

# 执行扫描
Write-Host "执行 SonarQube 扫描..."
Write-Host "  项目: $ProjectKey"
Write-Host "  源码: $Sources"
Write-Host "  服务: $SonarHost"

Push-Location $ProjectRoot
try {
    $Process = Start-Process -FilePath $ScannerBin -Wait -NoNewWindow -PassThru
    if ($Process.ExitCode -ne 0) {
        Write-Error "扫描执行失败，退出码: $($Process.ExitCode)"
        Pop-Location
        exit 1
    }
} catch {
    Write-Error "扫描执行异常: $_"
    Pop-Location
    exit 1
}
Pop-Location

# 验证扫描结果
Write-Host "验证扫描结果..."
$ProjectsUrl = "$SonarHost/api/projects/search?projects=$ProjectKey"
try {
    $Response = Invoke-WebRequest -Uri $ProjectsUrl -Headers @{Authorization="Bearer $SonarToken"} -UseBasicParsing -TimeoutSec 10
    $Projects = ($Response.Content | ConvertFrom-Json).projects
    if ($Projects.Count -eq 0) {
        Write-Error "扫描结果未上传到 SonarQube"
        exit 1
    }
    Write-Host "扫描成功完成!"
} catch {
    Write-Error "无法验证扫描结果: $_"
    exit 1
}

# 获取质量门禁状态
Write-Host "获取质量门禁状态..."
$QualityGateUrl = "$SonarHost/api/qualitygates/project_status?projectKey=$ProjectKey"
try {
    $Response = Invoke-WebRequest -Uri $QualityGateUrl -Headers @{Authorization="Bearer $SonarToken"} -UseBasicParsing -TimeoutSec 10
    $QualityGate = ($Response.Content | ConvertFrom-Json).projectStatus
    $GateStatus = $QualityGate.status
    Write-Host "质量门禁状态: $GateStatus"
    
    # 输出标准化报告
    Write-Host ""
    Write-Host "## SonarQube 扫描报告"
    Write-Host "| 项目 | 状态 |"
    Write-Host "|------|------|"
    Write-Host "| $ProjectKey | $GateStatus |"
    Write-Host ""
    Write-Host "### 访问地址"
    Write-Host "- SonarQube Dashboard: $SonarHost/dashboard?id=$ProjectKey"
} catch {
    Write-Warning "无法获取质量门禁状态: $_"
}

# 输出 MCP 配置建议
Write-Host ""
Write-Host "### MCP 配置建议"
Write-Host "当前使用 sonar-scanner 命令行工具作为降级方案。"
Write-Host "建议配置 SonarQube MCP 以获得更好的集成体验:"
Write-Host "  1. 在 Trae 设置中添加 SonarQube MCP 服务器"
Write-Host "  2. 配置环境变量 SONARQUBE_URL 和 SONARQUBE_TOKEN"
Write-Host "  3. 重启 Trae 后 MCP 工具将可用"

exit 0