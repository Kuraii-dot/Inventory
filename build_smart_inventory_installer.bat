@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Smart Inventory Installer Builder

set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "TAURI_DIR=%FRONTEND_DIR%\src-tauri"
set "OUTPUT_DIR=%PROJECT_DIR%installers"
set "BUILD_MODE=%~1"
set "QUIET_MODE=0"

if "%BUILD_MODE%"=="" set "BUILD_MODE=both"
if /i "%~2"=="quiet" set "QUIET_MODE=1"

if /i "%BUILD_MODE%"=="help" goto :usage
if /i "%BUILD_MODE%"=="--help" goto :usage
if /i "%BUILD_MODE%"=="-h" goto :usage
if /i "%BUILD_MODE%"=="x64" goto :mode_ok
if /i "%BUILD_MODE%"=="x86" goto :mode_ok
if /i "%BUILD_MODE%"=="both" goto :mode_ok

echo ERROR: Unknown build mode "%BUILD_MODE%".
goto :usage_error

:mode_ok
echo.
echo =====================================================
echo          SMART INVENTORY INSTALLER BUILDER
echo =====================================================
echo Build mode: %BUILD_MODE%
echo.

if not exist "%FRONTEND_DIR%\package.json" (
  echo ERROR: The frontend project was not found.
  echo Expected: "%FRONTEND_DIR%\package.json"
  goto :failed
)

if not exist "%FRONTEND_DIR%\.env.tauri" (
  echo ERROR: The Tauri production environment file was not found.
  echo Expected: "%FRONTEND_DIR%\.env.tauri"
  goto :failed
)

findstr /B /C:"VITE_API_URL=https://" "%FRONTEND_DIR%\.env.tauri" >nul 2>&1
if errorlevel 1 (
  echo ERROR: VITE_API_URL in .env.tauri must use a public HTTPS address.
  goto :failed
)

findstr /I /C:"localhost" /C:"127.0.0.1" /C:"192.168." "%FRONTEND_DIR%\.env.tauri" >nul 2>&1
if not errorlevel 1 (
  echo ERROR: .env.tauri still contains a local or office-LAN address.
  echo Production installers must use the public API address.
  goto :failed
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js and npm are required but npm.cmd was not found.
  goto :failed
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is required but node.exe was not found.
  goto :failed
)

where cargo.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Rust is required but cargo.exe was not found.
  goto :failed
)

where rustup.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: rustup is required but rustup.exe was not found.
  goto :failed
)

if /i "%BUILD_MODE%"=="x64" call :ensure_target x86_64-pc-windows-msvc
if errorlevel 1 goto :failed
if /i "%BUILD_MODE%"=="x86" call :ensure_target i686-pc-windows-msvc
if errorlevel 1 goto :failed
if /i "%BUILD_MODE%"=="both" (
  call :ensure_target x86_64-pc-windows-msvc
  if errorlevel 1 goto :failed
  call :ensure_target i686-pc-windows-msvc
  if errorlevel 1 goto :failed
)

if not exist "%FRONTEND_DIR%\node_modules\@tauri-apps\cli" (
  echo Installing locked frontend dependencies...
  pushd "%FRONTEND_DIR%"
  call npm.cmd ci
  if errorlevel 1 (
    popd
    goto :failed
  )
  popd
)

set "APP_NAME=Smart Inventory"
set "APP_VERSION=1.0.0"
pushd "%FRONTEND_DIR%"
for /f "delims=" %%V in ('node.exe -p "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')).version"') do set "APP_VERSION=%%V"
for /f "delims=" %%N in ('node.exe -p "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')).productName"') do set "APP_NAME=%%N"

if /i "%BUILD_MODE%"=="x64" (
  call :build_x64
  if errorlevel 1 goto :build_failed
)

if /i "%BUILD_MODE%"=="x86" (
  call :build_x86
  if errorlevel 1 goto :build_failed
)

