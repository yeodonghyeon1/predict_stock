#!/bin/bash
echo "================================"
echo " Stock AI Predictor - Setup"
echo "================================"
echo

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/3] Installing Python dependencies..."
cd "$SCRIPT_DIR/backend"
pip install -r requirements.txt
echo

echo "[2/3] Downloading AI models (about 500MB)..."
python download_models.py
echo

echo "[3/3] Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install
echo

echo "================================"
echo " Setup complete!"
echo " Run: cd backend && python -m uvicorn main:app --port 8000"
echo " Run: cd frontend && npm run dev"
echo "================================"
