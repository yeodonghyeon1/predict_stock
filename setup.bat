@echo off
echo ================================
echo  Stock AI Predictor - Setup
echo ================================
echo.

echo [1/3] Installing Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt
echo.

echo [2/3] Downloading AI models (about 500MB)...
python download_models.py
echo.

echo [3/3] Installing frontend dependencies...
cd /d "%~dp0frontend"
npm install
echo.

echo ================================
echo  Setup complete!
echo  Run start.bat to launch.
echo ================================
pause
