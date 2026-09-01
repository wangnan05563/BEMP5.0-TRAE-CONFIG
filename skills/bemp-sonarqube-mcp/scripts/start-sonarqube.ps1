# BEMP SonarQube Server Detection and Startup Script
# Port detection logic referenced from bemp-automation-startserver

param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\scan_config.json",
    [switch]$StatusOnly,
    [switch]$ForceRestart
)

function Write-Step($message) {
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Test-PortInUse {
    param(
        [int]$Port,
        [string[]]$ProcessFilter = @()
    )
    try {
        if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
            $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
            if ($connections) {
                $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
                foreach ($pidItem in $pids) {
                    try {
                        $proc = Get-Process -Id $pidItem -ErrorAction SilentlyContinue
                        if ($proc) {
                            if ($ProcessFilter.Count -eq 0 -or $ProcessFilter -contains $proc.Name) {
                                return @{ InUse = $true; Pid = $proc.Id; ProcessName = $proc.Name; Port = $Port }
                            }
                        }
                    } catch {}
                }
            }
            return @{ InUse = $false; Pid = 0; ProcessName = ""; Port = $Port }
        }
        throw "Get-NetTCPConnection not available"
    } catch {
        $result = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"
        if ($result) {
            $line = $result.ToString().Trim()
            $parts = $line -split '\s+' | Where-Object { $_ -ne "" }
            if ($parts.Count -ge 5) {
                $rawPid = $parts[-1]
                if ($rawPid -match '^\d+$') {
                    $netPid = [int]$rawPid
                    try {
                        $proc = Get-Process -Id $netPid -ErrorAction SilentlyContinue
                        if ($proc) {
                            if ($ProcessFilter.Count -eq 0 -or $ProcessFilter -contains $proc.Name) {
                                return @{ InUse = $true; Pid = $proc.Id; ProcessName = $proc.Name; Port = $Port }
                            }
                        }
                    } catch {}
                }
            }
            return @{ InUse = $true; Pid = 0; ProcessName = "unknown"; Port = $Port }
        }
        return @{ InUse = $false; Pid = 0; ProcessName = ""; Port = $Port }
    }
}

function Test-SonarQubeHealth {
    param(
        # 参数名禁用 $Host：$Host 是 PS 只读自动变量，作函数参数会在绑定时报
        # "无法覆盖变量 Host"（SessionStateUnauthorizedAccessException），导致健康检查永远失败
        [string]$BaseUrl,
        [int]$TimeoutSeconds = 10
    )
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/system/status" -UseBasicParsing -TimeoutSec $TimeoutSeconds -ErrorAction Stop
        $body = $response.Content | ConvertFrom-Json
        return @{ Healthy = $true; Status = $body.status; Version = $body.version }
    } catch {
        return @{ Healthy = $false; Status = "unreachable"; Version = "" }
    }
}

