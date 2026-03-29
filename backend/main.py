import io
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import yolo_service, bert_service
from services.news_scraper import fetch_news_for_stock
from services import llm_service
from schemas import SentimentRequest, StockRequest, AskRequest


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
    return {
        "status": "ok",
        "models": ["yolov8", "bert"],
        "llm": llm_service.is_available(),
    }


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


@app.post("/api/ask")
async def ask_question(req: AskRequest):
    query = req.query.strip()
    question = req.question.strip()
    if not question:
        raise HTTPException(400, "Question is required")

    chart_patterns = req.chart_patterns
    news_summary = None

    if query:
        articles = await fetch_news_for_stock(query, max_items=10)
        if articles:
            sentiments = [bert_service.analyze_sentiment(a["title_en"]) for a in articles]
            pos = sum(1 for s in sentiments if s["sentiment"] == "positive")
            neg = sum(1 for s in sentiments if s["sentiment"] == "negative")
            neu = len(sentiments) - pos - neg
            avg = sum(s["scores"]["positive"] - s["scores"]["negative"] for s in sentiments) / len(sentiments)
            signal_ko = "매수 고려" if avg > 0.15 else ("매도 고려" if avg < -0.15 else "관망")
            news_summary = {
                "total_articles": len(sentiments),
                "positive_count": pos,
                "neutral_count": neu,
                "negative_count": neg,
                "signal_ko": signal_ko,
            }

    if llm_service.is_available():
        answer = await llm_service.analyze_stock(query, question, chart_patterns, news_summary)
        return {"answer": answer, "source": "llm", "news_summary": news_summary}

    parts = []
    if news_summary:
        parts.append(
            f"[{query}] 최근 뉴스 {news_summary['total_articles']}건 분석: "
            f"긍정 {news_summary['positive_count']}, "
            f"중립 {news_summary['neutral_count']}, "
            f"부정 {news_summary['negative_count']} → "
            f"{news_summary['signal_ko']}"
        )
    if chart_patterns:
        for p in chart_patterns:
            parts.append(f"차트 패턴: {p['pattern']} ({p['signal']}, 신뢰도 {p['confidence']*100:.0f}%)")
    if not parts:
        parts.append("분석 가능한 데이터가 없습니다. 종목명을 입력하거나 차트를 먼저 업로드해주세요.")
    parts.append("")
    parts.append("※ AI API 키가 설정되지 않아 기본 분석만 제공됩니다. 상세 답변은 ANTHROPIC_API_KEY 설정 후 이용 가능합니다.")
    parts.append("※ 이 분석은 참고용이며 투자 조언이 아닙니다.")

    return {"answer": "\n".join(parts), "source": "basic", "news_summary": news_summary}


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
