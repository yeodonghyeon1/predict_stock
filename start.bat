@echo off
echo ================================
echo  Stock AI Predictor - Start
echo ================================

echo.
echo [1/2] Starting Backend (port 8000)...
start "Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [2/2] Starting Frontend (port 3000)...
timeout /t 5 /nobreak >nul
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  http://localhost:3000
echo ================================
