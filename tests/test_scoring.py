"""
Unit tests for scoring and classification module.
Run with: python -m pytest tests/test_scoring.py -v
Or simply: python tests/test_scoring.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring import (
    score_item, classify_item, count_negative_matches,
    has_any_positive_match, SECTION_RULES, OTHERS_CATEGORY,
    NEGATIVE_KEYWORDS, MIN_SCORE_THRESHOLD
)


def test_macro_fiscal_classification():
    """Test: Strong macro/fiscal keywords should classify to 거시경제·재정"""
    title = "정부, GDP 성장률 전망 하향...예산 편성 본격화"
    summary = "기획재정부가 내년 경제성장률 전망치를 하향 조정했다. 추경 편성 여부도 검토 중이며 세수 부족 우려."
    
    result = classify_item(title, summary, "연합뉴스")
    
    assert result["category"] == "거시경제·재정", f"Expected 거시경제·재정, got {result['category']}"
    assert result["score"] > MIN_SCORE_THRESHOLD, f"Score {result['score']} should exceed threshold"
    assert not result["dropped"], "Should not be dropped"
    print(f"PASS: Macro fiscal - score={result['score']}, category={result['category']}")


def test_real_estate_classification():
    """Test: Real estate keywords should classify to 부동산"""
    title = "서울 아파트 분양가 상승...DSR 규제 완화 논의"
    summary = "종부세 개편과 함께 LTV 규제 완화 방안이 검토되고 있다. 미분양 물량도 증가."
    
    result = classify_item(title, summary, "한국경제")
    
    assert result["category"] == "부동산", f"Expected 부동산, got {result['category']}"
    assert result["score"] > MIN_SCORE_THRESHOLD
    print(f"PASS: Real estate - score={result['score']}, category={result['category']}")


def test_negative_only_dropped():
    """Test: Item with only negative keywords should be dropped"""
    title = "연예인 A씨 결혼 발표...스포츠 스타도 축하"
    summary = "연예계 빅뉴스. 날씨도 좋은 날 결혼식 진행."
    
    result = classify_item(title, summary, "MBC뉴스")
    
    assert result["dropped"], "Should be dropped (negative-only)"
    assert result["negative_count"] > 0, "Should have negative matches"
    print(f"PASS: Negative-only dropped - neg_count={result['negative_count']}")


def test_mixed_positive_negative():
    """Test: Item with both positive and negative keywords applies penalty but doesn't drop"""
    title = "한국은행 기준금리 발표 - 연예인 참석 이벤트도"
    summary = "GDP 성장률과 물가 전망 발표. 스포츠 스타도 관심."
    
    result = classify_item(title, summary, "한국경제")
    
    assert not result["dropped"], "Should not be dropped (has positive matches)"
    assert result["negative_count"] > 0, "Should have negative matches"
    assert result["category"] != OTHERS_CATEGORY or result["score"] < MIN_SCORE_THRESHOLD
    print(f"PASS: Mixed keywords - score={result['score']}, neg={result['negative_count']}, cat={result['category']}")


def test_financial_markets_classification():
    """Test: Financial market keywords"""
    title = "코스피 급락, 환율 1400원 돌파"
    summary = "금융위원회가 시장 안정 대책 발표. 채권 금리도 상승."
    
    result = classify_item(title, summary, "매일경제")
    
    assert result["category"] == "금융시장", f"Expected 금융시장, got {result['category']}"
    print(f"PASS: Financial markets - score={result['score']}, category={result['category']}")


def test_international_economy_classification():
    """Test: International economy keywords"""
    title = "트럼프, 중국에 관세 25% 부과 예고"
    summary = "미국 연준 FOMC 회의 결과 발표. EU도 반응."
    
    result = classify_item(title, summary, "연합뉴스")
    
    assert result["category"] == "국제경제", f"Expected 국제경제, got {result['category']}"
    print(f"PASS: International economy - score={result['score']}, category={result['category']}")


def test_industry_science_classification():
    """Test: Industry/science keywords"""
    title = "삼성전자, 차세대 반도체 공개"
    summary = "SK하이닉스도 AI 메모리 개발 박차. 전기차 배터리 수요 증가."
    
    result = classify_item(title, summary, "아시아경제")
    
    assert result["category"] == "산업·과학", f"Expected 산업·과학, got {result['category']}"
    print(f"PASS: Industry/science - score={result['score']}, category={result['category']}")


def test_low_score_goes_to_others():
    """Test: Low scoring item goes to Others"""
    title = "일반적인 뉴스 제목"
    summary = "특별한 경제 관련 내용 없음"
    
    result = classify_item(title, summary, "Unknown Source")
    
    assert result["category"] == OTHERS_CATEGORY, f"Low score should go to Others, got {result['category']}"
    print(f"PASS: Low score to Others - score={result['score']}, category={result['category']}")


def test_keyword_order_weight():
    """Test: Earlier keywords in list get higher weight"""
    title1 = "GDP 성장률 발표"
    title2 = "취업률 발표"
    
    score1 = score_item(title1, "", "거시경제·재정", "")
    score2 = score_item(title2, "", "거시경제·재정", "")
    
    assert score1 > score2, f"GDP (earlier keyword) should score higher: {score1} vs {score2}"
    print(f"PASS: Keyword order weight - GDP={score1}, 취업={score2}")


def run_all_tests():
    """Run all tests and print summary."""
    tests = [
        test_macro_fiscal_classification,
        test_real_estate_classification,
        test_negative_only_dropped,
        test_mixed_positive_negative,
        test_financial_markets_classification,
        test_international_economy_classification,
        test_industry_science_classification,
        test_low_score_goes_to_others,
        test_keyword_order_weight,
    ]
    
    passed = 0
    failed = 0
    
    print("=" * 60)
    print("Running Scoring/Classification Tests")
    print("=" * 60)
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"FAIL: {test.__name__} - {str(e)}")
            failed += 1
        except Exception as e:
            print(f"ERROR: {test.__name__} - {str(e)}")
            failed += 1
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
