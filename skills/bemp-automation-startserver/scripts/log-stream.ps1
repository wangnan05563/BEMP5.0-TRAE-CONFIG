# log-stream.ps1 - BEMP 实时日志流工具
#
# 被 start-bemp-env.ps1 与生成的 launcher 脚本共同 dot-source。
#
# 设计动机：
#   旧实现用 cmd 2>&1 | Tee-Object 把服务日志写进管道，而 Java/Node 的 stdout
#   在连接管道时会被块缓冲，导致终端不能逐行实时滚动(看起来静默、只在文件里)。
#   新方案：服务输出重定向到 run-log 文件(OS 级落盘，按行 flush)，终端再用本模块的
#   Follow-ServiceLog 实时 tail 该文件，按时间顺序逐行打印，彻底绕开管道缓冲。
#
# 编码约定：本文件必须以 UTF-8 BOM 保存。PowerShell 5.1 读取无 BOM 的非 ASCII
#   文件时会按系统 ANSI 代码页(中文 Windows 为 GBK)解码，UTF-8 中文字节被乱码成
#   垃圾 token 从而导致解析失败。请勿移除 BOM。

# 仅在真实交互终端(非重定向/被捕获)时启用 ANSI 着色，避免把转义码写进被捕获的日志
$script:LS_UseColor = (-not [Console]::IsOutputRedirected)

function Colorize-LogLine {
    param([string]$Line)
    if ($null -eq $Line) { return $Line }
    if (-not $script:LS_UseColor) { return $Line }

    $esc = [char]27
    $l = $Line

    # 严重程度从高到低匹配，最严重的一档决定颜色
    if ($l -match '\b(FATAL|ERROR|SEVERE)\b' -or
        $l -match 'Exception(\s|$)' -or
        $l -match '^(at\s|\s+at\s|Caused by|BindException|OutOfMemory|StackOverflow)' -or
        $l -match '\[ERROR\]' -or
        $l -match 'BUILD FAILED') {
        return ('{0}[31m{1}{0}[0m' -f $esc, $l)   # 红：错误/异常/堆栈
    }
    if ($l -match '\b(WARN|WARNING)\b' -or $l -match '\[WARN\]') {
        return ('{0}[33m{1}{0}[0m' -f $esc, $l)   # 黄：警告
    }
    if ($l -match '\b(DEBUG|TRACE)\b' -or $l -match '\[DEBUG\]' -or $l -match '\[TRACE\]') {
        return ('{0}[90m{1}{0}[0m' -f $esc, $l)   # 灰：调试/跟踪
    }
    if ($l -match '\b(INFO)\b' -or $l -match '\[INFO\]') {
        return ('{0}[36m{1}{0}[0m' -f $esc, $l)   # 青：信息(让 INFO 行在大量输出中更易定位)
    }
    return $l
}

<#
.SYNOPSIS
    实时跟随一个或多个日志文件，按时间顺序逐行输出到终端。

.DESCRIPTION
    - 用 FileShare.ReadWrite 打开文件，可在服务持续写入时安全读取。
    - 主循环用位置追踪 + DiscardBufferedData 探测：每次轮询先把流定位到已知偏移并
      清空陈旧缓冲，再读可用行。这样另一进程(服务)持续追加的内容始终能被看到，
      不会出现"读到 EOF 后追加行读不到"的经典 StreamReader 尾随 bug。
    - 若传入 -Process，则当该进程退出且文件已读完时自动结束(适合"启动即跟随"场景)。
    - 若不传 -Process(如 -Follow 附加到已运行服务)，则一直跟随直到 Ctrl+C。
    - -Tail N：先打印每个文件的最后 N 行(历史回顾)，再定位到文件末尾只跟随新增内容。
#>
function Follow-ServiceLog {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Paths,
        [System.Diagnostics.Process]$Process = $null,
        [int]$PollMs = 150,
        [int]$Tail = 0
    )

    $readers = @()
    foreach ($p in $Paths) {
        # 等待文件出现(服务刚启动、重定向文件尚未创建)
        $tries = 0
        while (-not (Test-Path $p) -and $tries -lt 50) {
            Start-Sleep -Milliseconds 100
            $tries++
        }
        if (-not (Test-Path $p)) {
            Write-Warning "Log file not found, skipped: $p"
            continue
        }
        try {
            $fs = New-Object System.IO.FileStream($p, [System.IO.FileMode]::Open,
                [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        } catch {
            Write-Warning "Failed to open log file: $p ($($_.Exception.Message))"
            continue
        }

        # -Tail：先回看历史最后 N 行，再跳到文件末尾只跟随新增
        $startPos = 0
        if ($Tail -gt 0) {
            $sr0 = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
            $allLines = @()
            while (-not $sr0.EndOfStream) { $allLines += $sr0.ReadLine() }
            $sr0.Dispose()
            $recent = if ($allLines.Count -gt $Tail) { $allLines[($allLines.Count - $Tail)..($allLines.Count - 1)] } else { $allLines }
            foreach ($rl in $recent) { if ($null -ne $rl) { Write-Host (Colorize-LogLine $rl) } }
            $startPos = $fs.Length
        }

        $fs.Seek($startPos, [System.IO.SeekOrigin]::Begin) | Out-Null
        $reader = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
        $reader.DiscardBufferedData()
        $readers += @{ Stream = $fs; Reader = $reader; Path = $p; Pos = $startPos }
    }

    if ($readers.Count -eq 0) {
        Write-Warning "No log files to follow."
        return
    }

    if ($null -eq $Process) {
        Write-Host "[FOLLOW] Real-time log streaming started (Ctrl+C to stop)..." -ForegroundColor Cyan
    }

    # 安全读取进程退出状态：进程句柄可能已被回收，避免异常中断跟随
    function Test-ProcessExited($proc) {
        if ($null -eq $proc) { return $false }
        try { return $proc.HasExited } catch { return $false }
    }

    try {
        while ($true) {
            $anyData = $false
            foreach ($r in $readers) {
                # 重新定位到上次读取偏移并清空陈旧缓冲，确保追加内容可见
                $r.Stream.Seek($r.Pos, [System.IO.SeekOrigin]::Begin) | Out-Null
                $r.Reader.DiscardBufferedData()
                while (-not $r.Reader.EndOfStream) {
                    $line = $r.Reader.ReadLine()
                    if ($null -ne $line) {
                        Write-Host (Colorize-LogLine $line)
                        $anyData = $true
                    }
                }
                $r.Pos = $r.Stream.Position
            }

            # 跟踪的进程已退出：排空剩余内容后结束跟随
            if (Test-ProcessExited $Process) {
                $drain = 0
                while ($drain -lt 40) {
                    $more = $false
                    foreach ($r in $readers) {
                        $r.Stream.Seek($r.Pos, [System.IO.SeekOrigin]::Begin) | Out-Null
                        $r.Reader.DiscardBufferedData()
                        while (-not $r.Reader.EndOfStream) {
                            $line = $r.Reader.ReadLine()
                            if ($null -ne $line) { Write-Host (Colorize-LogLine $line); $more = $true }
                        }
                        $r.Pos = $r.Stream.Position
                    }
                    if ($more) { $drain = 0 } else { Start-Sleep -Milliseconds 50; $drain++ }
                }
                break
            }

            if (-not $anyData) { Start-Sleep -Milliseconds $PollMs }
        }
    } finally {
        foreach ($r in $readers) {
            try { $r.Reader.Dispose() } catch {}
            try { $r.Stream.Dispose() } catch {}
        }
    }
}
