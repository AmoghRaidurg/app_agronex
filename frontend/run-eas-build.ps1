Set-Location 'c:\Users\fuzzy\app_agronex\frontend'
$lines = @()
$lines += '=== STEP 1 ==='
$lines += 'Test-Path android: ' + (Test-Path android)
$free = (Get-PSDrive C).Free
$lines += 'C: FreeSpace bytes: ' + $free
$lines += 'C: FreeSpace GB: ' + ([math]::Round($free/1GB, 2))
$lines += 'HEAD: ' + (git rev-parse HEAD)
$lines += (Select-String -Path app.json -Pattern 'newArchEnabled' | ForEach-Object { $_.Line.Trim() })
$lines += '=== STEP 2 EAS BUILD ==='
npx eas-cli build --platform android --profile preview --clear-cache --non-interactive 2>&1 | ForEach-Object {
  $lines += $_
  Write-Output $_
}
$lines | Set-Content 'SUBAGENT_BUILD_RESULT.txt' -Encoding utf8
