# BEMP Development Environment Startup Script
# Function: Check service status, start services in IDE or external PowerShell terminal
# Optimized: PowerShell external terminal, config-driven defaults, unified lifecycle, dep-wait, health-check, log-tee

param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\config.json",
    [string]$Service = "",
    [switch]$Status,
    [switch]$ForceRestart,
    [switch]$QuickStart,
    [switch]$AutoRestart,
    [switch]$ExternalTerminal,
    [switch]$WaitForDeps,
    [string]$LaunchMode = ""
)

$originalLocation = Get-Location
$script:LastStartupLogPath = ""

. (Join-Path $PSScriptRoot "..\..\_shared\Resolve-EnvConfig.ps1")

# ──────────────────────────── 折叠式进度条函数 ────────────────────────────
# 使用ASCII兼容的spinner字符
$script:SpinnerFrames = @('|', '/', '-', '\')

function Test-AnsiSupport {
    if ([Console]::IsOutputRedirected) { return $false }
    try { $null = $Host.UI.RawUI.ForegroundColor; return $true } catch { return $false }
}

function Show-WaitProgress {
    param(
        [string]$Message,
        [int]$Elapsed,
        [int]$MaxWait,
        [switch]$Complete,
        [string]$FinalMessage,
        [ValidateSet('Spinner','Bar','Minimal')]
        [string]$Style = 'Bar'
    )
    $supportsAnsi = Test-AnsiSupport
    $ESC = [char]27
    
    if ($Complete) {
        # 完成时先回车+空格覆盖进度条残留，再回车输出完成消息
        # 双重保障：ANSI清行 + 空格覆盖，兼容不支持ANSI的终端
        Write-Host -NoNewline ("`r" + (" " * 100) + "`r")
        if ($supportsAnsi) { Write-Host "$ESC[2K$ESC[32m[OK]$ESC[0m $FinalMessage" }
        else { Write-Host "[OK] $FinalMessage" }
    } else {
        $spinnerFrame = $script:SpinnerFrames[$Elapsed % $script:SpinnerFrames.Count]
        $pct = if ($MaxWait -gt 0) { [Math]::Min(100, [Math]::Round($Elapsed * 100 / $MaxWait)) } else { 0 }
        
        if ($Style -eq 'Bar' -and $supportsAnsi) {
            # 进度条样式：显示百分比和进度条
            $barW = 16
            $filled = [Math]::Round($pct * $barW / 100)
            $bar = "=" * $filled + "-" * ($barW - $filled)
            $msg = "$ESC[2K$ESC[G$ESC[36m[$spinnerFrame]$ESC[0m $Message [$ESC[32m$bar$ESC[0m] ${pct}% ($Elapsed/${MaxWait}s)"
            Write-Host -NoNewline $msg
        } elseif ($Style -eq 'Spinner' -and $supportsAnsi) {
            # Spinner样式：仅显示动画和文字
            $msg = "$ESC[2K$ESC[G$ESC[36m[$spinnerFrame]$ESC[0m $Message ($Elapsed/${MaxWait}s)"
            Write-Host -NoNewline $msg
        } else {
            # Minimal/非ANSI样式：简洁显示
            Write-Host -NoNewline "`r[$Message] $pct% ($Elapsed/${MaxWait}s)"
        }
    }
}

# ──────────────────────────── 通用工具函数 ────────────────────────────

function Set-ConsoleEncoding {
    try { chcp 65001 > $null 2>&1 } catch {}
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding  = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
}
Set-ConsoleEncoding

function Write-Step($message)    { Write-Host "[INFO] $message" -ForegroundColor Cyan }
function Write-Success($message) { Write-Host "[OK]   $message" -ForegroundColor Green }
function Write-Warning($message) { Write-Host "[WARN] $message" -ForegroundColor Yellow }
function Write-Error($message)   { Write-Host "[ERROR]$message" -ForegroundColor Red }

function Write-Header {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "     BEMP Dev Environment" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

# ──────────────────────────── 端口与进程管理 ────────────────────────────

function Test-PortListening {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        # 单个对象时Count可能为$null，用@()强制转为数组
        return ($null -ne $conn -and @($conn).Count -gt 0)
    } catch {
        try {
            $result = netstat -ano | findstr ":$Port " | findstr "LISTENING"
            return ($null -ne $result -and $result -ne "")
        } catch { return $false }
    }
}

function Stop-ServiceByPort {
    param([int]$Port, [string]$ServiceName)
    if (-not (Test-PortListening -Port $Port)) { return }
    # 用 $procIds 代替 $pids/$pid，避免与 PowerShell 只读变量 $PID 冲突
    $procIds = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
               Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $procIds) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Warning "Stopping $ServiceName (PID: $procId)..."
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
    Start-Sleep -Seconds 2
}

function Get-PortProcessInfo {
    param([int]$Port)
    $procIds = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
               Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $procIds) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) { return @{ Name = $proc.Name; PID = $procId } }
        } catch {}
    }
    return $null
}

# ──────────────────────────── 依赖等待 ────────────────────────────

