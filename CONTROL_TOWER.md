# CONTROL_TOWER.md -- Operations Control Tower

> Last updated: 2026-03-21
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

| # | 이슈 | 관련 앱 | 우선순위 |
|---|------|---------|----------|
| 1 | opsguard README.md 타임라인에 05:00 KST 잔존 -- 23:00으로 수정 필요 | opsguard | 중간 |
| 2 | moltbook_comment.py가 daily_state와 미연동 | dashboard + scheduler | 높음 |
| 3 | moltbook-scheduler 외부 댓글 자동화 미완성 | moltbook-scheduler | 높음 |
| 4 | OpsGuard 알림 타이밍 오탐 다수 (A-2, A-4, A-7, B-1) | opsguard | 중간 |
| 6 | OpsGuard가 git으로 관리되지 않음 | opsguard | 중간 |

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

## 10. 참고 문서

로컬 Downloads 폴더에 스펙 문서들 존재:
- orchestration-agent-plan.md
- audit_report.md
- korea_economy_dashboard_spec.md
- moltbook-policyeditorbot-spec.md
- youtube-automation-system-spec.md
- opsguard-context-for-new-chat.md
- opsguard-cd-guide.md
- opsguard-cd-progress.md
