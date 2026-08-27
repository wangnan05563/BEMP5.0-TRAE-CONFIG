$projectKey = 'bemp-ext-hnnxbank-org-management'
$uri = "http://localhost:9000/api/issues/search?componentKeys=$projectKey&ps=500"

try {
    $resp = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing -TimeoutSec 30
    $data = $resp.Content | ConvertFrom-Json

    Write-Output "Project: $projectKey"
    Write-Output "Total: $($data.paging.total)"
    Write-Output "Returned: $($data.issues.Count)"
    Write-Output "----"

    $bySev = $data.issues | Group-Object severity
    foreach ($g in $bySev) {
        Write-Output "[$($g.Name)] -> $($g.Count)"
    }

    $data | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $PSScriptRoot '..\..\..\specs\add-ecif-cust-merge-pice070701\sonar-raw.json') -Encoding utf8
    Write-Output "----"
    Write-Output "Saved raw to sonar-raw.json"
} catch {
    Write-Output "ERROR: $_"
    exit 1
}
