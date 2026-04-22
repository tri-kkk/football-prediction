@echo off
echo ===================================
echo  Setup Windows Task Scheduler
echo ===================================
echo.

set SCRIPT_DIR=%~dp0
set BAT_PATH=%SCRIPT_DIR%run_posting.bat

echo Target: %BAT_PATH%
echo Schedule: Daily 11:30
echo.

schtasks /delete /tn "NaverBlogAutoPost" /f >nul 2>&1

schtasks /create /tn "NaverBlogAutoPost" /tr "\"%BAT_PATH%\"" /sc daily /st 11:30 /rl highest /f

if %errorlevel% equ 0 (
    echo.
    echo [OK] Task registered!
    echo   Name: NaverBlogAutoPost
    echo   Time: Daily 11:30
    echo.
    echo Check: taskschd.msc
    echo Delete: schtasks /delete /tn "NaverBlogAutoPost" /f
) else (
    echo.
    echo [FAIL] Run as Administrator!
)

echo.
pause
