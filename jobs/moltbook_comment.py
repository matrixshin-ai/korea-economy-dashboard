"""
Moltbook Submolt Comment Bot
- Searches Moltbook for AI × economy crossover posts
- Generates insightful comments using Claude API (Haiku)
- Posts one comment per day with Korean economic data context
"""
import argparse
import json
import operator
import os
import re
import sys
from datetime import datetime, timezone

import anthropic
import requests

# Ensure stdout can handle unicode (Windows cp949 workaround)
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HISTORY_PATH = os.path.join(BASE_DIR, "jobs", "data", "moltbook_history.json")
BRIEFING_PATH = os.path.join(BASE_DIR, "latest_briefing.json")
INDICATORS_PATH = os.path.join(BASE_DIR, "latest_indicators.json")

MOLTBOOK_API_BASE = "https://www.moltbook.com/api/v1"

SEARCH_QUERIES = [
    "AI agents economic growth",
    "artificial intelligence inflation impact",
    "AI automation labor market economy",
    "machine learning monetary policy",
    "generative AI productivity growth",
]

COMMENT_PROMPT_TEMPLATE = """You are a knowledgeable economic analyst who participates in online discussions about AI and the economy. Write a thoughtful comment on the following post, incorporating real Korean economic data.

Post title: {post_title}
Post content: {post_content}

Current Korean economic context:
{economic_context}

Requirements:
- 150-250 words, English, conversational but informed tone
- Reference specific data points from the Korean economic context above (e.g. KOSPI level, KRW/USD rate, interest rates)
- Analyze the intersection between the post's topic and Korean economic data
- Be insightful and add value to the discussion — don't just restate the post
- Do NOT use markdown formatting (no **, no ##, no bullet points)
- End with: "— Data sourced from Korea Economy Dashboard"
- Return ONLY the comment text, nothing else"""


def load_history() -> dict:
    """Load comment history from JSON file."""
    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {
        "commented_posts": [],
        "last_run": None,
        "stats": {"total_comments": 0, "total_failures": 0, "total_no_posts": 0},
    }


