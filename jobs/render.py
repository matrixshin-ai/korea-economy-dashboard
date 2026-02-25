
"""
Daily Briefing Renderer
- Classifies news into categories (rules loaded from keyword_rules.json)
- Applies negative keyword filtering (scoring.classify_item)
- Applies quality filtering (empty/short, summary too short, summary==title)
- Loads OCR-matched headlines from jobs/data/ocr_headlines.json
- Outputs daily briefing JSON (latest_briefing.json)
"""
import json
import os
import sys
from datetime import datetime
from collections import defaultdict

import pytz

# ---------------------------------------------------------------------------
# Constants (tunable)
# ---------------------------------------------------------------------------
KST = pytz.timezone("Asia/Seoul")

OTHERS_CATEGORY = "기타"

MIN_TITLE_LEN = 12          # for (empty summary + short title) drop
MIN_SUMMARY_LEN = 30        # drop if summary length < this
DROP_IF_SUMMARY_EQUALS_TITLE = True

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

# ---------------------------------------------------------------------------
# Imports from project modules
# ---------------------------------------------------------------------------
from scoring import (  # noqa: E402
    classify_item,
    media_rank,
    get_cluster_representative,
    calculate_cluster_score,
)

from src.keyword_rules import load_rules  # noqa: E402

HAS_DEDUP = False
deduplicate_articles = None
try:
    from src.dedup import deduplicate_articles  # noqa: F401
    HAS_DEDUP = True
except ImportError:
    pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _safe_strip(x) -> str:
    return (x or "").strip()


def get_effective_summary(item: dict) -> str:
    """
    Summary policy:
    - Use summary if present, else description, else "".
    - IMPORTANT: Do NOT fall back to title (to avoid summary==title artifacts).
    """
    return _safe_strip(item.get("summary")) or _safe_strip(item.get("description"))


