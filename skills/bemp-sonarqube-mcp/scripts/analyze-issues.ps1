$content = Get-Content 'C:\Users\HSPCAD~1\AppData\Local\Temp\trae\toolcall-output\63ee10e7-859f-4091-8761-0dc03d05d737.txt' -Raw

# 提取 JSON 数组部分（从第一个 [ 开始）
$jsonStart = $content.IndexOf('[')
if ($jsonStart -ge 0) {
    $jsonStr = $content.Substring($jsonStart)
    $json = $jsonStr | ConvertFrom-Json
    $issuesText = $json[0].text
    $issuesJson = $issuesText | ConvertFrom-Json

    Write-Host "Total Issues: $($issuesJson.issues.Count)"
    Write-Host ""
    Write-Host "=== By Severity ==="
    $issuesJson.issues | Group-Object severity | Select-Object Name, Count | Sort-Object Count -Descending
    Write-Host ""
    Write-Host "=== By Rule (Top 30) ==="
    $issuesJson.issues | Group-Object rule | Select-Object Name, Count | Sort-Object Count -Descending | Select-Object -First 30
    Write-Host ""
    Write-Host "=== By Component (Top 20) ==="
    $issuesJson.issues | Group-Object component | Select-Object Count, Name | Sort-Object Count -Descending | Select-Object -First 20
    Write-Host ""
    Write-Host "=== CRITICAL Issues ==="
    $critical = $issuesJson.issues | Where-Object { $_.severity -eq 'CRITICAL' }
    foreach ($i in $critical) {
        Write-Host "  Rule: $($i.rule)"
        Write-Host "  File: $($i.component)"
        Write-Host "  Line: $($i.textRange.startLine)"
        Write-Host "  Msg: $($i.message)"
        Write-Host ""
    }
    Write-Host ""
    Write-Host "=== BLOCKER Issues ==="
    $blocker = $issuesJson.issues | Where-Object { $_.severity -eq 'BLOCKER' }
    foreach ($i in $blocker) {
        Write-Host "  Rule: $($i.rule)"
        Write-Host "  File: $($i.component)"
        Write-Host "  Line: $($i.textRange.startLine)"
        Write-Host "  Msg: $($i.message)"
        Write-Host ""
    }
    Write-Host ""
    Write-Host "=== MAJOR Issues (First 50) ==="
    $major = $issuesJson.issues | Where-Object { $_.severity -eq 'MAJOR' } | Select-Object -First 50
    foreach ($i in $major) {
        Write-Host "  [$($i.rule)] $($i.component):$($i.textRange.startLine) - $($i.message)"
    }
} else {
    Write-Host "No JSON found in file"
    Write-Host "Content preview:"
    Write-Host $content.Substring(0, [Math]::Min(500, $content.Length))
}
