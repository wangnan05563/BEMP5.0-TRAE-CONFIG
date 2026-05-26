<#
.SYNOPSIS
BEMP Git同步与Maven构建统一入口
.DESCRIPTION
一条命令完成：配置加载→环境预检→仓库发现→Git同步→Maven构建→构建报告
.PARAMETER Mode
sync=仅同步 / incremental=增量构建(默认) / full=全量构建
.EXAMPLE
.\run-build.ps1 -Mode incremental
.\run-build.ps1 -Mode sync
.\run-build.ps1 -Mode full
#>

param(
    [ValidateSet("sync", "incremental", "full")]
    [string]$Mode = "incremental"
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$skillRoot = $env:BEMP_SKILL_ROOT
if (!$skillRoot -and $PSScriptRoot) {
    $skillRoot = Split-Path -Parent $PSScriptRoot
}
if (!$skillRoot) {
    $candidate = Join-Path $PWD ".trae\skills\bemp-git-maven-automation"
    if (Test-Path $candidate) { $skillRoot = (Resolve-Path $candidate).Path }
}
if (!$skillRoot) {
    Write-Error "Cannot determine skill root. Run from project root or set BEMP_SKILL_ROOT."
    exit 1
}

. (Join-Path $skillRoot "scripts\config-reader.ps1")

$c = Get-BuildConfig
if (!$c) { exit 1 }

$e = Test-BuildConfig $c
if ($e) { Write-Error ($e -join "`n"); exit 1 }

if ($Mode -eq "full") {
    $c["BUILD_TYPE"] = "full"
} elseif ($Mode -eq "incremental") {
    $c["BUILD_TYPE"] = "incremental"
}

$gitCmd = Find-GitCmd
if (!(Test-EnvPrerequisites $c $gitCmd)) { exit 1 }

Write-Host ""
Write-Host "===== BEMP Build (mode=$Mode) =====" -ForegroundColor Cyan

$repoList = Find-GitRepos $c $gitCmd
if ($repoList.Count -eq 0) {
    Write-Host "No git repos found" -ForegroundColor Yellow
    exit 0
}

$syncResults = Sync-GitRepos $c $gitCmd $repoList

$syncedCount = ($syncResults | Where-Object { $_.status -eq "synced" }).Count
$changedCount = ($syncResults | Where-Object { $_.hasSrcChanges }).Count
Write-Host ""
Write-Host "Sync done: $($syncResults.Count) repos, $syncedCount synced, $changedCount with source changes" -ForegroundColor Cyan

if ($Mode -eq "sync") {
    Write-Host "===== Done (sync only) =====" -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Invoke-MavenBuild $c $syncResults

Write-Host ""
Write-Host "===== Done =====" -ForegroundColor Cyan