function Wait-Dependencies {
    param(
        [string[]]$DepServices,
        [object]$AllServices,
        [int]$MaxWaitSeconds = 120,
        [int]$PollIntervalSeconds = 5
    )
    if ($DepServices.Count -eq 0) { return $true }

    foreach ($dep in $DepServices) {
        $svcConfig = $null
        if ($AllServices.PSObject.Properties.Name -contains $dep) {
            $svcConfig = $AllServices.$dep
        }
        if (-not $svcConfig) {
            Write-Warning "Dependency '$dep' not found in config, skipping wait"
            continue
        }

        $port = if ($svcConfig.ports -is [array]) { $svcConfig.ports[0] } else { $svcConfig.port }
        $elapsed = 0
        Write-Step "Waiting for $dep (port $port)..."

        while ($elapsed -lt $MaxWaitSeconds) {
            if (Test-PortListening -Port $port) {
                # 使用折叠式进度显示：完成状态
                Show-WaitProgress -Complete -FinalMessage "$dep ready (port $port)"
                break
            }
            # 使用折叠式进度显示：等待中
            Show-WaitProgress -Message "${dep}:$port" -Elapsed $elapsed -MaxWait $MaxWaitSeconds
            Start-Sleep -Seconds $PollIntervalSeconds
            $elapsed += $PollIntervalSeconds
        }
        if ($elapsed -ge $MaxWaitSeconds) {
            Write-Error "$dep not ready after ${MaxWaitSeconds}s"
            return $false
        }
    }
    return $true
}

# ──────────────────────────── 健康检查 ────────────────────────────

function Wait-ServiceReady {
    param(
        [int]$Port,
        [string]$ServiceName,
        [int]$MaxWaitSeconds = 300,
        [int]$PollIntervalSeconds = 15
    )
    $elapsed = 0
    while ($elapsed -lt $MaxWaitSeconds) {
        if (Test-PortListening -Port $Port) {
            # 使用折叠式进度显示：完成状态
            Show-WaitProgress -Complete -FinalMessage "$ServiceName ready (port $Port)"
            return $true
        }
        # 使用折叠式进度显示：等待中
        Show-WaitProgress -Message "${ServiceName}:$Port" -Elapsed $elapsed -MaxWait $MaxWaitSeconds
        Start-Sleep -Seconds $PollIntervalSeconds
        $elapsed += $PollIntervalSeconds
    }
    Write-Error "$ServiceName not ready after ${MaxWaitSeconds}s on port $Port"
    return $false
}

function Invoke-Diagnostics {
    param(
        [string]$ServiceName,
        [int]$Port,
        [string[]]$DepServices,
        [object]$AllServices,
        [string]$AppLogFile,
        [string]$StartupLog,
        [string[]]$LogKeywords
    )
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Diagnostic: $ServiceName" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red

    # 检查依赖服务
    foreach ($dep in $DepServices) {
        $svcConfig = $null
        if ($AllServices.PSObject.Properties.Name -contains $dep) {
            $svcConfig = $AllServices.$dep
        }
        if ($svcConfig) {
            $depPort = if ($svcConfig.ports -is [array]) { $svcConfig.ports[0] } else { $svcConfig.port }
            if (-not (Test-PortListening -Port $depPort)) {
                Write-Error "Dependency $dep (port $depPort) is NOT running. Start it first."
            } else {
                Write-Success "Dependency $dep (port $depPort) is running"
            }
        }
    }

    # 扫描启动日志（外部终端的console输出）
    if ($StartupLog -and (Test-Path $StartupLog)) {
        Write-Step "Scanning startup log: $StartupLog"
        _ScanLogFile -Path $StartupLog -Keywords $LogKeywords -ServiceName $ServiceName -ServicePort $Port
    }

    # 扫描应用日志（服务自身写的log文件）
    if ($AppLogFile -and (Test-Path $AppLogFile)) {
        Write-Step "Scanning app log: $AppLogFile"
        _ScanLogFile -Path $AppLogFile -Keywords $LogKeywords -ServiceName $ServiceName -ServicePort $Port
    }

    if (($StartupLog -and -not (Test-Path $StartupLog)) -or ($AppLogFile -and -not (Test-Path $AppLogFile))) {
        Write-Warning "Log file not found. Startup: $StartupLog, App: $AppLogFile"
    }

    # 端口占用检查
    $portInfo = Get-PortProcessInfo -Port $Port
    if ($portInfo) {
        Write-Warning "Port $Port is occupied by: $($portInfo.Name) (PID: $($portInfo.PID))"
    } else {
        Write-Warning "Port $Port is not occupied - service may have exited"
    }

    Write-Host ""
}

