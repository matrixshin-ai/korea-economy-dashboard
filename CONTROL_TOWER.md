# CONTROL_TOWER.md -- Operations Control Tower

> Last updated: 2026-05-15
> Purpose: 4개 앱 + OpsGuard의 전체 운영 상태, 연동 관계, 알려진 이슈, 보류 작업을 한 곳에 정리
>
> 프로젝트별 상세 문서:
> - [korea-economy-dashboard](docs/korea-economy-dashboard.md)
> - [youtube-automation](docs/youtube-automation.md)
> - [moltbook-scheduler](docs/moltbook-scheduler.md)
> - [ocr-automation](docs/ocr-automation.md)

---

## 0. Claude 운영 규칙

- 현재 시각은 Claude가 UTC 기준으로 직접 확인 후 KST(+9)로 변환하여 사용
- 사용자가 시각을 언급했더라도 오래된 메시지일 수 있으므로 Claude가 현재 UTC로 재계산
- 오늘 날짜는 사용자가 알려준 날짜를 우선 사용. 모르면 현재 UTC 기준으로 KST 날짜 계산
- 모든 시간은 KST(UTC+9) 기준으로 표시
- GitHub Actions 로그는 UTC이므로 반드시 +9시간 변환
- UTC 22:00 = KST 07:00 (오전 런)
- UTC 07:50 = KST 16:50 (저녁 런)

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
07:00 KST  [A] Dashboard 1차 (RSS only, 스케줄 트리거) → 오전 summary 제공
~14:00 KST     기재부 PDF 도착
14:30 KST  [B] OCR 파이프라인
        ↓  push_to_dashboard.py git push 완료 후 daily-update.yml 즉시 dispatch
       [A] Dashboard 2차 (이벤트 트리거, OCR 반영 + AI 요약 + Moltbook 댓글)
        ↓  EN summary 재생성 감지 시 youtube-automation pipeline.yml 자동 dispatch
       [D] YouTube 파이프라인 (이벤트 트리거)
