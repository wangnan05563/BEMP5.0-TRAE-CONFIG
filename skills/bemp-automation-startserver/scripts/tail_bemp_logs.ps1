# BEMP live log tailer (UTF-8, merged, colored, history preview).
# Auto-detects the latest launch batch from start-bemp.ps1 (_launch_summary_*.txt)
# or supervise_bemp.ps1 (_supervise_start_*.txt) and live-merges all
# *_startup_<ts>.log files with [service] prefixes. Uses FileStream polling with
# UTF-8 decoding to avoid the PS5.1 Get-Content -Wait buffering/EOR pitfall and
# the default-GBK garbling of UTF-8 logs. Run in a visible terminal (IDE terminal)
# to see real-time scrolling logs.

$logDir = Join-Path $PSScriptRoot '..\logs'

# Find latest batch marker: prefer new (_launch_summary), fallback to legacy (_supervise_start)
$marker = Get-ChildItem -Path $logDir -Filter "_launch_summary_*.txt" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if (-not $marker) {
    $marker = Get-ChildItem -Path $logDir -Filter "_supervise_start_*.txt" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
}
if (-not $marker) {
    Write-Host "[!] 未找到任何 BEMP 启动批次日志 ($logDir)" -ForegroundColor Yellow
    Write-Host "    请先运行 start-bemp.ps1（或 supervise_bemp.ps1）启动服务。" -ForegroundColor Yellow
    Read-Host "按回车退出"
    exit
}

# Extract batch timestamp
if ($marker.Name -match '_launch_summary_(\d{8}_\d{6})\.txt') { $ts = $Matches[1] }
elseif ($marker.Name -match '_supervise_start_(\d{8}_\d{6})\.txt') { $ts = $Matches[1] }
else {
    Write-Host "[!] 无法解析批次时间戳: $($marker.Name)" -ForegroundColor Red
    Read-Host "按回车退出"
    exit
}

$batchLogs = Get-ChildItem -Path $logDir -Filter "*_startup_$ts.log" -ErrorAction SilentlyContinue | Sort-Object Name
if ($batchLogs.Count -eq 0) {
    Write-Host "[!] 未找到批次 $ts 的服务日志 (${logDir}/*_startup_$ts.log)" -ForegroundColor Red
    Read-Host "按回车退出"
    exit
}

# Service-name color map
$colors = @{
    'redis'      = 'Magenta'
    'zookeeper'  = 'Yellow'
    'served'     = 'Cyan'
    'adapter'    = 'Green'
    'frontend'   = 'Blue'
}
function Get-SvcColor($name) {
    $key = ($name -split '_')[0]
    if ($colors.ContainsKey($key)) { return $colors[$key] }
    return 'Gray'
}

# Read the last N lines of a file by seeking near EOF (UTF-8). Drops the first
# partial line if we started mid-file.
function Get-LastLines($path, $n) {
    $fi = Get-Item $path -ErrorAction SilentlyContinue
    if (-not $fi -or $fi.Length -eq 0) { return @() }
    $readBytes = [Math]::Min($fi.Length, 8192)
    $fs = $null; $sr = $null
    try {
        $fs = [System.IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
        $fs.Seek($fi.Length - $readBytes, 'Begin') | Out-Null
        $sr = New-Object System.IO.StreamReader($fs, [System.Text.UTF8Encoding]::new($false))
        $text = $sr.ReadToEnd()
    } finally {
        if ($sr) { $sr.Dispose() }
        if ($fs) { $fs.Dispose() }
    }
    $lines = $text -split "`r?`n"
    if ($fi.Length -gt $readBytes -and $lines.Count -gt 0) { $lines = $lines[1..($lines.Count - 1)] }
    $last = @($lines | Select-Object -Last $n)
    return ,$last
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ("  BEMP 实时日志  (批次 {0})" -f $ts) -ForegroundColor Cyan
Write-Host ("  服务数: {0}   Ctrl+C 退出" -f $batchLogs.Count) -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
foreach ($f in $batchLogs) { Write-Host ("  - {0}" -f $f.Name) -ForegroundColor DarkGray }
Write-Host ""

# Per-file state: track read position. We seed Position to current EOF AFTER
# printing the last-N history, so the live loop only shows new lines from this
# point forward (no duplication of history).
$state = @{}
foreach ($f in $batchLogs) {
    $svc = $f.BaseName -replace ([regex]::Escape("_startup_$ts") + '$'), ''
    $clr = Get-SvcColor $svc
    $hist = @(Get-LastLines $f.FullName 50)
    $hist = @($hist | Where-Object { $_ -ne $null -and $_.Length -gt 0 })
    if ($hist.Count -gt 0) {
        Write-Host ("--- {0} (最近 {1} 行) ---" -f $svc, $hist.Count) -ForegroundColor DarkGray
        foreach ($hl in $hist) { Write-Host ("{0} {1}" -f "[$svc]", $hl) -ForegroundColor $clr }
    }
    $state[$f.FullName] = [pscustomobject]@{
        Position = (Get-Item $f.FullName).Length
        Prefix   = "[$svc]"
        Color    = $clr
        Path     = $f.FullName
    }
}
Write-Host "--- live ---" -ForegroundColor DarkGray

try {
    while ($true) {
        $anyOutput = $false
        foreach ($key in @($state.Keys)) {
            $s = $state[$key]
            if (-not (Test-Path $s.Path)) { continue }
            $fi = Get-Item $s.Path
            if ($fi.Length -lt $s.Position) { $s.Position = 0 }  # truncated/rotated
            if ($fi.Length -gt $s.Position) {
                $fs = $null; $sr = $null
                try {
                    # Reopen each poll to avoid the StreamReader tail-of-append
                    # pitfall (buffered reader at EOF doesn't see new data).
                    $fs = [System.IO.File]::Open($s.Path, 'Open', 'Read', 'ReadWrite')
                    $fs.Seek($s.Position, 'Begin') | Out-Null
                    $sr = New-Object System.IO.StreamReader($fs, [System.Text.UTF8Encoding]::new($false))
                    while (-not $sr.EndOfStream) {
                        $line = $sr.ReadLine()
                        if ($null -ne $line) {
                            Write-Host ("{0} {1}" -f $s.Prefix, $line) -ForegroundColor $s.Color
                            $anyOutput = $true
                        }
                    }
                    $s.Position = $fs.Position
                } finally {
                    if ($sr) { $sr.Dispose() }
                    if ($fs) { $fs.Dispose() }
                }
            }
        }
        if (-not $anyOutput) { Start-Sleep -Milliseconds 500 }
    }
} finally {
    Write-Host ""
    Write-Host "[*] 实时日志已退出。" -ForegroundColor Yellow
}
