# CONTROL_TOWER.md -- Operations Control Tower

> Last updated: 2026-04-28
> Purpose: 4개 앱 + OpsGuard의 전체 운영 상태, 연동 관계, 알려진 이슈, 보류 작업을 한 곳에 정리
>
> 프로젝트별 상세 문서:
> - [korea-economy-dashboard](docs/korea-economy-dashboard.md)
> - [youtube-automation](docs/youtube-automation.md)
> - [moltbook-scheduler](docs/moltbook-scheduler.md)
> - [ocr-automation](docs/ocr-automation.md)

---

## 1. 시스템 전체 구조

```
                      OpsGuard (VM)
                      모니터링 + 알림
                           |
        +------------------+------------------+------------------+
        |                  |                  |                  |
  korea-economy-       ocr-automation    moltbook-         youtube-
  dashboard            (로컬 PC)         scheduler         automation
  (Vercel + GHA)                         (VM)              (PaaS)
        |                  |                  |
        +------ 데이터 ---->|                  |
        |<----- OCR -------+                  |
        |<----- API (/api/briefing) ----------+
        +------ moltbook_comment.py --------> Moltbook
        |                                     |
        |                  moltbook_api.py -->-+
```

## 2. 앱별 상태

| 앱 | 인프라 | 상태 |
|----|--------|------|
| korea-economy-dashboard | Vercel + Neon DB + GitHub Actions | 정상 |
| ocr-automation (private) | 로컬 PC (Windows Task Scheduler) | 정상 |
| moltbook-scheduler (private) | GCP VM | 정상 |
| youtube-automation | PaaS | 정상 |
| opsguard (private) | GCP VM (moltbook-scheduler와 동일) | 정상 |

### GCP VM

두 서비스 공존:
- `moltbook-telegram.service` -- PolicyEditorBot
- `opsguard.service` -- OpsGuard 모니터링

접속 방법 및 경로는 별도 운영 문서 참조.

---

## 3. 일일 타임라인

```
23:00 KST  [C] Moltbook 파이프라인 (collect -> draft -> Telegram 미리보기)
07:00 KST  [A] Dashboard 1차 (RSS only, 스케줄 트리거)
~14:00 KST     기재부 PDF 도착
14:30 KST  [B] OCR 파이프라인 (2026-03-08 변경: 14:00 -> 14:30)
        ↓  push_to_dashboard.py가 git push 완료 후 daily-update.yml 즉시 dispatch
       [A] Dashboard 2차 (이벤트 트리거, OCR 반영 + AI 요약 + Moltbook 댓글)
        ↓  EN summary 생성 성공 시 youtube-automation pipeline.yml 자동 dispatch
       [D] YouTube 파이프라인 (이벤트 트리거, 스크립트 fetch → TTS → 업로드)
~17:30 KST  [D] YouTube 파이프라인 (스케줄 트리거, fallback — 이미 완료 시 skip)
22:00 KST      OpsGuard 일일 리포트
```

> **2026-04-28 변경**: Dashboard 2차 및 YouTube가 시간 기반 스케줄에서 이벤트 기반 트리거로 전환됨.
> 기존 스케줄(15:45, 17:30)은 fallback으로 유지.

---

## 4. OpsGuard 체크 항목

### A: Dashboard (korea-economy-dashboard)

| ID | 체크 | 설명 |
|----|------|------|
| A-1 | API Health | `/api/briefing` 200 응답 |
| A-2 | Data Freshness | `latest_briefing.json` 날짜 확인 |
| A-3 | Poll Job | GitHub Actions `daily-update.yml` 최근 실행 |
| A-4 | Summary | AI 요약 생성 여부 |
| A-5 | Indicators | `latest_indicators.json` 데이터 |
| A-6 | Update Status | `/api/update-status` 엔드포인트 |
| A-7 | Summary Status | `/api/summary-status` 엔드포인트 |
| A-8 | Warmup | `/api/warmup` 엔드포인트 |

### B: OCR Pipeline (ocr-automation)

| ID | 체크 | 설명 |
|----|------|------|
| B-1 | OCR Freshness | `ocr_headlines.json` 날짜 (GitHub API 조회) |
| B-2 | Matched Count | 매칭된 기사 수 |
| B-3 | Push Status | 대시보드에 push 성공 여부 |

### C: Moltbook (moltbook-scheduler)

| ID | 체크 | 설명 |
|----|------|------|
| C-1 | Service Status | systemd 서비스 active 여부 |
| C-2 | Pipeline Triggered | journalctl에서 "PIPELINE TRIGGERED" 검색 |
| C-3 | Skip Marker | `data/skips/skip_YYYYMMDD.json` 존재 시 정상 스킵으로 처리 |
| C-4 | Post Published | 당일 게시 여부 |
| C-5 | API Health | Moltbook API 응답 |

