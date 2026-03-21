# korea-economy-dashboard

> 다른 프로젝트 문서는 [CONTROL_TOWER.md](../CONTROL_TOWER.md) 참조

---

## 개요

**스택**: React/TypeScript (Vite) + Express/TypeScript + Python jobs
**인프라**: Vercel + Neon DB + GitHub Actions

## 핵심 데이터 파일 (프로젝트 루트)

- `latest_briefing.json` -- 뉴스 브리핑 (headlines + sections)
- `latest_indicators.json` -- 경제 지표 (KOSPI, KOSDAQ, KRW/USD, WTI 등)
- `latest_economic_calendar.json`, `latest_korea_stats.json`
- `cache_candidates.json` -- poll.py 수집 결과
- `cached_summary_kr.json`, `cached_summary_en.json` -- AI 요약

## GitHub Actions (`daily-update.yml`)

```
1. fetch_indicators.py        (continue-on-error)
2. fetch_economic_calendar.py  (continue-on-error)
3. fetch_korea_stats.py        (continue-on-error)
4. OCR headlines check         (afternoon only)
5. poll.py                     (RSS + Naver 수집)
6. render.py                   (briefing 생성)
7. generate_summary.py         (Gemini AI 요약)
8. moltbook_comment.py         (afternoon only, continue-on-error)
9. git commit & push
```

## 설정 정보

- **Staleness 판정**: `getMostRecentKST330PM()` in `server/routes.ts`
- **환경변수**: 프로젝트 `.env` (로컬) + GitHub Secrets (CI)

---

## 알려진 이슈

| # | 이슈 | 우선순위 |
|---|------|----------|
| 5 | 대시보드 기사 중복 (오늘의 핵심이슈, 거시경제/재정 섹션에서 동일 기사 노출) | 중간 |
| 11 | /api/summary-status가 Vercel에서 HTML 반환 (Express 라우트 우선순위 문제, 기능에는 무영향) | 낮음 |
| 12 | A-4 체크 재검토 필요 (/api/summary-status 미작동으로 현재 체크가 의미없을 수 있음) | 낮음 |

## 보류 중인 작업

| # | 작업 | 우선순위 |
|---|------|----------|
| 4 | 기사 중복 억제 강화 | 중간 |

---

## 변경 이력

### 2026-03-08

- 매체 화이트리스트 28개 적용
- AI와 경제 섹션 그룹B 키워드 확장 + quota 5 -> 7
- 기사 수집 시간 범위 72h -> 48h (월요일 예외 72h 유지)
- English 페이지 Video Brief + MOLTBOOK 링크 수정
- `jobs/moltbook_comment.py` 신규 추가 (외부 submolt 댓글 자동화)

### 2026-03-10

- generate_summary.py 스킵 로직 수정: 날짜 비교만 하던 것을 briefing 콘텐츠 해시(SHA-256) 비교 추가
- 원인: 오전 RSS only 요약이 생성되면 오후 OCR 반영 후에도 날짜가 같아 스킵되던 문제
- 효과: 오후 OCR 데이터 반영 시 EN/KR summary 자동 재생성

### 2026-03-16

- Moltbook comment 401 Unauthorized 에러 발생 — 원인 미확인 (알려진 이슈 #10)

### 2026-03-17

- 경제 에세이 게시판 글쓰기 수정: Vercel read-only 파일시스템 문제로 저장 불가 → api/essays.ts를 GitHub Contents API로 essays.json 읽기/쓰기하도록 수정
- GitHub Fine-grained PAT 생성 (korea-economy-dashboard-essay, Contents R/W) → Vercel GITHUB_TOKEN 환경변수 추가
