"""
RSS Feed + Naver News Polling Job
- Fetches articles from configured RSS feeds
- Fetches articles from Naver News Search API
- Saves combined raw candidates for later classification by render.py
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

import feedparser
import pytz
from dateutil import parser as dtparser

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from feeds import FEEDS
from src.naver_search import fetch_naver_candidates

KST = pytz.timezone("Asia/Seoul")
MIN_TITLE_LEN = 12


def get_collection_hours():
    """Return 72 on Monday (KST), 48 otherwise."""
    now_kst = datetime.now(KST)
    return 72 if now_kst.weekday() == 0 else 48


def should_drop_item(title: str, summary: str) -> bool:
    """
    Drop rule:
    - summary is completely empty AND title is very short (< 12 chars)
    """
    t = (title or "").strip()
    s = (summary or "").strip()
    return (s == "") and (len(t) < MIN_TITLE_LEN)


def parse_published(entry):
    for key in ["published", "updated", "pubDate"]:
        val = getattr(entry, key, None)
        if val:
            try:
                return dtparser.parse(val)
            except:
                pass
    return None


def within_hours(dt, hours=48):
    if not dt:
        return False
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt >= (now - timedelta(hours=hours))


def fetch_rss_candidates(hours=48):
    """Fetch candidates from RSS feeds"""
    seen = set()
    candidates = []
    errors = []

    print(f"Processing {len(FEEDS)} RSS feeds...")

    for feed_url in FEEDS:
        try:
            d = feedparser.parse(feed_url)
            if d.bozo and not d.entries:
                errors.append(f"Failed to parse: {feed_url}")
                continue

            entries = d.entries[:30]
            feed_title = getattr(d.feed, "title", "") or ""

            for e in entries:
                link = getattr(e, "link", None)
                if not link or link in seen:
                    continue
                seen.add(link)

                published = parse_published(e)
                if not within_hours(published, hours):
                    continue

                title = getattr(e, "title", "").strip()
                summary = getattr(e, "summary", "").strip()

                if should_drop_item(title, summary):
                    continue

                if len(summary) > 500:
                    summary = summary[:500] + "..."

                candidates.append({
                    "title":
                    title,
                    "summary":
                    summary,
                    "link":
                    link,
                    "source":
                    feed_title,
                    "published":
                    published.isoformat() if published else None
                })

            print(f"  RSS: {feed_title or feed_url[:50]}")

        except Exception as ex:
            errors.append(f"Error processing {feed_url}: {str(ex)}")
            continue

    if errors:
        print(f"\nRSS Errors ({len(errors)}):")
        for err in errors[:5]:
            print(f"  - {err}")

    return candidates


def main():
    print(f"\n{'='*60}")
    print(
        f"News Polling Started at {datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S KST')}"
    )
    print(f"{'='*60}\n")

    hours = get_collection_hours()
    print(f"  Collection window: {hours} hours ({'Monday mode' if hours == 72 else 'default'})\n")

    rss_candidates = fetch_rss_candidates(hours=hours)
    print(f"\nRSS: {len(rss_candidates)} candidates collected")

    naver_candidates = []
    try:
        naver_candidates = fetch_naver_candidates(hours=hours)
    except Exception as e:
        print(f"\nNaver search failed (continuing with RSS only): {e}")

    seen_links = set()
    combined = []

    for c in rss_candidates:
        link = c.get("link", "")
        if link and link not in seen_links:
            seen_links.add(link)
            combined.append(c)

    for c in naver_candidates:
        link = c.get("link", "")
        if link and link not in seen_links:
            seen_links.add(link)
            combined.append(c)

    cache_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "cache_candidates.json")
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"Polling Complete: {len(combined)} total candidates saved")
    print(f"  - RSS: {len(rss_candidates)}")
    print(f"  - Naver: {len(naver_candidates)}")
    print(f"  - Combined (deduplicated): {len(combined)}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
