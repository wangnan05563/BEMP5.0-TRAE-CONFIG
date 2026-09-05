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
    # PS5.1 默认按系统 ANSI 编码读取，UTF-8 配置文件中的中文注释会乱码并导致 JSON 解析失败
    $Config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
    Write-Error "配置文件不存在: $ConfigPath"
    exit 1
}

# Token 解析与占位符解析统一走技能侧共享模块（内部已加载 _shared/Resolve-EnvConfig.ps1）
# 解析链：环境变量 SONARQUBE_TOKEN/SONAR_TOKEN > _shared/env-config.json#environmentDefaults.SONARQUBE_TOKEN > 键名文本搜索兜底
# 占位符三层解析：环境变量 > environmentDefaults > ${ENV:VAR:默认值} inline default
. (Join-Path $PSScriptRoot "resolve-sonar-token.ps1")

# 解析配置路径（占位符经三层解析，SONARQUBE_PORT/SONAR_SCANNER_HOME 未设环境变量时回落 _shared environmentDefaults）
$ScannerHome = Resolve-SqPlaceholder $Config.sonar_scanner.scanner_home
$ScannerBin = Join-Path $ScannerHome $Config.sonar_scanner.scanner_bin
$SonarHost = Resolve-SqPlaceholder $Config.sonarqube_server.host
$SonarPort = $Config.sonarqube_server.port

# 如果参数未提供，使用配置默认值
if ($ProjectKey -eq "") {
    $ProjectKey = Resolve-SqPlaceholder $Config.sonar_scanner.default_project_key
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

# Token 配置：走解析链（环境变量 > _shared/env-config.json#environmentDefaults.SONARQUBE_TOKEN > 键名文本搜索兜底），
# 不再仅依赖会话环境变量——新会话取不到 SONARQUBE_TOKEN 导致 validate 401 是上轮实测暴露的主要缺陷
$TokenResolved = Resolve-SonarToken
if (-not $TokenResolved) {
    Write-Error "Token 解析链全部来源无值（环境变量 SONARQUBE_TOKEN/SONAR_TOKEN 与 _shared/env-config.json 均未配置）"
    Write-Host "请在 SonarQube Web 界面生成 Token 并配置（按序任选其一）:"
    Write-Host "  1. 会话临时设置: `$env:SONARQUBE_TOKEN = '<token值>'"
    Write-Host "  2. 永久兜底（推荐）: 在 _shared/env-config.json 的 environmentDefaults.SONARQUBE_TOKEN 填入真实值"
    exit 1
}
$SonarToken = $TokenResolved.Token
Write-Host "Token 来源: $($TokenResolved.Source)"

# Token 有效性前置实测（cli_fallback.prerequisites 要求 L1 Token 有效，避免带无效 Token 硬扫）
$TokenTest = Test-SonarToken -BaseUrl $SonarHost -Token $SonarToken
if (-not $TokenTest.Valid) {
    Write-Error "Token 有效性实测未通过: $($TokenTest.Detail)"
    Write-Host "请更新 Token 后重试（更新位置见上方解析链说明）"
    exit 1
}
Write-Host "Token 有效性实测通过: $($TokenTest.Detail)"

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
# 双引号内引用对象属性必须用 $() 子表达式，否则 $Config 会被整体内插成对象ToString、后续属性沦为字面量，
# 导致 ProjectRoot 指向不存在的哈希表文本路径（2026-09-01 实测 EXECUTION FAILURE 根因之一）
$ProjectRoot = Join-Path $SkillRoot "..\..\..\$($Config.project.base_path)"
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


$SourceModule = ($Sources -split '/')[0]
$ModuleClasses = Join-Path $ProjectRoot ($SourceModule + '\target\classes')
if (Test-Path $ModuleClasses) {
    $PropertiesContent = $PropertiesContent + [Environment]::NewLine + 'sonar.java.binaries=' + ($ModuleClasses.Replace('\', '/'))
    Write-Host 'sonar.java.binaries:' $ModuleClasses
} else {
    Write-Warning ('compiled classes not found: ' + $ModuleClasses)
}
[System.IO.File]::WriteAllText($PropertiesFile, $PropertiesContent, (New-Object System.Text.UTF8Encoding($false)))


# 执行扫描
Write-Host "执行 SonarQube 扫描..."
Write-Host "  项目: $ProjectKey"
Write-Host "  源码: $Sources"
Write-Host "  服务: $SonarHost"

# 目录不存在时立即终止：Push-Location 的目录缺失属非终止错误，不拦截会在错误目录下启动 scanner，产生无 projectKey 的无效扫描
if (-not (Test-Path $ProjectRoot)) {
    Write-Error "项目根目录不存在: $ProjectRoot"
    exit 1
}
Push-Location $ProjectRoot
try {
    $Process = Start-Process -FilePath $ScannerBin -Wait -NoNewWindow -PassThru
    if ($Process.ExitCode -ne 0) {
        throw "扫描执行失败，退出码: $($Process.ExitCode)"
    }
} catch {
    Write-Error "扫描执行异常: $_"
    exit 1
} finally {
    Pop-Location
    # 扫描结束后立即清理含 Token 明文的临时 properties（degradation-chain.md L1.2 要求扫描临时产物不滞留明文 Token，
    # 此前实现只生成不清理，属文档与实现漂移；无论扫描成败都必须清理）
    if (Test-Path $PropertiesFile) {
        Remove-Item $PropertiesFile -Force
        Write-Host "已清理临时配置(含Token明文): $PropertiesFile"
    }
}

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