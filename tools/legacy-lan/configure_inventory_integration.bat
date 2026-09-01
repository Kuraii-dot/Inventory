@echo off
setlocal EnableExtensions

for %%I in ("%~dp0..\..") do set "INVENTORY_ROOT=%%~fI"
for %%I in ("%INVENTORY_ROOT%\..\OS") do set "OS_ROOT=%%~fI"

echo CCWD TCMS - Smart Inventory Integration
echo.
echo Before continuing, make sure the Smart Inventory backend .env contains
echo the working DATABASE_URL and JWT_SECRET. This script will create and save
echo the shared INVENTORY_INTEGRATION_KEY for both Inventory and TCMS.
echo The Tauri app and TCMS will use the central office server over the LAN.
echo.

call "%OS_ROOT%\detect_os_server_ip.bat"
if errorlevel 1 exit /b 1
set "INVENTORY_URL=http://%OS_SERVER_IP%:5000"
set /p "INVENTORY_URL=Inventory backend URL [%INVENTORY_URL%]: "

set "CCWD_INVENTORY_URL=%INVENTORY_URL%"
set "CCWD_INVENTORY_ENV=%INVENTORY_ROOT%\backend\.env"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url = [Environment]::GetEnvironmentVariable('CCWD_INVENTORY_URL','Process').TrimEnd('/'); " ^
  "$envPath = [Environment]::GetEnvironmentVariable('CCWD_INVENTORY_ENV','Process'); " ^
  "if (-not [Uri]::IsWellFormedUriString($url, [UriKind]::Absolute)) { Write-Error 'Enter a complete http:// or https:// URL.'; exit 1 }; " ^
  "$secure = Read-Host 'Create the shared Inventory integration key' -AsSecureString; " ^
  "$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); " ^
  "try { " ^
  "  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr); " ^
  "  if ([string]::IsNullOrWhiteSpace($key) -or $key.Length -lt 24) { Write-Error 'Use a shared secret of at least 24 characters.'; exit 1 }; " ^
  "  if (-not (Test-Path -LiteralPath $envPath)) { Write-Error ('Inventory backend .env was not found: ' + $envPath); exit 1 }; " ^
  "  $lines = [Collections.Generic.List[string]](Get-Content -LiteralPath $envPath); " ^
  "  $found = $false; " ^
  "  for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^INVENTORY_INTEGRATION_KEY=') { $lines[$i] = 'INVENTORY_INTEGRATION_KEY=' + $key; $found = $true } }; " ^
  "  if (-not $found) { $lines.Add('INVENTORY_INTEGRATION_KEY=' + $key) }; " ^
  "  Set-Content -LiteralPath $envPath -Value $lines -Encoding utf8; " ^
  "  [Environment]::SetEnvironmentVariable('INVENTORY_INTEGRATION_URL', $url, 'User'); " ^
  "  [Environment]::SetEnvironmentVariable('INVENTORY_INTEGRATION_KEY', $key, 'User'); " ^
  "  Write-Host 'Inventory backend and TCMS integration settings saved.' -ForegroundColor Green " ^
  "} finally { " ^
  "  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) } " ^
  "}"

if errorlevel 1 (
  echo.
  echo [ERROR] Inventory integration settings were not saved.
  exit /b 1
)

echo.
echo Restart run_os_unified_stack.bat to enable Inventory synchronization.
echo.
echo You do NOT need a new APK just to change the Inventory URL or integration key.

endlocal
exit /b 0
