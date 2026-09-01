@echo off
setlocal EnableExtensions

net session >nul 2>&1
if errorlevel 1 (
  echo Requesting Administrator access so the Inventory API can be restarted...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure_inventory_database.ps1"
set "RESULT=%ERRORLEVEL%"

echo.
if not "%RESULT%"=="0" (
  echo [ERROR] Inventory database configuration was not completed.
) else (
  echo [READY] Inventory database configuration is working.
)
echo.
pause
endlocal & exit /b %RESULT%