function _ScanLogFile {
    param([string]$Path, [string[]]$Keywords, [string]$ServiceName, [int]$ServicePort = 0)
    foreach ($keyword in $Keywords) {
        $hits = Select-String -Path $Path -Pattern $keyword -SimpleMatch -ErrorAction SilentlyContinue |
                Select-Object -Last 5
        if ($hits) {
            Write-Warning "Found '$keyword':"
            foreach ($m in $hits) {
                Write-Host "  $($m.Line)" -ForegroundColor Gray
            }
            if ($keyword -in @("SessionExpired", "ConnectionLoss")) {
                Write-Warning "ZK session expired detected. Try: restart ZooKeeper first, then restart $ServiceName"
            }
            # BindException: 检测Windows Hyper-V端口保留是否导致端口冲突
            if ($keyword -in @("Exception", "BindException")) {
                $bindHits = Select-String -Path $Path -Pattern "BindException" -ErrorAction SilentlyContinue
                if ($bindHits -and $ServicePort -gt 0) {
                    Write-Warning "BindException detected — checking if port $ServicePort is in Windows exclusion range..."
                    $exclRanges = netsh interface ipv4 show excludedportrange protocol=tcp 2>$null
                    foreach ($line in $exclRanges) {
                        if ($line -match "^\s+(\d+)\s+(\d+)\s*$") {
                            $exclStart = [int]$Matches[1]; $exclEnd = [int]$Matches[2]
                            if ($ServicePort -ge $exclStart -and $ServicePort -le $exclEnd) {
                                Write-Error "Port $ServicePort is in Windows exclusion range ($exclStart-$exclEnd). Hyper-V/WSL reserves this port."
                                Write-Warning "Solution 1: Reboot after running 'netsh interface ipv4 set dynamicport tcp start=49152 num=16384' (admin)"
                                Write-Warning "Solution 2: Disable Hyper-V temporarily, or use a different port"
                                break
                            }
                        }
                    }
                }
            }
        }
    }
}

# ──────────────────────────── 日志文件管理 ────────────────────────────

function Get-StartupLogPath {
    param([string]$ServiceName)
    $logDir = Join-Path $PSScriptRoot "..\logs"
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    return Join-Path $logDir "${ServiceName}_startup_${timestamp}.log"
}

# 清理过期的launcher脚本和启动日志（清理时间通过health-check.json的defaults.logCleanupHours配置）
function Clear-OldLauncherScripts {
    param([object]$HConfig = $null)
    $logDir = Join-Path $PSScriptRoot "..\logs"
    if (-not (Test-Path $logDir)) { return }
    # 从配置读取清理时间，默认24小时
    $cleanupHours = Get-HealthConfigValue -HConfig $HConfig -ServiceKey "" -Property "logCleanupHours" -Default 24
    $cutoff = (Get-Date).AddHours(-$cleanupHours)
    Get-ChildItem -Path $logDir -Filter "launcher_*.ps1" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path $logDir -Filter "*_startup_*.log" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        Remove-Item -Force -ErrorAction SilentlyContinue
}
# 注意：Clear-OldLauncherScripts 在加载 healthConfig 后调用，以读取配置的清理时间

# ──────────────────────────── 健康检查配置读取（配置驱动，无硬编码） ────────────────────────────

function Get-HealthConfigValue {
    param(
        [object]$HConfig,
        [string]$ServiceKey,
        [string]$Property,
        [string]$ServiceType = "",
        $Default = $null
    )
    # 四级优先级：服务级配置 > byType类型默认 > defaults节 > 传入默认值
    # Level 1: 服务级配置（health-check.json → services.{ServiceKey}.{Property}）
    if ($HConfig -and $HConfig.PSObject.Properties.Name -contains "services" -and
        $HConfig.services.PSObject.Properties.Name -contains $ServiceKey -and
        $HConfig.services.$ServiceKey.PSObject.Properties.Name -contains $Property) {
        return $HConfig.services.$ServiceKey.$Property
    }
    # Level 2: 按服务类型的默认值（health-check.json → byType.{ServiceType}.{Property}）
    if ($HConfig -and $ServiceType -ne "" -and
        $HConfig.PSObject.Properties.Name -contains "byType" -and
        $HConfig.byType.PSObject.Properties.Name -contains $ServiceType -and
        $HConfig.byType.$ServiceType.PSObject.Properties.Name -contains $Property) {
        return $HConfig.byType.$ServiceType.$Property
    }
    # Level 3: 全局默认值（health-check.json → defaults.{Property}）
    if ($HConfig -and $HConfig.PSObject.Properties.Name -contains "defaults" -and
        $HConfig.defaults.PSObject.Properties.Name -contains $Property) {
        return $HConfig.defaults.$Property
    }
    # Level 4: 代码默认值
    return $Default
}

# ──────────────────────────── 外部终端启动脚本生成 ────────────────────────────
# 使用PowerShell替代CMD，解决tee-object不可用问题
# 生成.ps1启动脚本，在独立PowerShell窗口中运行服务并实时输出日志