15:30 KST      장 마감 → 지표 확정
16:50 KST  [A] Dashboard evening 런 (스케줄 fallback)
~18:00 KST [D] YouTube (OpsGuard 자동 복구 fallback)
22:00 KST      OpsGuard 일일 리포트
23:00 KST  [E] Obsidian daily export (독립 워크플로우, GHA 지연 허용, KST 15:30 가드)
```

> **2026-05-15 변경**: OCR push 후 즉시 dispatch 복원 (5/12 제거 → 원복).
> 16:50 evening 런은 스케줄 fallback으로 유지. OpsGuard YouTube 자동 복구도 fallback으로 병존.

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
| D-2 | Cron Run | GitHub Actions cron 최근 실행. 미실행 감지 시 Fly.io `/api/pipeline/trigger`에 직접 HTTP POST로 자동 복구 — GHA를 거치지 않으므로 Actions 로그에 흔적 없음 |
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
| 트리거 | GHA evening run (16:50 KST) | Telegram bot 스케줄 (23:00 KST) |
| 승인 | 자동 (사람 승인 없음) | Telegram 버튼 승인 |
| 횟수 제한 | 자체 히스토리 (moltbook_history.json) | daily_state.json (1/day) |
| API Key | GitHub Secrets | VM .env (동일 키) |

**문제: 두 시스템이 독립적으로 동작하여 1/day 외부 댓글 제한을 공유하지 않음.**

---

## 7. 크로스 프로젝트 알려진 이슈

| # | 이슈 | 관련 앱 | 우선순위 | 상태 |
|---|------|---------|----------|------|
| 1 | opsguard README.md 타임라인에 05:00 KST 잔존 -- 23:00으로 수정 필요 | opsguard | 중간 | 미해결 |
| 2 | moltbook_comment.py가 daily_state와 미연동 | dashboard + scheduler | 높음 | **해결** (설계 결정: 역할 분리로 종료. 외부 댓글은 moltbook_comment.py 전담, moltbook-scheduler는 자기 포스트만 담당) |
| 3 | moltbook-scheduler 외부 댓글 자동화 미완성 | moltbook-scheduler | 높음 | **해결** (설계 결정: 구현 안 하기로 확정, 이슈 #2와 동일) |
| 4 | OpsGuard 알림 타이밍 오탐 다수 (A-2, A-4, A-7, B-1) | opsguard | 중간 | 미해결 |
| 5 | Gemini API 불안정 (503/429) — 오후 summary 재생성 실패 | dashboard | 높음 | **해결** (2026-04-08 Claude API 전환, 종료) |
| 6 | OpsGuard가 git으로 관리되지 않음 | opsguard | 중간 | 미해결 |
| 7 | GCP VM에 flyctl 미설치 — Fly.io 자동 복구 불가 | opsguard | 중간 | **해결** (2026-04-11 flyctl 설치 완료) |
| 8 | FRED API GitHub Actions IP 차단 — us_rate 누락 | dashboard | 중간 | **부분 해결** (2026-04-09 fallback 로직 추가, 캐시값 재사용) |
| 9 | Vercel `/api/summary-status` HTML 반환 — YouTube readiness 폴링 45분 stuck | dashboard + youtube | 높음 | **해결** (2026-04-14 서버리스 함수 추가) |
| 10 | OCR step6 cp949 인코딩 오류 — ☑ 특수문자 포함 기사 제목 출력 시 UnicodeEncodeError | ocr-automation | 높음 | **해결** (2026-04-18 `sys.stdout.reconfigure(errors="replace")` 추가) |
| 11 | Moltbook pipeline maximum recursion depth 오류 — f-string 예외 로깅 시 재귀 발생 | moltbook-scheduler | 높음 | **부분 해결** (2026-04-18 로깅 개선, 4/19 자동 실행 결과 확인 필요) |
| 12 | YouTube 이중 트리거 — EN summary 미변경 시에도 YouTube dispatch 발생 | dashboard + youtube | 높음 | **해결** (2026-04-29 EN summary 재생성 감지 조건으로 전환, 종료) |
| 13 | moltbook_comment.py Gemini → Claude API 미전환 — google-genai import 실패로 54일간 외부 댓글 중단 | dashboard | 높음 | **해결** (2026-05-01 Claude API 전환 + MOLTBOOK_API_KEY 갱신) |
| 14 | Anthropic API 크레딧 소진 — 5/9 KR/EN summary 전체 실패, YouTube 미생성 | dashboard + youtube | 높음 | **해결** (2026-05-10 크레딧 $25 충전, Auto reload 활성화) |
| 15 | YouTube 트리거 조건 오류 — en_changed 미설정으로 dispatch 불가 | dashboard + youtube | 높음 | **해결** (2026-05-10 신규 EN 생성 시에도 en_changed=true 출력, schedule 조건 제거) |
| 16 | OpsGuard B-1 오탐 — OCR 정상 실행(일요일 제외)인데 last_commit_date 잘못 읽음 | opsguard | 중간 | **해결** (2026-05-13 체크 대상을 dashboard repo ocr_headlines.json 커밋으로 변경) |
| 17 | YouTube playlist 추가 403 — OAuth 토큰에 PlaylistItem.Insert 스코프 부족 | youtube-automation | 낮음 | 미해결 |
| 18 | OpsGuard A-7 warmup 자동 복구 대상 /api/warmup 404 — 실제 복구 미작동 | opsguard | 낮음 | 미해결 |
| 19 | OCR → Dashboard 자동 트리거 gap — push 후 수동 dispatch 또는 16:50 스케줄 대기 필요 | ocr-automation + dashboard | 낮음 | 관찰 중 |
| 20 | OpsGuard D-2 자동복구가 이벤트 기반 파이프라인과 충돌 가능 — D-2 체크(~18:00 KST)가 Fly.io 직접 POST로 YouTube 트리거하나, 정상 흐름에서는 19:37 KST evening 런이 트리거함. YouTube 중복 실행 원인 중 하나 | opsguard + youtube | 중간 | 미해결 |

> 프로젝트별 이슈는 각 프로젝트 문서 참조.

---

## 8. 보류 중인 작업

| # | 작업 | 관련 앱 | 우선순위 |
|---|------|---------|----------|
| 1 | opsguard README.md 타임라인 05:00 -> 23:00 수정 | opsguard | 중간 |
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

### 2026-05-22

**obsidian-export.yml 독립 워크플로우 분리**
- 원인: GHA 지연(최대 3h+)으로 obsidian 런 탐지 창(1시간) 이탈 → 이틀 연속 export 실패
- 수정: daily-update.yml에서 obsidian export 스텝 및 runtype 판별 로직 완전 제거
- 신규: .github/workflows/obsidian-export.yml 생성 (cron: UTC 14:00 = KST 23:00, 평일)
- 효과: GHA 지연 7시간 30분까지 허용, runtype 판단 불필요
- daily-update.yml cron 2개로 단순화: morning(07:00), evening(16:50)

**5/21 파이프라인 분석 결과 기록**
- KR summary에서 주식시장 섹션 누락 확인 → 당분간 관찰 예정
- moltbook_comment.py 로그에 "Gemini" 문자열 잔존 → 실제 API 호출 여부 확인 필요
- OpsGuard D-2 자동복구(Fly.io 직접 POST) → 이슈 #20 등록
- YouTube 중복 실행(19:58 dispatch + 20:42 schedule) → YouTube 자체 중복 방지 로직 확인 필요

### 2026-05-21

**미스터리 실행 원인 확인 (OpsGuard D-2 자동복구)**
- OpsGuard가 D-2(YouTube 미실행) 감지 시 Fly.io `/api/pipeline/trigger`에 직접 HTTP POST
- GHA를 거치지 않으므로 Actions 로그에 흔적 없음, `matrixshin-ai` 계정 트리거도 아님
- 매번 18:00 KST 전후 발생 → OpsGuard D-2 체크 시각과 일치
- 현재 이벤트 기반 파이프라인(19:37 KST evening 런)과 충돌 가능성 있음 → 이슈 #20 등록

**Obsidian daily export 버그 수정**
- 원인 1: runtype 판별에서 obsidian 분기(UTC 08:30~09:30)가 evening 조건(HOUR_UTC 7~11)에 가로채여 dead code였음
- 수정 1: daily-update.yml runtype 판별 순서 변경 — obsidian 분기를 evening보다 앞으로 이동
- 원인 2: cached_summary_kr.json이 장 마감 전 버전일 수 있어 불완전한 브리핑이 push될 위험
- 수정 2: export_to_daily_vault.py에 가드 추가 — 오늘 날짜(KST) 확인 + KST 15:30 이후인지 확인, 미충족 시 push 차단
- 결과: 18:00 KST obsidian 런이 매일 1회 장 마감 후 브리핑만 daily/에 push

### 2026-05-15

**trigger_dashboard_workflow() 복원 — OCR→Dashboard 즉시 트리거 원복**
- trigger_dashboard_workflow() 복원 (5/12 제거 → 원복, ocr-automation push_to_dashboard.py)
- 제거 이유(runtype 버그)가 잘못된 판단이었음 확인
- GHA evening 스케줄 불안정 확인 (오늘 16:50 KST 미실행, 14:33 수동 dispatch만 1건)
- OpsGuard 자동 복구가 YouTube fallback으로 작동 중 확인 (18:00 KST POST /api/pipeline/trigger → videoId: P-v2dDMuVmI)

### 2026-05-13

**런 스케줄 재편 — 장마감 확정 지표 반영 및 YouTube 업로드 품질 개선**
- 배경: 14:37 KST YouTube 업로드 시 장중 잠정 지표 기반 EN summary 사용 문제
- 15:45 KST afternoon 런 제거 → 16:50 KST evening 런으로 대체
- OCR push 후 즉시 workflow_dispatch 트리거 제거 (push_to_dashboard.py, ocr-automation 레포)
- runtype: afternoon → evening
- YouTube dispatch 조건: en_changed && afternoon → en_changed && evening
- 효과: 장마감(15:30) 확정 지표 + OCR 데이터가 모두 반영된 summary로 YouTube 업로드
- 실측: GHA 스케줄 지연 2시간 19분 발생 (16:50 설정 → 19:09 실행)

**YouTube 영상 끝 무음 여백 제거**
- 원인 1: concat demuxer 마지막 파일에 duration 없음 → ffmpeg 무한 연장
- 원인 2: -shortest 플래그가 concat demuxer와 함께 오작동
- 수정: 마지막 파일 duration 0.040초 명시 + -shortest → -t audioDuration(ffprobe 측정값)
- getAudioDuration() ffprobe 파싱 오류(NaN) 추가 수정: -of default=nw=1 → -of csv=p=0

**OpsGuard B-1 오탐 수정**
- 원인: ocr-automation repo 전체 커밋 확인 → 코드 변경 없는 날 항상 ERROR
- 수정: korea-economy-dashboard repo의 ocr_headlines.json 커밋 날짜 확인으로 변경

**OpsGuard A-7 체크 타이밍 조정**
- 원인: evening 런 GHA 스케줄 지연으로 16:15 체크 시점에 EN summary 미생성
- 수정: 16:15 KST → 20:00 KST (evening 런 완료 후 충분한 여유)

### 2026-05-12

**런 스케줄 재편 — 장마감 확정 지표 반영 및 YouTube 업로드 품질 개선**

- 배경: 14:37 KST YouTube 업로드 시 장중 잠정 지표 기반 EN summary 사용 문제
- 15:45 KST afternoon 런 제거 → 16:50 KST evening 런으로 대체
- OCR push 후 즉시 workflow_dispatch 트리거 제거 (push_to_dashboard.py, ocr-automation 레포)
- runtype: afternoon → evening
- YouTube dispatch 조건: en_changed && afternoon → en_changed && evening
- 효과: 장마감(15:30) 확정 지표 + OCR 데이터가 모두 반영된 summary로 YouTube 업로드

### 2026-05-10

**Anthropic API 크레딧 소진 복구**

- Feb 22 지급된 $5.50 credit grant 소진 (5/9 기준)
- $25 크레딧 충전, Auto reload 활성화 ($5 이하 시 $15 자동 충전)
- 월 예상 비용: $3~5 (haiku 기준)

**YouTube 트리거 조건 수정**

- `generate_summary.py`: EN 신규 생성 시에도 `"EN briefing content changed"` 출력 추가
- `daily-update.yml`: Trigger YouTube pipeline if 조건에서 `github.event_name == 'schedule'` 제거
- 수정 전: hash 변경 시에만 `en_changed=true` → 수정 후: 신규 생성/date 불일치 포함 모든 EN 생성 시 true

**OpsGuard B-1 오탐 확인**

- OCR은 일요일 제외 매일 정상 실행 중 (기재부 PDF 미발행일)
- B-1 체크 로직이 last_commit_date를 잘못 읽는 버그 → 미해결

### 2026-05-01

**moltbook_comment.py Gemini → Claude API 전환**

- `generate_comment()`: Gemini 2.5 Flash → Claude Haiku (`claude-haiku-4-5-20251001`) 전환
- `google-genai` import 완전 제거, `anthropic` SDK 사용 (기존 의존성)
- `daily-update.yml`: Post Moltbook comment 스텝 env `GEMINI_API_KEY` → `ANTHROPIC_API_KEY` 변경
- 원인: `google-genai`가 `requirements.txt`에 누락되어 2026-03-08 이후 54일간 import 실패
- MOLTBOOK_API_KEY GitHub Secrets 갱신 (GCP VM의 유효한 키로 동기화)
- RAINDROP_TOKEN GitHub Secrets 갱신 (만료된 토큰 교체)
- daily-update.yml YouTube 트리거에 `github.event_name == 'schedule'` 조건 추가 (workflow_dispatch 시 YouTube 트리거 방지)
- 외부 댓글 역할 분리 설계 확정: moltbook_comment.py가 외부 submolt 댓글 전담, moltbook-scheduler는 자기 포스트만 담당 (이슈 #2, #3 종료)

**fetch_raindrop.py: Raindrop API 일시적 401 retry 로직 추가**

- 원인: raise_for_status() 후 즉시 sys.exit(1) — 일시적 401로 5/1 오전 런 실패
- 토큰 자체는 정상 (디버그 런에서 /rest/v1/user 200 확인)
- 수정: 최대 3회 retry, backoff 5→10→20초, 401/429/5xx 모두 대상

### 2026-05-20

**Obsidian daily vault 자동 연동 구축**

- `jobs/export_to_daily_vault.py` 신규 작성
  - 소스: `cached_summary_kr.json` (나레이션 한국어 브리핑 전문)
  - 대상: `matrixshin-ai/obsidian-vault` 레포의 `daily/YYYY-MM-DD-economy-briefing.md`
  - GitHub Contents API로 직접 push (파일 존재 시 update, 없으면 create)
  - 첫 줄 # 헤더 자동 제거, YAML frontmatter 포함
- `daily-update.yml` 스텝 추가
  - cron 추가: `0 9 * * 1-5` (KST 18:00 평일)
  - runtype `obsidian` 조건 추가 (UTC 08:30~09:30)
  - Export 스텝 조건: `steps.runtype.outputs.type == 'obsidian'`
- GitHub Secret `VAULT_PAT` 등록 (`matrixshin-ai/korea-economy-dashboard`)
- `obsidian-vault` 레포에 `daily/` 폴더 생성 (집 PC에서 push)
- LLMwiki `OBSIDIAN_SOURCES_DIR` 확장
  - 기존: `Clippings`
  - 변경: `Economy, JAMnomics, daily, Clippings` (4개 폴더)

### 2026-05-19

**LLM Wiki 구축**
→ [[LLMWiki-Setup-Guide]]

### 2026-04-30

**push_to_dashboard.py: cp949 인코딩 오류 근본 해결**

- `sys.stdout.reconfigure(encoding='utf-8', errors='replace')` / `sys.stderr` 동일 추가
  - ⋯ (U+22EF), ☑ (U+2611) 등 어떤 유니코드 특수문자가 나와도 프로그램 중단 없이 처리
- `run_render()` 함수: subprocess 호출 시 `PYTHONIOENCODING=utf-8` 환경변수 전달
  - render.py는 매 실행마다 `git reset --hard origin/main`으로 원복되므로 파일 수정 대신 환경변수로 해결
- 오늘(4/30) OCR 18건 수동 push 완료, Dashboard workflow dispatch 정상

### 2026-04-29

**Raindrop → Dashboard 연동 구현**

- `jobs/fetch_raindrop.py` 신규 작성
  - 컬렉션 ID: 70314520, `GET /rest/v1/raindrops/70314520`
  - `RAINDROP_TOKEN` 환경변수로 Bearer 인증
  - KST 기준 최근 24시간 이내 북마크 필터링
  - Claude API로 한국어 핵심이슈 요약 생성
  - `jobs/data/raindrop_headlines.json` 저장
- `jobs/render.py`: `raindrop_headlines.json` 병합 — OCR 헤드라인보다 먼저 표시, `핵심이슈` 섹션 추가
- `daily-update.yml`: Fetch Raindrop bookmarks 스텝 추가 (`RAINDROP_TOKEN`, `ANTHROPIC_API_KEY`)
- GitHub Secrets에 `RAINDROP_TOKEN` 추가
- 반영 범위: 오늘의 핵심이슈, 오늘의 뉴스 종합(KR/EN), YouTube 스크립트

**daily-update.yml YouTube 트리거 조건 개선**

- 기존: EN summary 생성 성공 시 항상 트리거 (`steps.summary.outcome == 'success'`)
- 변경 1: `"EN briefing content changed"` 감지 시에만 트리거 (`steps.summary.outputs.en_changed == 'true'`)
- 변경 2: 오후 런(afternoon)에서만 YouTube 트리거 (`&& steps.runtype.outputs.type == 'afternoon'`)
- `generate_summary.py` 출력을 `tee`로 캡처, grep으로 EN 재생성 여부를 step output에 반영
- 배경: 오전 런에서도 EN summary가 재생성되어 YouTube가 오전 버전으로 생성되는 문제
- 중복 영상 수동 삭제 (2026-04-28 제목, Apr 29 업로드본)

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

## 11. Obsidian LLM Wiki

> 상세 가이드: `C:\Users\minsi\Documents\obsidian-vault\LLMWiki-Setup-Guide.md`

### 구축 완료 항목

| 항목 | 상태 |
|------|------|
| Obsidian vault (`matrixshin-ai/obsidian-vault`) GitHub 동기화 | 완료 |
| Obsidian Git 플러그인 (Auto commit/push 10분) | 완료 |
| LLM Wiki (`obsidian-wiki/`) 설치 및 `.env` 설정 | 완료 |
| Obsidian Web Clipper (기사 → `Clippings/` 자동 저장) | 완료 |
| Zotero + Obsidian Integration (PDF/논문 수집) | 완료 |
| Claude Code Integration 플러그인 (Windows npm 경로) | 완료 |
| korea-economy-dashboard → `daily/` 브리핑 자동 push | 완료 (2026-05-22 obsidian-export.yml 독립 워크플로우로 분리) |

### OBSIDIAN_SOURCES_DIR (현재 설정)

```
Economy/, JAMnomics/, daily/, Clippings/
```

### 핵심 명령어

| 명령어 | 용도 |
|--------|------|
| `/wiki-status` | 미수집 자료 및 페이지 현황 확인 |
| `/wiki-ingest` | 새 자료 → Wiki 페이지 변환 |
| `/wiki-query` | Wiki에 질문 |
| `/wiki-lint` | 품질 검사 (모순, 고립 페이지) |

> **실행 위치:** 터미널 Claude Code (Obsidian 내부 Claude Code 아님)

### 향후 계획

- [ ] 2026-05-22 KST 23:00 첫 실행 예정 — 내일 아침 확인 필요
- [ ] Economy 폴더 전체 ingest
- [ ] JAMnomics ingest (Economy와 cross-link)
- [ ] `/wiki-lint` 실행으로 품질 점검

---

## 12. 참고 문서

로컬 Downloads 폴더에 스펙 문서들 존재:
- orchestration-agent-plan.md
- audit_report.md
- korea_economy_dashboard_spec.md
- moltbook-policyeditorbot-spec.md
- youtube-automation-system-spec.md
- opsguard-context-for-new-chat.md
- opsguard-cd-guide.md
- opsguard-cd-progress.md
