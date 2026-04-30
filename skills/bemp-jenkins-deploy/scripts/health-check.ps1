# 服务健康检查脚本
# 用于验证服务是否正常启动
# 支持端口监听检测、HTTP健康检查、Nginx进程检测

param(
    [string]$ServiceName,
    [int]$Port = 0,
    [int]$TimeoutSeconds = 60,
    [string]$HealthCheckUrl = "",
    [string]$CheckMode = "port",
    [string]$NginxExe = "",
    [string]$NginxHome = ""
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Test-PortListening {
    param([int]$Port)
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $result = $tcpClient.BeginConnect("localhost", $Port, $null, $null)
        $wait = $result.AsyncWaitHandle.WaitOne(3000)  # 3秒超时
        
        if ($wait) {
            $tcpClient.EndConnect($result)
            $tcpClient.Close()
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

function Test-HttpHealthCheck {
    param([string]$Url)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10 -UseBasicParsing
        return ($response.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Test-NginxProcess {
    param(
        [string]$NginxExePath,
        [string]$NginxHomePath
    )
    
    $processRunning = $false
    $nginxProcesses = Get-Process -Name "nginx" -ErrorAction SilentlyContinue
    if ($nginxProcesses -and $nginxProcesses.Count -gt 0) {
        $processRunning = $true
    }

    if ($processRunning -and -not [string]::IsNullOrEmpty($NginxExePath) -and -not [string]::IsNullOrEmpty($NginxHomePath)) {
        try {
            Push-Location $NginxHomePath
            $testOutput = & $NginxExePath "-t" 2>&1
            Pop-Location
            if ($testOutput -match "successful") {
                return @{ Success = $true; Message = "Nginx进程运行中且配置有效" }
            } else {
                return @{ Success = $false; Message = "Nginx配置测试失败: $testOutput" }
            }
        } catch {
            Pop-Location
            return @{ Success = $false; Message = "Nginx配置测试异常: $_" }
        }
    }

    return @{ Success = $processRunning; Message = if ($processRunning) { "Nginx进程运行中" } else { "Nginx进程未运行" } }
}

function Wait-ServiceReady {
    param(
        [string]$Name,
        [int]$Port,
        [int]$Timeout,
        [string]$HealthUrl
    )
    
    Write-Log "==========================================" "INFO"
    Write-Log "等待服务启动: $Name" "INFO"
    if ($CheckMode -eq "nginx") {
        Write-Log "检测模式: Nginx进程检测" "INFO"
    } else {
        Write-Log "监听端口: $Port" "INFO"
    }
    Write-Log "超时时间: ${Timeout}秒" "INFO"
    Write-Log "==========================================" "INFO"
    
    $startTime = Get-Date
    $isReady = $false
    
    while ((New-TimeSpan -Start $startTime -End (Get-Date)).TotalSeconds -lt $Timeout) {
        if ($CheckMode -eq "nginx") {
            $nginxResult = Test-NginxProcess -NginxExePath $NginxExe -NginxHomePath $NginxHome
            if ($nginxResult.Success) {
                Write-Log "Nginx检测通过: $($nginxResult.Message)" "INFO"
                $isReady = $true
                break
            }
        } else {
            if (Test-PortListening -Port $Port) {
                Write-Log "服务 $Name 已在端口 $Port 上监听" "INFO"

                if (-not [string]::IsNullOrEmpty($HealthUrl)) {
                    Write-Log "执行HTTP健康检查: $HealthUrl" "INFO"
                    if (Test-HttpHealthCheck -Url $HealthUrl) {
                        Write-Log "健康检查通过" "INFO"
                        $isReady = $true
                        break
                    } else {
                        Write-Log "健康检查未通过，继续等待..." "WARN"
                    }
                } else {
                    $isReady = $true
                    break
                }
            }
        }
        
        Write-Log "等待服务启动..." "INFO"
        Start-Sleep -Seconds 2
    }
    
    if ($isReady) {
        Write-Log "服务 $Name 启动成功" "INFO"
        return 0
    } else {
        Write-Log "服务 $Name 启动超时（${Timeout}秒）" "ERROR"
        return 1
    }
}

# 执行健康检查
$exitCode = Wait-ServiceReady -Name $ServiceName -Port $Port -Timeout $TimeoutSeconds -HealthUrl $HealthCheckUrl
exit $exitCode
