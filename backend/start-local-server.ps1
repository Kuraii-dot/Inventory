$ErrorActionPreference = 'Stop'

$existingServer = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($existingServer) {
  exit 0
}

$backendDirectory = $PSScriptRoot
$logsDirectory = Join-Path $backendDirectory 'logs'
New-Item -ItemType Directory -Path $logsDirectory -Force | Out-Null

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
Start-Process `
  -FilePath $nodePath `
  -ArgumentList 'server.js' `
  -WorkingDirectory $backendDirectory `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logsDirectory 'server.log') `
  -RedirectStandardError (Join-Path $logsDirectory 'server-error.log')
