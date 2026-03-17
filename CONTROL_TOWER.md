# CONTROL_TOWER.md -- Operations Control Tower

> Last updated: 2026-03-17
> Purpose: 4개 앱 + OpsGuard의 전체 운영 상태, 연동 관계, 알려진 이슈, 보류 작업을 한 곳에 정리

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
07:00 KST  [A] Dashboard 1차 (RSS only)
~14:00 KST     기재부 PDF 도착
14:30 KST  [B] OCR 파이프라인 (2026-03-08 변경: 14:00 -> 14:30)
15:45 KST  [A] Dashboard 2차 (OCR 반영 + AI 요약 + Moltbook 댓글)
~17:30 KST  [D] YouTube 파이프라인 (2026-03-16 변경: 15:00 -> 17:30)
22:00 KST      OpsGuard 일일 리포트
```

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

## 5. 프로젝트별 상세

### 5-A. korea-economy-dashboard

**스택**: React/TypeScript (Vite) + Express/TypeScript + Python jobs

**핵심 데이터 파일** (프로젝트 루트):
- `latest_briefing.json` -- 뉴스 브리핑 (headlines + sections)
- `latest_indicators.json` -- 경제 지표 (KOSPI, KOSDAQ, KRW/USD, WTI 등)
- `latest_economic_calendar.json`, `latest_korea_stats.json`
- `cache_candidates.json` -- poll.py 수집 결과
- `cached_summary_kr.json`, `cached_summary_en.json` -- AI 요약

**GitHub Actions** (`daily-update.yml`):
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

**2026-03-08 변경사항**:
- 매체 화이트리스트 28개 적용
- AI와 경제 섹션 그룹B 키워드 확장 + quota 5 -> 7
- 기사 수집 시간 범위 72h -> 48h (월요일 예외 72h 유지)
- English 페이지 Video Brief + MOLTBOOK 링크 수정
- `jobs/moltbook_comment.py` 신규 추가

**Staleness 판정**: `getMostRecentKST330PM()` in `server/routes.ts`

**환경변수**: 프로젝트 `.env` 및 GitHub Secrets 참조

### 5-B. ocr-automation

**위치**: 로컬 PC
**스케줄**: Windows Task Scheduler, **14:30 KST** (2026-03-08 변경: 14:00 -> 14:30)

**파이프라인**: 기재부 석간 PDF -> OCR -> 기사 매칭 -> `ocr_headlines.json` push to dashboard

**매칭 기준**:
- OK: score >= 84
- REVIEW: score >= 65
- FAIL: score < 65

**출력**: `output_daily/matched/matched_YYYYMMDD.xlsx` (14 columns)
**Push**: `push_to_dashboard.py` -> `jobs/data/ocr_headlines.json`

### 5-C. moltbook-scheduler

**위치**: GCP VM
**스택**: Python, Claude API (drafter), Moltbook API, Telegram Bot

**데이터 파이프라인**:
```
korea-economy-dashboard      moltbook-scheduler         Moltbook
(/api/briefing)               |                         (m/ai-macro-policy)
  AI와 경제 section  -->  collector.py  -->  drafter.py  -->  publisher.py
  + topic filter        (topic filter)    (post type      (API + verify
  + macro context                          selection,      + state track
  + headlines                              word count,     + metrics)
                                           quality gate)
