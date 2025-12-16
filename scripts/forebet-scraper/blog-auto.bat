@echo off
echo ========================================
echo TrendSoccer Blog Auto Generator
echo %date% %time%
echo ========================================

cd /d C:\Users\SPOFEED\Desktop\football-prediction\scripts\forebet-scraper

set GEMINI_API_KEY=AIzaSyCnq4WWV8Sz-0iENxaXp2tzE-DoME3FgNc
set SUPABASE_URL=https://riqvjiiwjyynvhuynisv.supabase.co
set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcXZqaWl3anl5bnZodXluaXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYzODI0MiwiZXhwIjoyMDc3MjE0MjQyfQ.FgeTgtbg3RR1zZ9Qo1i7gtxwJ54jbRZK6HXxx9PaV-A
set THESPORTSDB_API_KEY=166885

set LOGDIR=C:\Users\SPOFEED\Desktop\football-prediction\scripts\forebet-scraper\logs
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

set LOGFILE=%LOGDIR%\blog_%date:~0,4%%date:~5,2%%date:~8,2%.log

echo.
echo [1/3] Scraping Forebet...
echo [%time%] Starting scraper >> "%LOGFILE%"
node scraper.js >> "%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo [X] Scraper failed!
    echo [%time%] Scraper FAILED >> "%LOGFILE%"
    goto :error
)
echo [OK] Scraping complete

echo.
echo [2/3] AI Processing...
echo [%time%] Starting AI processor >> "%LOGFILE%"
node ai-processor.js >> "%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo [X] AI Processor failed!
    echo [%time%] AI Processor FAILED >> "%LOGFILE%"
    goto :error
)
echo [OK] AI Processing complete

echo.
echo [3/3] Uploading to Supabase...
echo [%time%] Starting uploader >> "%LOGFILE%"
node supabase-uploader.js >> "%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo [X] Uploader failed!
    echo [%time%] Uploader FAILED >> "%LOGFILE%"
    goto :error
)
echo [OK] Upload complete

echo.
echo ========================================
echo [SUCCESS] All tasks completed!
echo Log: %LOGFILE%
echo ========================================
echo [%time%] SUCCESS >> "%LOGFILE%"
goto :end

:error
echo.
echo ========================================
echo [FAILED] Check log file
echo Log: %LOGFILE%
echo ========================================

:end
pause
