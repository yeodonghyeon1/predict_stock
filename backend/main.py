import io
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import yolo_service, bert_service
from services.news_scraper import fetch_news_for_stock
from schemas import SentimentRequest, StockRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading models...")
    yolo_service.get_model()
    bert_service.get_model()
    print("Models loaded.")
    yield


app = FastAPI(title="Stock AI Predictor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "models": ["yolov8", "bert"]}


@app.post("/api/analyze-chart")
async def analyze_chart(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")

    result = yolo_service.analyze_chart(image_bytes)
    return result


@app.post("/api/analyze-sentiment")
def analyze_sentiment(req: SentimentRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "Text is required")
    if len(text) > 1000:
        raise HTTPException(400, "Text too long (max 1000 chars)")

    result = bert_service.analyze_sentiment(text)
    return result


@app.post("/api/analyze-stock")
async def analyze_stock(req: StockRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(400, "Query is required")

    articles = await fetch_news_for_stock(query, max_items=15)

    if not articles:
        return {
            "query": query,
            "news": [],
            "summary": {"signal": "Unknown", "signal_ko": "데이터 없음", "avg_score": 0},
        }

    results = []
    total_score = 0.0
    for article in articles:
        sentiment = bert_service.analyze_sentiment(article["title_en"])
        score_val = sentiment["scores"]["positive"] - sentiment["scores"]["negative"]
        total_score += score_val
        results.append({
            **article,
            "sentiment": sentiment,
        })

    avg_score = total_score / len(results) if results else 0

    if avg_score > 0.15:
        summary_signal = "Buy"
        summary_signal_ko = "매수 고려"
    elif avg_score < -0.15:
        summary_signal = "Sell"
        summary_signal_ko = "매도 고려"
    else:
        summary_signal = "Hold"
        summary_signal_ko = "관망"

    return {
        "query": query,
        "news": results,
        "summary": {
            "signal": summary_signal,
            "signal_ko": summary_signal_ko,
            "avg_score": round(avg_score, 3),
            "total_articles": len(results),
            "positive_count": sum(1 for r in results if r["sentiment"]["sentiment"] == "positive"),
            "neutral_count": sum(1 for r in results if r["sentiment"]["sentiment"] == "neutral"),
            "negative_count": sum(1 for r in results if r["sentiment"]["sentiment"] == "negative"),
        },
    }
