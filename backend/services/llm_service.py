"""LLM analysis with provider fallback chain.

Default order: Groq → Google → Claude. The first provider whose API key is
configured and that returns a non-empty response wins. Any 4xx/5xx/timeout
error or empty body causes the chain to fall through to the next provider.

Configure the order via ``LLM_PROVIDER_ORDER`` (comma-separated).
"""

import os
import logging
import httpx

log = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_TEXT_MODEL = os.environ.get("GROQ_TEXT_MODEL", "llama-3.3-70b-versatile")
GROQ_VISION_MODEL = os.environ.get(
    "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GOOGLE_MODEL = os.environ.get("GOOGLE_MODEL", "gemini-2.5-flash")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

PROVIDER_ORDER = [
    p.strip().lower()
    for p in os.environ.get("LLM_PROVIDER_ORDER", "groq,google,claude").split(",")
    if p.strip()
]

# Vision quality varies more by provider than text. Default to Google first
# because Gemini follows non-English output instructions better than Llama 4
# Scout via Groq.
VISION_PROVIDER_ORDER = [
    p.strip().lower()
    for p in os.environ.get(
        "LLM_VISION_PROVIDER_ORDER", "google,claude,groq"
    ).split(",")
    if p.strip()
]

REQUEST_TIMEOUT = float(os.environ.get("LLM_TIMEOUT", "60"))
MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "1024"))


def _provider_available(name: str) -> bool:
    return {
        "groq": bool(GROQ_API_KEY),
        "google": bool(GOOGLE_API_KEY),
        "claude": bool(ANTHROPIC_API_KEY),
    }.get(name, False)


def is_available() -> bool:
    return any(_provider_available(p) for p in PROVIDER_ORDER)


# ---------- Groq (OpenAI-compatible) ----------

async def _groq_chat(prompt: str, image_b64: str | None, media_type: str) -> str:
    if image_b64:
        model = GROQ_VISION_MODEL
        content: list[dict] = [
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {"url": f"data:{media_type};base64,{image_b64}"},
            },
        ]
    else:
        model = GROQ_TEXT_MODEL
        content = prompt  # OpenAI accepts a plain string for text-only

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": content}],
                "max_tokens": MAX_TOKENS,
                "temperature": 0.3,
            },
        )
        if resp.status_code != 200:
            log.warning("groq returned %s: %s", resp.status_code, resp.text[:300])
            return ""
        data = resp.json()
        return (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()


# ---------- Google Gemini ----------

async def _google_chat(prompt: str, image_b64: str | None, media_type: str) -> str:
    parts: list[dict] = [{"text": prompt}]
    if image_b64:
        parts.append({"inlineData": {"mimeType": media_type, "data": image_b64}})

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GOOGLE_MODEL}:generateContent?key={GOOGLE_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        resp = await client.post(
            url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": MAX_TOKENS,
                    # Gemini 2.5 Flash burns budget on hidden thinking tokens
                    # by default, which can starve the visible response.
                    "thinkingConfig": {"thinkingBudget": 0},
                },
            },
        )
        if resp.status_code != 200:
            log.warning("google returned %s: %s", resp.status_code, resp.text[:300])
            return ""
        data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return ""
        parts_out = (candidates[0].get("content") or {}).get("parts") or []
        return "".join(p.get("text", "") for p in parts_out).strip()


# ---------- Anthropic Claude ----------

async def _claude_chat(prompt: str, image_b64: str | None, media_type: str) -> str:
    if image_b64:
        content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": image_b64,
                },
            },
            {"type": "text", "text": prompt},
        ]
    else:
        content = prompt

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": MAX_TOKENS,
                "messages": [{"role": "user", "content": content}],
            },
        )
        if resp.status_code != 200:
            log.warning("claude returned %s: %s", resp.status_code, resp.text[:300])
            return ""
        data = resp.json()
        blocks = data.get("content") or []
        if not blocks:
            return ""
        return blocks[0].get("text", "").strip()


_CALLERS = {"groq": _groq_chat, "google": _google_chat, "claude": _claude_chat}


async def _try_chain(prompt: str, image_b64: str | None = None, media_type: str = "image/png") -> str:
    order = VISION_PROVIDER_ORDER if image_b64 else PROVIDER_ORDER
    for provider in order:
        if not _provider_available(provider):
            continue
        try:
            answer = await _CALLERS[provider](prompt, image_b64, media_type)
        except Exception as e:
            log.warning("%s exception: %s", provider, e)
            answer = ""
        if answer:
            log.info("llm provider used: %s (vision=%s)", provider, bool(image_b64))
            return answer
    return ""


# ---------- Public API (preserved signatures) ----------

VISION_PROMPT_KO = """OUTPUT LANGUAGE: KOREAN ONLY. 한국어로만 답변하세요. Do NOT write any English in the response.

You are a stock chart analyst. Analyze this chart image.

Instructions:
1. Identify any chart patterns (head & shoulders, double top/bottom, triangle, wedge, flag, channel, support/resistance, trendlines, etc.)
2. Note the current trend direction (uptrend, downtrend, sideways)
3. Identify key support and resistance levels if visible
4. Give a clear signal: BUY / SELL / HOLD with reasoning
5. Write 200-400 characters in Korean. Every sentence must be in Korean.
6. End with: "이 분석은 참고용이며 투자 조언이 아닙니다."

Be specific about what you see in the chart. Respond in Korean only."""

