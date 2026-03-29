import os
import httpx

CLAUDE_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"
CLAUDE_URL = "https://api.anthropic.com/v1/messages"


def is_available() -> bool:
    return bool(CLAUDE_API_KEY)


async def analyze_stock(
    query: str,
    question: str,
    chart_patterns: list[dict] | None = None,
    news_sentiments: dict | None = None,
) -> str:
    if not CLAUDE_API_KEY:
        return ""

    context_parts = []

    if chart_patterns:
        patterns_text = ", ".join(
            f"{p['pattern']}({p['signal']}, {p['confidence']*100:.0f}%)"
            for p in chart_patterns
        )
        context_parts.append(f"차트 패턴 분석 결과: {patterns_text}")

    if news_sentiments:
        s = news_sentiments
        context_parts.append(
            f"최근 뉴스 분석({s.get('total_articles', 0)}건): "
            f"긍정 {s.get('positive_count', 0)}, "
            f"중립 {s.get('neutral_count', 0)}, "
            f"부정 {s.get('negative_count', 0)}, "
            f"종합 시그널: {s.get('signal_ko', '알 수 없음')}"
        )

    context = "\n".join(context_parts) if context_parts else "추가 분석 데이터 없음"

    prompt = f"""당신은 주식 분석 보조 AI입니다. 아래 데이터를 참고하여 사용자의 질문에 답하세요.

종목: {query or '미지정'}
{context}

사용자 질문: {question}

규칙:
- 반드시 "이 분석은 참고용이며 투자 조언이 아닙니다"를 마지막에 포함
- 간결하게 핵심만 답변 (200자 이내)
- 확신하지 못하는 내용은 솔직히 모른다고 답변
- 패턴/뉴스 데이터가 있으면 그 결과를 근거로 설명"""

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
                    "max_tokens": 512,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            if resp.status_code != 200:
                return ""
            data = resp.json()
            return data["content"][0]["text"]
    except Exception:
        return ""
