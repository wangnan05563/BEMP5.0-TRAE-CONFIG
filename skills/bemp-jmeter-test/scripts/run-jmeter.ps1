# JMeter 性能测试执行脚本 (PowerShell)
# 用途：执行 JMeter 压测并收集结果
# 用法：.\run-jmeter.ps1 -TestPlan "api-test.jmx" -Threads 100 -Duration 300

param(
    [Parameter(Mandatory = $true)]
    [string]$TestPlan,

    [Parameter(Mandatory = $false)]
    [int]$Threads = 100,

    [Parameter(Mandatory = $false)]
    [int]$RampUp = 10,

    [Parameter(Mandatory = $false)]
    [int]$Duration = 300,

    [Parameter(Mandatory = $false)]
    [string]$JMeterPath = "D:\code\Jmeter\apache-jmeter-5.6.3\bin\jmeter.bat",

    [Parameter(Mandatory = $false)]
    [string]$ConfigPath = "",

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "output",

    [Parameter(Mandatory = $false)]
    [switch]$GenerateReport = $true
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 日志函数
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

# 检查 JMeter 是否安装
function Test-JMeterInstallation {
    if (-not (Test-Path $JMeterPath)) {
        Write-Log "错误：未找到 JMeter 可执行文件：$JMeterPath" "ERROR"
        Write-Log "请安装 JMeter 或修改配置文件中的路径" "ERROR"
        exit 1
    }
    Write-Log "JMeter 路径验证通过：$JMeterPath"
}

# 检查测试计划文件是否存在
function Test-TestPlan {
    if (-not (Test-Path $TestPlan)) {
        Write-Log "错误：未找到测试计划文件：$TestPlan" "ERROR"
        exit 1
    }
    Write-Log "测试计划文件验证通过：$TestPlan"
}

# 创建输出目录
function New-OutputDirectory {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $resultDir = Join-Path $OutputDir "results_$timestamp"
    $reportDir = Join-Path $OutputDir "reports_$timestamp"
    
    if (-not (Test-Path $resultDir)) {
        New-Item -ItemType Directory -Path $resultDir -Force | Out-Null
    }
    if (-not (Test-Path $reportDir)) {
        New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }
    
    return @{
        ResultDir = $resultDir
        ReportDir = $reportDir
        Timestamp = $timestamp
    }
}

# 查找配置文件
function Find-ConfigFile {
    param([string]$CustomPath)
    
    if ($CustomPath -ne "" -and (Test-Path $CustomPath)) {
        return $CustomPath
    }
    
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $skillRoot = Split-Path -Parent $scriptDir
    $defaultConfig = Join-Path $skillRoot "config\jmeter.properties"
    
    if (Test-Path $defaultConfig) {
        return $defaultConfig
    }
    
    return ""
}

# 执行 JMeter 测试
function Invoke-JMeterTest {
    param(
        [string]$TestPlan,
        [string]$ResultFile,
        [string]$ReportDir,
        [int]$Threads,
        [int]$RampUp,
        [int]$Duration,
        [string]$ConfigFile = ""
    )
    
    $jmeterArgs = @(
        "-n",                                    # 非 GUI 模式
        "-t", $TestPlan,                         # 测试计划文件
        "-l", $ResultFile,                       # 结果文件
        "-Jthreads=$Threads",                    # 线程数
        "-JrampUp=$RampUp",                      # Ramp-Up 时间
        "-Jduration=$Duration",                  # 持续时间
        "-j", "jmeter.log",                      # 日志文件
        "-LINFO"                                 # 日志级别
    )
    
    if ($ConfigFile -ne "") {
        $jmeterArgs += "-p", $ConfigFile         # 配置文件（确保 CSV 格式）
        Write-Log "使用配置文件：$ConfigFile"
    } else {
        $jmeterArgs += "-Jjmeter.save.saveservice.output_format=csv"
    }
    
    if ($GenerateReport) {
        $jmeterArgs += "-e", "-o", $ReportDir    # 生成 HTML 报告
    }
    
    Write-Log "开始执行 JMeter 测试..."
    Write-Log "命令参数：$($jmeterArgs -join ' ')"
    
    $process = Start-Process -FilePath $JMeterPath `
                             -ArgumentList $jmeterArgs `
                             -NoNewWindow `
                             -PassThru `
                             -RedirectStandardOutput "jmeter-stdout.log" `
                             -RedirectStandardError "jmeter-stderr.log"
    
    Write-Log "JMeter 进程已启动，PID: $($process.Id)"
    Write-Log "等待测试完成..."
    
    # 等待进程完成
    while (-not $process.HasExited) {
        Start-Sleep -Seconds 5
        Write-Log "测试进行中... (PID: $($process.Id))"
    }
    
    Write-Log "JMeter 测试完成，退出代码：$($process.ExitCode)"
    return $process.ExitCode
}

# 主流程
function Main {
    Write-Log "==========================================" 
    Write-Log "JMeter 性能测试技能 - 执行脚本"
    Write-Log "=========================================="
    
    # 1. 环境检查
    Write-Log "步骤 1/4: 检查 JMeter 安装..."
    Test-JMeterInstallation
    
    # 2. 测试计划检查
    Write-Log "步骤 2/4: 检查测试计划文件..."
    Test-TestPlan
    
    # 3. 创建输出目录
    Write-Log "步骤 3/4: 创建输出目录..."
    $dirs = New-OutputDirectory
    $resultFile = Join-Path $dirs.ResultDir "results.jtl"
    
    Write-Log "结果目录：$($dirs.ResultDir)"
    Write-Log "报告目录：$($dirs.ReportDir)"
    
    # 4. 执行测试
    Write-Log "步骤 4/4: 执行 JMeter 测试..."
    Write-Log "配置：并发数=$Threads, Ramp-Up=$RampUp 秒, 持续时间=$Duration 秒"
    
    $configFile = Find-ConfigFile -CustomPath $ConfigPath
    
    $exitCode = Invoke-JMeterTest -TestPlan $TestPlan `
                                  -ResultFile $resultFile `
                                  -ReportDir $dirs.ReportDir `
                                  -Threads $Threads `
                                  -RampUp $RampUp `
                                  -Duration $Duration `
                                  -ConfigFile $configFile
    
    # 5. 输出结果
    if ($exitCode -eq 0) {
        Write-Log "==========================================" 
        Write-Log "测试执行成功！"
        Write-Log "结果文件：$resultFile"
        Write-Log "报告目录：$($dirs.ReportDir)"
        Write-Log "==========================================" 
    } else {
        Write-Log "==========================================" 
        Write-Log "测试执行失败，退出代码：$exitCode"
        Write-Log "请检查 jmeter.log 文件获取详细错误信息"
        Write-Log "==========================================" 
    }
    
    return $exitCode
}

# 执行主流程
Main
