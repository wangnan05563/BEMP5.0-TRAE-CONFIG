<#
.SYNOPSIS
    BEMP 技能库配置自检（doctor）。扫描全部技能 config JSON 的 ${ENV:VAR} 占位符，
    逐个验证"环境变量 > _shared environmentDefaults > 内联默认值"三层链是否可解析，
    让"调用时找不到配置参数"的问题前置暴露为一份可执行的 FAIL 清单。

.NOTES
    退出码：0 = 全 PASS；1 = 存在 FAIL。CI/会话开始时执行即可。
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$skillsRoot = Split-Path -Parent $PSScriptRoot   # _shared/ 的上级即 skills 根

# ── 载入 _shared environmentDefaults（单一事实源） ──
$envConfigPath = Join-Path $PSScriptRoot 'env-config.json'
if (-not (Test-Path $envConfigPath)) {
    Write-Host "[FATAL] 找不到唯一配置入口: $envConfigPath" -ForegroundColor Red
    exit 1
}
$shared = Get-Content $envConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$defaults = @{}
if ($shared.environmentDefaults) {
    foreach ($p in $shared.environmentDefaults.PSObject.Properties) { $defaults[$p.Name] = $p.Value }
}

$placeholderPattern = '\$\{ENV:([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}'

function Test-PlaceholderResolvable {
    param([string]$VarName, [string]$InlineDefault)
    # $env:$VarName 不是合法 PS 语法（动态变量名不能挂 env: 驱动器），
    # 必须走 .NET API 按名取值
    $envVal = [Environment]::GetEnvironmentVariable($VarName)
    if ($envVal -and $envVal -ne '') { return @{ ok = $true; src = 'env' } }
    if ($defaults.ContainsKey($VarName) -and -not [string]::IsNullOrEmpty([string]$defaults[$VarName])) {
        return @{ ok = $true; src = 'shared' }
    }
    if ($null -ne $InlineDefault) { return @{ ok = $true; src = 'inline' } }
    return @{ ok = $false; src = '' }
}

$total = 0; $failed = 0
$failLines = New-Object System.Collections.Generic.List[string]

Write-Host '========================================' 
Write-Host ' BEMP 配置 Doctor 自检' -ForegroundColor Cyan
Write-Host " 配置入口: $envConfigPath"
Write-Host '========================================'

# ── 扫描全部技能 config 目录 + _shared 自身 ──
$configFiles = Get-ChildItem -Path $skillsRoot -Recurse -Include *.json -File |
    Where-Object { $_.FullName -match '\\(config|assets)\\' -or $_.DirectoryName -eq $PSScriptRoot } |
    Where-Object { $_.Name -notmatch '\.schema\.json$|package(-lock)?\.json|tsconfig|components\.json' }

foreach ($file in $configFiles) {
    try { $raw = Get-Content $file.FullName -Raw -Encoding UTF8 } catch { continue }
    $ms = [regex]::Matches($raw, $placeholderPattern)
    if ($ms.Count -eq 0) { continue }

    $relPath = $file.FullName.Substring($skillsRoot.Length + 1)
    $fileFails = @()
    $seen = @{}
    foreach ($m in $ms) {
        $varName = $m.Groups[1].Value
        if ($seen.ContainsKey($varName)) { continue }
        $seen[$varName] = $true
        $total++
        $r = Test-PlaceholderResolvable -VarName $varName -InlineDefault $m.Groups[2].Value
        if (-not $r.ok) {
            $failed++
            $fileFails += ("    FAIL ${varName} = " + $m.Value + "  （三层链均无值）")
        }
    }
    if ($fileFails.Count -gt 0) {
        Write-Host "  [FAIL] $relPath" -ForegroundColor Red
        $fileFails | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow }
        $failLines.AddRange($fileFails)
    } else {
        Write-Host "  [PASS] $relPath" -ForegroundColor Green
    }
}

Write-Host '----------------------------------------'
if ($failed -eq 0) {
    Write-Host " 结果: 全部 PASS（检查 $total 个占位符变量，来源分布 env/shared/inline）" -ForegroundColor Green
} else {
    Write-Host " 结果: $failed/$total 个占位符无法解析" -ForegroundColor Red
    Write-Host ''
    Write-Host ' 修复指引（三选一，按优先级）:' -ForegroundColor Cyan
    Write-Host '  1. 会话级:  $env:变量名 = "值"'
    Write-Host ('  2. 永久:    编辑 ' + $envConfigPath + ' 的 environmentDefaults（唯一配置入口）')
    Write-Host '  3. 配置级:  在技能配置中改为 ${ENV:VAR:默认值} 内联默认值'
    exit 1
}
exit 0