### D: YouTube (youtube-automation)

| ID | 체크 | 설명 |
|----|------|------|
| D-1 | Worker Health | 워커 HTTP health |
| D-2 | Cron Run | GitHub Actions cron 최근 실행 |
| D-3 | Video Published | 당일 영상 게시 여부 |
| D-4 | Pipeline Status | 파이프라인 완료/진행 상태 |
| D-5 | Warmup | warmup 엔드포인트 |
| D-6 | Test Fetch | test-fetch 엔드포인트 |

### CH: Chain Checks (교차 검증)

| ID | 체크 | 설명 |
|----|------|------|
| CH-1 | OCR -> Dashboard | OCR 데이터가 대시보드에 반영되었는지 |
| CH-2 | Dashboard -> Moltbook | 대시보드 데이터가 Moltbook 수집에 사용되었는지 |
| CH-3 | Dashboard -> YouTube | 대시보드 데이터가 YouTube에 사용되었는지 |
| CH-4 | End-to-End | 전체 파이프라인 정상 여부 |

### OpsGuard 환경변수

각 프로젝트의 `.env` 및 `.env.example` 참조. OpsGuard VM의 `.env`는 VM에서 직접 관리.

### OpsGuard CD

GitHub Actions `deploy.yml`: main push -> Workload Identity Federation -> VM 배포 -> systemctl restart

---

## 5. 연동 관계 (데이터 흐름)

```
[기재부 PDF] --> [ocr-automation] --> ocr_headlines.json --> [dashboard jobs/data/]
                                                                    |
[RSS/Naver] --> [dashboard poll.py] --> cache_candidates.json       |
                                              |                     |
                                        [render.py] <--------------+
                                              |
                                     latest_briefing.json
                                        /          \
                          [generate_summary.py]   [moltbook_comment.py]
                                |                        |
                        cached_summary_*.json     Moltbook (외부 submolt 댓글)
                                |
                    [moltbook-scheduler collector.py]
                                |
                         (topic filter)
                                |
                          [drafter.py] --> [publisher.py] --> Moltbook (m/ai-macro-policy 포스트)
                                                |
                                         [Telegram 승인]
```

---

## 6. Moltbook 댓글: 두 시스템의 관계

| 항목 | moltbook_comment.py (dashboard) | moltbook-scheduler |
|------|--------------------------------|-------------------|
| 위치 | GitHub Actions | GCP VM |
| 대상 | 외부 submolt (검색 기반) | 자기 submolt (m/ai-macro-policy) |
| 인증 | Bearer + verification challenge | 동일 |
| 트리거 | GHA afternoon run (15:45 KST) | Telegram bot 스케줄 (23:00 KST) |
| 승인 | 자동 (사람 승인 없음) | Telegram 버튼 승인 |
| 횟수 제한 | 자체 히스토리 (moltbook_history.json) | daily_state.json (1/day) |
| API Key | GitHub Secrets | VM .env (동일 키) |

**문제: 두 시스템이 독립적으로 동작하여 1/day 외부 댓글 제한을 공유하지 않음.**

---

## 7. 크로스 프로젝트 알려진 이슈

| # | 이슈 | 관련 앱 | 우선순위 | 상태 |
|---|------|---------|----------|------|
| 1 | opsguard README.md 타임라인에 05:00 KST 잔존 -- 23:00으로 수정 필요 | opsguard | 중간 | 미해결 |
| 2 | moltbook_comment.py가 daily_state와 미연동 | dashboard + scheduler | 높음 | 미해결 |
| 3 | moltbook-scheduler 외부 댓글 자동화 미완성 | moltbook-scheduler | 높음 | 미해결 |
| 4 | OpsGuard 알림 타이밍 오탐 다수 (A-2, A-4, A-7, B-1) | opsguard | 중간 | 미해결 |
| 5 | Gemini API 불안정 (503/429) — 오후 summary 재생성 실패 | dashboard | 높음 | **해결** (2026-04-08 Claude API 전환, 종료) |
| 6 | OpsGuard가 git으로 관리되지 않음 | opsguard | 중간 | 미해결 |
| 7 | GCP VM에 flyctl 미설치 — Fly.io 자동 복구 불가 | opsguard | 중간 | **해결** (2026-04-11 flyctl 설치 완료) |
| 8 | FRED API GitHub Actions IP 차단 — us_rate 누락 | dashboard | 중간 | **부분 해결** (2026-04-09 fallback 로직 추가, 캐시값 재사용) |
| 9 | Vercel `/api/summary-status` HTML 반환 — YouTube readiness 폴링 45분 stuck | dashboard + youtube | 높음 | **해결** (2026-04-14 서버리스 함수 추가) |
| 10 | OCR step6 cp949 인코딩 오류 — ☑ 특수문자 포함 기사 제목 출력 시 UnicodeEncodeError | ocr-automation | 높음 | **해결** (2026-04-18 `sys.stdout.reconfigure(errors="replace")` 추가) |
| 11 | Moltbook pipeline maximum recursion depth 오류 — f-string 예외 로깅 시 재귀 발생 | moltbook-scheduler | 높음 | **부분 해결** (2026-04-18 로깅 개선, 4/19 자동 실행 결과 확인 필요) |

