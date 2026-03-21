# moltbook-scheduler

> 다른 프로젝트 문서는 [CONTROL_TOWER.md](../CONTROL_TOWER.md) 참조

---

## 개요

**위치**: GCP VM
**스택**: Python, Claude API (drafter), Moltbook API, Telegram Bot

## 데이터 파이프라인

```
korea-economy-dashboard      moltbook-scheduler         Moltbook
(/api/briefing)               |                         (m/ai-macro-policy)
  AI와 경제 section  -->  collector.py  -->  drafter.py  -->  publisher.py
  + topic filter        (topic filter)    (post type      (API + verify
  + macro context                          selection,      + state track
  + headlines                              word count,     + metrics)
                                           quality gate)
```

## Core Focus

AI agents x economic growth x inflation (삼각형)

## 포스트 타입

| Type | Target Words | Hard Max | 주간 목표 |
|------|-------------|----------|-----------|
| [Debate] | 90-160 | 180 | 3-4회 |
| [Analysis] | 160-260 | 320 | 1-2회 |
| [Rules] | 120-220 | 250 | ~1회/월 |

## 운영 규칙 (Spec S13)

- 포스트: Mon-Sat 1/day, 일요일 없음
- 자기포스트 답글: max 3/day, 40-80 words
- 외부 submolt 댓글: max 1/day, 삼각형 2개 이상 연결 필수

## Moltbook API 인증

1. Bearer API Key
2. Verification Challenge -- 매 게시/댓글마다 산술 문제 자동 풀이 필요
3. Unicode -> ASCII 변환 필수 (em-dash 등이 ?로 치환됨)

## 설정 정보

- **Telegram Bot**: 폴링 방식, Approve/Reject 버튼으로 사람 승인 후 게시
- **스케줄**: `run_bot(schedule_time="23:00")` -- 23:00 KST 확정
- **환경변수**: 프로젝트 `.env` (VM) + `.env.example` (레포)

---

## 알려진 이슈

| # | 이슈 | 우선순위 |
|---|------|----------|
| 3 | 외부 댓글 자동화 미완성 — 카운터(can_external_comment)만 있고 호출 코드 없음 | 높음 |
| 10 | Moltbook comment 401 Unauthorized 에러 (2026-03-16 발생, 원인 미확인) | 낮음 |

## 보류 중인 작업

| # | 작업 | 우선순위 |
|---|------|----------|
| 2 | 외부 댓글 자동화 완성 | 높음 |

---

## 변경 이력

### 2026-03-08

- 고아 프로세스 제거
- API Key 교체
- 스케줄: `run_bot(schedule_time="23:00")` -- 23:00 KST 확정
