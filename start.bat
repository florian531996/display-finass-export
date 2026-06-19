@echo off
cd /d "%~dp0"

if not exist "node_modules" (
    powershell -NoProfile -Command "Write-Host ([char]0x23F3 + ' Installing dependencies...') -ForegroundColor Cyan"
    call npm install
    if errorlevel 1 goto error
    powershell -NoProfile -Command "Write-Host ([char]0x2705 + ' Dependencies installed.') -ForegroundColor Green"
)

powershell -NoProfile -Command "Write-Host ([char]0x23F3 + ' Starting App...') -ForegroundColor Cyan"
start "App" cmd /k "npm start"
if errorlevel 1 goto error

powershell -NoProfile -Command "Write-Host ([char]0x23F3 + ' Waiting for backend to be ready...') -ForegroundColor Cyan"
:wait_be
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/health | find "200" >nul 2>&1
if errorlevel 1 goto wait_be
powershell -NoProfile -Command "Write-Host ([char]0x2705 + ' Backend is up.') -ForegroundColor Green"

powershell -NoProfile -Command "Write-Host ([char]0x23F3 + ' Waiting for frontend to be ready...') -ForegroundColor Cyan"
:wait_fe
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:5173 | find "200" >nul 2>&1
if errorlevel 1 goto wait_fe
powershell -NoProfile -Command "Write-Host ([char]0x2705 + ' Frontend is up.') -ForegroundColor Green"

powershell -NoProfile -Command "Write-Host ([char]0x2705 + ' Opening http://localhost:5173 ...') -ForegroundColor Green"
start "" "http://localhost:5173"
exit /b 0

:error
echo.
powershell -NoProfile -Command "Write-Host ([char]0x274C + ' Something went wrong. See error above.') -ForegroundColor Red"
pause
