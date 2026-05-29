"""
Unit tests for jobs/render.py
Run with: python -m pytest tests/test_render.py -v
Or:       python tests/test_render.py
"""
import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "jobs"))

import render
from render import (
    score_ocr_by_keywords,
    select_top5_diverse,
    should_drop_quality,
    OCR_KEYWORD_RULES,
)


# ---------------------------------------------------------------------------
# score_ocr_by_keywords
# ---------------------------------------------------------------------------

def test_score_empty_title():
    """Empty title → 0"""
    assert score_ocr_by_keywords({"title": ""}, OCR_KEYWORD_RULES) == 0
    assert score_ocr_by_keywords({}, OCR_KEYWORD_RULES) == 0
    print("PASS: score empty title → 0")


def test_score_no_match():
    """Title with no keywords → 0"""
    result = score_ocr_by_keywords({"title": "오늘 날씨 맑음"}, OCR_KEYWORD_RULES)
    assert result == 0
    print(f"PASS: score no match → {result}")


def test_score_single_keyword():
    """GDP(weight=5) in title → 5"""
    result = score_ocr_by_keywords({"title": "GDP 성장률 발표"}, OCR_KEYWORD_RULES)
    assert result >= 5, f"Expected ≥5, got {result}"
    print(f"PASS: GDP keyword → {result}")


def test_score_multiple_keywords_same_title():
    """Multiple keywords in one title: 기준금리(5) + 물가(4) + 한국은행(5) → 14"""
    result = score_ocr_by_keywords(
        {"title": "한국은행, 기준금리 동결…물가 안정세 지속"},
        OCR_KEYWORD_RULES,
    )
    assert result >= 14, f"Expected ≥14, got {result}"
    print(f"PASS: multiple keywords → {result}")


def test_score_financial_market_keyword():
    """코스피(5) → score ≥ 5"""
    result = score_ocr_by_keywords({"title": "코스피 2% 급등"}, OCR_KEYWORD_RULES)
    assert result >= 5
    print(f"PASS: 코스피 keyword → {result}")


def test_score_industry_keyword():
    """반도체(5) in 산업·과학"""
    result = score_ocr_by_keywords({"title": "삼성전자 반도체 신제품 출시"}, OCR_KEYWORD_RULES)
    assert result >= 5
    print(f"PASS: 반도체 keyword → {result}")


def test_score_low_weight_keyword():
    """경기심리지수(w=1) → 1 only (no other keywords)"""
    result = score_ocr_by_keywords({"title": "경기심리지수 발표"}, OCR_KEYWORD_RULES)
    # "경기심리지수"(1) + "경기"(3) match both
    assert result >= 1
    print(f"PASS: low-weight keyword → {result}")


def test_score_keyword_rules_empty():
    """Empty keyword_rules → 0 regardless of title"""
    result = score_ocr_by_keywords({"title": "GDP 기준금리"}, {})
    assert result == 0
    print("PASS: empty rules → 0")


# ---------------------------------------------------------------------------
# select_top5_diverse — Raindrop exclusion
# ---------------------------------------------------------------------------

def _make_ocr(title, score=10):
    return {"title": title, "source": "석간", "match_status": "OK", "score": score}


def _make_raindrop(title):
    return {"title": title, "source": "Raindrop", "match_status": "raindrop", "score": 80}


def test_raindrop_excluded_by_source():
    """Raindrop items (source=Raindrop) must not appear in result"""
    items = [_make_raindrop("Raindrop 기사 A"), _make_ocr("OCR 기사 B")]
    result = select_top5_diverse(items)
    titles = [r["title"] for r in result]
    assert "Raindrop 기사 A" not in titles, "Raindrop should be excluded"
    assert "OCR 기사 B" in titles
    print("PASS: Raindrop excluded by source")


def test_raindrop_excluded_by_match_status():
    """match_status=raindrop also excluded"""
    items = [
        {"title": "Raindrop via status", "source": "Other", "match_status": "raindrop", "score": 80},
        _make_ocr("OCR 기사 C"),
    ]
    result = select_top5_diverse(items)
    titles = [r["title"] for r in result]
    assert "Raindrop via status" not in titles
    print("PASS: Raindrop excluded by match_status")


def test_only_raindrop_returns_empty():
    """If all items are Raindrop, result is empty"""
    items = [_make_raindrop("R1"), _make_raindrop("R2")]
    result = select_top5_diverse(items)
    assert result == []
    print("PASS: only Raindrop → empty result")


def test_empty_input_returns_empty():
    result = select_top5_diverse([])
    assert result == []
    print("PASS: empty input → []")


# ---------------------------------------------------------------------------
# select_top5_diverse — importance_score
# ---------------------------------------------------------------------------

def test_importance_score_set_on_ocr_items():
    """importance_score field is added to each OCR item after selection"""
    items = [_make_ocr("GDP 성장률 전망 하향"), _make_ocr("날씨 맑음")]
    select_top5_diverse(items)
    # The function mutates items in-place
    for item in items:
        if item.get("source") != "Raindrop":
            assert "importance_score" in item, "importance_score should be set"
    print("PASS: importance_score set on OCR items")


def test_high_importance_score_selected_first():
    """OCR item with strong keyword should appear before generic item"""
    items = [
        _make_ocr("일반 뉴스 제목", score=100),        # high raw score, no keywords
        _make_ocr("한국은행 기준금리 결정", score=5),  # low raw score, strong keywords
    ]
    result = select_top5_diverse(items)
    assert len(result) == 2
    assert result[0]["title"] == "한국은행 기준금리 결정", (
        f"Keyword-rich item should rank first, got: {result[0]['title']}"
    )
    print("PASS: keyword-rich item selected first despite lower raw score")