function Build-ExternalTerminalScript {
    param(
        [object]$StartInfo,
        [string]$LogPath,
        [string]$TerminalTitle,
        [string]$ServiceName
    )

    $logDir = Join-Path $PSScriptRoot "..\logs"
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $scriptPath = Join-Path $logDir "launcher_${ServiceName}_${timestamp}.ps1"

    $sb = [System.Text.StringBuilder]::new()

    [void]$sb.AppendLine("# BEMP Launcher: $ServiceName - Auto-generated")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("chcp 65001 | Out-Null")
    [void]$sb.AppendLine("[Console]::OutputEncoding = [System.Text.Encoding]::UTF8")
    [void]$sb.AppendLine("`$host.UI.RawUI.WindowTitle = '$TerminalTitle'")
    [void]$sb.AppendLine("")

    # 环境变量
    if ($StartInfo.EnvVars) {
        foreach ($kv in $StartInfo.EnvVars.GetEnumerator()) {
            [void]$sb.AppendLine("`$env:$($kv.Key) = '$($kv.Value)'")
        }
        [void]$sb.AppendLine("")
    }

    [void]$sb.AppendLine("Set-Location '$($StartInfo.WorkingDir)'")
    [void]$sb.AppendLine("Write-Host '========================================' -ForegroundColor Cyan")
    [void]$sb.AppendLine("Write-Host '  $TerminalTitle' -ForegroundColor Cyan")
    [void]$sb.AppendLine("Write-Host '========================================' -ForegroundColor Cyan")
    [void]$sb.AppendLine("Write-Host 'Log: $LogPath' -ForegroundColor Gray")
    [void]$sb.AppendLine("Write-Host ''")

    # 过滤原生命令stderr的ErrorRecord包装
    # PowerShell 的 2>&1 会把原生命令(Java/Redis等)的stderr包装为ErrorRecord(NativeCommandError)，
    # 导致JVM的"Picked up JAVA_TOOL_OPTIONS"等正常提示被红色显示为错误。
    # 此函数提取ErrorRecord的纯文本，按普通输出处理，避免误导。
    [void]$sb.AppendLine("function Convert-NativeOutput {")
    [void]$sb.AppendLine("    `$input | ForEach-Object {")
    [void]$sb.AppendLine("        if (`$_ -is [System.Management.Automation.ErrorRecord]) {")
    [void]$sb.AppendLine("            `$_.ToString()")
    [void]$sb.AppendLine("        } else {")
    [void]$sb.AppendLine("            `$_")
    [void]$sb.AppendLine("        }")
    [void]$sb.AppendLine("    }")
    [void]$sb.AppendLine("}")
    [void]$sb.AppendLine("")

    # 版本诊断等预启动输出（如前端 node/npm 版本确认）
    if ($StartInfo.PreStartLines -and $StartInfo.PreStartLines.Count -gt 0) {
        foreach ($line in $StartInfo.PreStartLines) {
            [void]$sb.AppendLine($line)
        }
        [void]$sb.AppendLine("Write-Host ''")
    }

    [void]$sb.AppendLine("")

    # 执行服务命令 + Tee-Object同时输出到终端和日志文件
    # 使用参数数组直接传递给可执行文件，避免PowerShell解析特殊字符(;=)
    # 数组在launcher脚本中会自动展开为独立参数
    # 2>&1 后接 Convert-NativeOutput 过滤，把原生命令stderr的ErrorRecord转为纯文本
    if ($StartInfo.CommandArgs -is [array] -and $StartInfo.CommandArgs.Count -gt 0) {
        # 生成参数数组声明：$cmdArgs = @('arg1', 'arg2', ...)
        $argsStr = ($StartInfo.CommandArgs | ForEach-Object {
            $escaped = $_ -replace "'", "''"
            "'$escaped'"
        }) -join ', '
        [void]$sb.AppendLine("`$cmdArgs = @($argsStr)")
        [void]$sb.AppendLine("& '$($StartInfo.Command)' @cmdArgs 2>&1 | Convert-NativeOutput | Tee-Object -FilePath '$LogPath' -Append")
    } elseif ($StartInfo.CommandLine) {
        [void]$sb.AppendLine("& $($StartInfo.CommandLine) 2>&1 | Convert-NativeOutput | Tee-Object -FilePath '$LogPath' -Append")
    }

    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("Write-Host ''")
    [void]$sb.AppendLine("Write-Host '[Service exited] Press any key to close...' -ForegroundColor Yellow")
    [void]$sb.AppendLine("`$null = [Console]::ReadKey(`$true)")

    $sb.ToString() | Set-Content -Path $scriptPath -Encoding UTF8
    return $scriptPath
}

# ──────────────────────────── 统一服务启动 ────────────────────────────

