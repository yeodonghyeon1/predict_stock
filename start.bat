@echo off
title Stock AI Predictor

echo ================================
echo  Stock AI Predictor
echo ================================
echo.

echo Starting Backend (port 8000)...
start /B "" cmd /c "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 > nul 2>&1"
timeout /t 5 /nobreak > nul

echo Starting Frontend (port 3000)...
start /B "" cmd /c "cd /d "%~dp0frontend" && npm run dev > nul 2>&1"
timeout /t 3 /nobreak > nul

echo.
echo  http://localhost:3000
echo.
echo  Press any key to stop all services...
pause > nul

echo.
echo Stopping services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTEN"') do taskkill /PID %%a /F > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTEN"') do taskkill /PID %%a /F > nul 2>&1
echo Done.
