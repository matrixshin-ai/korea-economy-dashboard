# CONTROL_TOWER.md -- Operations Control Tower

> Last updated: 2026-03-08
> Purpose: 4개 앱 + OpsGuard의 전체 운영 상태, 연동 관계, 알려진 이슈, 보류 작업을 한 곳에 정리

---

## 1. 시스템 전체 구조

```
                      OpsGuard (GCP VM)
                      모니터링 + 알림
                           |
        +------------------+------------------+------------------+
        |                  |                  |                  |
  korea-economy-       ocr-automation    moltbook-         youtube-
  dashboard            (로컬 PC)         scheduler         automation
  (Vercel + GHA)                         (GCP VM)          (Fly.io)
        |                  |                  |
        +------ 데이터 ---->|                  |
        |<----- OCR -------+                  |
        |<----- API (/api/briefing) ----------+
        +------ moltbook_comment.py --------> Moltbook
        |                                     |
        |                  moltbook_api.py -->-+
```

## 2. 앱별 상태

| 앱 | 레포 | 인프라 | 상태 |
|----|------|--------|------|
| korea-economy-dashboard | matrixshin-ai/korea-economy-dashboard | Vercel + Neon DB + GitHub Actions | 정상 |
| ocr-automation | matrixshin-ai/ocr-automation (private) | 로컬 PC (Windows Task Scheduler) | 정상 |
| moltbook-scheduler | matrixshin-ai/moltbook-scheduler (private) | GCP e2-micro VM (us-central1-a) | 정상 |
| youtube-automation | matrixshin-ai/youtube-automation | Fly.io (nrt) | 정상 |
| opsguard | matrixshin-ai/opsguard (private) | GCP e2-micro VM (us-central1-a) | 정상 |

### GCP VM (moltbook-bot, e2-micro, us-central1-a)

두 서비스 공존:
- `moltbook-telegram.service` -- PolicyEditorBot
- `opsguard.service` -- OpsGuard 모니터링

VM 사용자: `matrix_shin` (경로: `/home/matrix_shin/`)
접속: `gcloud compute ssh moltbook-bot --zone=us-central1-a`

---

## 3. 일일 타임라인