function Start-BempService {
    param(
        [string]$ServiceKey,
        [object]$SvcConfig,
        [object]$GlobalPaths,
        [object]$HealthConfig,
        [object]$AllServices
    )

    $serviceName    = $SvcConfig.name
    $serviceType    = $SvcConfig.type
    $port           = if ($SvcConfig.ports -is [array]) { $SvcConfig.ports[0] } else { $SvcConfig.port }
    $useExternal    = $ExternalTerminal

    # 终端标题
    $terminalTitle = "BEMP - $serviceName ($port)"
    try { $host.UI.RawUI.WindowTitle = $terminalTitle } catch {}
    $esc = [char]27; $bel = [char]7
    Write-Host -NoNewline "$esc]0;$terminalTitle$bel"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $serviceName Startup" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    if ($useExternal) { Write-Host "  Mode: External PowerShell Terminal" -ForegroundColor Yellow }
    Write-Host ""

    # ── Step 1: 检查运行状态 ──
    Write-Step "Checking $serviceName status..."
    $isRunning = Test-PortListening -Port $port

    if ($isRunning -and -not $ForceRestart -and -not $AutoRestart) {
        Write-Success "$serviceName is running (port $port)"
        return $true
    }

    # ── Step 2: 处理端口冲突 ──
    if ($isRunning) {
        $portInfo = Get-PortProcessInfo -Port $port
        if ($portInfo) {
            if ($ForceRestart -or $AutoRestart) {
                Write-Warning "Stopping existing process: $($portInfo.Name) (PID: $($portInfo.PID))"
                Stop-ServiceByPort -Port $port -ServiceName $serviceName
            } else {
                Write-Error "Port $port is occupied by $($portInfo.Name) (PID: $($portInfo.PID))"
                Write-Host "  Use -ForceRestart to stop and restart" -ForegroundColor Yellow
                return $false
            }
        }
    }

    # ── Step 3: 等待依赖（仅 SpringBoot 类型） ──
    if ($WaitForDeps -and $serviceType -eq "springboot") {
        $deps = @()
        if ($SvcConfig.PSObject.Properties.Name -contains "dependencies") {
            $deps = @($SvcConfig.dependencies)
        } elseif ($SvcConfig.PSObject.Properties.Name -contains "diagnostics" -and
                  $SvcConfig.diagnostics.PSObject.Properties.Name -contains "checkDependencies") {
            $deps = @($SvcConfig.diagnostics.checkDependencies)
        }
        if ($deps.Count -gt 0) {
            $depWait = Get-HealthConfigValue -HConfig $HealthConfig -ServiceKey $ServiceKey -Property "depWaitSeconds" -ServiceType $serviceType -Default 120
            $ok = Wait-Dependencies -DepServices $deps -AllServices $AllServices -MaxWaitSeconds $depWait
            if (-not $ok) {
                Write-Error "Dependencies not ready, aborting $serviceName start"
                return $false
            }
        }
    }

    # ── Step 4: 构建启动命令 ──
    $startInfo = Build-StartCommand -ServiceType $serviceType -SvcConfig $SvcConfig -GlobalPaths $GlobalPaths
    if (-not $startInfo) {
        Write-Error "Failed to build start command for $serviceName"
        return $false
    }

    # ── Step 5: 执行启动 ──
    $logPath = Get-StartupLogPath -ServiceName $serviceName
    $script:LastStartupLogPath = $logPath

    if ($useExternal) {
        # 外部终端模式：生成.ps1启动脚本，在独立PowerShell窗口运行
        # 原生支持Tee-Object，终端实时显示服务日志
        $launcherScript = Build-ExternalTerminalScript -StartInfo $startInfo -LogPath $logPath `
            -TerminalTitle $terminalTitle -ServiceName $serviceName
        Write-Step "Launching in external PowerShell: $serviceName"
        Write-Host "  Log: $logPath" -ForegroundColor Gray
        Write-Host "  Script: $launcherScript" -ForegroundColor Gray
        # PowerShell 5.1 的 Start-Process -ArgumentList 需要单字符串，逗号分隔会导致类型转换错误
        $psArgs = "-NoExit -ExecutionPolicy Bypass -File `"$launcherScript`""
        Start-Process -FilePath "powershell.exe" -ArgumentList $psArgs
        Start-Sleep -Seconds 2
    } else {
        # IDE终端模式：前台运行
        Show-TerminalWarning
        Write-Host "Working Dir: $($startInfo.WorkingDir)" -ForegroundColor Gray
        Write-Host "Command: $($startInfo.CommandLine)" -ForegroundColor Gray
        if ($logPath) { Write-Host "Log: $logPath" -ForegroundColor Gray }
        Write-Host ""

        Set-Location $startInfo.WorkingDir

        # 设置环境变量
        if ($startInfo.EnvVars) {
            foreach ($kv in $startInfo.EnvVars.GetEnumerator()) {
                Set-Item -Path "env:$($kv.Key)" -Value $kv.Value
            }
        }

        # 版本诊断等预启动输出（如前端 node/npm 版本确认）
        if ($startInfo.PreStartLines -and $startInfo.PreStartLines.Count -gt 0) {
            foreach ($line in $startInfo.PreStartLines) {
                Invoke-Expression $line
            }
            Write-Host ""
        }

        # 通过 Tee-Object 同时输出到终端和日志文件
        if ($startInfo.CommandArgs -is [array]) {
            & $startInfo.Command $startInfo.CommandArgs 2>&1 | Tee-Object -FilePath $logPath -Append
        } else {
            & $startInfo.CommandLine 2>&1 | Tee-Object -FilePath $logPath -Append
        }
    }

    return $true
}

function Show-TerminalWarning {
    Write-Host ""
    Write-Host "[!] This terminal is occupied by the service. Do NOT run other commands." -ForegroundColor Yellow
    Write-Host "    Use a separate terminal for status checks." -ForegroundColor Gray
    Write-Host ""
}

# ──────────────────────────── 各类型启动命令构建 ────────────────────────────

function Build-StartCommand {
    param([string]$ServiceType, [object]$SvcConfig, [object]$GlobalPaths)

    switch ($ServiceType) {
        "redis"      { return Build-RedisCommand -SvcConfig $SvcConfig }
        "zookeeper"  { return Build-ZooKeeperCommand -SvcConfig $SvcConfig }
        "springboot" { return Build-SpringBootCommand -SvcConfig $SvcConfig -GlobalPaths $GlobalPaths }
        "frontend"   { return Build-FrontendCommand -SvcConfig $SvcConfig -GlobalPaths $GlobalPaths }
        default {
            Write-Error "Unknown service type: $ServiceType"
            return $null
        }
    }
}

function Build-RedisCommand {
    param([object]$SvcConfig)
    $exe = $SvcConfig.executable
    if (-not (Test-Path $exe)) {
        Write-Error "Redis executable not found: $exe"
        return $null
    }
    return @{
        WorkingDir   = Split-Path -Parent $exe
        Command      = Join-Path (Split-Path -Parent $exe) (Split-Path -Leaf $exe)
        CommandArgs  = @()
        CommandLine  = ".\$(Split-Path -Leaf $exe)"
        EnvVars      = @{}
    }
}

