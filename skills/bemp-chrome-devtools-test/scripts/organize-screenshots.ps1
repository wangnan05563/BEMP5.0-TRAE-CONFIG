<#
.SYNOPSIS
    [已废弃] 请使用 aotutests-devtools/organize-screenshots.ps1（新版）

.DESCRIPTION
    本脚本为旧版截图归档工具（已废弃）。
    新版脚本位于项目根目录下的 aotutests-devtools/organize-screenshots.ps1，
    支持任务ID归档、自动索引生成、与 index.json 联动。
    本文件保留用于兼容已有的调用。如有新任务请使用新版。
#>

Write-Warning "本脚本已废弃，请使用新版: aotutests-devtools/organize-screenshots.ps1"

param(
    [string]$SourceDir = "d:\code\QJ\BEMP5.0DEV\screenshots",
    [string]$ArchiveBase = "",
    [string]$Prefix = ""
)

Write-Warning "执行旧版归档脚本（兼容模式）..."

# 尝试转移到新版脚本
$newScript = Join-Path $PSScriptRoot "..\..\..\..\aotutests-devtools\organize-screenshots.ps1"
if (Test-Path $newScript) {
    Write-Host "[提示] 检测到新版脚本，建议直接运行:" -ForegroundColor Cyan
    Write-Host "  .\aotutests-devtools\organize-screenshots.ps1 -TaskId ""$(Get-Date -Format 'yyyyMMdd')-001""" -ForegroundColor Cyan
}

# 以下为旧版兼容逻辑
if (-not $ArchiveBase) {
    $ArchiveBase = $SourceDir
}

if (-not $Prefix) {
    $Prefix = Get-Date -Format "yyyy-MM-dd_HHmm"
}

$ArchiveDir = Join-Path $ArchiveBase $Prefix

Write-Host "源目录: $SourceDir"
Write-Host "归档目录: $ArchiveDir"

if (-not (Test-Path $SourceDir)) {
    Write-Host "[错误] 源目录不存在: $SourceDir" -ForegroundColor Red
    exit 1
}

$pngFiles = Get-ChildItem -Path $SourceDir -Filter "*.png" -File

if ($pngFiles.Count -eq 0) {
    Write-Host "[信息] 没有需要归档的截图文件" -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path $ArchiveDir)) {
    New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
}

$movedCount = 0
foreach ($file in $pngFiles) {
    $destPath = Join-Path $ArchiveDir $file.Name
    Move-Item -Path $file.FullName -Destination $destPath -Force
    $movedCount++
}

Write-Host "归档完成: $movedCount 个文件" -ForegroundColor Green
Write-Host "[警告] 请尽快迁移到新版脚本: aotutests-devtools/organize-screenshots.ps1" -ForegroundColor Yellow