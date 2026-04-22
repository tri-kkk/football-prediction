@echo off
echo ===================================
echo  Naver Blog Auto Posting
echo  %date% %time%
echo ===================================

cd /d "%~dp0"
python main.py

echo.
echo Done. Closing in 10 sec...
timeout /t 10

exit
