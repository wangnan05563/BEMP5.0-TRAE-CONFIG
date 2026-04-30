# Trae Self-Improving Agent Initialization Script (PowerShell)
Write-Host "Initializing Trae self-improving-agent..." -ForegroundColor Cyan

# Create learnings directory
$learningsDir = ".trae\learnings"
if (-not (Test-Path $learningsDir)) {
    New-Item -ItemType Directory -Path $learningsDir -Force | Out-Null
    Write-Host "Created learnings directory: $learningsDir" -ForegroundColor Green
} else {
    Write-Host "Learnings directory already exists: $learningsDir" -ForegroundColor Yellow
}

# Create LEARNINGS.md
$learningsFile = Join-Path $learningsDir "LEARNINGS.md"
if (-not (Test-Path $learningsFile)) {
    @"
# Learnings Log

This file records user's coding habits, preferences, and rules. AI will automatically learn and follow these rules.

## Rule Format

- [YYYY-MM-DD] Rule: [Rule content]
  Source: [Source type, e.g., User Feedback/Auto Learning]
  Scope: [Applicable scope, e.g., **/*.java/Frontend Development]

## Example

- 2026-04-16 Rule: Use 4 spaces for Java indentation, no tabs
  Source: User Feedback
  Scope: **/*.java

"@ | Out-File -FilePath $learningsFile -Encoding UTF8
    Write-Host "Created learnings file: LEARNINGS.md" -ForegroundColor Green
}

# Create ERRORS.md
$errorsFile = Join-Path $learningsDir "ERRORS.md"
if (-not (Test-Path $errorsFile)) {
    @"
# Errors Log

This file records historical error information. AI will avoid repeating the same mistakes.

## Error Format

- [YYYY-MM-DD] Error: [Error summary/command/file]
  Cause: [Error cause analysis]
  Fix: [Correct approach]

## Example

- 2026-04-16 Error: mvn clean install dependency version conflict
  Cause: Inconsistent spring-boot-starter-parent version
  Fix: Use version from bom/import-bom/pom.xml

"@ | Out-File -FilePath $errorsFile -Encoding UTF8
    Write-Host "Created errors file: ERRORS.md" -ForegroundColor Green
}

# Create FEATURE_REQUESTS.md
$featureFile = Join-Path $learningsDir "FEATURE_REQUESTS.md"
if (-not (Test-Path $featureFile)) {
    @"
# Feature Requests Log

This file records feature requirements and suggestions.

## Request Format

- [YYYY-MM-DD] Request: [Request description]
  Source: User
  Status: Pending/In Progress/Completed

"@ | Out-File -FilePath $featureFile -Encoding UTF8
    Write-Host "Created feature requests file: FEATURE_REQUESTS.md" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Trae self-improving-agent initialized successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Learnings directory: $learningsDir" -ForegroundColor White
Write-Host "Please restart Trae IDE to activate the skill" -ForegroundColor Yellow
Write-Host ""
