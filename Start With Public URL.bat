@echo off
echo.
echo  ============================================
echo   VidSnap - Starting with Public URL
echo  ============================================
echo.

REM Start Flask in a separate window
start "VidSnap Server" cmd /k "python app.py"

REM Wait 3 seconds for Flask to start
timeout /t 3 /nobreak >nul

REM Start cloudflared tunnel and show URL
echo  Starting Cloudflare tunnel...
echo  Your public URL will appear below in a moment:
echo.
cloudflared.exe tunnel --url http://localhost:5000
