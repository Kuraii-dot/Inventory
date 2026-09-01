@echo off
setlocal EnableExtensions
title Redeploy Smart Inventory Cloud API

for %%I in ("%~dp0..\..") do set "INVENTORY_ROOT=%%~fI"
set "PROJECT_REF=lnplmxyevcjohgpdpgfh"

echo.
echo =====================================================
echo       SMART INVENTORY CLOUD API REDEPLOYMENT
echo =====================================================
echo.
echo Sign in with the Supabase account that owns the
echo Inventory project: %PROJECT_REF%
echo.

if not exist "%INVENTORY_ROOT%\supabase\functions\inventory-api\index.ts" (
  echo [ERROR] Inventory cloud function was not found.
  goto :failed
)

pushd "%INVENTORY_ROOT%"
call npx.cmd --yes supabase@latest login
if errorlevel 1 (
  popd
  echo [ERROR] Supabase login did not complete.
  goto :failed
)

call npx.cmd --yes supabase@latest functions deploy inventory-api --project-ref %PROJECT_REF%
if errorlevel 1 (
  popd
  echo [ERROR] Supabase rejected the function deployment.
  goto :failed
)
popd

echo.
echo [SUCCESS] The optimized Inventory cloud API is live.
echo.
pause
exit /b 0

:failed
echo.
echo Sign in with an Owner or Administrator account for the
echo Inventory Supabase project, then run this file again.
echo.
pause
exit /b 1
