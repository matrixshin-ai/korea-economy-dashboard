"""
Raindrop Bookmark Fetcher
- Fetches bookmarks from Raindrop collection 70314520
- Filters to last 24 hours (KST)
- Generates Korean summary via Claude API
- Saves to jobs/data/raindrop_headlines.json
"""
import json
import os
import sys
import time
from datetime import datetime, timezone, timedelta

import requests

KST = timezone(timedelta(hours=9))
COLLECTION_ID = "70314520"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _is_retryable(status_code: int) -> bool:
    return status_code in (401, 429) or status_code >= 500


def fetch_raindrops(token: str, max_retries: int = 3) -> list:
    """Fetch bookmarks with exponential backoff retry for transient errors."""
    url = f"https://api.raindrop.io/rest/v1/raindrops/{COLLECTION_ID}"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"perpage": 50, "sort": "-created"}

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json().get("items", [])
        except requests.HTTPError as e:
            status = e.response.status_code if e.response is not None else 0
            if attempt < max_retries and _is_retryable(status):
                wait = 5 * (2 ** (attempt - 1))  # 5s, 10s, 20s
                print(f"  Raindrop API error (attempt {attempt}/{max_retries}): {e}")
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise


def filter_recent_24h(items: list) -> list:
    now_kst = datetime.now(KST)
    cutoff = now_kst - timedelta(hours=24)
    result = []
    for item in items:
        created_str = item.get("created", "")
        if not created_str:
            continue
        try:
            created_utc = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            created_kst = created_utc.astimezone(KST)
        except (ValueError, TypeError):
            continue
        if created_kst >= cutoff:
            result.append({
                "title": item.get("title", "").strip(),
                "link": item.get("link", ""),
                "created": created_kst.isoformat(),
            })
    return result


def generate_summary(items: list) -> str:
    """Generate Korean summary of bookmarks using Claude API."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set, skipping summary generation")
        return ""

    try:
        import anthropic
    except ImportError:
        print("anthropic package not available, skipping summary")
        return ""

    titles_text = "\n".join(
        f"- {item['title']} ({item['link']})" for item in items
    )

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": (
                "다음은 오늘 수집된 한국 경제 관련 북마크 목록입니다.\n"
                "핵심 이슈를 3~5문장의 한국어로 간결하게 요약해 주세요.\n"
                "각 이슈를 나열하는 방식이 아니라, 오늘의 경제 흐름을 종합적으로 서술해 주세요.\n\n"
                f"{titles_text}"
            ),
        }],
    )
    return msg.content[0].text.strip()


def main():
    token = os.environ.get("RAINDROP_TOKEN")
    if not token:
        print("RAINDROP_TOKEN not set — skipping Raindrop fetch")
        sys.exit(0)

    print("Fetching Raindrop bookmarks...")
    try:
        all_items = fetch_raindrops(token)
    except requests.HTTPError as e:
        print(f"Raindrop API error: {e}")
        sys.exit(1)

    print(f"Total bookmarks fetched: {len(all_items)}")

    recent = filter_recent_24h(all_items)
    print(f"Within last 24h (KST): {len(recent)} items")
    for item in recent:
        print(f"  [{item['created'][:16]}] {item['title'][:70]}")

    summary = ""
    if recent:
        print("Generating Korean summary via Claude API...")
        summary = generate_summary(recent)
        if summary:
            print(f"Summary: {summary[:120]}...")

    output = {
        "generated_at": datetime.now(KST).isoformat(),
        "count": len(recent),
        "summary": summary,
        "items": recent,
    }

    out_path = os.path.join(BASE_DIR, "jobs", "data", "raindrop_headlines.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Saved → {out_path}")


if __name__ == "__main__":
    main()
