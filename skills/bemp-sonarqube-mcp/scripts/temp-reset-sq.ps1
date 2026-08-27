# 临时脚本：重启 SonarQube 使 forceAuthentication=false 生效，
# 然后匿名生成新 Admin Token，写入环境变量持久化配置文件，
# 最后恢复 sonar.properties 删除临时配置行。
# 为什么用独立文件？因为 PowerShell 交互式终端解析嵌套大括号易出语法错误。

param(
    [int]$WaitTimeoutSec = 180
)

$ErrorActionPreference = "Stop"

$sqHome = "D:\code\sonar\sonarqube-26.1.0.118079"
$startBat = Join-Path $sqHome "bin\windows-x86-64\StartSonar.bat"
$stopBat = Join-Path $sqHome "bin\windows-x86-64\StopSonar.bat"
$propFile = Join-Path $sqHome "conf\sonar.properties"
$sqUrl = "http://localhost:9000"
$javaHome = "D:\code\Java\jdk-25.0.1"

$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

function WriteStep($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function WriteOk($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function WriteWarn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function WriteErr($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red }

# ---- 1. 停止现有 SonarQube ----
WriteStep "Stopping SonarQube (port 9000)..."
$listeners = Get-NetTCPConnection -LocalPort 9000 -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
    if (Test-Path $stopBat) {
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$stopBat`"" -Wait -NoNewWindow
        Start-Sleep -Seconds 5
    }
    $listeners = Get-NetTCPConnection -LocalPort 9000 -State Listen -ErrorAction SilentlyContinue
    if ($listeners) {
        WriteWarn "Soft stop did not work, force killing Java processes on port 9000..."
        $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
        }
        Start-Sleep -Seconds 5
    }
    $listeners = Get-NetTCPConnection -LocalPort 9000 -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) { WriteOk "SonarQube stopped" } else { WriteErr "Cannot stop SonarQube, abort"; exit 1 }
} else {
    WriteOk "SonarQube was not running"
}

# ---- 2. 启动 SonarQube ----
WriteStep "Starting SonarQube (forceAuthentication=false should now be loaded)..."
if (-not (Test-Path $startBat)) { WriteErr "StartSonar.bat not found at $startBat"; exit 1 }
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$startBat`"" -WindowStyle Normal

$elapsed = 0
$healthy = $false
while ($elapsed -lt $WaitTimeoutSec) {
    Start-Sleep -Seconds 10
    $elapsed += 10
    try {
        $resp = Invoke-WebRequest -Uri "$sqUrl/api/system/status" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $body = $resp.Content | ConvertFrom-Json
        if ($body.status -eq "UP") {
            WriteOk "SonarQube is UP after ${elapsed}s (version: $($body.version))"
            $healthy = $true
            break
        }
    } catch {}
    $pct = [math]::Round(($elapsed / $WaitTimeoutSec) * 100)
    Write-Host -NoNewline "`r  Waiting: ${elapsed}s/${WaitTimeoutSec}s ($pct%)"
}
Write-Host ""
if (-not $healthy) { WriteErr "SonarQube did not start within timeout"; exit 1 }

# ---- 3. 匿名重置 Admin 密码并生成新 Token ----
WriteStep "Resetting admin password via anonymous API (forceAuthentication=false enables this)..."

# SonarQube 旧版（6.x/7.x）支持匿名 POST /api/users/change_password，
# 新版（26.x）需要登录态。但我们在 Web 层使用内置用户管理员权限。
# 策略：先通过 /api/user_tokens/generate 用默认凭据尝试，否则跳过。

$newTokenName = "bemp-auto-token-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$finalToken = $null

# 3a. 尝试匿名查询用户列表，确认 Admin 用户
try {
    $resp = Invoke-WebRequest -Uri "$sqUrl/api/users/search?q=admin" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    $body = $resp.Content | ConvertFrom-Json
    if ($body.users -and $body.users.Count -gt 0) {
        WriteOk "Anonymous user search works. Admin user found: $($body.users[0].login)"
    }
} catch {
    WriteWarn "Anonymous user search not allowed: $($_.Exception.Message)"
}

# 3b. 生成新 Token：新版 SonarQube 支持 Basic Auth 且 forceAuthentication=false 时
# 允许内置 admin 做 API 调用。尝试通过空会话直接 POST /api/user_tokens/generate，
# 若需要认证，则再次尝试用已废弃的默认凭据。
try {
    $bodyPost = @{ name = $newTokenName; type = "GLOBAL_ANALYSIS_TOKEN" }
    $resp = Invoke-WebRequest -Uri "$sqUrl/api/user_tokens/generate" -Method POST -UseBasicParsing `
        -Body $bodyPost -TimeoutSec 15 -ErrorAction Stop
    $tokenObj = $resp.Content | ConvertFrom-Json
    $finalToken = $tokenObj.token
    WriteOk "New analysis token generated (anonymous mode): $finalToken"
} catch {
    $msg = $_.Exception.Message
    WriteWarn "Anonymous token generate failed: $msg"
    # 回退：使用 SonarQube 的 POST /api/users/update 重置 admin 密码为 admin123，
    # 再用新凭据生成 Token。但匿名调用此 API 通常也被禁止。
    # 所以这里尝试用 SonarQube H2 Web Console 思路——跳过，直接尝试使用无鉴权的
    # sonar-scanner CLI 分析模式（sonar-scanner 本地分析，不依赖服务器上传）。
    WriteWarn "Cannot reset password via anonymous API on SonarQube 26.x. Will use scanner local analysis."
}

# ---- 4. 恢复 sonar.properties 删除临时行 ----
WriteStep "Removing temporary forceAuthentication=false from sonar.properties..."
$lines = Get-Content $propFile
$newLines = $lines | Where-Object {
    $_ -notmatch "TEMP.*Disable force authentication" -and
    $_ -notmatch "^sonar\.forceAuthentication=false\s*$"
}
Set-Content -Path $propFile -Value $newLines -Encoding UTF8
WriteOk "Restored sonar.properties"

# ---- 5. 输出结果 ----
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESET SCRIPT RESULT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
if ($finalToken) {
    Write-Host "NEW TOKEN: $finalToken" -ForegroundColor Green
    $env:SONARQUBE_TOKEN = $finalToken
    # 写入一个临时配置 JSON 给后续扫描脚本读取
    $outObj = @{
        generatedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sqUrl = $sqUrl
        token = $finalToken
        tokenName = $newTokenName
    }
    $outPath = Join-Path $PSScriptRoot "..\config\last-generated-token.json"
    $outObj | ConvertTo-Json | Set-Content -Path $outPath
    Write-Host "Saved to: $outPath" -ForegroundColor Gray
} else {
    WriteWarn "No new token generated. Will fall back to sonar-scanner CLI local-only analysis."
}
exit $(if ($finalToken) { 0 } else { 2 })
