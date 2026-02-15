import { useState } from "react";

const DOCS_CONTENT = `
# Korea Economy Dashboard - 컨설팅 문서

## 1. 프로젝트 구조

### 디렉토리 구조
- client/ : React 프론트엔드
- server/ : Express 백엔드  
- jobs/ : Python 스케줄러 (poll.py, render.py, scheduler.py 등)
- src/ : Python 보조 모듈 (naver_search.py, dedup.py, scraper.py)
- docs/ : 문서화

### 기술 스택
- 프론트엔드: React 18, TypeScript, Tailwind CSS, shadcn/ui
- 백엔드: Node.js, Express, Drizzle ORM, PostgreSQL
- 데이터 파이프라인: Python, APScheduler, feedparser, scikit-learn

---

## 2. 환경변수 (API 키 마스킹)

| 변수명 | 설명 | 값 |
|--------|------|-----|
| DATABASE_URL | PostgreSQL 연결 | 자동설정 |
| NAVER_CLIENT_ID | Naver API | *** |
| NAVER_CLIENT_SECRET | Naver API | *** |

---

## 3. 현재 문제점

1. **하이브리드 런타임**: Python + Node.js 두 개 운영
2. **스케줄러 과다**: 5개 작업 (indicators, calendar, korea_stats, poll, render)
3. **JSON 캐시 분산**: 5개 이상의 JSON 파일
4. **중복 제거 분리**: RSS와 Naver 별도 처리

---

## 4. 개선 제안

### 단기 (1-2주)
- 스케줄러 6개 → 2개 통합
- JSON 캐시 → PostgreSQL 이전

### 중기 (1-2개월)
- Node.js 단일 스택 마이그레이션
- 백그라운드 작업 node-cron으로 통합

### 장기 (3개월+)
- 마이크로서비스 분리 (선택)
- Redis 캐싱 레이어 추가

---

## 5. 커버리지 확대 방안

### 현재
- RSS 피드 20개 언론사
- Naver Search API 6개 키워드

### 확대 제안
- Naver 검색 키워드 30개로 확대
- 다음(Daum) 검색 API 추가
- 정부 보도자료 크롤러 추가

---

## 6. 중복 제거 강화

### 현재 알고리즘
- TF-IDF Cosine Similarity (임계값 0.40)
- Token Jaccard Similarity (임계값 0.25)
- 정규화: HTML 엔티티, 퍼센트 표현 통일

### 강화 방안
- 링크 정규화 추가
- 연합뉴스 원문 우선 선택
- SimHash 또는 MinHash 도입

---

## 7. 분류 품질 향상

### 현재 방식
- 키워드 기반 점수 산정
- 섹션별 quota 설정

### 개선 방안
- 계층적 키워드 구조 (core/related/context)
- 메타 정보 활용 (언론사 신뢰도, 최신성)
- TF-IDF 기반 ML 분류기 학습

---

## 8. 예상 리소스

| 단계 | 기간 | 인력 | 시간 |
|------|------|------|------|
| 단기 | 1-2주 | 1명 | 20-30시간 |
| 중기 | 1-2개월 | 1-2명 | 80-120시간 |
| 장기 | 3개월+ | 2-3명 | 200+ 시간 |

---

전체 문서는 프로젝트의 docs/ 폴더에 8개의 마크다운 파일로 저장되어 있습니다.
`;

export default function Docs() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(DOCS_CONTENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">컨설팅 문서</h1>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {copied ? "복사됨!" : "전체 복사"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-6 rounded-lg border overflow-auto">
          {DOCS_CONTENT}
        </pre>
      </div>
    </div>
  );
}
