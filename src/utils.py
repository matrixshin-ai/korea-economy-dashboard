import re

def strip_html(s: str) -> str:
    s = s or ""
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&quot;", '"').replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return s.strip()

def normalize_text(s: str) -> str:
    """기존(약한) 정규화: 보조용으로 유지"""
    s = re.sub(r"[^0-9A-Za-z가-힣 ]", " ", s or "")
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s

def normalize_text_strong(s: str) -> str:
    """
    강한 정규화: '비슷한 기사' 중복 제거의 핵심
    - 따옴표/말줄임/HTML 엔티티 제거
    - 비율 표현(53%, 절반, 과반 등) 통일 <pct>
    - 불필요한 기호 제거
    """
    s = (s or "").lower()

    # HTML 엔티티/따옴표/말줄임 정리
    s = s.replace("&quot;", " ")
    s = s.replace(""", " ").replace(""", " ").replace('"', " ").replace("'", " ")
    s = s.replace("…", " ").replace("..", " ").replace("⋯", " ")
    s = s.replace("·", " ").replace("—", " ").replace("–", " ").replace("-", " ")

    # 퍼센트/비율 표현 통일
    s = re.sub(r"\b\d{1,3}\s*%\s*p?\b", " <pct> ", s, flags=re.IGNORECASE)
    s = re.sub(r"(절반|과반|반수|다수|대다수|대부분|과반수)", " <pct> ", s)
    s = re.sub(r"(유권자|미국인|국민)\s*(과반|절반|다수)", " <pct> ", s)

    # 흔한 잡음 토큰 정리
    s = re.sub(r"(단독|속보|종합|인터뷰|기획|사설|칼럼|오피니언)", " ", s)
    
    # 국가명 통일
    s = re.sub(r"美", "미국", s)
    s = re.sub(r"미\s+", "미국 ", s)
    
    # 인명 통일 - 불필요한 조사 제거
    s = re.sub(r"트럼프\s*대통령", "트럼프", s)
    
    # 유권자/미국인 등 통일
    s = re.sub(r"(미국인|미\s*유권자|유권자)", "미국인", s)

    # 괄호 부제/말줄임(끝에 …) 제거는 구조적으로 어렵지만, 기호 제거로 완화됨
    s = re.sub(r"[^0-9a-z가-힣 <>\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()

    return s

def token_jaccard(a: str, b: str) -> float:
    A = normalize_text_strong(a)
    B = normalize_text_strong(b)
    if not A or not B:
        return 0.0
    sa, sb = set(A.split()), set(B.split())
    inter = len(sa & sb)
    union = max(1, len(sa | sb))
    return inter / union
