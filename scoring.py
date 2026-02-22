"""
News Scoring and Classification Module (JSON rules)
- Manual weight keyword scoring (from keyword_rules.json)
- Negative keyword filtering
- Multi-category classification
- Quota selection + clustering support
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple, Optional

# =============================================================================
# CONSTANTS (TUNABLE)
# =============================================================================

TITLE_BASE = 10  # Base score multiplier for keyword match in title
BODY_BASE = 4  # Base score multiplier for keyword match in body/summary
MIN_SCORE_THRESHOLD = 25  # Minimum score to avoid "기타" category
NEGATIVE_PENALTY = 15  # Penalty per negative keyword match

# =============================================================================
# NEGATIVE KEYWORDS (Apply to ALL categories)
# =============================================================================

_DEFAULT_NEGATIVE_KEYWORDS = [
    "연예", "스포츠", "날씨", "사건사고", "교통", "지역행사", "주말나들이", "맛집", "여행", "축제", "공연",
    "영화", "드라마", "아이돌", "결혼", "이혼", "폭행", "살인", "화재", "사고", "실종"
]

_NEGATIVE_CACHE: Optional[List[str]] = None


def _load_negative_keywords() -> List[str]:
    """Load negative keywords: DB first, fallback to defaults."""
    global _NEGATIVE_CACHE
    if _NEGATIVE_CACHE is not None:
        return _NEGATIVE_CACHE
    from src.keyword_rules import load_negative_keywords
    db_negatives = load_negative_keywords()
    _NEGATIVE_CACHE = db_negatives if db_negatives else _DEFAULT_NEGATIVE_KEYWORDS
    return _NEGATIVE_CACHE


NEGATIVE_KEYWORDS = _DEFAULT_NEGATIVE_KEYWORDS  # kept for backward compat

# =============================================================================
# CATEGORY
# =============================================================================

OTHERS_CATEGORY = "기타"

# =============================================================================
# RULES LOADING (from JSON)
# =============================================================================

_RULES_CACHE: Optional[Dict[str, Dict[str, Any]]] = None


def _load_rules_cached() -> Dict[str, Dict[str, Any]]:
    """
    Load rules once and cache in memory.
    Expects: src/keyword_rules.py exists and reads keyword_rules.json
    """
    global _RULES_CACHE
    if _RULES_CACHE is not None:
        return _RULES_CACHE

    # NOTE: Your project already has src/keyword_rules.py
    #       which defines load_rules() reading keyword_rules.json
    from src.keyword_rules import load_rules

    raw = load_rules()  # expected dict: {section_name: {...}, ...}
    if not isinstance(raw, dict) or not raw:
        raise ValueError(
            "Rules loaded but invalid/empty. Check keyword_rules.json structure."
        )

    _RULES_CACHE = _normalize_rules(raw)
    return _RULES_CACHE


def _normalize_rules(raw: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Be tolerant to JSON formats.
    Supported keyword formats per section:
      1) ["GDP", "성장률", ...]                   -> weight defaults to 1
      2) [{"keyword":"GDP","weight":5}, ...]
      3) [{"kw":"GDP","w":5}, ...]
      4) [{"text":"GDP","weight_manual":5}, ...]
    Quota:
      - rule["quota"] or default 5
    """
    normalized: Dict[str, Dict[str, Any]] = {}

    for section, rule in raw.items():
        if not isinstance(rule, dict):
            continue

        quota = rule.get("quota", 5)
        try:
            quota = int(quota)
        except Exception:
            quota = 5

        kws = rule.get("keywords", [])
        kw_pairs: List[Tuple[str, int]] = []

        if isinstance(kws, list):
            for item in kws:
                if isinstance(item, str):
                    kw = item.strip()
                    if kw:
                        kw_pairs.append((kw, 1))
                elif isinstance(item, dict):
                    kw = (item.get("keyword") or item.get("kw")
                          or item.get("text") or "").strip()
                    w = item.get("weight")
                    if w is None:
                        w = item.get("weight_manual")
                    if w is None:
                        w = item.get("w")
                    try:
                        w_int = int(w) if w is not None else 1
                    except Exception:
                        w_int = 1
                    if kw:
                        kw_pairs.append((kw, max(0, w_int)))

        # remove empty / zero-weight keywords (optional: keep zero-weight if you want)
        kw_pairs = [(k, w) for (k, w) in kw_pairs if k and w > 0]

        # AND logic support: two keyword groups that must both match
        and_logic = bool(rule.get("and_logic", False))
        kw_pairs_a: List[Tuple[str, int]] = []
        kw_pairs_b: List[Tuple[str, int]] = []

        if and_logic:
            for group_key, target_list in [("keywords_a", kw_pairs_a), ("keywords_b", kw_pairs_b)]:
                for item in rule.get(group_key, []):
                    if isinstance(item, str):
                        kw = item.strip()
                        if kw:
                            target_list.append((kw, 1))
                    elif isinstance(item, dict):
                        kw = (item.get("keyword") or item.get("kw")
                              or item.get("text") or "").strip()
                        w = item.get("weight")
                        if w is None:
                            w = item.get("w", 1)
                        try:
                            w_int = int(w) if w is not None else 1
                        except Exception:
                            w_int = 1
                        if kw:
                            target_list.append((kw, max(0, w_int)))
            kw_pairs_a = [(k, w) for (k, w) in kw_pairs_a if k and w > 0]
            kw_pairs_b = [(k, w) for (k, w) in kw_pairs_b if k and w > 0]

        normalized[section] = {
            "quota": quota,
            "keywords": kw_pairs,  # list of (keyword, weight)
            "and_logic": and_logic,
            "keywords_a": kw_pairs_a,
            "keywords_b": kw_pairs_b,
        }

    if not normalized:
        raise ValueError(
            "No valid sections after normalizing rules. Check keyword_rules.json."
        )
    return normalized


