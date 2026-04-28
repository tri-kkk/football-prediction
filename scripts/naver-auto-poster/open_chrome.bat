@echo off
setlocal

echo ===================================
echo  Chrome Debug Mode Launcher (port 9222)
echo ===================================

REM 1. Check if port 9222 is already in use
netstat -ano | findstr /C:":9222 " | findstr LISTENING >nul 2>&1
if %errorlevel%==0 (
    echo.
    echo [WARN] Port 9222 is already in use.
    echo        Another Chrome debug session might be running.
    echo        Close it first, or just use the existing one.
    echo.
    pause
    exit /b 1
)

REM 2. Auto-detect Chrome path (64bit -> 32bit -> LocalAppData)
set CHROME=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if "%CHROME%"=="" (
    echo [ERROR] chrome.exe not found in the usual locations.
    echo        Install Chrome or edit this .bat with the correct path.
    pause
    exit /b 1
)

echo [OK] Chrome: %CHROME%
echo [OK] User data dir: %USERPROFILE%\ChromeDebug
echo.
echo Opening Chrome... login to Naver, then run: python main.py
echo (Keep this Chrome window open while posting.)
echo.

start "" "%CHROME%" --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\ChromeDebug" --disable-blink-features=AutomationControlled --lang=ko-KR https://www.naver.com

endlocal
