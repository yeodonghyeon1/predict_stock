import time
import re
from urllib.parse import quote

import feedparser
import httpx
from bs4 import BeautifulSoup
from cachetools import TTLCache

_cache = TTLCache(maxsize=100, ttl=300)

_client = httpx.AsyncClient(
    timeout=10.0,
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
)


def _is_korean_query(query: str) -> bool:
    return bool(re.search(r"[\uac00-\ud7af]", query))


async def fetch_google_news(query: str, max_items: int = 10) -> list[dict]:
    cache_key = f"google:{query}"
    if cache_key in _cache:
        return _cache[cache_key]

    encoded = quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}+stock&hl=en-US&gl=US&ceid=US:en"

    try:
        resp = await _client.get(url)
        feed = feedparser.parse(resp.text)
        articles = []
        for entry in feed.entries[:max_items]:
            articles.append({
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "source": entry.get("source", {}).get("title", "Unknown"),
                "published": entry.get("published", ""),
            })
        _cache[cache_key] = articles
        return articles
    except Exception:
        return []


async def fetch_naver_news(query: str, max_items: int = 10) -> list[dict]:
    cache_key = f"naver:{query}"
    if cache_key in _cache:
        return _cache[cache_key]

    encoded = quote(query)
    url = f"https://search.naver.com/search.naver?where=news&query={encoded}+주식&sort=1"

    try:
        resp = await _client.get(url)
        soup = BeautifulSoup(resp.text, "html.parser")
        articles = []

        news_items = soup.select(".news_tit")
        for item in news_items[:max_items]:
            title = item.get_text(strip=True)
            link = item.get("href", "")
            articles.append({
                "title": title,
                "link": link,
                "source": "Naver News",
                "published": "",
            })

        _cache[cache_key] = articles
        return articles
    except Exception:
        return []


async def translate_to_english(text: str) -> str:
    try:
        from googletrans import Translator
        translator = Translator()
        result = translator.translate(text, dest="en")
        return result.text
    except Exception:
        return text


async def fetch_news_for_stock(query: str, max_items: int = 15) -> list[dict]:
    is_korean = _is_korean_query(query)

    if is_korean:
        articles = await fetch_naver_news(query, max_items)
        for article in articles:
            article["title_en"] = await translate_to_english(article["title"])
            article["title_original"] = article["title"]
    else:
        articles = await fetch_google_news(query, max_items)
        for article in articles:
            article["title_en"] = article["title"]
            article["title_original"] = article["title"]

    return articles
