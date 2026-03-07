ALLOWED_SOURCES = {
    "경향신문", "국민일보", "내일신문", "동아일보", "문화일보", "서울신문",
    "세계일보", "아시아투데이", "조선일보", "중앙일보", "한겨레", "한국일보",
    "매일경제", "머니투데이", "서울경제", "아시아경제", "파이낸셜뉴스",
    "한국경제", "헤럴드경제", "이데일리", "KBS", "MBC", "MBN", "SBS", "YTN",
    "뉴시스", "뉴스1", "연합뉴스",
}

# Domain substring -> source name (for whitelist filtering)
_FEED_SOURCE_MAP = {
    "hankyung": "한국경제",
    "mk.co.kr": "매일경제",
    "asiae": "아시아경제",
    "donga": "동아일보",
    "khan": "경향신문",
    "kmib": "국민일보",
    "mbn": "MBN",
    "korea.kr": "대한민국 정부",
    "yna": "연합뉴스",
}

_ALL_FEEDS = [
    "https://www.hankyung.com/feed/economy",
    "https://www.hankyung.com/feed/finance",
    "https://www.hankyung.com/feed/realestate",
    "https://www.hankyung.com/feed/international",
    "https://www.mk.co.kr/rss/30100041/",
    "https://www.mk.co.kr/rss/50200011/",
    "https://www.mk.co.kr/rss/50300009/",
    "https://www.mk.co.kr/rss/30300018/",
    "https://www.asiae.co.kr/rss/economy.htm",
    "https://www.asiae.co.kr/rss/stock.htm",
    "https://www.asiae.co.kr/rss/realestate.htm",
    "https://www.asiae.co.kr/rss/world.htm",
    "https://www.asiae.co.kr/rss/industry-IT.htm",
    "https://rss.donga.com/economy.xml",
    "https://www.khan.co.kr/rss/rssdata/economy_news.xml",
    "https://www.kmib.co.kr/rss/data/kmibEcoRss.xml",
    "https://www.mbn.co.kr/rss/economy/",
    "https://www.korea.kr/rss/pressrelease.xml",
    "https://www.yna.co.kr/rss/economy.xml",
    "https://www.yna.co.kr/rss/market.xml",
]


def _get_feed_source(url: str) -> str:
    for domain, source in _FEED_SOURCE_MAP.items():
        if domain in url:
            return source
    return ""


FEEDS = [url for url in _ALL_FEEDS if _get_feed_source(url) in ALLOWED_SOURCES]