> 프로젝트별 이슈는 각 프로젝트 문서 참조.

---

## 8. 보류 중인 작업

| # | 작업 | 관련 앱 | 우선순위 |
|---|------|---------|----------|
| 1 | opsguard README.md 타임라인 05:00 -> 23:00 수정 | opsguard | 중간 |
| 2 | moltbook-scheduler 외부 댓글 자동화 완성 | moltbook-scheduler | 높음 |
| 3 | moltbook_comment.py <-> daily_state 연동 설계 | dashboard + scheduler | 높음 |
| 5 | OpsGuard 알림 타이밍 조정 | opsguard | 중간 |

> 프로젝트별 보류 작업은 각 프로젝트 문서 참조.

---

## 9. 환경변수 안내

각 프로젝트의 환경변수는 해당 프로젝트의 `.env` 또는 `.env.example` 파일을 참조.

| 프로젝트 | 환경변수 위치 |
|----------|--------------|
| korea-economy-dashboard | `.env` (로컬) + GitHub Secrets (CI) |
| moltbook-scheduler | `.env` (VM) + `.env.example` (레포) |
| opsguard | `.env` (VM) + `.env.example` (레포) |
| youtube-automation | 별도 확인 필요 |

---

## 10. 변경 이력

### 2026-04-28

**이벤트 기반 파이프라인 구축 (시간 기반 → OCR 완료 시 자동 트리거)**

- 배경: GitHub Actions 스케줄 지연이 최대 2시간 이상 발생하여 EN summary 완료 전에 YouTube가 실행되는 문제 반복
  - 실측: Dashboard 오전 53분 지연, 오후 2시간 22분 지연 (2026-04-28 기준)
  - YouTube GHA가 먼저 실행되면 "Already uploaded today" (전날 데이터) 또는 stale script 사용
- 기존 흐름: `OCR(14:30) → Dashboard GHA(15:45+지연) → EN summary → YouTube(17:30+지연)`
- 변경 흐름: `OCR(14:30) → Dashboard 즉시 트리거 → EN summary → YouTube 자동 트리거`
- 변경 내용:
  - `push_to_dashboard.py`: git push 완료 후 `daily-update.yml` 즉시 workflow_dispatch (토큰: `gh auth token` → `GH_TOKEN` fallback)
  - `daily-update.yml`: Generate AI briefing summary 스텝에 `id: summary` 추가, EN summary 생성 성공 시 `youtube-automation/pipeline.yml` 자동 workflow_dispatch
  - GitHub Secret `GH_PAT` 추가 (classic PAT, `repo` scope, korea-economy-dashboard 레포)
- 기존 cron 스케줄(Dashboard 15:45, YouTube 17:30)은 fallback으로 유지
- 예상 효과: OCR 완료 후 전체 파이프라인이 30분 내 완료 (GHA 지연 무관)

### 2026-04-18

**OCR step6_daily_extract_csv.py: cp949 인코딩 오류 수정**
- 원인: ☑ (U+2611) 등 특수문자가 포함된 기사 제목 `print()` 시 `UnicodeEncodeError: 'cp949' codec can't encode character` 발생
- 수정: 파일 상단에 `sys.stdout.reconfigure(errors="replace")` 추가
- CSV 저장은 `utf-8-sig` 인코딩이라 데이터 손실 없음

**Moltbook telegram_bot.py: 파이프라인 예외 로깅 개선**
- 원인: f-string에서 예외 객체 `str(e)` 변환 시 `maximum recursion depth` 오류 발생
- 수정: `repr(e)[:200]` 사용으로 안전한 예외 문자열 변환
- 4/10~4/17 Moltbook 초안 생성 실패의 근본 원인이 이 재귀 오류로 확인됨
- 4/19 자동 실행 결과 확인 필요

### 2026-04-14

