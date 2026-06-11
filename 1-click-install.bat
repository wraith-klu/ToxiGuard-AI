@echo off
TITLE ToxiGuard AI - 1-Click Extension Installer
COLOR 0A
echo.
echo ========================================================
echo        ToxiGuard AI - Smart Content Shield
echo        Enterprise Extension Installer
echo ========================================================
echo.
echo Launching browser with the ToxiGuard AI extension loaded...
echo.

set "EXT_DIR=%~dp0extension"
if not exist "%EXT_DIR%\manifest.json" (
    COLOR 0C
    echo ERROR: Could not find the extension directory.
    echo Make sure this script is run from the ToxiGuard-AI root folder.
    pause
    exit /b 1
)

:: Try to launch Chrome
start chrome --load-extension="%EXT_DIR%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Chrome not found in PATH or failed to start.
    echo Trying Microsoft Edge...
    start msedge --load-extension="%EXT_DIR%"
)

echo.
echo ✅ Done! The browser should open with the extension installed.
echo Press any key to exit.
pause >nul
