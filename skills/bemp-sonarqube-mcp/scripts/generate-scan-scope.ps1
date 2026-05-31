# BEMP SonarQube 扫描范围生成脚本
# 用途：根据功能模块关键词，生成需要扫描的文件清单
# 使用：.\generate-scan-scope.ps1 -Keyword "credit" -ModulePath "banks/${ENV:BANK_PROJECT_DIR}"

param(
    [Parameter(Mandatory=$true)]
    [string]$Keyword,
    
    [Parameter(Mandatory=$false)]
    [string]$ModulePath = "",
    
    [Parameter(Mandatory=$false)]
    [string]$BasePath = ""
)

$sharedConfigPath = Join-Path $PSScriptRoot "..\..\_shared\env-config.json"
$sharedConfig = $null
if (Test-Path $sharedConfigPath) {
    $sharedConfig = Get-Content $sharedConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

if ([string]::IsNullOrEmpty($ModulePath)) {
    $scanConfigPath = Join-Path $PSScriptRoot "..\config\scan_config.json"
    if (Test-Path $scanConfigPath) {
        $scanConfig = Get-Content $scanConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $ModulePath = $scanConfig.project.base_path -replace '/', '\'
    } else {
        if ($sharedConfig -and $sharedConfig.bank.projectDir) {
            $ModulePath = "banks\$($sharedConfig.bank.projectDir)"
        }
        if ([string]::IsNullOrEmpty($ModulePath)) {
            $ModulePath = "banks\ext-hnnxbank"
        }
    }
}

if ([string]::IsNullOrEmpty($BasePath)) {
    $BasePath = [Environment]::GetEnvironmentVariable("BEMP_WORKSPACE_ROOT")
    if ([string]::IsNullOrEmpty($BasePath) -and $sharedConfig) {
        $BasePath = $sharedConfig.environmentDefaults.BEMP_WORKSPACE_ROOT
    }
    if ([string]::IsNullOrEmpty($BasePath)) {
        $BasePath = "d:\code\QJ\BEMP5.0DEV"
    }
}

Write-Host "=== BEMP SonarQube 扫描范围生成 ===" -ForegroundColor Cyan
Write-Host "关键词: $Keyword" -ForegroundColor Yellow
Write-Host "模块路径: $ModulePath" -ForegroundColor Yellow
Write-Host ""

$sonarProjectKey = "bemp-ext-hnnxbank"
if ($sharedConfig -and $sharedConfig.bank.sonarProjectKey) {
    $sonarProjectKey = $sharedConfig.bank.sonarProjectKey
}

$searchPath = Join-Path $BasePath $ModulePath

if (-not (Test-Path $searchPath)) {
    Write-Host "[错误] 路径不存在: $searchPath" -ForegroundColor Red
    exit 1
}

$javaFiles = Get-ChildItem -Path $searchPath -Filter "*.java" -Recurse | 
    Where-Object { $_.Name -match $Keyword }

$grouped = $javaFiles | Group-Object {
    if ($_.FullName -match "\\controller\\") { "Controller" }
    elseif ($_.FullName -match "\\service\\impl\\") { "Service" }
    elseif ($_.FullName -match "\\service\\") { "Service接口" }
    elseif ($_.FullName -match "\\dao\\entity\\") { "DAO Entity" }
    elseif ($_.FullName -match "\\dao\\") { "DAO" }
    elseif ($_.FullName -match "\\dto\\") { "DTO" }
    elseif ($_.FullName -match "\\utils\\") { "Util" }
    elseif ($_.FullName -match "\\aspect\\") { "Aspect" }
    else { "其他" }
}

Write-Host "扫描文件清单：" -ForegroundColor Green
Write-Host ""

$totalLines = 0
$totalFiles = 0

foreach ($group in $grouped) {
    Write-Host "【$($group.Name)】" -ForegroundColor Cyan
    foreach ($file in $group.Group) {
        $lineCount = (Get-Content $file.FullName | Measure-Object -Line).Lines
        $totalLines += $lineCount
        $totalFiles++
        $relativePath = $file.FullName.Replace($BasePath + "\", "")
        Write-Host "  $relativePath ($lineCount 行)" -ForegroundColor White
    }
    Write-Host ""
}

Write-Host "=== 汇总 ===" -ForegroundColor Cyan
Write-Host "  文件总数: $totalFiles" -ForegroundColor Green
Write-Host "  代码行数: $totalLines" -ForegroundColor Green
Write-Host ""
Write-Host "SonarQube MCP 文件路径格式（用于 files 参数）：" -ForegroundColor Yellow

foreach ($file in $javaFiles) {
    $relativePath = $file.FullName.Replace($BasePath + "\", "").Replace("\", "/")
    $sonarPath = "${sonarProjectKey}:$relativePath"
    Write-Host "  $sonarPath" -ForegroundColor White
}
