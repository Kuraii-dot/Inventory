@echo off
setlocal EnableExtensions
title Configure Smart Inventory Supabase Cloud
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure_inventory_supabase_cloud.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Smart Inventory cloud configuration was not completed.
) else (
  echo.
  echo [SUCCESS] Smart Inventory cloud configuration completed.
)
echo.
pause
exit /b %errorlevel%

