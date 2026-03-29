@echo off
echo ========================================
echo  Stock AI Predictor - Starting Services
echo ========================================

echo.
echo [1/2] Starting FastAPI ML Backend (port 8000)...
start "FastAPI Backend" cmd /k "cd /d D:\stock-ai-predictor\backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [2/2] Starting Next.js Frontend (port 3000)...
timeout /t 5 /nobreak >nul
start "Next.js Frontend" cmd /k "cd /d D:\stock-ai-predictor\frontend && npm run dev"

echo.
echo ========================================
echo  Services starting...
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000/api/health
echo ========================================
echo.
echo Press any key to also start Cloudflare Tunnel...
pause >nul
cloudflared tunnel run stock-ai
