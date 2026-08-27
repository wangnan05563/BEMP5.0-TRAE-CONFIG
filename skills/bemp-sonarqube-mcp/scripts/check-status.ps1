try {
    $status = Invoke-RestMethod -Uri 'http://localhost:9000/api/system/status' -Method GET -TimeoutSec 5
    Write-Output "SonarQube状态: $($status.status)"
    Write-Output "版本: $($status.version)"
} catch {
    Write-Output "SonarQube服务不可用: $_"
}

if (Test-Path 'Env:SONARQUBE_TOKEN') {
    Write-Output "Token已设置"
} else {
    Write-Output "Token未设置"
}
