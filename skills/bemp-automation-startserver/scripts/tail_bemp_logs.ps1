# BEMP live log tailer.
# Auto-detects the latest startup batch and tails its stdout logs (-Wait) so the
# terminal shows real-time output. Run in a visible -NoExit window.
$logDir = Join-Path $PSScriptRoot '..\logs'

$startFiles = Get-ChildItem -Path $logDir -Filter "_supervise_start_*.txt" -ErrorAction SilentlyContinue | Sort-Object Name -Descending
if ($startFiles.Count -eq 0) {
    Write-Host "未找到任何 BEMP 启动批次日志 ($logDir)" -ForegroundColor Yellow
    Write-Host "请先运行 supervise_bemp.ps1 启动服务。" -ForegroundColor Yellow
    Read-Host "按回车退出"
    exit
}

$latest = $startFiles[0].Name
if ($latest -match '_supervise_start_(\d{8}_\d{6})\.txt') {
    $ts = $Matches[1]
} else {
    Write-Host "无法解析启动批次时间戳: $latest" -ForegroundColor Red
    Read-Host "按回车退出"
    exit
}

$batchLogs = Get-ChildItem -Path $logDir -Filter "*_startup_$ts.log" -ErrorAction SilentlyContinue
if ($batchLogs.Count -eq 0) {
    Write-Host "未找到批次 $ts 的服务日志文件。" -ForegroundColor Red
    Read-Host "按回车退出"
    exit
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  BEMP 实时日志  (批次 $ts)" -ForegroundColor Cyan
Write-Host "  追踪文件数: $($batchLogs.Count)   (Ctrl+C 退出)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
foreach ($f in $batchLogs) { Write-Host "  - $($f.Name)" -ForegroundColor DarkGray }

# Tail all batch stdout logs live. New lines from any service appear as written.
Get-Content -Path ($batchLogs.FullName) -Wait -Tail 25
