$logDir=Join-Path $PSScriptRoot '..\logs'
$sb=New-Object System.Text.StringBuilder
function L($m){ [void]$sb.AppendLine($m) }

$wait=180
L("Waiting ${wait}s for webpack initial build...")
Start-Sleep -Seconds $wait

# check for Compiled marker
$ferr=Join-Path $logDir "Frontend_startup_20260814_013139.log.stderr"
if(Test-Path $ferr){
  $txt=[System.IO.File]::ReadAllText($ferr)
  $compiled=[regex]::Matches($txt,'Compiled')
  $running=[regex]::Matches($txt,'running at')
  $errs=[regex]::Matches($txt,'ERROR')
  L("stderr size: "+(Get-Item $ferr).Length)
  L("'Compiled' count: "+$compiled.Count+", 'running at' count: "+$running.Count+", 'ERROR' count: "+$errs.Count)
} else { L("stderr missing") }

# retry HTTP up to 3 times with 40s timeout
L("=== HTTP retry on 8091 ===")
$ok=$false
for($i=1;$i -le 3;$i++){
  try {
    $r=Invoke-WebRequest -Uri "http://127.0.0.1:8091/" -TimeoutSec 40 -UseBasicParsing -ErrorAction Stop
    L("attempt $i -> HTTP $($r.StatusCode) ($(($r.Content).Length) bytes)")
    $ok=$true; break
  } catch {
    $ex=$_.Exception
    if($ex.Response){ L("attempt $i -> HTTP $($ex.Response.StatusCode)") ; $ok=$true; break }
    else { L("attempt $i -> CONNECT ERROR: $($ex.Message)") }
  }
}
L("frontend http reachable: $ok")

# confirm port still up
$c=Get-NetTCPConnection -LocalPort 8091 -State Listen -ErrorAction SilentlyContinue
L("8091 listening: "+($null -ne $c))

[System.IO.File]::WriteAllText((Join-Path $logDir "_fe_wait.txt"), $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
L("DONE")