function Build-ZooKeeperCommand {
    param([object]$SvcConfig)
    $exe = $SvcConfig.executable
    if (-not (Test-Path $exe)) {
        Write-Error "ZooKeeper executable not found: $exe"
        return $null
    }
    return @{
        WorkingDir   = Split-Path -Parent $exe
        Command      = Join-Path (Split-Path -Parent $exe) (Split-Path -Leaf $exe)
        CommandArgs  = @()
        CommandLine  = ".\$(Split-Path -Leaf $exe)"
        EnvVars      = @{ "JAVA_TOOL_OPTIONS" = "-Dfile.encoding=UTF-8" }
    }
}

function Build-SpringBootCommand {
    param([object]$SvcConfig, [object]$GlobalPaths)

    $projectPath  = $GlobalPaths.banksProjectPath
    $modulePath   = $SvcConfig.modulePath
    $warFile      = $SvcConfig.warFile
    $mainClass    = $SvcConfig.mainClass
    $jvmOptions   = $SvcConfig.jvmOptions
    $javaHome     = $GlobalPaths.javaHome
    $mavenPath    = $GlobalPaths.mavenPath
    $mavenCommand = $SvcConfig.mavenCommand
    $autoCompile  = $SvcConfig.autoCompile
    $launchMode   = if ($LaunchMode -ne "") { $LaunchMode } else { $SvcConfig.launchMode }

    # 编译检查
    if ($QuickStart) {
        Write-Warning "QuickStart: Skipping Maven compilation"
    } elseif ($autoCompile) {
        Write-Step "Compiling with Maven..."
        if (-not (Test-Path $mavenPath)) {
            Write-Error "Maven not found: $mavenPath"
            return $null
        }
        Set-Location $projectPath
        $mavenArgs = $mavenCommand.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
        $mavenArgs += "-pl", $modulePath, "-am"
        & $mavenPath @mavenArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Maven compilation failed!"
            return $null
        }
        Write-Success "Maven compilation completed"
    }

    # 检查 WAR 目录
    $warDirName = [System.IO.Path]::GetFileNameWithoutExtension($warFile)
    $webinfClasses = Join-Path $projectPath "$modulePath\target\$warDirName\WEB-INF\classes"
    $webinfLib     = Join-Path $projectPath "$modulePath\target\$warDirName\WEB-INF\lib"
    $flatClasses   = Join-Path $projectPath "$modulePath\target\classes"
    $flatLib       = Join-Path $projectPath "$modulePath\target\lib"

    $envVars = @{}
    if ($javaHome) {
        $envVars["JAVA_HOME"] = $javaHome
        $javaExe = Join-Path $javaHome "bin\java.exe"
    } else {
        $javaExe = "java"
    }

    if ((Test-Path $webinfClasses) -and (Test-Path $webinfLib)) {
        $workingDir = Join-Path $projectPath "$modulePath\target\$warDirName"
        $cpClasses  = "WEB-INF\classes"
        $cpLib      = "WEB-INF\lib\*"
        Write-Success "Using exploded WAR structure"
    } elseif ((Test-Path $flatClasses) -and (Test-Path $flatLib)) {
        $workingDir = Join-Path $projectPath "$modulePath\target"
        $cpClasses  = "classes"
        $cpLib      = "lib\*"
        Write-Success "Using flat target structure"
    } else {
        Write-Error "No compiled classes found. Run without -QuickStart first."
        return $null
    }

    $allArgs = @()
    $allArgs += $jvmOptions.Split(' ')
    $allArgs += @("-Dfile.encoding=UTF-8", "-Dsun.stdout.encoding=UTF-8", "-Dsun.stderr.encoding=UTF-8")
    $allArgs += @("-cp", "$cpClasses;$cpLib", $mainClass)

    return @{
        WorkingDir   = $workingDir
        Command      = $javaExe
        CommandArgs  = $allArgs
        CommandLine  = "$javaExe $($allArgs -join ' ')"
        EnvVars      = $envVars
    }
}

