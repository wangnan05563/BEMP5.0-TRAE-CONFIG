<#
.SYNOPSIS
    按时间戳归档 Chrome DevTools 验证截图

.DESCRIPTION
    将 screenshots 目录下的截图文件按 YYYY-MM-DD_HHmm 子目录归档。
    同时生成截图索引文件 index.md。

.PARAMETER SourceDir
    截图源目录路径，默认为 d:\code\QJ\BEMP5.0DEV\screenshots

.PARAMETER ArchiveBase
    归档根目录，默认与 SourceDir 相同

.PARAMETER Prefix
    时间戳前缀格式，默认为脚本执行时间

.EXAMPLE
    .\organize-screenshots.ps1
    按当前时间戳归档所有截图

.EXAMPLE
    .\organize-screenshots.ps1 -Prefix "2026-05-14_1530"
    按指定时间戳归档
#>

param(
    [string]$SourceDir = "d:\code\QJ\BEMP5.0DEV\screenshots",
    [string]$ArchiveBase = "",
    [string]$Prefix = ""
)

if (-not $ArchiveBase) {
    $ArchiveBase = $SourceDir
}

if (-not $Prefix) {
    $Prefix = Get-Date -Format "yyyy-MM-dd_HHmm"
}

$ArchiveDir = Join-Path $ArchiveBase $Prefix
$IndexFile = Join-Path $ArchiveDir "index.md"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " BEMP Chrome DevTools 截图归档工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "源目录: $SourceDir"
Write-Host "归档目录: $ArchiveDir"
Write-Host "时间戳: $Prefix"
Write-Host ""

# 检查源目录是否存在
if (-not (Test-Path $SourceDir)) {
    Write-Host "[错误] 源目录不存在: $SourceDir" -ForegroundColor Red
    exit 1
}

# 获取所有 PNG 截图文件（仅根层级，不递归）
$pngFiles = Get-ChildItem -Path $SourceDir -Filter "*.png" -File

if ($pngFiles.Count -eq 0) {
    Write-Host "[信息] 没有需要归档的截图文件" -ForegroundColor Yellow
    exit 0
}

# 创建归档目录
if (-not (Test-Path $ArchiveDir)) {
    New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
    Write-Host "[创建] 归档目录: $ArchiveDir" -ForegroundColor Green
}

# 移动文件
$movedCount = 0
$indexEntries = @()

foreach ($file in $pngFiles) {
    $destPath = Join-Path $ArchiveDir $file.Name
    Move-Item -Path $file.FullName -Destination $destPath -Force
    $sizeKB = [math]::Round($file.Length / 1024, 1)
    $indexEntries += "| $($file.Name) | $($sizeKB)KB |"
    $movedCount++
    Write-Host "  [移动] $($file.Name) ($($sizeKB)KB)" -ForegroundColor Gray
}

# 生成索引文件
$indexContent = @"
# 截图索引 - $Prefix

**归档时间**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**截图数量**: $movedCount

| 文件名 | 大小 |
|--------|------|
$($indexEntries -join "`n")

---

> 由 bemp-chrome-devtools-test Skill 自动生成
"@

Set-Content -Path $IndexFile -Value $indexContent -Encoding UTF8
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " 归档完成: $movedCount 个文件" -ForegroundColor Green
Write-Host " 索引文件: $IndexFile" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green