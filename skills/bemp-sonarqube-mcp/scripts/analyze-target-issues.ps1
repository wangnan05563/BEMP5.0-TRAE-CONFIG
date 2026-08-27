# Analyze SonarQube issues - extract target file issues
$files = @(
    'C:\Users\HSPCAD~1\AppData\Local\Temp\trae\toolcall-output\4b564290-dc77-4072-8a55-31d00563288a.txt',
    'C:\Users\HSPCAD~1\AppData\Local\Temp\trae\toolcall-output\56d55022-59d1-4b3a-9900-33fe8460d386.txt',
    'C:\Users\HSPCAD~1\AppData\Local\Temp\trae\toolcall-output\2ff8b347-8b1e-4517-8a1c-30519928be95.txt',
    'C:\Users\HSPCAD~1\AppData\Local\Temp\trae\toolcall-output\9659ac62-0bc2-4850-8c7e-4fbd04e83b1d.txt'
)

$severityLabels = @('HIGH', 'MEDIUM', 'LOW', 'INFO')

$targetKeywords = @(
    'POBM010304', 'BOPC010101', 'sm/controller/branch', 'sm/service/impl/branch',
    'impl/user/HnnxbankBranchUserServiceImpl', 'ce/disc', 'SyncPjgcs', 'SyncPjgx',
    'LegalPersonVirtual', 'BranchController', 'BranchQueryController', 'BranchAdminController',
    'BranchServiceImpl', 'BranchParamServiceImpl', 'BranchRelationServiceImpl',
    'DiscBillServiceImpl', 'DiscCompanyRoster', 'DiscElecController',
    'DiscOccurController', 'DiscBillUtil', 'DiscBillAtomImpl', 'DiscOccurAtomImpl'
)

$totalAll = 0
$targetIssues = @()

$rulePattern = '"rule"\s*:\s*"([^"]+)"'
$componentPattern = '"component"\s*:\s*"([^"]+)"'
$severityPattern = '"severity"\s*:\s*"([^"]+)"'
$startLinePattern = '"startLine"\s*:\s*(\d+)'
$messagePattern = '"message"\s*:\s*"(.*?)"(?=,\r\n)'

for ($i = 0; $i -lt $files.Count; $i++) {
    $content = Get-Content $files[$i] -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $ruleMatches = [regex]::Matches($content, $rulePattern)
    $componentMatches = [regex]::Matches($content, $componentPattern)
    $severityMatches = [regex]::Matches($content, $severityPattern)
    $lineMatches = [regex]::Matches($content, $startLinePattern)
    $messageMatches = [regex]::Matches($content, $messagePattern)
    
    $count = $ruleMatches.Count
    $totalAll += $count
    Write-Host "=== $($severityLabels[$i]) Total: $count ==="
    
    for ($j = 0; $j -lt $count; $j++) {
        $component = $componentMatches[$j].Groups[1].Value
        $isTarget = $false
        foreach ($kw in $targetKeywords) {
            if ($component -like "*$kw*") {
                $isTarget = $true
                break
            }
        }
        if ($isTarget) {
            $lineVal = if ($j -lt $lineMatches.Count) { $lineMatches[$j].Groups[1].Value } else { '?' }
            $msgVal = if ($j -lt $messageMatches.Count) { $messageMatches[$j].Groups[1].Value } else { '' }
            $issue = @{
                severity = $severityMatches[$j].Groups[1].Value
                rule = $ruleMatches[$j].Groups[1].Value
                component = $component
                line = $lineVal
                message = $msgVal
            }
            $targetIssues += $issue
        }
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "All Issues Total: $totalAll"
Write-Host "Target Issues (this requirement): $($targetIssues.Count)"
Write-Host "========================================="
Write-Host ""

Write-Host "=== Target Issues by Severity ==="
$targetIssues | Group-Object severity | ForEach-Object { Write-Host "  $($_.Name): $($_.Count)" }
Write-Host ""

Write-Host "=== Target Issues by Rule ==="
$targetIssues | Group-Object rule | Sort-Object Count -Descending | ForEach-Object { Write-Host "  $($_.Name): $($_.Count)" }
Write-Host ""

Write-Host "=== Target Issues by Component ==="
$targetIssues | Group-Object component | Sort-Object Count -Descending | ForEach-Object { Write-Host "  $($_.Count): $($_.Name)" }
Write-Host ""

Write-Host "=== Target Issues Details ==="
foreach ($issue in $targetIssues) {
    $shortFile = $issue.component -replace 'bemp-ext-hnnxbank-org-management:', ''
    $msg = $issue.message -replace '\\', ''
    Write-Host "[$($issue.severity)] $($issue.rule) | ${shortFile}:$($issue.line) | $msg"
}