function Build-FrontendCommand {
    param([object]$SvcConfig, [object]$GlobalPaths)

    $projectPath    = $GlobalPaths.frontendProjectPath
    $nodePath       = $GlobalPaths.nodePath
    $nodeMemLimit   = $SvcConfig.nodeMemoryLimit

    if (-not (Test-Path $projectPath)) {
        Write-Error "Frontend project not found: $projectPath"
        return $null
    }

    $nodeExe = if ($nodePath -and (Test-Path $nodePath)) { $nodePath } else { "node" }
    $nodeDir = Split-Path -Parent $nodeExe
    $npmCmd  = Join-Path $nodeDir "npm.cmd"

    # 依赖检查
    Set-Location $projectPath
    if ($QuickStart) {
        if (-not (Test-Path "node_modules")) {
            Write-Error "QuickStart failed: node_modules not found"
            return $null
        }
    } elseif (-not (Test-Path "node_modules")) {
        Write-Step "Installing dependencies..."
        $env:PUPPETEER_SKIP_DOWNLOAD = "true"
        $env:ELECTRON_SKIP_BINARY_DOWNLOAD = "true"
        & $npmCmd install --prefer-offline --no-audit --no-fund --scripts-prepend-node-path
        Remove-Item Env:PUPPETEER_SKIP_DOWNLOAD -ErrorAction SilentlyContinue
        Remove-Item Env:ELECTRON_SKIP_BINARY_DOWNLOAD -ErrorAction SilentlyContinue
        if ($LASTEXITCODE -ne 0) {
            Write-Error "npm install failed"
            return $null
        }
    }

    $envVars = @{
        "NODE_ENV" = "development"
    }
    if ($nodeMemLimit) {
        $envVars["NODE_OPTIONS"] = "--max_old_space_size=$nodeMemLimit"
    }

    # 将 node14 目录注入 PATH 最前面，确保 npm 子进程（webpack 等）使用正确 Node 版本
    # 而非系统默认的高版本 Node（如 v24）
    $currentPath = [Environment]::GetEnvironmentVariable("PATH")
    if ($nodeDir -and ($currentPath -notlike "$nodeDir*")) {
        $envVars["PATH"] = "$nodeDir;$currentPath"
    }

    # 版本诊断：启动前打印 node/npm 版本，便于在外部终端确认版本正确
    $preStartLines = @()
    if ($nodeExe -and (Test-Path $nodeExe -ErrorAction SilentlyContinue)) {
        $preStartLines += "Write-Host 'Node version: ' -NoNewline -ForegroundColor Cyan; & '$nodeExe' --version"
    }
    if ($npmCmd -and (Test-Path $npmCmd -ErrorAction SilentlyContinue)) {
        $preStartLines += "Write-Host 'NPM version:  ' -NoNewline -ForegroundColor Cyan; & '$npmCmd' --version"
    }

    return @{
        WorkingDir     = $projectPath
        Command        = $npmCmd
        CommandArgs    = @("run", "dev", "--scripts-prepend-node-path")
        CommandLine    = "$npmCmd run dev --scripts-prepend-node-path"
        EnvVars        = $envVars
        PreStartLines  = $preStartLines
    }
}

# ──────────────────────────── 状态展示（动态读取配置，无硬编码） ────────────────────────────

function Get-ServiceStatus {
    param([object]$SvcConfig)
    $ports = if ($SvcConfig.ports -is [array]) { $SvcConfig.ports } else { @($SvcConfig.port) }
    foreach ($port in $ports) {
        if (Test-PortListening -Port $port) {
            return @{ Status = "Running"; Port = $port }
        }
    }
    return @{ Status = "Stopped"; Port = ($ports -join ", ") }
}

function Show-Status {
    param([object]$Config)

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Service Status" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    $services = @()
    # 从配置动态读取服务列表，不硬编码
    foreach ($key in $Config.services.PSObject.Properties.Name) {
        if ($Config.services.$key.enabled) {
            $svc = $Config.services.$key
            $status = Get-ServiceStatus -SvcConfig $svc
            $statusText = if ($status.Status -eq "Running") { "[OK] Running" } else { "[--] Stopped" }
            $services += [PSCustomObject]@{
                Service = $svc.name
                Port    = $status.Port
                Status  = $statusText
            }
        }
    }

    $services | Format-Table -AutoSize
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
}

# ──────────────────────────── 主流程 ────────────────────────────

Write-Header

Write-Step "Loading config: $ConfigPath"
if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config not found: $ConfigPath"
    exit 1
}
$config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$config = Resolve-AllConfigPlaceholders $config
Write-Success "Config loaded"

# 加载健康检查配置
$healthConfigPath = Join-Path $PSScriptRoot "..\config\health-check.json"
$healthConfig = $null
if (Test-Path $healthConfigPath) {
    $healthConfig = Get-Content $healthConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $healthConfig = Resolve-AllConfigPlaceholders $healthConfig
}

# 清理过期日志和launcher脚本（在healthConfig加载后调用，以读取配置的清理时间）
Clear-OldLauncherScripts -HConfig $healthConfig

if ($Status) {
    Show-Status -Config $config
    Set-Location $originalLocation
    exit 0
}