```

**Core Focus**: AI agents x economic growth x inflation (삼각형)

**포스트 타입**:
| Type | Target Words | Hard Max | 주간 목표 |
|------|-------------|----------|-----------|
| [Debate] | 90-160 | 180 | 3-4회 |
| [Analysis] | 160-260 | 320 | 1-2회 |
| [Rules] | 120-220 | 250 | ~1회/월 |

**운영 규칙 (Spec S13)**:
- 포스트: Mon-Sat 1/day, 일요일 없음
- 자기포스트 답글: max 3/day, 40-80 words
- 외부 submolt 댓글: max 1/day, 삼각형 2개 이상 연결 필수

**Moltbook API 인증**:
1. Bearer API Key
2. Verification Challenge -- 매 게시/댓글마다 산술 문제 자동 풀이 필요
3. Unicode -> ASCII 변환 필수 (em-dash 등이 ?로 치환됨)

**Telegram Bot**: 폴링 방식, Approve/Reject 버튼으로 사람 승인 후 게시

**2026-03-08 변경사항**:
- 고아 프로세스 제거
- API Key 교체
- 스케줄: `run_bot(schedule_time="23:00")` -- 23:00 KST 확정

**환경변수**: 프로젝트 `.env` 및 `.env.example` 참조

### 5-D. youtube-automation

**인프라**: PaaS
**상세 구조**: 미파악 (추후 확인 필요)

---

## 6. 연동 관계 (데이터 흐름)

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

## 7. Moltbook 댓글: 두 시스템의 관계

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

## 8. 알려진 이슈

### 높은 우선순위

| # | 이슈 | 영향 |
|---|------|------|
| 1 | opsguard README.md 타임라인에 05:00 KST 잔존 -- 23:00으로 수정 필요 | 모니터링 타이밍 오탐 가능 |
| 2 | moltbook_comment.py가 daily_state와 미연동 | 외부 댓글 1/day 제한 우회 가능 |
| 3 | moltbook-scheduler 외부 댓글 자동화 미완성 | 카운터(can_external_comment)만 있고 호출 코드 없음 |

### 중간 우선순위

| # | 이슈 | 영향 |
|---|------|------|
| 4 | OpsGuard 알림 타이밍 오탐 다수 (A-2, A-4, A-7, B-1) | 타이밍 불일치로 불필요한 알림 발생 |
| 5 | 대시보드 기사 중복 | 오늘의 핵심이슈, 거시경제/재정 섹션에서 동일 기사 노출 |
| 6 | OpsGuard가 git으로 관리되지 않음 | VM 직접 수정 필요, 변경 이력 추적 불가, CD 파이프라인 무효화 |

### 낮은 우선순위 / 미파악

| # | 이슈 | 비고 |
|---|------|------|
| 7 | YouTube 자동화 상세 구조 미파악 | 스펙 문서 존재하나 코드 미확인 |
| 9 | YouTube OAuth token 간헐적 만료 | 원인 미확정. 발생 시 수동 재발급 필요 (절차는 변경 이력 2026-03-10 참조) |
| 10 | Moltbook comment 401 Unauthorized 에러 | 2026-03-16 발생. 원인 미확인 |
| 11 | /api/summary-status가 Vercel에서 HTML 반환 | Express 라우트가 서버리스 함수보다 우선순위 낮음. OpsGuard A-4 체크에 영향, 대시보드 기능에는 무영향 |
| 12 | A-4 체크 재검토 필요 | /api/summary-status 미작동으로 현재 체크가 의미없을 수 있음 |
| 8 | ~~CLAUDE.md 문서 일부 오래됨~~ | 해결됨 (23:00 KST로 수정 완료) |

---

## 9. 보류 중인 작업

| # | 작업 | 관련 앱 | 우선순위 |
|---|------|---------|----------|
| 1 | opsguard README.md 타임라인 05:00 -> 23:00 수정 | opsguard | 중간 |
| 2 | moltbook-scheduler 외부 댓글 자동화 완성 | moltbook-scheduler | 높음 |
| 3 | moltbook_comment.py <-> daily_state 연동 설계 | dashboard + scheduler | 높음 |
| 4 | 대시보드 기사 중복 억제 강화 | dashboard | 중간 |
| 5 | OpsGuard 알림 타이밍 조정 | opsguard | 중간 (1~2주 안정 확인 후) |
| 6 | YouTube 자동화 구조 파악 | youtube-automation | 낮음 |

---

## 10. 환경변수 안내

각 프로젝트의 환경변수는 해당 프로젝트의 `.env` 또는 `.env.example` 파일을 참조.

| 프로젝트 | 환경변수 위치 |
|----------|--------------|
| korea-economy-dashboard | `.env` (로컬) + GitHub Secrets (CI) |
| moltbook-scheduler | `.env` (VM) + `.env.example` (레포) |
| opsguard | `.env` (VM) + `.env.example` (레포) |
| youtube-automation | 별도 확인 필요 |

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

---

## 12. 변경 이력

### 2026-03-08

- ocr-automation 스케줄 14:00 -> 14:30 KST (Windows Task Scheduler)
- dashboard 매체 화이트리스트 28개 적용
- dashboard AI와 경제 섹션 그룹B 키워드 확장 + quota 5 -> 7
- dashboard 기사 수집 시간 범위 72h -> 48h (월요일 예외 72h)
- dashboard English 페이지 Video Brief + MOLTBOOK 링크 수정
- dashboard `jobs/moltbook_comment.py` 신규 추가 (외부 submolt 댓글 자동화)
- moltbook-scheduler 고아 프로세스 제거
- moltbook-scheduler API Key 교체
- moltbook-scheduler 스케줄 23:00 KST 확정 (CLAUDE.md, CONTROL_TOWER.md 수정 완료)
- OpsGuard scheduler.py: moltbook_morning 체크 05:30 -> 23:30 KST (VM 직접 수정)
- OpsGuard scheduler.py: chain_morning 체크 05:35 -> 23:35 KST (VM 직접 수정)
- OpsGuard는 현재 git 미관리 상태 -- VM에서 직접 수정, 레포 동기화 안 됨
- TODO: opsguard README.md 타임라인도 05:00 -> 23:00 수정 필요

### 2026-03-10

- YouTube OAuth Refresh Token 만료 → 수동 재발급 완료
- 원인: 불명확 (프로덕션 상태임에도 만료됨, Google 보안 이벤트 또는 Fly.io 재배포 가능성)
- 재발급 절차: myaccount.google.com/permissions 권한 해제 → youtube-automation.fly.dev/settings → Open Google Authorization → code 복사 → Get Token → `fly secrets set YT_REFRESH_TOKEN` 등록
- Google OAuth 앱 상태: In production (7일 만료 아님)
- 향후 동일 문제 발생 시 위 절차 참조
- generate_summary.py 스킵 로직 수정: 날짜 비교만 하던 것을 briefing 콘텐츠 해시(SHA-256) 비교 추가
- 원인: 오전 RSS only 요약이 생성되면 오후 OCR 반영 후에도 날짜가 같아 스킵되던 문제
- 효과: 오후 OCR 데이터 반영 시 EN/KR summary 자동 재생성

### 2026-03-12

- youtube-automation OAuth scope 수정: `youtube.upload` → `youtube` (플레이리스트 추가 권한 포함)
- 원인: `playlistItems.insert` API가 `youtube.upload` scope로는 403 "insufficient authentication scopes" 반환
- OAuth 토큰 재발급 완료 (새 scope 적용, `fly secrets set YT_REFRESH_TOKEN`)
- 내일부터 영상 업로드 후 플레이리스트 자동 추가 정상 동작 예상
- OpsGuard scheduler.py: A-7 EN summary 체크 시간 16:15 → 17:00 KST 변경
- 이유: Dashboard 오후 런 완료(~16:28)보다 체크가 빨라서 오탐 발생

### 2026-03-16

- youtube-automation cron 스케줄 변경: UTC 06:00 → UTC 08:30 (KST 15:00 → KST 17:30)
- 이유: YouTube 파이프라인이 Dashboard 오후 EN summary 완료(~KST 17:00) 이전에 실행되어 어제 버전 스크립트를 사용하는 문제
- 효과: Dashboard 오후 워크플로우 완료 후 30분 버퍼 확보
- Moltbook comment 401 Unauthorized 에러 발생 — 원인 미확인 (알려진 이슈 #10 등록)

### 2026-03-17

- 경제 에세이 게시판 글쓰기 수정: Vercel read-only 파일시스템 문제로 저장 불가 → api/essays.ts를 GitHub Contents API로 essays.json 읽기/쓰기하도록 수정
- GitHub Fine-grained PAT 생성 (korea-economy-dashboard-essay, Contents R/W) → Vercel GITHUB_TOKEN 환경변수 추가
- YouTube OAuth scope 문제 재발: Google Cloud Console OAuth consent screen에 youtube scope 미등록이 근본 원인으로 확인 → scope 추가 후 토큰 재발급 완료
- YouTube cron 스케줄 변경: UTC 06:00 → UTC 08:30 (KST 15:00 → 17:30) — Dashboard 오후 EN summary 완료 후 실행 보장
