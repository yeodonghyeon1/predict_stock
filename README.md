# Stock AI Predictor

AI-powered stock chart pattern detection and news sentiment analysis.

- **Chart Pattern Detection**: Upload a line chart screenshot, object detection model identifies patterns (Head & Shoulders, Double Top/Bottom, Triangle, etc.)
- **AI Chart Analysis**: Claude Vision analyzes chart images for trends, support/resistance, and signals
- **News Sentiment Analysis**: Enter a ticker to auto-collect recent news and analyze market sentiment
- **Stock Q&A**: Ask questions about any stock — AI combines chart analysis, news data, and patterns to give a clear Buy/Sell/Hold recommendation

## Quick Start

```bash
git clone --recurse-submodules https://github.com/yeodonghyeon1/predict_stock.git
cd predict_stock

# Windows
setup.bat
start.bat

# Mac/Linux
bash setup.sh
cd backend && python -m uvicorn main:app --port 8000 &
cd frontend && npm run dev
```

Open `http://localhost:3000`

## Configuration

Copy `.env.example` to `backend/.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Optional | Claude API key for AI analysis. Without it, basic analysis only. |
| `YOLO_MODEL_PATH` | Optional | Custom YOLOv8 model path. Default: `backend/weights/yolo/model.pt` |
| `BERT_MODEL_PATH` | Optional | Custom BERT model path. Default: `backend/weights/bert/` |
| `DAILY_RATE_LIMIT` | Optional | API requests per IP per day. Default: 50. Localhost exempt. |

## Architecture

```
Next.js (3000) ──proxy──> FastAPI (8000)
                              ├── YOLOv8 (chart pattern detection)
                              ├── BERT (news sentiment)
                              ├── Claude API (vision + Q&A)
                              └── News scraper (Google News, Naver)
```

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS
- **Backend**: FastAPI, Python
- **Models**: YOLOv8 (foduucom/stockmarket-pattern-detection-yolov8), BERT (hasnain43/bert-stock-sentiment-v1)
- **LLM**: Claude Haiku 4.5 (optional)

## License

MIT