def test_tiebreak_by_raw_score():
    """When importance_score is equal, higher raw score wins"""
    items = [
        _make_ocr("날씨 맑은 오늘", score=5),
        _make_ocr("주말 나들이 명소", score=50),
    ]
    result = select_top5_diverse(items)
    assert result[0]["title"] == "주말 나들이 명소", (
        f"Equal importance → higher raw score wins, got: {result[0]['title']}"
    )
    print("PASS: tiebreak by raw score")


# ---------------------------------------------------------------------------
# select_top5_diverse — deduplication
# ---------------------------------------------------------------------------

def test_dedup_similar_titles_skipped():
    """Near-duplicate OCR titles should not both appear"""
    items = [
        _make_ocr("한국은행 기준금리 동결 결정"),
        _make_ocr("한국은행 기준금리 동결 발표"),  # very similar
        _make_ocr("삼성전자 반도체 신제품 출시"),
    ]
    result = select_top5_diverse(items)
    titles = [r["title"] for r in result]
    assert len(result) <= 3
    assert "삼성전자 반도체 신제품 출시" in titles
    # Both 기준금리 기사 should not both appear
    both_present = (
        "한국은행 기준금리 동결 결정" in titles
        and "한국은행 기준금리 동결 발표" in titles
    )
    assert not both_present, "Near-duplicate titles should be deduplicated"
    print(f"PASS: near-duplicates deduplicated, got {len(result)} items")


def test_max_five_returned():
    """Never return more than 5 even with many distinct items"""
    distinct_titles = [
        "반도체 수출 역대 최고치 기록",
        "한국은행 기준금리 인하 결정",
        "코스피 3000선 회복 돌파",
        "부동산 규제 완화 정책 발표",
        "트럼프 관세 협상 타결 임박",
        "삼성전자 분기 영업이익 신기록",
        "전기차 배터리 화재 안전기준 강화",
        "IMF 한국 성장률 전망 상향",
        "원달러 환율 1300원 하회",
        "재정적자 GDP 대비 축소 목표",
    ]
    items = [_make_ocr(t, score=i) for i, t in enumerate(distinct_titles)]
    result = select_top5_diverse(items)
    assert len(result) == 5, f"Expected 5, got {len(result)}"
    print(f"PASS: max 5 returned (got {len(result)})")


def test_raindrop_mixed_with_ocr_max_five():
    """Raindrop items don't count toward the 5 — OCR fills all 5 slots"""
    raindrop = [_make_raindrop(f"Raindrop 전문가 선별 기사 {i}") for i in range(3)]
    ocr_titles = [
        "반도체 수출 증가세 지속",
        "기준금리 동결 결정 배경",
        "코스피 외국인 순매수 전환",
        "부동산 규제 지역 추가 지정",
        "미국 연준 금리 인하 신호",
        "원전 수출 계약 체결",
        "전기차 보조금 축소 발표",
    ]
    ocr = [_make_ocr(t, score=i) for i, t in enumerate(ocr_titles)]
    result = select_top5_diverse(raindrop + ocr)
    assert len(result) == 5, f"Expected 5 OCR items, got {len(result)}"
    for r in result:
        assert r["source"] != "Raindrop"
    print(f"PASS: mixed input, only OCR in result ({len(result)} items)")


# ---------------------------------------------------------------------------
# should_drop_quality (existing logic — regression guard)
# ---------------------------------------------------------------------------

def test_drop_empty_summary_short_title():
    assert should_drop_quality("짧음", "") is True
    print("PASS: empty summary + short title → drop")


def test_drop_summary_too_short():
    assert should_drop_quality("충분히 긴 제목입니다", "짧음") is True
    print("PASS: summary too short → drop")


def test_drop_summary_equals_title():
    t = "이것은 제목이자 요약입니다"
    assert should_drop_quality(t, t) is True
    print("PASS: summary == title → drop")


def test_keep_good_quality():
    assert should_drop_quality(
        "한국은행 기준금리 결정 발표",
        "한국은행 금융통화위원회가 오늘 기준금리를 현 수준에서 동결하기로 결정했다고 발표했습니다."
    ) is False
    print("PASS: good quality item → not dropped")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_all_tests():
    tests = [
        test_score_empty_title,
        test_score_no_match,
        test_score_single_keyword,
        test_score_multiple_keywords_same_title,
        test_score_financial_market_keyword,
        test_score_industry_keyword,
        test_score_low_weight_keyword,
        test_score_keyword_rules_empty,
        test_raindrop_excluded_by_source,
        test_raindrop_excluded_by_match_status,
        test_only_raindrop_returns_empty,
        test_empty_input_returns_empty,
        test_importance_score_set_on_ocr_items,
        test_high_importance_score_selected_first,
        test_tiebreak_by_raw_score,
        test_dedup_similar_titles_skipped,
        test_max_five_returned,
        test_raindrop_mixed_with_ocr_max_five,
        test_drop_empty_summary_short_title,
        test_drop_summary_too_short,
        test_drop_summary_equals_title,
        test_keep_good_quality,
    ]

    passed = 0
    failed = 0

    print("=" * 60)
    print("Running render.py Unit Tests")
    print("=" * 60)

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"FAIL: {test.__name__} — {e}")
            failed += 1
        except Exception as e:
            print(f"ERROR: {test.__name__} — {type(e).__name__}: {e}")
            failed += 1

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