```
23:00 KST  [C] Moltbook 파이프라인 (collect -> draft -> Telegram 미리보기)
07:00 KST  [A] Dashboard 1차 (RSS only, GHA cron 22:00 UTC)
~14:00 KST     기재부 PDF 도착
14:30 KST  [B] OCR 파이프라인 (Windows Task Scheduler, 2026-03-08 변경: 14:00 -> 14:30)
15:45 KST  [A] Dashboard 2차 (OCR 반영 + AI 요약 + Moltbook 댓글, GHA cron 06:45 UTC)
~15:00+ KST [D] YouTube (GHA cron UTC 06:00, 지연 0~3h)
22:00 KST      OpsGuard 일일 리포트
              (23:00 확정 -- 코드와 문서 일치)
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
| C-1 | Service Status | systemd 서비스 active 여부 (로컬 subprocess) |
| C-2 | Pipeline Triggered | journalctl에서 "PIPELINE TRIGGERED" 검색 |
| C-3 | Skip Marker | `data/skips/skip_YYYYMMDD.json` 존재 시 정상 스킵으로 처리 |
| C-4 | Post Published | 당일 게시 여부 |
| C-5 | API Health | Moltbook API 응답 |

### D: YouTube (youtube-automation)

| ID | 체크 | 설명 |
|----|------|------|
| D-1 | Worker Health | Fly.io 워커 HTTP health |
| D-2 | Cron Run | GitHub Actions cron 최근 실행 |
| D-3 | Video Published | 당일 영상 게시 여부 |
| D-4 | Pipeline Status | 파이프라인 완료/진행 상태 |
| D-5 | Warmup | `/api/cron/warmup` |
| D-6 | Test Fetch | `/api/pipeline/test-fetch` |

### CH: Chain Checks (교차 검증)

| ID | 체크 | 설명 |
|----|------|------|
| CH-1 | OCR -> Dashboard | OCR 데이터가 대시보드에 반영되었는지 |
| CH-2 | Dashboard -> Moltbook | 대시보드 데이터가 Moltbook 수집에 사용되었는지 |
| CH-3 | Dashboard -> YouTube | 대시보드 데이터가 YouTube에 사용되었는지 |
| CH-4 | End-to-End | 전체 파이프라인 정상 여부 |

### OpsGuard 환경변수 (VM .env)

```
TELEGRAM_BOT_TOKEN=(OpsGuard 전용 봇, PolicyEditorBot과 분리)
TELEGRAM_CHAT_ID=(소유자 chat ID)
GITHUB_PAT=ghp_...
DASHBOARD_URL=https://korea-economy-dashboard.vercel.app
YT_WORKER_URL=https://youtube-automation.fly.dev
GITHUB_OWNER=matrixshin-ai
DASHBOARD_REPO=korea-economy-dashboard
OCR_REPO=ocr-automation
MOLTBOOK_REPO=moltbook-scheduler
YOUTUBE_REPO=youtube-automation
```

### OpsGuard CD

GitHub Actions `deploy.yml`: main push -> Workload Identity Federation -> tar+scp+rsync -> VM 배포 -> systemctl restart

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

### 5-B. ocr-automation

**위치**: `C:\ocr_automation` (로컬 PC)
**스케줄**: Windows Task Scheduler, **14:30 KST** (2026-03-08 변경: 14:00 -> 14:30)

**파이프라인**: 기재부 석간 PDF -> OCR -> 기사 매칭 -> `ocr_headlines.json` push to dashboard

**매칭 기준**:
- OK: score >= 84
- REVIEW: score >= 65
- FAIL: score < 65

**출력**: `output_daily/matched/matched_YYYYMMDD.xlsx` (14 columns)
**Push**: `push_to_dashboard.py` -> `jobs/data/ocr_headlines.json`

### 5-C. moltbook-scheduler

**위치**: GCP VM `/home/matrix_shin/moltbook-scheduler/`
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
1. Bearer API Key (`Authorization: Bearer {MOLTBOOK_API_KEY}`)
2. Verification Challenge -- 매 게시/댓글마다 산술 문제 자동 풀이 필요
3. Unicode -> ASCII 변환 필수 (em-dash 등이 ?로 치환됨)

**Telegram Bot**: 폴링 방식, Approve/Reject 버튼으로 사람 승인 후 게시

**2026-03-08 변경사항**:
- 고아 프로세스 제거 (PID 459184)
- Anthropic API Key 교체
- 스케줄: `run_bot(schedule_time="23:00")` -- 23:00 KST 확정

### 5-D. youtube-automation

**인프라**: Fly.io (nrt region)
**레포**: matrixshin-ai/youtube-automation
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
| 트리거 | GHA afternoon run (15:45 KST) | Telegram bot 스케줄 |
| 승인 | 자동 (사람 승인 없음) | Telegram 버튼 승인 |
| 횟수 제한 | 자체 히스토리 (moltbook_history.json) | daily_state.json (1/day) |
| API Key | `MOLTBOOK_API_KEY` (GitHub Secrets) | 동일 키, VM .env |

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

### 낮은 우선순위 / 미파악

| # | 이슈 | 비고 |
|---|------|------|
| 6 | YouTube 자동화 상세 구조 미파악 | 스펙 문서 존재하나 코드 미확인 |
| 7 | ~~CLAUDE.md 문서 일부 오래됨~~ | 해결됨 (23:00 KST로 수정 완료) |

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

## 10. 환경변수 / Secrets 목록

### korea-economy-dashboard (GitHub Secrets)

| Key | 용도 |
|-----|------|
| GEMINI_API_KEY | Gemini 2.5 Flash (요약 + 댓글 생성) |
| NAVER_CLIENT_ID | Naver 검색 API |
| NAVER_CLIENT_SECRET | Naver 검색 API |
| MOLTBOOK_API_KEY | Moltbook 댓글 게시 |

### korea-economy-dashboard (.env, 로컬 전용)

| Key | 용도 |
|-----|------|
| ADMIN_PASSWORD | 관리 비밀번호 |
| GEMINI_API_KEY | 로컬 테스트용 |
| AI_INTEGRATIONS_GEMINI_API_KEY | Vercel AI 연동 |
| MOLTBOOK_API_KEY | 로컬 테스트용 |

### moltbook-scheduler (VM .env)

| Key | 용도 |
|-----|------|
| MOLTBOOK_API_KEY | Moltbook API (moltbook_sk_...) |
| DASHBOARD_URL | Dashboard API 엔드포인트 |
| TELEGRAM_BOT_TOKEN | PolicyEditorBot Telegram |
| TELEGRAM_CHAT_ID | 소유자 chat ID |
| WEEKLY_REPORT_CHAT_ID | 주간 리포트 채널 |
| ANTHROPIC_API_KEY | Claude API (drafter) |

### Moltbook API Key 형식

접두사: `moltbook_sk_`
활성 에이전트: PolicyEditorBot (`moltbook_sk_JVHgCl1wScCpoHBpAAkpuGhyLqzlt5Fy`)

---

## 11. 참고 문서 (로컬)

```
C:\Users\신민식\Downloads\orchestration-agent-plan.md
C:\Users\신민식\Downloads\audit_report.md
C:\Users\신민식\Downloads\korea_economy_dashboard_spec.md
C:\Users\신민식\Downloads\moltbook-policyeditorbot-spec.md
C:\Users\신민식\Downloads\youtube-automation-system-spec.md
C:\Users\신민식\Downloads\CONTEXT_FOR_NEW_CHAT__1_.md
C:\Users\신민식\Downloads\opsguard-context-for-new-chat.md
C:\Users\신민식\Downloads\opsguard-cd-guide.md
C:\Users\신민식\Downloads\opsguard-cd-progress.md
C:\Users\신민식\Downloads\claude-code-opsguard-impl.md
```

---

## 12. 변경 이력

### 2026-03-08

- ocr-automation 스케줄 14:00 -> 14:30 KST (Windows Task Scheduler)
- dashboard 매체 화이트리스트 28개 적용
- dashboard AI와 경제 섹션 그룹B 키워드 확장 + quota 5 -> 7
- dashboard 기사 수집 시간 범위 72h -> 48h (월요일 예외 72h)
- dashboard English 페이지 Video Brief + MOLTBOOK 링크 수정
- dashboard `jobs/moltbook_comment.py` 신규 추가 (외부 submolt 댓글 자동화)
- moltbook-scheduler 고아 프로세스 제거 (PID 459184)
- moltbook-scheduler Anthropic API Key 교체
- moltbook-scheduler 스케줄 23:00 KST 확정 (CLAUDE.md, CONTROL_TOWER.md 수정 완료)
- TODO: opsguard README.md 타임라인도 05:00 -> 23:00 수정 필요
