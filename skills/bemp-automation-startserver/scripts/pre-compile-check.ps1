<#
.SYNOPSIS
    BEMP 编译前置检查脚本（F-01）
.DESCRIPTION
    编译前检查Java文件大括号匹配，提前发现文件写入截断问题。
    通过 git diff 获取最近修改的文件，仅检查 .java 文件。
    配置文件：config/pre-compile-check.json
.USAGE
    .\pre-compile-check.ps1
    .\pre-compile-check.ps1 -ConfigPath "..\config\pre-compile-check.json"
#>
param(
    [string]$ConfigPath = ""
)

# 复用全局占位符解析（与 start-bemp-env.ps1 相同的 dot-source 方式）
. (Join-Path $PSScriptRoot "..\..\_shared\Resolve-EnvConfig.ps1")

# 默认配置路径
if (-not $ConfigPath) {
    $ConfigPath = Join-Path $PSScriptRoot "..\config\pre-compile-check.json"
}

if (-not (Test-Path $ConfigPath)) {
    Write-Host "[FAIL] Config not found: $ConfigPath" -ForegroundColor Red
    exit 2
}

# 加载并解析配置（${ENV:} 占位符解析）
$cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$cfg = Resolve-AllConfigPlaceholders $cfg

$workspace = $cfg.defaults.workspaceRoot
$git = $cfg.defaults.gitPath
if (-not $git) { $git = "git" }

$failOnWarning = $cfg.defaults.failOnWarning
$braceCheck = $cfg.checks.braceBalance
$emptyCheck = $cfg.checks.fileNonEmpty

# 切换到工作空间根目录
Set-Location $workspace

# 获取修改的 Java 文件
$changedFiles = & $git diff --name-only HEAD | Where-Object { $_ -match '\.java$' }

# 检查未跟踪的新增文件
if ($cfg.fileFilter.includeUntracked) {
    $untracked = & $git status --short | Where-Object { $_ -match '^\?\?' -and $_ -match '\.java$' } | ForEach-Object { ($_ -replace '^\?\?\s*', '').Trim() }
    $changedFiles = @($changedFiles) + @($untracked) | Select-Object -Unique
}

if ($changedFiles.Count -eq 0) {
    Write-Host "[INFO] No Java files changed, skip pre-compile check" -ForegroundColor Cyan
    exit 0
}

Write-Host "[INFO] Pre-compile check for $($changedFiles.Count) file(s)..." -ForegroundColor Cyan

$warnCount = 0
$failCount = 0
$okCount = 0

foreach ($file in $changedFiles) {
    $fullPath = Join-Path $workspace $file
    if (-not (Test-Path $fullPath)) {
        Write-Host "[SKIP] $file : file not found (deleted?)" -ForegroundColor Gray
        continue
    }

    $content = Get-Content $fullPath -Raw -Encoding UTF8

    # 空文件检查
    if ($emptyCheck.enabled -and $content.Length -lt $emptyCheck.minSizeBytes) {
        Write-Host "[FAIL] $file : empty file (truncation detected)" -ForegroundColor Red
        $failCount++
        continue
    }

    # 大括号匹配检查
    if ($braceCheck.enabled) {
        $open = ($content.ToCharArray() | Where-Object { $_ -eq $braceCheck.openBrace }).Count
        $close = ($content.ToCharArray() | Where-Object { $_ -eq $braceCheck.closeBrace }).Count
        $diff = $open - $close

        if ($diff -ne $braceCheck.allowDiff) {
            $sev = $braceCheck.severity
            $tag = 'WARN'; $color = 'Yellow'
            if ($sev -eq 'block') { $tag = 'FAIL'; $color = 'Red' }
            Write-Host "[$tag] $file : brace imbalance (open=$open, close=$close, diff=$diff)" -ForegroundColor $color
            if ($sev -eq 'block') { $failCount++ } else { $warnCount++ }
        } else {
            Write-Host "[OK]   $file : brace balanced ($open/$close)" -ForegroundColor Green
            $okCount++
        }
    } else {
        $okCount++
    }
}

# 汇总输出
$total = $changedFiles.Count
Write-Host ""
Write-Host "Pre-compile check: $okCount/$total files passed ($warnCount warnings, $failCount failures)" -ForegroundColor Cyan

# 退出码逻辑
if ($failCount -gt 0) {
    Write-Host "[FAIL] Pre-compile check failed. Fix the issues above before compiling." -ForegroundColor Red
    exit 1
}
if ($warnCount -gt 0 -and $failOnWarning) {
    Write-Host "[FAIL] Pre-compile check blocked by warnings (failOnWarning=true)." -ForegroundColor Red
    exit 1
}
if ($warnCount -gt 0) {
    Write-Host "[WARN] Pre-compile check passed with warnings. Verify file integrity." -ForegroundColor Yellow
}

exit 0
