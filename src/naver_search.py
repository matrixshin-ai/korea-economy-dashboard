"""
Naver News Search API Client
- General-purpose economic news search
- Uses same candidate format as RSS feeds
"""
import os
import urllib.request
import urllib.parse
import json
import re
from datetime import datetime, timedelta, timezone
from html import unescape

from feeds import ALLOWED_SOURCES

KST = timezone(timedelta(hours=9))


def get_collection_hours():
    """Return 72 on Monday (KST), 48 otherwise."""
    now_kst = datetime.now(KST)
    return 72 if now_kst.weekday() == 0 else 48


NAVER_SEARCH_QUERIES = [
    "경제",
    "금리",
    "환율",
    "부동산",
    "반도체",
    "FOMC",
    "한국은행",
    "기획재정부",
    "GDP",
    "수출",
    "수입",
    "무역",
    "코스피",
    "채권",
    "인플레이션",
    "고용",
    "실업률",
    "전기차",
    "배터리",
    "조선",
]


def clean_html(text: str) -> str:
    """Remove HTML tags and unescape entities"""
    text = re.sub(r'<[^>]+>', '', text)
    text = unescape(text)
    return text.strip()


def extract_source(link: str) -> str:
    """Extract source name from link"""
    if "hankyung" in link:
        return "한국경제"
    elif "mk.co.kr" in link:
        return "매일경제"
    elif "asiae" in link:
        return "아시아경제"
    elif "donga" in link:
        return "동아일보"
    elif "khan" in link:
        return "경향신문"
    elif "kmib" in link:
        return "국민일보"
    elif "yna" in link:
        return "연합뉴스"
    elif "chosun" in link:
        return "조선일보"
    elif "joongang" in link:
        return "중앙일보"
    elif "sedaily" in link:
        return "서울경제"
    elif "mt.co.kr" in link:
        return "머니투데이"
    elif "edaily" in link:
        return "이데일리"
    elif "fnnews" in link:
        return "파이낸셜뉴스"
    elif "heraldcorp" in link:
        return "헤럴드경제"
    elif "mbn" in link:
        return "MBN"
    elif "sbs" in link:
        return "SBS"
    elif "kbs" in link:
        return "KBS"
    elif "ytn" in link:
        return "YTN"
    else:
        return "네이버뉴스"


def parse_naver_date(date_str: str) -> datetime:
    """Parse Naver pubDate format: 'Wed, 22 Jan 2025 10:30:00 +0900'"""
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(date_str)
    except Exception:
        return datetime.now(timezone.utc)


def search_news(query: str, display: int = 100, sort: str = "date") -> list:
    """Search news using Naver API"""
    client_id = os.environ.get("NAVER_CLIENT_ID", "")
    client_secret = os.environ.get("NAVER_CLIENT_SECRET", "")
    
    if not client_id or not client_secret:
        return []
    
    encoded_query = urllib.parse.quote(query)
    url = f"https://openapi.naver.com/v1/search/news.json?query={encoded_query}&display={display}&sort={sort}"
    
    request = urllib.request.Request(url)
    request.add_header("X-Naver-Client-Id", client_id)
    request.add_header("X-Naver-Client-Secret", client_secret)
    
    try:
        response = urllib.request.urlopen(request, timeout=10)
        response_body = response.read().decode("utf-8")
        data = json.loads(response_body)
        return data.get("items", [])
    except Exception as e:
        print(f"  Naver search error for '{query}': {e}")
        return []


def fetch_naver_candidates(hours: int = 48) -> list:
    """
    Fetch news candidates from Naver Search API
    Returns list in same format as RSS candidates:
    [{title, summary, link, source, published}]
    """
    client_id = os.environ.get("NAVER_CLIENT_ID", "")
    client_secret = os.environ.get("NAVER_CLIENT_SECRET", "")
    
    if not client_id or not client_secret:
        print("  Naver API credentials not configured - skipping Naver search")
        return []
    
    seen_links = set()
    candidates = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    print(f"  Searching Naver with {len(NAVER_SEARCH_QUERIES)} queries...")
    
    for query in NAVER_SEARCH_QUERIES:
        try:
            items = search_news(query, display=100, sort="date")
            
            for item in items:
                original_link = item.get("originallink", "")
                naver_link = item.get("link", "")
                link = original_link if original_link else naver_link
                
                if not link or link in seen_links:
                    continue
                seen_links.add(link)
                
                pub_date = parse_naver_date(item.get("pubDate", ""))
                if pub_date.tzinfo is None:
                    pub_date = pub_date.replace(tzinfo=timezone.utc)
                
                if pub_date < cutoff:
                    continue
                
                title = clean_html(item.get("title", ""))
                summary = clean_html(item.get("description", ""))
                if len(summary) > 500:
                    summary = summary[:500] + "..."
                
                source = extract_source(link)

                if source not in ALLOWED_SOURCES:
                    continue

                candidates.append({
                    "title": title,
                    "summary": summary,
                    "link": link,
                    "source": source,
                    "published": pub_date.isoformat()
                })
                
        except Exception as e:
            print(f"  Error searching '{query}': {e}")
            continue
    
    print(f"  Naver: collected {len(candidates)} unique candidates")
    return candidates


if __name__ == "__main__":
    hours = get_collection_hours()
    results = fetch_naver_candidates(hours=hours)
    print(f"\nTotal candidates: {len(results)}")
    for r in results[:5]:
        print(f"  - {r['source']}: {r['title'][:50]}...")
