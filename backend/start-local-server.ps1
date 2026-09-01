param([switch]$Restart)
$ErrorActionPreference = 'Stop'

$existingServer = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($existingServer) {
  if (-not $Restart) { exit 0 }
  $processIds = $existingServer | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -ne 'node') {
      throw "Port 5000 is already used by $($process.ProcessName); refusing to stop it."
    }
    if ($process) {
      try {
        Stop-Process -Id $processId -Force -ErrorAction Stop
      } catch {
        Write-Warning "The existing Inventory API process $processId belongs to another Windows session and could not be restarted. Reusing it for the health check."
        exit 0
      }
    }
  }
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