VISION_PROMPT_EN = """OUTPUT LANGUAGE: ENGLISH ONLY.

You are a stock chart analyst. Analyze this chart image.

Instructions:
1. Identify any chart patterns (head & shoulders, double top/bottom, triangle, wedge, flag, channel, support/resistance, trendlines, etc.)
2. Note the current trend direction (uptrend, downtrend, sideways)
3. Identify key support and resistance levels if visible
4. Give a clear signal: BUY / SELL / HOLD with reasoning
5. Write 200-400 characters in English.
6. End with: "This analysis is for reference only and is not investment advice."

Be specific about what you see in the chart."""


def _vision_prompt(lang: str) -> str:
    return VISION_PROMPT_EN if lang == "en" else VISION_PROMPT_KO


async def analyze_chart_with_vision(
    image_b64: str, media_type: str = "image/png", lang: str = "ko"
) -> str:
    return await _try_chain(_vision_prompt(lang), image_b64=image_b64, media_type=media_type)


async def analyze_stock(
    query: str,
    question: str,
    chart_patterns: list[dict] | None = None,
    news_data: list[dict] | None = None,
    news_summary: dict | None = None,
    chart_vision_analysis: str | None = None,
    lang: str = "ko",
) -> str:
    context_parts: list[str] = []

    if chart_vision_analysis:
        context_parts.append(f"## Chart Analysis (AI Vision)\n{chart_vision_analysis}")

    if chart_patterns:
        context_parts.append("## Object Detection Pattern Analysis")
        for p in chart_patterns:
            context_parts.append(
                f"- {p['pattern']}: {p['signal']} (confidence {p['confidence']*100:.0f}%)"
            )
        context_parts.append("Note: These patterns were detected by an object detection model on the chart image. Factor these into your analysis.")

    if news_data:
        context_parts.append(f"\n## Recent News ({len(news_data)} articles)")
        for i, article in enumerate(news_data, 1):
            sentiment = article.get("sentiment", {})
            signal = sentiment.get("signal_ko" if lang == "ko" else "signal", "?")
            title = article.get("title_original", article.get("title_en", ""))
            source = article.get("source", "")
            link = article.get("link", "")
            context_parts.append(f"{i}. [{signal}] {title} ({source}) - {link}")

    if news_summary:
        s = news_summary
        overall = s.get("signal_ko" if lang == "ko" else "signal_ko", "N/A")
        context_parts.append(
            f"\n## News Summary"
            f"\nTotal: {s.get('total_articles', 0)} articles"
            f"\nPositive: {s.get('positive_count', 0)}, "
            f"Neutral: {s.get('neutral_count', 0)}, "
            f"Negative: {s.get('negative_count', 0)}"
            f"\nOverall signal: {overall}"
        )

    context = "\n".join(context_parts) if context_parts else "No analysis data available."

    if lang == "en":
        prompt = f"""You are a stock analysis AI. Analyze the data below and answer the user's question in English.

Ticker: {query or 'Not specified'}

{context}

User question: {question}

Instructions:
1. EVIDENCE FIRST: Cite specific news headlines as evidence. Include the article link in parentheses when referencing news.
2. CLEAR DIRECTION: State a clear recommendation - buy, sell, or hold - with confidence level (strong/moderate/weak). Do not be vague.
3. CHART + NEWS + OBJECT DETECTION COMBINED: Synthesize all available data - AI vision analysis, object detection patterns, and news. If signals conflict, explain which is stronger and why. Always mention object detection results if available.
4. RISKS: Briefly mention 1-2 key risks.
5. NEWS LINKS: At the end, list 2-3 most relevant article links under "References:" section.
6. End with: "This analysis is for reference only and is not investment advice."

Write 400-800 characters in English. Be specific and direct."""
    else:
        prompt = f"""You are a stock analysis AI. Analyze the data below and answer the user's question in Korean.

Ticker: {query or 'Not specified'}

{context}

User question: {question}

Instructions:
1. EVIDENCE FIRST: Cite specific news headlines as evidence. Include the article link in parentheses when referencing news.
2. CLEAR DIRECTION: State a clear recommendation - buy, sell, or hold - with confidence level (strong/moderate/weak). Do not be vague.
3. CHART + NEWS + OBJECT DETECTION COMBINED: Synthesize all available data - AI vision analysis, object detection patterns, and news. If signals conflict, explain which is stronger and why. Always mention object detection results if available.
4. RISKS: Briefly mention 1-2 key risks.
5. NEWS LINKS: At the end, list 2-3 most relevant article links under "참고 기사:" section.
6. End with: "이 분석은 참고용이며 투자 조언이 아닙니다."

Write 400-800 characters in Korean. Be specific and direct."""

    return await _try_chain(prompt)