def should_drop_quality(title: str, summary: str) -> bool:
    """
    Quality drop rules:
    1) summary empty AND title very short -> drop
    2) summary too short (< MIN_SUMMARY_LEN) -> drop
    3) summary equals title -> drop (optional)
    """
    t = _safe_strip(title)
    s = _safe_strip(summary)

    # Rule 1
    if (s == "") and (len(t) < MIN_TITLE_LEN):
        return True

    # Rule 2
    if len(s) < MIN_SUMMARY_LEN:
        return True

    # Rule 3
    if DROP_IF_SUMMARY_EQUALS_TITLE and t and (s == t):
        return True

    return False


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
def load_ocr_headlines() -> list:
    """Load OCR-matched headlines from jobs/data/ocr_headlines.json."""
    headlines_path = os.path.join(BASE_DIR, "jobs", "data", "ocr_headlines.json")
    try:
        with open(headlines_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("articles", [])
    except FileNotFoundError:
        print("OCR headlines file not found, headlines will be empty")
        return []


def load_all_items() -> list:
    """
    Load items from combined candidates.
    Current implementation reads BASE_DIR/cache_candidates.json
    (poll.py writes this in the current project).
    """
    items = []
    cache_path = os.path.join(BASE_DIR, "cache_candidates.json")
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            rss_items = json.load(f)
            for item in rss_items:
                item["_source_type"] = item.get("_source_type") or "rss"
            items.extend(rss_items)
    except FileNotFoundError:
        pass

    return items


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------
def classify_all_items(items: list):
    """
    Classify all items and filter out dropped ones.
    Returns:
      classified: dict(category -> list[items])
      stats: dict
    """
    classified = defaultdict(list)

    stats = {
        "total_input_raw": len(items),
        "total_input_used": 0,
        "dropped_quality": 0,
        "dropped_negative": 0,
        "classified": defaultdict(int),
    }

    for item in items:
        title = _safe_strip(item.get("title"))
        summary = get_effective_summary(item)

        # Quality filter BEFORE scoring/classification
        if should_drop_quality(title, summary):
            stats["dropped_quality"] += 1
            continue

        source = _safe_strip(item.get("source")) or _safe_strip(item.get("source_name"))

        # scoring.classify_item handles negative keywords and section scoring
        result = classify_item(title, summary, source)

        if result.get("dropped"):
            stats["dropped_negative"] += 1
            continue

        category = result.get("category") or OTHERS_CATEGORY
        item["_category"] = category
        item["score"] = result.get("score", 0)
        item["_negative_count"] = result.get("negative_count", 0)

        # Keep normalized fields for downstream consistency
        item["title"] = title
        item["summary"] = summary
        item["source"] = source

        classified[category].append(item)
        stats["classified"][category] += 1
        stats["total_input_used"] += 1

    return classified, stats


# ---------------------------------------------------------------------------
# Clustering (simple)
# ---------------------------------------------------------------------------
def _title_similarity(t1: str, t2: str) -> float:
    """Simple Jaccard similarity for titles."""
    t1 = _safe_strip(t1)
    t2 = _safe_strip(t2)
    if not t1 or not t2:
        return 0.0
    words1 = set(t1.split())
    words2 = set(t2.split())
    if not words1 or not words2:
        return 0.0
    intersection = len(words1 & words2)
    union = len(words1 | words2)
    return (intersection / union) if union > 0 else 0.0


def simple_cluster(items: list) -> list:
    """
    If src.dedup exists, use it for a first-pass dedup and attach near-duplicates.
    Otherwise, basic title Jaccard clustering.
    Returns: list[cluster], each cluster is list[items].
    """
    if not items:
        return []

    # If dedup module exists, use it to reduce duplicates strongly
    if HAS_DEDUP and deduplicate_articles is not None:
        try:
            unique_items = deduplicate_articles(items)
            clusters = [[item] for item in unique_items]

            unique_links = {item.get("link") for item in unique_items}
            for item in items:
                if item.get("link") in unique_links:
                    continue

                best_cluster = None
                best_sim = 0.0
                for cluster in clusters:
                    rep = cluster[0]
                    sim = _title_similarity(item.get("title", ""), rep.get("title", ""))
                    if sim > best_sim:
                        best_sim = sim
                        best_cluster = cluster

                if best_cluster and best_sim >= 0.3:
                    best_cluster.append(item)

            return clusters
        except Exception:
            # Fall back to naive clustering
            pass

    clusters = []
    for item in items:
        placed = False
        for cluster in clusters:
            rep = cluster[0]
            if _title_similarity(item.get("title", ""), rep.get("title", "")) > 0.5:
                cluster.append(item)
                placed = True
                break
        if not placed:
            clusters.append([item])

    return clusters


def get_top5_clusters(classified_items: dict) -> list:
    """
    Generate Top 5 clusters from all classified items excluding '기타'.
    Returns list of dicts with representative, score, size, category.
    """
    all_items = []
    for category, items in classified_items.items():
        if category != OTHERS_CATEGORY:
            all_items.extend(items)

    clusters = simple_cluster(all_items)

    cluster_info = []
    for cluster in clusters:
        rep = get_cluster_representative(cluster)
        if not rep:
            continue
        score = calculate_cluster_score(cluster)
        cluster_info.append(
            {
                "representative": rep,
                "score": score,
                "size": len(cluster),
                "category": rep.get("_category", OTHERS_CATEGORY),
            }
        )

    cluster_info.sort(key=lambda x: -x["score"])
    return cluster_info[:5]


# ---------------------------------------------------------------------------
# Quota selection (fill-by-next-candidate behavior)
# ---------------------------------------------------------------------------
def select_by_quota_filtered(items: list, quota: int) -> list:
    """
    Select up to 'quota' after sorting by:
      1) score desc
      2) media priority (lower is better)
    Since items are already quality-filtered upstream, this naturally "fills"
    quotas using the next best candidates.
    """
    if quota <= 0:
        return []

    sorted_items = sorted(
        items,
        key=lambda x: (-x.get("score", 0), media_rank(x.get("source", ""))),
    )
    return sorted_items[:quota]


# ---------------------------------------------------------------------------
# Top 5 diverse headline selection
# ---------------------------------------------------------------------------
def select_top5_diverse(headlines: list, threshold: int = 60) -> list:
    """
    Select up to 5 diverse headlines by scanning in order and skipping
    any headline whose title has token_set_ratio >= threshold with
    an already-selected headline.
    """
    from rapidfuzz import fuzz

    selected = []
    for item in headlines:
        title = _safe_strip(item.get("title"))
        if not title:
            continue

        is_dup = False
        for chosen in selected:
            if fuzz.token_set_ratio(title, chosen.get("title", "")) >= threshold:
                is_dup = True
                break

        if not is_dup:
            selected.append(item)
            if len(selected) >= 5:
                break

    return selected


# ---------------------------------------------------------------------------
# Output builder
# ---------------------------------------------------------------------------
def build_daily_output(classified_items: dict, ocr_headlines: list, stats: dict) -> dict:
    now_kst = datetime.now(KST)

    # Load rules ONCE (important)
    RULES = load_rules()
    CATEGORY_NAMES = list(RULES.keys())
    if OTHERS_CATEGORY not in CATEGORY_NAMES:
        CATEGORY_NAMES.append(OTHERS_CATEGORY)

    output = {
        "generated_at": now_kst.isoformat(),
        "date": now_kst.strftime("%Y-%m-%d"),
        "market_tape_label": "D-1 (전일 종가)",
        "stats": {
            # keep legacy-ish keys + add richer stats
            "total_input": stats.get("total_input_raw", 0),
            "total_used": stats.get("total_input_used", 0),
            "dropped_quality": stats.get("dropped_quality", 0),
            "dropped_negative": stats.get("dropped_negative", 0),
            "per_category": dict(stats.get("classified", {})),
        },
        "headlines": [],
        "sections": {},
    }

    # OCR-matched headlines
    if ocr_headlines:
        # New OCR data available → use it
        for item in ocr_headlines:
            output["headlines"].append(
                {
                    "title": item.get("title", ""),
                    "summary": item.get("summary", ""),
                    "link": item.get("url", ""),
                    "source": "석간",
                    "published": item.get("published", ""),
                    "score": item.get("score", 0),
                    "match_status": item.get("status", ""),
                }
            )
    else:
        # No OCR data (e.g. morning run before 15:30) → preserve previous headlines
        briefing_path = os.path.join(BASE_DIR, "latest_briefing.json")
        try:
            with open(briefing_path, "r", encoding="utf-8") as f:
                prev = json.load(f)
                output["headlines"] = prev.get("headlines", [])
                print("OCR headlines empty → preserved previous headlines "
                      f"({len(output['headlines'])} items)")
        except (FileNotFoundError, json.JSONDecodeError):
            print("OCR headlines empty & no previous briefing → headlines will be empty")

    # Top 5 diverse headlines
    output["top5_headlines"] = select_top5_diverse(output["headlines"])

    # Sections
    for category in CATEGORY_NAMES:
        items = classified_items.get(category, [])

        quota = RULES.get(category, {}).get("quota", 10)
        selected = select_by_quota_filtered(items, quota)

        output["sections"][category] = []
        for item in selected:
            output["sections"][category].append(
                {
                    "title": _safe_strip(item.get("title")),
                    "summary": get_effective_summary(item),
                    "link": item.get("link", ""),
                    "source": _safe_strip(item.get("source")) or _safe_strip(item.get("source_name")),
                    "published": item.get("published"),
                    "score": item.get("score", 0),
                }
            )

    return output


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("Daily Briefing Renderer")
    print("=" * 60)

    items = load_all_items()
    count_before_dedupe = len(items)
    print(f"Loaded {count_before_dedupe} total items")

    if not items:
        print("No items found. Run poll.py first.")
        return

    if HAS_DEDUP and deduplicate_articles:
        items = deduplicate_articles(items)
        count_after_dedupe = len(items)
        removed = count_before_dedupe - count_after_dedupe
        print(f"Dedupe: {count_before_dedupe} -> {count_after_dedupe} (removed {removed} duplicates)")
    else:
        print("Dedupe: skipped (module not available)")

    classified, stats = classify_all_items(items)

    print(f"\nClassification Results:")
    print(f"  Total input (raw): {stats['total_input_raw']}")
    print(f"  Total used (after quality filter): {stats['total_input_used']}")
    print(f"  Dropped (quality): {stats['dropped_quality']}")
    print(f"  Dropped (negative-only): {stats['dropped_negative']}")

    print(f"  Classified by category:")
    for cat, count in sorted(stats["classified"].items()):
        print(f"    {cat}: {count}")

    ocr_headlines = load_ocr_headlines()
    print(f"\nOCR Headlines: {len(ocr_headlines)} articles")
    for i, item in enumerate(ocr_headlines, 1):
        title = item.get("title", "")
        status = item.get("status", "")
        print(f"  {i}. [{status}] {title[:60]}")

    output = build_daily_output(classified, ocr_headlines, stats)

    briefing_path = os.path.join(BASE_DIR, "latest_briefing.json")
    with open(briefing_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    now_kst = datetime.now(KST)
    print(f"\n{'=' * 60}")
    print(f"Daily briefing generated: {now_kst.strftime('%Y-%m-%d %H:%M:%S KST')}")
    print(f"Output: {briefing_path}")

    # Quota report
    RULES = load_rules()
    CATEGORY_NAMES = list(RULES.keys())
    if OTHERS_CATEGORY not in CATEGORY_NAMES:
        CATEGORY_NAMES.append(OTHERS_CATEGORY)

    total_articles = sum(len(output["sections"].get(s, [])) for s in output["sections"])
    print(f"Total articles selected: {total_articles}")
    for section in CATEGORY_NAMES:
        quota = RULES.get(section, {}).get("quota", 10)
        count = len(output["sections"].get(section, []))
        print(f"  {section}: {count}/{quota}")


if __name__ == "__main__":
    main()
