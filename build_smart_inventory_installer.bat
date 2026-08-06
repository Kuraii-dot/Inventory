@echo off
setlocal EnableExtensions
title Smart Inventory Installer Builder

set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"

echo.
echo =====================================================
echo          SMART INVENTORY INSTALLER BUILDER
echo =====================================================
echo.

if not exist "%FRONTEND_DIR%\package.json" (
  echo ERROR: The frontend project was not found.
  echo Expected: "%FRONTEND_DIR%\package.json"
  goto :failed
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js and npm are required but npm.cmd was not found.
  goto :failed
)

where cargo.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Rust is required but cargo.exe was not found.
  goto :failed
)

if not exist "%FRONTEND_DIR%\node_modules\@tauri-apps\cli" (
  echo Installing project dependencies...
  pushd "%FRONTEND_DIR%"
  call npm.cmd install
  if errorlevel 1 (
    popd
    goto :failed
  )
  popd
)

if /i "%~1"=="x64" (
  set "BUILD_CHOICE=1"
  goto :selected
)
if /i "%~1"=="x86" (
  set "BUILD_CHOICE=2"
  goto :selected
)
if /i "%~1"=="both" (
  set "BUILD_CHOICE=3"
  goto :selected
)

echo Select the installer architecture:
echo.
echo   [1] x64 - Standard 64-bit Windows
echo   [2] x86 - 32-bit Windows
echo   [3] Build both x64 and x86
echo   [Q] Cancel
echo.
choice /C 123Q /N /M "Enter your choice: "
if errorlevel 4 goto :cancelled
if errorlevel 3 (
  set "BUILD_CHOICE=3"
  goto :selected
)
if errorlevel 2 (
  set "BUILD_CHOICE=2"
  goto :selected
)
if errorlevel 1 (
  set "BUILD_CHOICE=1"
  goto :selected
)

:selected
pushd "%FRONTEND_DIR%"

if "%BUILD_CHOICE%"=="1" call :build_x64
if errorlevel 1 goto :build_failed

if "%BUILD_CHOICE%"=="2" call :build_x86
if errorlevel 1 goto :build_failed

if "%BUILD_CHOICE%"=="3" (
  call :build_x64
  if errorlevel 1 goto :build_failed
  call :build_x86
  if errorlevel 1 goto :build_failed
)

popd
echo.
echo =====================================================
echo   Smart Inventory installer build completed.
echo =====================================================
echo.

if "%BUILD_CHOICE%"=="1" start "" "%FRONTEND_DIR%\src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis"
if "%BUILD_CHOICE%"=="2" start "" "%FRONTEND_DIR%\src-tauri\target\i686-pc-windows-msvc\release\bundle\nsis"
if "%BUILD_CHOICE%"=="3" start "" "%FRONTEND_DIR%\src-tauri\target"

echo You may close this window.
pause
exit /b 0

:build_x64
echo.
echo Building Smart Inventory for x64...
call npm.cmd run tauri:build:x64 -- --config src-tauri/tauri.conf.json
exit /b %errorlevel%

:build_x86
echo.
echo Building Smart Inventory for x86...
call npm.cmd run tauri:build:x86 -- --config src-tauri/tauri.conf.json
exit /b %errorlevel%

:build_failed
popd
echo.
echo ERROR: The installer build failed. Review the messages above.
goto :failed

:cancelled
echo.
echo Build cancelled.
pause
exit /b 0

:failed
echo.
pause
exit /b 1