def save_history(history: dict):
    """Save comment history, keeping only the last 90 entries."""
    history["commented_posts"] = history["commented_posts"][-90:]
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def search_moltbook(api_key: str, query: str) -> list:
    """Search Moltbook for posts matching query."""
    url = f"{MOLTBOOK_API_BASE}/search"
    params = {
        "q": query,
        "type": "posts",
        "limit": 20,
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    resp = requests.get(url, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    # Filter to actual posts only (type == "post")
    results = data.get("results", [])
    return [r for r in results if r.get("type") == "post"]


def pick_best_post(results: list, already_commented: set) -> dict | None:
    """Pick the first post not already commented on."""
    for post in results:
        post_id = str(post.get("post_id") or post.get("id", ""))
        if post_id and post_id not in already_commented:
            return post
    return None


def build_economic_context() -> str:
    """Extract key economic data from dashboard files."""
    lines = []

    # Indicators
    if os.path.exists(INDICATORS_PATH):
        try:
            with open(INDICATORS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            lines.append(f"Data as of: {data.get('updated_at', 'unknown')}")
            for ind in data.get("indicators", []):
                name = ind.get("name", "")
                value = ind.get("value", "")
                change = ind.get("change")
                change_str = f" ({change:+.2f}%)" if change is not None else ""
                lines.append(f"- {name}: {value}{change_str}")
        except (json.JSONDecodeError, IOError) as e:
            print(f"  Warning: could not read indicators: {e}")

    # Briefing headlines
    if os.path.exists(BRIEFING_PATH):
        try:
            with open(BRIEFING_PATH, "r", encoding="utf-8") as f:
                briefing = json.load(f)
            headlines = briefing.get("headlines", [])[:3]
            if headlines:
                lines.append("\nTop headlines today:")
                for h in headlines:
                    lines.append(f"- {h.get('title', '')}")
        except (json.JSONDecodeError, IOError) as e:
            print(f"  Warning: could not read briefing: {e}")

    return "\n".join(lines) if lines else "No economic data available today."


def generate_comment(client: anthropic.Anthropic, post_title: str, post_content: str, context: str) -> str:
    """Generate a comment using Claude API."""
    prompt = COMMENT_PROMPT_TEMPLATE.format(
        post_title=post_title,
        post_content=post_content[:2000],
        economic_context=context,
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


_OPS = {"+": operator.add, "-": operator.sub, "*": operator.mul, "x": operator.mul}


def _solve_challenge(text: str) -> int | None:
    """Solve arithmetic challenge like 'What is 12 + 34?'"""
    m = re.search(r"(\d+)\s*([+\-*x])\s*(\d+)", text)
    if not m:
        return None
    return _OPS.get(m.group(2), operator.add)(int(m.group(1)), int(m.group(3)))


def _verify_challenge(api_key: str, challenge: dict):
    """Auto-solve and submit verification challenge."""
    if not challenge:
        return
    answer = _solve_challenge(challenge.get("text", ""))
    if answer is None:
        print(f"  WARNING: Could not parse challenge: {challenge.get('text')}")
        return
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        f"{MOLTBOOK_API_BASE}/verify",
        headers=headers,
        json={"challenge_id": challenge["id"], "answer": answer},
        timeout=30,
    )
    data = resp.json()
    if data.get("success"):
        print(f"  Verification OK (answer={answer})")
    else:
        print(f"  Verification FAILED: {data}")


def _sanitize(text: str) -> str:
    """Replace Unicode chars that Moltbook converts to '?'."""
    for old, new in {
        "\u2014": "--", "\u2013": "-", "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"', "\u2022": "-", "\u2026": "...",
    }.items():
        text = text.replace(old, new)
    return text


def post_comment(api_key: str, post_id: str, content: str) -> dict:
    """Post a comment to a Moltbook post and auto-verify."""
    url = f"{MOLTBOOK_API_BASE}/posts/{post_id}/comments"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        url, json={"content": _sanitize(content)}, headers=headers, timeout=30,
    )
    if resp.status_code == 429:
        print("ERROR: Rate limited by Moltbook API (429)")
        sys.exit(0)
    resp.raise_for_status()
    data = resp.json()
    _verify_challenge(api_key, data.get("challenge"))
    return data


def main():
    parser = argparse.ArgumentParser(description="Post Moltbook comments with economic data")
    parser.add_argument("--dry-run", action="store_true", help="Search and generate only, don't post")
    args = parser.parse_args()

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    moltbook_key = os.environ.get("MOLTBOOK_API_KEY", "")

    if not anthropic_key:
        print("ANTHROPIC_API_KEY not set -- skipping Moltbook comment")
        return

    if not moltbook_key and not args.dry_run:
        print("MOLTBOOK_API_KEY not set -- skipping Moltbook comment")
        return

    history = load_history()
    history["last_run"] = datetime.now(timezone.utc).isoformat()

    already_commented = {str(e["post_id"]) for e in history["commented_posts"]}

    # Search for a suitable post
    chosen_post = None
    query_used = None

    for query in SEARCH_QUERIES:
        print(f"Searching: {query}")
        try:
            results = search_moltbook(moltbook_key or "dry-run", query)
            print(f"  Found {len(results)} results")
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                print("ERROR: Rate limited by Moltbook API (429)")
                save_history(history)
                return
            print(f"  Search error: {e}")
            continue
        except requests.exceptions.RequestException as e:
            print(f"  Search error: {e}")
            continue

        chosen_post = pick_best_post(results, already_commented)
        if chosen_post:
            query_used = query
            break

    if not chosen_post:
        print("No suitable posts found across all queries")
        history["stats"]["total_no_posts"] += 1
        save_history(history)
        return

    post_id = str(chosen_post.get("post_id") or chosen_post.get("id", ""))
    post_title = chosen_post.get("title", "Untitled")
    post_content = chosen_post.get("content", chosen_post.get("body", ""))
    print(f"\nSelected post: [{post_id}] {post_title}")

    # Build economic context
    context = build_economic_context()
    print(f"Economic context: {len(context)} chars")

    # Generate comment
    print("Generating comment with Gemini...")
    try:
        claude_client = anthropic.Anthropic(api_key=anthropic_key)
        comment = generate_comment(claude_client, post_title, post_content, context)
    except Exception as e:
        print(f"ERROR generating comment: {e}")
        history["stats"]["total_failures"] += 1
        history["commented_posts"].append({
            "post_id": post_id,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "query_used": query_used,
            "post_title": post_title,
            "comment_preview": f"GENERATION FAILED: {e}",
            "success": False,
        })
        save_history(history)
        return

    safe_comment = _sanitize(comment)
    print(f"Generated comment ({len(comment)} chars):")
    print(f"  {safe_comment[:200]}...")

    if args.dry_run:
        print("\n[DRY RUN] Full comment:")
        print(safe_comment)
        print("\n[DRY RUN] Skipping actual post")
        save_history(history)
        return

    # Post comment
    print("Posting comment...")
    try:
        result = post_comment(moltbook_key, post_id, comment)
        comment_id = result.get("comment", {}).get("id", "unknown")
        print(f"Comment posted successfully (id={comment_id})")
        history["stats"]["total_comments"] += 1
        history["commented_posts"].append({
            "post_id": post_id,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "query_used": query_used,
            "post_title": post_title,
            "comment_preview": comment[:100],
            "success": True,
        })
    except Exception as e:
        print(f"ERROR posting comment: {e}")
        history["stats"]["total_failures"] += 1
        history["commented_posts"].append({
            "post_id": post_id,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "query_used": query_used,
            "post_title": post_title,
            "comment_preview": f"POST FAILED: {e}",
            "success": False,
        })

    save_history(history)
    print("Done.")


if __name__ == "__main__":
    main()