if ($Service -ne "") {
    $globalPaths = $config.globalPaths
    $serviceKey  = $Service.ToLower()

    # 支持逗号分隔的多服务启动
    $serviceKeys = $serviceKey -split "," | ForEach-Object { $_.Trim() }

    # ── 阶段1：启动所有服务进程（不等待就绪，快速返回） ──
    # 多服务时先全部启动进程，再统一等健康检查，避免健康检查等待时间叠加
    $pendingChecks = @()
    foreach ($sKey in $serviceKeys) {
        if ($config.services.PSObject.Properties.Name -notcontains $sKey) {
            Write-Error "Unknown service: $sKey"
            Write-Host "Available: $($config.services.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
            continue
        }
        $svcConfig = $config.services.$sKey
        if (-not $svcConfig.enabled) {
            Write-Warning "$($svcConfig.name) is disabled"
            continue
        }

        $script:LastStartupLogPath = ""
        $result = Start-BempService -ServiceKey $sKey -SvcConfig $svcConfig -GlobalPaths $globalPaths `
                                    -HealthConfig $healthConfig -AllServices $config.services

        # 收集需要健康检查的服务信息，阶段2统一处理
        if ($result -and $ExternalTerminal) {
            $port = if ($svcConfig.ports -is [array]) { $svcConfig.ports[0] } else { $svcConfig.port }
            $svcType = $svcConfig.type
            $maxWait = Get-HealthConfigValue -HConfig $healthConfig -ServiceKey $sKey -Property "maxWaitSeconds" -ServiceType $svcType -Default 120
            $pollInterval = Get-HealthConfigValue -HConfig $healthConfig -ServiceKey $sKey -Property "pollIntervalSeconds" -ServiceType $svcType -Default 15

            # 收集诊断所需信息
            $deps = @()
            $appLogFile = ""
            $logKeywords = @("Exception", "ERROR", "SessionExpired", "ConnectionLoss")
            if ($svcConfig.PSObject.Properties.Name -contains "diagnostics") {
                $diag = $svcConfig.diagnostics
                if ($diag.PSObject.Properties.Name -contains "checkDependencies") {
                    $deps = @($diag.checkDependencies)
                }
                if ($diag.PSObject.Properties.Name -contains "logFile") {
                    $appLogFile = $diag.logFile
                }
                if ($diag.PSObject.Properties.Name -contains "logKeywords") {
                    $logKeywords = @($diag.logKeywords)
                }
            }

            $pendingChecks += @{
                ServiceKey   = $sKey
                ServiceName  = $svcConfig.name
                Port         = $port
                MaxWait      = $maxWait
                PollInterval = $pollInterval
                Deps         = $deps
                AppLogFile   = $appLogFile
                StartupLog   = $script:LastStartupLogPath
                LogKeywords  = $logKeywords
            }
        }
    }

    # ── 阶段2：统一并行健康检查（轮询所有待检查服务的端口） ──
    # 多服务并行等待，取最长超时时间作为总等待上限
    if ($pendingChecks.Count -gt 0) {
        Write-Host ""
        Write-Step "Phase 2: Health check for $($pendingChecks.Count) service(s)..."

        # 多服务时取最大超时作为总等待上限，避免逐个叠加
        # hashtable的键不能用Measure-Object -Property，需直接遍历取值
        $globalMaxWait = 0
        $globalPoll = [int]::MaxValue
        foreach ($pc in $pendingChecks) {
            if ($pc.MaxWait -gt $globalMaxWait) { $globalMaxWait = $pc.MaxWait }
            if ($pc.PollInterval -lt $globalPoll) { $globalPoll = $pc.PollInterval }
        }
        if ($globalPoll -lt 10) { $globalPoll = 10 }
        if ($globalMaxWait -le 0) { $globalMaxWait = 120 }
        $globalElapsed = 0

        while ($globalElapsed -lt $globalMaxWait) {
            $allReady = $true
            $anyTimedOut = $false
            foreach ($pc in $pendingChecks) {
                # 已就绪的跳过
                if ($pc.ContainsKey("_ready") -and $pc._ready) { continue }
                # 已超时的跳过
                if ($pc.ContainsKey("_timedOut") -and $pc._timedOut) { continue }
                # 个人超时检查
                if ($globalElapsed -ge $pc.MaxWait) {
                    $pc._timedOut = $true
                    $anyTimedOut = $true
                    continue
                }
                if (Test-PortListening -Port $pc.Port) {
                    # 使用折叠式进度显示：完成状态
                    Show-WaitProgress -Complete -FinalMessage "$($pc.ServiceName) ready (port $($pc.Port))"
                    $pc._ready = $true
                } else {
                    $allReady = $false
                }
            }
            if ($allReady) { break }

            # 检查是否所有服务都已确定状态（就绪或超时）
            $allDone = $true
            foreach ($pc in $pendingChecks) {
                if (-not ($pc.ContainsKey("_ready") -or $pc.ContainsKey("_timedOut"))) { $allDone = $false; break }
            }
            if ($allDone) { break }

            # 进度提示：列出未就绪的服务（折叠式单行更新）
            $pendingNames = ($pendingChecks | Where-Object { -not ($_.ContainsKey("_ready") -and $_._ready) -and -not ($_.ContainsKey("_timedOut") -and $_._timedOut) } |
                            ForEach-Object { "$($_.ServiceName):$($_.Port)" }) -join ", "
            Show-WaitProgress -Message "Waiting: $pendingNames" -Elapsed $globalElapsed -MaxWait $globalMaxWait

            Start-Sleep -Seconds $globalPoll
            $globalElapsed += $globalPoll
        }

        # 诊断超时失败的服务
        foreach ($pc in $pendingChecks) {
            if ($pc.ContainsKey("_timedOut") -and $pc._timedOut) {
                Write-Error "$($pc.ServiceName) not ready after $($pc.MaxWait)s on port $($pc.Port)"
                Invoke-Diagnostics -ServiceName $pc.ServiceName -Port $pc.Port `
                                   -DepServices $pc.Deps -AllServices $config.services `
                                   -AppLogFile $pc.AppLogFile -StartupLog $pc.StartupLog `
                                   -LogKeywords $pc.LogKeywords
            }
        }
    }

    Set-Location $originalLocation
    exit 0
}

# 无参数：显示状态
Show-Status -Config $config
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Each service needs its own terminal." -ForegroundColor Yellow
Write-Host "  Command: .\start-bemp-env.ps1 -Service <name> [-QuickStart] [-ForceRestart] [-ExternalTerminal] [-WaitForDeps]" -ForegroundColor White
Write-Host "  Status:  .\start-bemp-env.ps1 -Status" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

Set-Location $originalLocation
