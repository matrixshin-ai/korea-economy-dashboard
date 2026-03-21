# youtube-automation

> 다른 프로젝트 문서는 [CONTROL_TOWER.md](../CONTROL_TOWER.md) 참조

---

## 개요

**인프라**: PaaS (Fly.io)
**상세 구조**: 미파악 (추후 확인 필요)

## 설정 정보

- **스케줄**: ~17:30 KST (GitHub Actions cron UTC 08:30)
- **환경변수**: 별도 확인 필요

---

## 알려진 이슈

| # | 이슈 | 우선순위 |
|---|------|----------|
| 9 | YouTube OAuth token 간헐적 만료 — 원인 미확정, 발생 시 수동 재발급 필요 (절차는 변경 이력 2026-03-10 참조) | 낮음 |

## 보류 중인 작업

| # | 작업 | 우선순위 |
|---|------|----------|
| 6 | YouTube 자동화 구조 파악 | 낮음 |

---

## 변경 이력

### 2026-03-10

- YouTube OAuth Refresh Token 만료 → 수동 재발급 완료
- 원인: 불명확 (프로덕션 상태임에도 만료됨, Google 보안 이벤트 또는 Fly.io 재배포 가능성)
- 재발급 절차: myaccount.google.com/permissions 권한 해제 → youtube-automation.fly.dev/settings → Open Google Authorization → code 복사 → Get Token → `fly secrets set YT_REFRESH_TOKEN` 등록
- Google OAuth 앱 상태: In production (7일 만료 아님)
- 향후 동일 문제 발생 시 위 절차 참조

### 2026-03-12

- youtube-automation OAuth scope 수정: `youtube.upload` → `youtube` (플레이리스트 추가 권한 포함)
- 원인: `playlistItems.insert` API가 `youtube.upload` scope로는 403 "insufficient authentication scopes" 반환
- OAuth 토큰 재발급 완료 (새 scope 적용, `fly secrets set YT_REFRESH_TOKEN`)

### 2026-03-16

- cron 스케줄 변경: UTC 06:00 → UTC 08:30 (KST 15:00 → KST 17:30)
- 이유: YouTube 파이프라인이 Dashboard 오후 EN summary 완료(~KST 17:00) 이전에 실행되어 어제 버전 스크립트를 사용하는 문제
- 효과: Dashboard 오후 워크플로우 완료 후 30분 버퍼 확보

### 2026-03-17

- YouTube OAuth scope 문제 재발: Google Cloud Console OAuth consent screen에 youtube scope 미등록이 근본 원인으로 확인 → scope 추가 후 토큰 재발급 완료
- cron 스케줄 변경: UTC 06:00 → UTC 08:30 (KST 15:00 → 17:30) — Dashboard 오후 EN summary 완료 후 실행 보장

### 2026-03-21

- 중복 업로드 방지 로직 추가
- 원인: GitHub Actions curl이 `waitForScriptReady` 45분 대기 후 재시도하면서 Fly.io 파이프라인이 2회 실행됨 (03-17 발생 확인: 동일 날짜에 영상 2개 업로드)
- 해결: `/api/cron/pipeline`에 KST 날짜 기준 중복 체크 추가 — DB에서 당일 completed + youtubeVideoId 존재 시 `{"status":"skipped","reason":"Already uploaded today"}` 반환
- 수동 트리거(`/api/pipeline/trigger`)는 중복 체크 제외 (필요시 수동 재실행 가능)
- 변경 파일: `server/routes.ts` (getKSTDateString + 중복 체크), `server/storage.ts` (getCompletedUploadForDate 메서드)
