$f = "c:\Users\fuzzy\app_agronex\frontend\SUBAGENT_BUILD_RESULT.txt"
$deadline = (Get-Date).AddMinutes(50)
while ((Get-Date) -lt $deadline) {
  if (Test-Path $f) {
    $t = Get-Content $f -Raw
    if ($t -match 'Build finished|ERRORED|Build failed|See logs for more information') { break }
  }
  Start-Sleep -Seconds 45
}
if (Test-Path $f) { Get-Content $f -Raw } else { 'NO_RESULT_FILE' }
