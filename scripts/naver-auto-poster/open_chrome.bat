@echo off
echo Opening Chrome with debug mode...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\ChromeDebug" https://www.naver.com
echo Chrome ready. Login to Naver, then run python main.py
pause