# =============================================================================
# MEDIA PRIORITY (lower index = higher priority)
# =============================================================================

MEDIA_PRIORITY = [
    "연합뉴스", "한국경제", "매일경제", "아시아경제", "서울경제", "머니투데이", "이데일리", "파이낸셜뉴스",
    "헤럴드경제", "동아일보", "조선일보", "중앙일보", "경향신문", "한겨레", "MBN", "SBS", "KBS", "MBC",
    "YTN"
]


def media_rank(source_title: str) -> int:
    """Return media priority rank (lower = better). Unknown media gets max rank."""
    source = (source_title or "").strip()
    for i, name in enumerate(MEDIA_PRIORITY):
        if name in source:
            return i
    return len(MEDIA_PRIORITY)


# =============================================================================
# SCORING FUNCTIONS (Manual weight only, no org boost, no order weight)
# =============================================================================


def score_item(title: str,
               summary: str,
               section: str,
               source_name: str = "") -> int:
    """
    Score an item for a specific section using manual weights from JSON.
    - If keyword appears in title: TITLE_BASE * weight
    - Else if appears in (title+summary): BODY_BASE * weight
    - AND-logic sections: both keyword groups must have >= 1 match
    """
    rules = _load_rules_cached()
    rule = rules.get(section)
    if not rule:
        return 0

    t = (title or "").strip()
    s = (summary or "").strip()
    text = f"{t} {s}"

    # AND-logic section: require matches from both groups
    if rule.get("and_logic"):
        return _score_and_logic(t, text, rule)

    score = 0
    matched = set()

    for kw, weight in rule["keywords"]:
        if kw in matched:
            continue
        if kw in t:
            score += TITLE_BASE * weight
            matched.add(kw)
        elif kw in text:
            score += BODY_BASE * weight
            matched.add(kw)

    return score


def _score_and_logic(title: str, text: str, rule: Dict[str, Any]) -> int:
    """
    AND-logic scoring: both keywords_a and keywords_b must have >= 1 match.
    If either group has zero matches, return 0.
    """
    score_a = 0
    matched_a = 0
    for kw, weight in rule.get("keywords_a", []):
        if kw in title:
            score_a += TITLE_BASE * weight
            matched_a += 1
        elif kw in text:
            score_a += BODY_BASE * weight
            matched_a += 1

    if matched_a == 0:
        return 0

    score_b = 0
    matched_b = 0
    for kw, weight in rule.get("keywords_b", []):
        if kw in title:
            score_b += TITLE_BASE * weight
            matched_b += 1
        elif kw in text:
            score_b += BODY_BASE * weight
            matched_b += 1

    if matched_b == 0:
        return 0

    return score_a + score_b


