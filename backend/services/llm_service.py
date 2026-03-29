import os
import base64
import httpx

CLAUDE_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"
CLAUDE_URL = "https://api.anthropic.com/v1/messages"


def is_available() -> bool:
    return bool(CLAUDE_API_KEY)


async def analyze_chart_with_vision(image_b64: str, media_type: str = "image/png") -> str:
    if not CLAUDE_API_KEY:
        return ""

    prompt = """You are a stock chart analyst. Analyze this chart image in Korean.

Instructions:
1. Identify any chart patterns (head & shoulders, double top/bottom, triangle, wedge, flag, channel, support/resistance, trendlines, etc.)
2. Note the current trend direction (uptrend, downtrend, sideways)
3. Identify key support and resistance levels if visible
4. Give a clear signal: BUY / SELL / HOLD with reasoning
5. Write 200-400 characters in Korean
6. End with: "이 분석은 참고용이며 투자 조언이 아닙니다."

Be specific about what you see in the chart."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                CLAUDE_URL,
                headers={
                    "x-api-key": CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 1024,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_b64,
                                },
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }],
                },
            )
            if resp.status_code != 200:
                return ""
            data = resp.json()
            return data["content"][0]["text"]
    except Exception:
        return ""


async def analyze_stock(
    query: str,
    question: str,
    chart_patterns: list[dict] | None = None,
    news_data: list[dict] | None = None,
    news_summary: dict | None = None,
    chart_vision_analysis: str | None = None,
) -> str:
    if not CLAUDE_API_KEY:
        return ""

    context_parts = []

    if chart_vision_analysis:
        context_parts.append(f"## Chart Analysis (AI Vision)\n{chart_vision_analysis}")

    if chart_patterns:
        context_parts.append("## Chart Pattern Detection (YOLOv8)")
        for p in chart_patterns:
            context_parts.append(
                f"- {p['pattern']}: {p['signal']} (confidence {p['confidence']*100:.0f}%)"
            )

    if news_data:
        context_parts.append(f"\n## Recent News ({len(news_data)} articles)")
        for i, article in enumerate(news_data, 1):
            sentiment = article.get("sentiment", {})
            signal = sentiment.get("signal_ko", "?")
            title = article.get("title_original", article.get("title_en", ""))
            source = article.get("source", "")
            link = article.get("link", "")
            context_parts.append(f"{i}. [{signal}] {title} ({source}) - {link}")

    if news_summary:
        s = news_summary
        context_parts.append(
            f"\n## News Summary"
            f"\nTotal: {s.get('total_articles', 0)} articles"
            f"\nPositive: {s.get('positive_count', 0)}, "
            f"Neutral: {s.get('neutral_count', 0)}, "
            f"Negative: {s.get('negative_count', 0)}"
            f"\nOverall signal: {s.get('signal_ko', 'N/A')}"
        )

    context = "\n".join(context_parts) if context_parts else "No analysis data available."

    prompt = f"""You are a stock analysis AI. Analyze the data below and answer the user's question in Korean.

Ticker: {query or 'Not specified'}

{context}

User question: {question}

Instructions:
1. EVIDENCE FIRST: Cite specific news headlines as evidence. Include the article link in parentheses when referencing news.
2. CLEAR DIRECTION: State a clear recommendation - buy, sell, or hold - with confidence level (strong/moderate/weak). Do not be vague.
3. CHART + NEWS COMBINED: If both chart analysis and news are available, synthesize them. If they conflict, explain which signal is stronger and why.
4. RISKS: Briefly mention 1-2 key risks.
5. NEWS LINKS: At the end, list 2-3 most relevant article links under "참고 기사:" section.
6. End with: "이 분석은 참고용이며 투자 조언이 아닙니다."

Write 400-800 characters in Korean. Be specific and direct."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                CLAUDE_URL,
                headers={
                    "x-api-key": CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            if resp.status_code != 200:
                return ""
            data = resp.json()
            return data["content"][0]["text"]
    except Exception:
        return ""
