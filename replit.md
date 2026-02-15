# Korea Economic News Dashboard

## Overview

This is a Korean economic news aggregation and analysis platform that provides a comprehensive view of Korea's economic landscape. The application aggregates news from major Korean media outlets via RSS feeds, categorizes them into economic sectors (Macro, Fiscal, Finance, Real Estate, International, Industry), and presents daily briefings with key economic indicators.

The platform is designed for economic policymakers, central bank staff, and researchers who need to track macroeconomic trends without being distracted by company-specific or regional news. It's publicly accessible without authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables for economic dashboard aesthetics
- **Fonts**: Inter (UI/numbers), Merriweather (reports/essays), Noto Sans KR (Korean text)
- **Charts**: Recharts for economic indicator visualizations

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build Tool**: Vite for frontend, esbuild for server bundling
- **API Pattern**: RESTful endpoints under `/api/*` prefix

### Data Pipeline (Python)
- **RSS Polling**: Scheduled job (`jobs/poll.py`) runs every 60 minutes to fetch news from 20 Korean media RSS feeds
- **Scoring System**: `scoring.py` implements keyword-based relevance scoring per economic section with organization boost factors
- **Daily Rendering**: Scheduled job (`jobs/render.py`) runs at 07:00 KST to generate the daily briefing from cached candidates
- **Storage**: JSON file-based storage (`cache_candidates.json`, `latest_briefing.json`)

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - defines users and essays tables
- **Migrations**: Drizzle Kit for schema migrations (`migrations/` directory)

### Key Design Decisions

1. **Hybrid Python/Node Stack**: Python handles RSS parsing and NLP-style scoring (leveraging feedparser, dateutil), while Node.js serves the web application for better React integration.

2. **File-Based News Cache**: News candidates are stored in JSON files rather than database for simplicity and easy debugging of the scoring pipeline.

3. **Section-Based News Organization**: Six economic sectors with configurable quotas and keyword rules enable domain-expert-level curation.

4. **Bilingual Support**: Essays support both Korean and English content fields for international accessibility.

## External Dependencies

### Data Sources
- 20 Korean media RSS feeds (Hankyung, Maeil Business, Asia Economy, Dong-A Ilbo, Kyunghyang, Kookmin Ilbo, MBN, Korea.kr, Yonhap)

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Session storage: connect-pg-simple for Express sessions

### Python Libraries
- feedparser: RSS/Atom feed parsing
- python-dateutil: Date parsing from various formats
- pytz: Timezone handling (KST)

### Key npm Packages
- drizzle-orm + postgres: Database access
- @tanstack/react-query: Data fetching and caching
- recharts: Economic indicator charts
- Various @radix-ui/* packages: Accessible UI primitives

## Operations Guide (운영 가이드)

### Quick Commands
- **즉시 갱신 테스트**: `python jobs/scheduler.py --now` 실행 후 `latest_briefing.json`의 `generated_at` 확인
- **상시 스케줄러**: `python jobs/scheduler.py` (07:00 KST 자동 실행)

### Daily Checklist (매일 아침 점검)
1. `~/workspace/latest_briefing.json`의 `generated_at`(KST) 확인
2. sections 쿼터 확인: 거시 12, 금융 5, 산업 4, 부동산 4, 국제 4, 기타 10
3. top5에 link/source가 비어있는 항목 확인
4. 이상 시 원인(수집/분류/경로/중복제거/키워드룰) 파악

### Troubleshooting

#### 'Loaded 0 total items' 오류
- 원인: 캐시 파일 경로 불일치
- 확인: `/home/runner/workspace/cache_candidates.json` vs `/home/runner/cache_candidates.json`
- 해결: `jobs/scheduler.py`의 `sync_cache_for_renderer()` 확인/수정

#### 터미널 Nix 선택창 문제
- Ctrl+C로 빠져나온 후 Shell 탭 닫고 새 Shell 열기
- `pwd`로 `/home/runner/workspace` 확인 후 작업 재개

#### render.py 경로 주의
- 렌더러는 루트의 `render.py`를 단일 소스로 사용
- `jobs/render.py`는 호출하지 않음 (스케줄러에서 `python render.py` 사용)

### Downstream Integration (Daily-News-Automation 연계)

#### API Endpoints for Downstream Apps
- **`GET /api/warmup`**: 앱을 깨우고 백그라운드 업데이트 시작 (즉시 응답, non-blocking)
- **`GET /api/summary-status?lang=EN`**: EN 요약 준비 상태 확인 (allReady=true면 준비 완료)
- **`GET /api/summary-status?lang=EN&trigger=true`**: 상태 확인 + 업데이트 트리거 (non-blocking)
- **`GET /api/briefing-summary?lang=EN`**: EN 요약 가져오기 (blocking, 업데이트 완료까지 대기)
- **`GET /api/briefing-summary?lang=EN&wait=false`**: EN 요약 가져오기 (non-blocking, 업데이트 중이면 202 반환)

#### 권장 호출 순서 (Daily-News-Automation)
1. 10:00 KST: `GET /api/warmup` → 앱 깨우기 + 백그라운드 업데이트 시작
2. 10:05-10:50: `GET /api/summary-status?lang=EN` 폴링 → allReady=true 확인
3. 11:00 KST: `GET /api/briefing-summary?lang=EN&wait=false` → 즉시 응답

#### EN 요약 한국어 검증
- 자동 생성(generateSummaries): 5회 재시도 + 한국어 제거 + 실패 시 캐시 저장 차단
- API 요청(/api/briefing-summary): 5회 재시도 + 한국어 제거 + 실패 시 422 에러 반환
- 캐시 반환 시에도 한국어 검증 → 오염된 캐시 발견 시 재생성

#### Autoscale 주의사항
- Autoscale 모드에서는 트래픽 없으면 앱이 잠듬
- 07:00 KST 크론은 앱이 깨어있을 때만 작동
- 서버 시작 시 데이터가 오래된 경우 자동 업데이트 트리거
- **외부 크론 서비스(cron-job.org 등)로 매일 10:00 KST에 /api/warmup 핑 권장**

### File Locations
- **캐시**: `~/workspace/cache_candidates.json`
- **브리핑**: `~/workspace/latest_briefing.json`
- **스케줄러**: `jobs/scheduler.py`
- **스코어링**: `scoring.py` (루트)
- **렌더러**: `render.py` (루트, `jobs/render.py`가 import)