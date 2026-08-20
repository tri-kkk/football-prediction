@echo off
chcp 65001 >nul
REM TrendSoccer shorts - daily batch render
REM Register THIS file in Windows Task Scheduler.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\render-all.ps1" %*
exit /b %ERRORLEVEL%