if /i "%BUILD_MODE%"=="both" (
  call :build_x64
  if errorlevel 1 goto :build_failed
  call :build_x86
  if errorlevel 1 goto :build_failed
)
popd

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
if errorlevel 1 (
  echo ERROR: Could not create "%OUTPUT_DIR%".
  goto :failed
)

if /i "%BUILD_MODE%"=="x64" call :collect_x64
if errorlevel 1 goto :failed
if /i "%BUILD_MODE%"=="x86" call :collect_x86
if errorlevel 1 goto :failed
if /i "%BUILD_MODE%"=="both" (
  call :collect_x64
  if errorlevel 1 goto :failed
  call :collect_x86
  if errorlevel 1 goto :failed
)

echo.
echo =====================================================
echo   Smart Inventory installer build completed.
echo =====================================================
echo.
echo Installers are available in:
echo   "%OUTPUT_DIR%"
echo.
if "%QUIET_MODE%"=="0" start "" "%OUTPUT_DIR%"
if "%QUIET_MODE%"=="0" pause
exit /b 0

:build_x64
echo.
echo -----------------------------------------------------
echo Building %APP_NAME% %APP_VERSION% for 64-bit Windows...
echo -----------------------------------------------------
call npm.cmd run tauri:build:x64 -- --config src-tauri/tauri.conf.json
exit /b %errorlevel%

:build_x86
echo.
echo -----------------------------------------------------
echo Building %APP_NAME% %APP_VERSION% for 32-bit Windows...
echo -----------------------------------------------------
call npm.cmd run tauri:build:x86 -- --config src-tauri/tauri.conf.json
exit /b %errorlevel%

:collect_x64
set "X64_INSTALLER=%TAURI_DIR%\target\x86_64-pc-windows-msvc\release\bundle\nsis\%APP_NAME%_%APP_VERSION%_x64-setup.exe"
if not exist "%X64_INSTALLER%" (
  echo ERROR: The x64 installer was not found after the build.
  echo Expected: "%X64_INSTALLER%"
  exit /b 1
)
copy /Y "%X64_INSTALLER%" "%OUTPUT_DIR%\" >nul
if errorlevel 1 exit /b 1
echo Collected: %APP_NAME%_%APP_VERSION%_x64-setup.exe
exit /b 0

:collect_x86
set "X86_INSTALLER=%TAURI_DIR%\target\i686-pc-windows-msvc\release\bundle\nsis\%APP_NAME%_%APP_VERSION%_x86-setup.exe"
if not exist "%X86_INSTALLER%" (
  echo ERROR: The x86 installer was not found after the build.
  echo Expected: "%X86_INSTALLER%"
  exit /b 1
)
copy /Y "%X86_INSTALLER%" "%OUTPUT_DIR%\" >nul
if errorlevel 1 exit /b 1
echo Collected: %APP_NAME%_%APP_VERSION%_x86-setup.exe
exit /b 0

:ensure_target
rustup.exe target list --installed | findstr /I /C:"%~1" >nul 2>&1
if not errorlevel 1 exit /b 0
echo Installing missing Rust target %~1...
rustup.exe target add %~1
exit /b %errorlevel%

:build_failed
popd
echo.
echo ERROR: The installer build failed. Review the messages above.
goto :failed

:usage
echo.
echo Smart Inventory installer builder
echo.
echo Usage:
echo   %~nx0          Build both x64 and x86 installers
echo   %~nx0 both     Build both x64 and x86 installers
echo   %~nx0 x64      Build only the 64-bit installer
echo   %~nx0 x86      Build only the 32-bit installer
echo   Add "quiet" as the second argument for automation.
echo.
exit /b 0

:usage_error
echo.
echo Usage: %~nx0 [both^|x64^|x86]
echo.
if "%QUIET_MODE%"=="0" pause
exit /b 2

:failed
echo.
echo Installer build did not complete.
if "%QUIET_MODE%"=="0" pause
exit /b 1
