@echo off
cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

start "FINASS" cmd /k "npm start"

echo Waiting for backend to be ready...
:wait_be
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/health | find "200" >nul 2>&1
if errorlevel 1 goto wait_be

echo Waiting for frontend to be ready...
:wait_fe
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:5173 | find "200" >nul 2>&1
if errorlevel 1 goto wait_fe

start "" "http://localhost:5173"
exit