def count_negative_matches(title: str, summary: str) -> int:
    """Count how many negative keywords appear in the text."""
    t = (title or "").strip()
    s = (summary or "").strip()
    text = f"{t} {s}"

    count = 0
    for neg in _load_negative_keywords():
        if neg in text:
            count += 1
    return count


def has_any_positive_match(title: str, summary: str) -> bool:
    """Check if text matches any keyword in any category."""
    rules = _load_rules_cached()
    t = (title or "").strip()
    s = (summary or "").strip()
    text = f"{t} {s}"

    for _section, rule in rules.items():
        if rule.get("and_logic"):
            has_a = any(kw in text for kw, _w in rule.get("keywords_a", []))
            has_b = any(kw in text for kw, _w in rule.get("keywords_b", []))
            if has_a and has_b:
                return True
        else:
            for kw, _w in rule["keywords"]:
                if kw in text:
                    return True
    return False


# =============================================================================
# CLASSIFICATION FUNCTION
# =============================================================================


def classify_item(title: str,
                  summary: str,
                  source_name: str = "") -> Dict[str, Any]:
    """
    Classify an item into the best category.
    Returns dict:
      - category, score, all_scores, dropped, negative_count
    """
    rules = _load_rules_cached()
    t = (title or "").strip()
    s = (summary or "").strip()

    all_scores: Dict[str, int] = {}
    for section in rules.keys():
        all_scores[section] = score_item(t, s, section, source_name)

    best_category = max(all_scores.keys(), key=lambda k: all_scores[k])
    best_score = all_scores[best_category]

    negative_count = count_negative_matches(t, s)
    has_positive = has_any_positive_match(t, s)

    adjusted_score = best_score - (negative_count * NEGATIVE_PENALTY)

    # Case 1: No positive matches + has negative matches -> dropped
    if not has_positive and negative_count > 0:
        return {
            "category": None,
            "score": 0,
            "all_scores": all_scores,
            "dropped": True,
            "negative_count": negative_count,
        }

    # Case 2: Score below threshold -> Others
    if adjusted_score < MIN_SCORE_THRESHOLD:
        return {
            "category": OTHERS_CATEGORY,
            "score": adjusted_score,
            "all_scores": all_scores,
            "dropped": False,
            "negative_count": negative_count,
        }

    # Case 3: Normal classification
    return {
        "category": best_category,
        "score": adjusted_score,
        "all_scores": all_scores,
        "dropped": False,
        "negative_count": negative_count,
    }


# =============================================================================
# QUOTA SELECTION
# =============================================================================


def select_by_quota(items: list, category: str) -> list:
    """Select top items for a category based on quota."""
    rules = _load_rules_cached()

    if category == OTHERS_CATEGORY:
        quota = 10
    else:
        quota = int(rules.get(category, {}).get("quota", 5))

    sorted_items = sorted(
        items,
        key=lambda x: (-x.get("score", 0), media_rank(x.get("source", ""))))
    return sorted_items[:quota]


# =============================================================================
# CLUSTERING SUPPORT (unchanged)
# =============================================================================


def get_cluster_representative(cluster_items: list):
    """Pick representative: highest score, tie-break by media priority."""
    if not cluster_items:
        return None
    sorted_items = sorted(
        cluster_items,
        key=lambda x: (-x.get("score", 0), media_rank(x.get("source", ""))))
    return sorted_items[0]


def calculate_cluster_score(cluster_items: list) -> float:
    """Cluster score = representative score + size bonus."""
    if not cluster_items:
        return 0
    rep = get_cluster_representative(cluster_items)
    rep_score = rep.get("score", 0) if rep else 0
    size_bonus = len(cluster_items) * 2
    return rep_score + size_bonus


# =============================================================================
# LEGACY COMPATIBILITY (optional)
# =============================================================================

LEGACY_SECTION_MAP = {
    "거시경제": "거시경제·재정",
    "경제정책": "거시경제·재정",
    "재정": "거시경제·재정",
    "금융시장": "금융시장",
    "부동산": "부동산",
    "국제경제": "국제경제",
    "산업": "산업·과학",
    "AI와 경제": "AI와 경제",
}


def map_legacy_section(old_section: str) -> str:
    return LEGACY_SECTION_MAP.get(old_section, OTHERS_CATEGORY)
