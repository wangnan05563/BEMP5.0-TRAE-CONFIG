﻿param(
    # 默认值保留原脚本口径，实际调用以传参为准（禁止在命令里写死其他项目 key）
    [string]$ProjectKey = 'bemp-ext-hnnxbank-org-management',
    [string]$Severities = '',
    [switch]$SinceLeakPeriod,
    [string]$OutputJson = ''
)

$uri = "http://localhost:9000/api/issues/search?componentKeys=$ProjectKey&ps=500&resolved=false"
if ($Severities -ne '') { $uri += "&severities=$Severities" }
if ($SinceLeakPeriod) { $uri += '&sinceLeakPeriod=true' }

try {
    # 走技能侧 Token 解析链，避免匿名/失效 Token 导致 401 被误判为"无问题"
    . (Join-Path $PSScriptRoot 'resolve-sonar-token.ps1')
    $token = (Resolve-SonarToken).Token
    $resp = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing -TimeoutSec 30 -Headers @{Authorization="Bearer $token"}
    $data = $resp.Content | ConvertFrom-Json

    Write-Output "Project: $ProjectKey"
    Write-Output "Total: $($data.paging.total)"
    Write-Output "Returned: $($data.issues.Count)"
    Write-Output "----"

    $bySev = $data.issues | Group-Object severity
    foreach ($g in $bySev) {
        Write-Output "[$($g.Name)] -> $($g.Count)"
    }

    if ($OutputJson -ne '') {
        $data | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputJson -Encoding utf8
        Write-Output "----"
        Write-Output "Saved raw to $OutputJson"
    }
} catch {
    Write-Output "ERROR: $_"
    exit 1
}
