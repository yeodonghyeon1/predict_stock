from pydantic import BaseModel


class SentimentRequest(BaseModel):
    text: str


class StockRequest(BaseModel):
    query: str


class ChartPattern(BaseModel):
    pattern: str
    confidence: float
    signal: str


class AskRequest(BaseModel):
    query: str = ""
    question: str
    chart_patterns: list[ChartPattern] | None = None


class SentimentResult(BaseModel):
    sentiment: str
    confidence: float
    scores: dict[str, float]
    signal: str
    signal_ko: str
    icon: str


class NewsItem(BaseModel):
    title: str
    title_en: str
    title_original: str
    link: str
    source: str
    published: str
    sentiment: SentimentResult | None = None