**moltbook-scheduler src/drafter.py SyntaxError 수정**
- `import time`이 `try` 블록 밖으로 잘못 위치하여 자정부터 매 시간 크래시 반복
- 들여쓰기 수정으로 해결

**GCP VM에 flyctl 설치 완료 → OpsGuard Fly.io 자동 복구 정상화**
- flyctl PATH 적용 후 OpsGuard 서비스 재시작

**korea-economy-dashboard `api/summary-status.ts` Vercel 서버리스 함수 추가**
- 원인: Express 라우트(`/api/summary-status`)만 존재, Vercel에서는 SPA HTML 반환
- youtube-automation readiness 폴링이 45분간 "Not ready yet" 반복 후 타임아웃
- `api/briefing-summary.ts`와 동일 패턴으로 서버리스 함수 생성
- 응답: `{ today, briefing: {date, ready}, summary: {date, ready, generated_at}, allReady }`

### 2026-04-11

**GCP VM에 flyctl 설치 완료**
- 설치: `curl -L https://fly.io/install.sh | sh`
- 이유: OpsGuard [D-4] Fly.io 자동 복구 실패 ('fly' 명령어 없음)

**moltbook-scheduler drafter.py: Claude API 529 과부하 retry 로직 추가**
- 이유: 어제(4/10) KST 23:00 파이프라인에서 Claude API 529로 draft 생성 실패
- 최대 5회 재시도, exponential backoff (2→4→8→16→32초)

### 2026-04-09

**generate_summary.py: Gemini API → Claude API(claude-haiku-4-5-20251001) 전환**
- 모델: `claude-haiku-4-5-20251001` (KR / EN / Structured EN 전체 교체)
- 이유: Gemini 503/429 오류 반복 발생으로 오후 summary 재생성 실패
- `requirements.txt`: `google-genai` → `anthropic>=0.40`
- GitHub Secrets에 `ANTHROPIC_API_KEY` 추가

**미국 기준금리 데이터 소스 교체: Yahoo Finance ^IRX → FRED DFEDTARU**
- Yahoo Finance `^IRX`(13주 T-Bill) → FRED `DFEDTARU` (Fed 목표 상단)
- FRED CSV 헤더 버그 수정: `DATE` → `observation_date`
- FRED GitHub Actions IP 차단 문제 → fallback 로직 추가 (기존 캐시값 재사용)
- `us_rate` 수동 초기값 추가 (3.75%, FOMC 6개월 이력 포함)

**한국 지표 전체 BOK ECOS API 통합**
- KOSPI, KOSDAQ, 원/달러, 국고채 3년/10년 모두 BOK ECOS API로 통합
- Trading Economics 스크래핑 완전 제거
- 5일 히스토리 → 6개월 히스토리로 개선

**한국 기준금리 수정**
- fallback 값 3.00% → 2.50% 수정
- BOK ECOS API로 교체 (공식 소스, 실시간)
- GitHub Secrets에 `BOK_ECOS_API_KEY` 추가

### 2026-04-08

**generate_summary.py: Gemini API → Claude API 전환**
- 모델: `claude-haiku-4-5-20251001` (KR / EN / Structured EN 전체 교체)
- 이유: Gemini 503/429 오류 반복 발생으로 오후 summary 재생성 실패
- `requirements.txt`: `google-genai` → `anthropic>=0.40`
- GitHub Secrets에 `ANTHROPIC_API_KEY` 추가 필요

**미국 기준금리 데이터 소스 교체**
- Yahoo Finance `^IRX` → FRED DFF (실제 Fed 기준금리)
- 이유: `^IRX`는 13주 T-Bill 수익률로 실제 기준금리와 다름, 6개월 그래프 왜곡
- API 키 불필요 (공개 CSV URL)

**한국 지표 전체 BOK ECOS API 통합**
- KOSPI, KOSDAQ, 원/달러, 국고채 3년/10년 모두 BOK ECOS API로 통합
- Trading Economics 스크래핑 완전 제거
- 5일 히스토리 → 6개월 히스토리로 개선

**한국 기준금리 수정**
- fallback 값 3.00% → 2.50% 수정
- BOK ECOS API로 교체 (공식 소스, 실시간)
- GitHub Secrets에 `BOK_ECOS_API_KEY` 추가

---

## 11. 참고 문서

로컬 Downloads 폴더에 스펙 문서들 존재:
- orchestration-agent-plan.md
- audit_report.md
- korea_economy_dashboard_spec.md
- moltbook-policyeditorbot-spec.md
- youtube-automation-system-spec.md
- opsguard-context-for-new-chat.md
- opsguard-cd-guide.md
- opsguard-cd-progress.md