function Stop-SonarQube {
    param([object]$Config)
    
    $port = $Config.port
    $portCheck = Test-PortInUse -Port $port
    if ($portCheck.InUse) {
        Write-Warning "SonarQube is running on port $port (PID: $($portCheck.Pid), Process: $($portCheck.ProcessName))"
        Write-Step "Stopping SonarQube..."
        
        $javaHome = $Config.java_home
        $installPath = $Config.install_path
        $stopScript = Join-Path $installPath "bin\windows-x86-64\StopSonar.bat"
        
        if (Test-Path $stopScript) {
            $env:JAVA_HOME = $javaHome
            $env:PATH = "$javaHome\bin;$env:PATH"
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$stopScript`"" -Wait -NoNewWindow
            Start-Sleep -Seconds 5
        }
        
        $portCheck2 = Test-PortInUse -Port $port
        if ($portCheck2.InUse) {
            Write-Step "Force stopping remaining Java processes on port $port..."
            $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            if ($connections) {
                $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
                foreach ($pid in $pids) {
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    } catch {}
                }
            }
            Start-Sleep -Seconds 3
        }
        
        $portCheck3 = Test-PortInUse -Port $port
        if (-not $portCheck3.InUse) {
            Write-Success "SonarQube stopped successfully"
        } else {
            Write-Error "Failed to stop SonarQube"
        }
    } else {
        Write-Success "SonarQube is not running"
    }
}

# ---- Main ----

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SonarQube Server Detection" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config file not found: $ConfigPath"
    exit 1
}

# PS5.1 默认按 ANSI 读取，UTF-8 配置文件中的中文注释会乱码并导致 JSON 解析失败（2026-09-01 降级记录点名缺陷）
$config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$sqConfig = $config.sonarqube_server
$port = $sqConfig.port
# host 值含 ${ENV:SONARQUBE_PORT} 占位符，必须三层解析；禁止向只读自动变量 $host 赋值（降级记录点名缺陷），改用 $sqHost
. (Join-Path $PSScriptRoot "resolve-sonar-token.ps1")
$sqHost = Resolve-SqPlaceholder $sqConfig.host

if ($StatusOnly) {
    $portCheck = Test-PortInUse -Port $port
    $healthCheck = Test-SonarQubeHealth -BaseUrl $sqHost
    
    Write-Host "SonarQube Server Status:" -ForegroundColor Yellow
    Write-Host "  Port $port : $(if ($portCheck.InUse) { 'LISTENING' } else { 'NOT LISTENING' })" -ForegroundColor $(if ($portCheck.InUse) { 'Green' } else { 'Red' })
    Write-Host "  Health    : $($healthCheck.Status)" -ForegroundColor $(if ($healthCheck.Healthy) { 'Green' } else { 'Red' })
    if ($healthCheck.Version) {
        Write-Host "  Version   : $($healthCheck.Version)" -ForegroundColor Gray
    }
    if ($portCheck.InUse -and $portCheck.Pid -gt 0) {
        Write-Host "  PID       : $($portCheck.Pid) ($($portCheck.ProcessName))" -ForegroundColor Gray
    }
    exit $(if ($portCheck.InUse -and $healthCheck.Healthy) { 0 } else { 1 })
}

if ($ForceRestart) {
    Stop-SonarQube -Config $sqConfig
}

# Step 1: Check if SonarQube is already running
$portCheck = Test-PortInUse -Port $port
if ($portCheck.InUse) {
    $healthCheck = Test-SonarQubeHealth -BaseUrl $sqHost
    if ($healthCheck.Healthy) {
        Write-Success "SonarQube is already running on port $port"
        Write-Host "  Status  : $($healthCheck.Status)" -ForegroundColor Gray
        Write-Host "  Version : $($healthCheck.Version)" -ForegroundColor Gray
        Write-Host "  PID     : $($portCheck.Pid) ($($portCheck.ProcessName))" -ForegroundColor Gray
        Write-Host ""
        Write-Host "SonarQube server is ready. You can proceed with scanning." -ForegroundColor Green
        exit 0
    } else {
        Write-Warning "Port $port is in use but SonarQube health check failed"
        Write-Step "Attempting restart..."
        Stop-SonarQube -Config $sqConfig
    }
}

# Step 2: Start SonarQube
Write-Step "SonarQube is not running. Starting SonarQube server..."

$javaHome = $sqConfig.java_home
$installPath = $sqConfig.install_path
$startScript = Join-Path $installPath $sqConfig.start_script

if (-not (Test-Path $javaHome)) {
    Write-Error "JAVA_HOME not found: $javaHome"
    Write-Host "  Please update config/scan_config.json -> sonarqube_server.java_home" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $startScript)) {
    Write-Error "SonarQube start script not found: $startScript"
    Write-Host "  Please update config/scan_config.json -> sonarqube_server.install_path" -ForegroundColor Yellow
    exit 1
}

Write-Step "JAVA_HOME: $javaHome"
Write-Step "SonarQube: $installPath"
Write-Step "Starting SonarQube (this may take 30-60 seconds)..."

$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$startScript`"" -WindowStyle Normal

# Step 3: Wait for SonarQube to be ready
$timeout = $sqConfig.startup_timeout_seconds
$interval = $sqConfig.health_check_interval_seconds
$elapsed = 0

Write-Step "Waiting for SonarQube to start (timeout: ${timeout}s)..."

while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    
    $portCheck = Test-PortInUse -Port $port
    if ($portCheck.InUse) {
        $healthCheck = Test-SonarQubeHealth -BaseUrl $sqHost
        if ($healthCheck.Healthy) {
            Write-Host ""
            Write-Success "SonarQube started successfully!"
            Write-Host "  Status  : $($healthCheck.Status)" -ForegroundColor Gray
            Write-Host "  Version : $($healthCheck.Version)" -ForegroundColor Gray
            Write-Host "  URL     : $sqHost" -ForegroundColor Gray
            Write-Host ""
            Write-Host "SonarQube server is ready. You can proceed with scanning." -ForegroundColor Green
            exit 0
        }
    }
    
    $progress = [math]::Round(($elapsed / $timeout) * 100)
    Write-Host -NoNewline "`r  Progress: $progress% ($elapsed/${timeout}s)" -ForegroundColor Yellow
}

Write-Host ""
Write-Error "SonarQube failed to start within ${timeout}s"
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  1. Check if Java $javaHome\bin\java.exe exists" -ForegroundColor White
Write-Host "  2. Check SonarQube logs: $installPath\logs\sonar.log" -ForegroundColor White
Write-Host "  3. Verify port $port is not occupied by another process" -ForegroundColor White
Write-Host "  4. Try starting manually: $startScript" -ForegroundColor White
exit 1
