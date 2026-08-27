<#
.SYNOPSIS
    BEMP 增量编译脚本（F-03）
.DESCRIPTION
    根据修改文件自动确定Maven编译范围，仅编译改动模块及其上游依赖(-am)。
    通过 git diff + moduleMapping 规则确定编译模块。
    配置文件：config/compile-options.json
.USAGE
    .\incremental-compile.ps1
    .\incremental-compile.ps1 -Mode incremental
    .\incremental-compile.ps1 -Mode full
    .\incremental-compile.ps1 -Mode skip
#>
param(
    [string]$ConfigPath = "",
    [ValidateSet("auto", "full", "incremental", "skip")]
    [string]$Mode = "auto"
)

# 复用全局占位符解析
. (Join-Path $PSScriptRoot "..\..\_shared\Resolve-EnvConfig.ps1")

# 默认配置路径
if (-not $ConfigPath) {
    $ConfigPath = Join-Path $PSScriptRoot "..\config\compile-options.json"
}

if (-not (Test-Path $ConfigPath)) {
    Write-Host "[FAIL] Config not found: $ConfigPath" -ForegroundColor Red
    exit 2
}

# 加载并解析配置
$cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$cfg = Resolve-AllConfigPlaceholders $cfg

$repoRoot = $cfg.defaults.repoRoot
$maven = $cfg.defaults.mavenExecutable
$mavenSettings = $cfg.defaults.mavenSettings
$defaultMode = $cfg.defaults.defaultMode

# 切换到 Maven reactor 根目录
Set-Location $repoRoot

# 确定编译模式
$compileMode = $Mode
if ($compileMode -eq "auto") {
    $compileMode = $defaultMode
    # 自动模式选择：检查是否有 Java 文件改动
    $changedFiles = & git diff --name-only HEAD
    $javaFiles = $changedFiles | Where-Object { $_ -match '\.java$' }

    if ($javaFiles.Count -eq 0) {
        $compileMode = "skip"
    } else {
        # 尝试匹配 moduleMapping
        $hasMatch = $false
        foreach ($rule in $cfg.moduleMapping.rules) {
            foreach ($f in $javaFiles) {
                if ($f -like $rule.pattern) { $hasMatch = $true; break }
            }
            if ($hasMatch) { break }
        }
        if (-not $hasMatch) { $compileMode = "full" }
    }
}

Write-Host "[INFO] Compile mode: $compileMode" -ForegroundColor Cyan

# skip 模式
if ($compileMode -eq "skip") {
    Write-Host "[INFO] Skip Maven compile. Use -QuickStart to start with existing artifacts." -ForegroundColor Cyan
    exit 0
}

# full 模式
if ($compileMode -eq "full") {
    $cmd = $cfg.defaults.modes.full.command
    $timeout = $cfg.defaults.modes.full.timeoutSeconds
    Write-Host "[INFO] Full compile: mvn $cmd (timeout=${timeout}s)" -ForegroundColor Cyan
    $mavenArgs = $cmd -split ' '
    if ($mavenSettings) { $mavenArgs = @("-s", $mavenSettings) + $mavenArgs }
    & $maven @mavenArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Full compile failed (exit=$LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Full compile succeeded" -ForegroundColor Green
    exit 0
}

# incremental 模式
$changedFiles = & git diff --name-only HEAD
$javaFiles = $changedFiles | Where-Object { $_ -match '\.java$' }

$modules = @()
foreach ($rule in $cfg.moduleMapping.rules) {
    # 跳过 skipMaven 规则
    if ($rule.skipMaven) { continue }
    foreach ($f in $javaFiles) {
        if ($f -like $rule.pattern) {
            $modules += $rule.modules
            break
        }
    }
}
$modules = $modules | Select-Object -Unique

if ($modules.Count -eq 0) {
    Write-Host "[WARN] No module match for changed files, fallback to full compile" -ForegroundColor Yellow
    $cmd = $cfg.defaults.modes.full.command
    $mavenArgs = $cmd -split ' '
    if ($mavenSettings) { $mavenArgs = @("-s", $mavenSettings) + $mavenArgs }
    & $maven @mavenArgs
    if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Fallback full compile failed" -ForegroundColor Red; exit 1 }
    Write-Host "[OK] Fallback full compile succeeded" -ForegroundColor Green
    exit 0
}

$moduleList = $modules -join ","
$cmdTemplate = $cfg.defaults.modes.incremental.command
$cmd = $cmdTemplate -replace '\{modules\}', $moduleList
$timeout = $cfg.defaults.modes.incremental.timeoutSeconds

Write-Host "[INFO] Incremental compile: mvn $cmd (timeout=${timeout}s)" -ForegroundColor Cyan
Write-Host "[INFO] Modules: $moduleList" -ForegroundColor Gray

# 解析命令参数：clean install -DskipTests=true -pl moduleA,moduleB -am
$mavenArgs = @()
$parts = $cmd -split ' '
foreach ($p in $parts) {
    if ($p -like '-pl*') {
        # -pl 和模块列表分开传递
        $mavenArgs += @("-pl", ($p -replace '^(-pl\s*)', ''))
    } elseif ($p -ne '') {
        $mavenArgs += $p
    }
}
if ($mavenSettings) { $mavenArgs = @("-s", $mavenSettings) + $mavenArgs }

& $maven @mavenArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Incremental compile failed (exit=$LASTEXITCODE). Try full compile." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Incremental compile succeeded: $moduleList" -ForegroundColor Green
exit 0
