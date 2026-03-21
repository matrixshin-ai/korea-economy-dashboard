# ocr-automation

> 다른 프로젝트 문서는 [CONTROL_TOWER.md](../CONTROL_TOWER.md) 참조

---

## 개요

**위치**: 로컬 PC
**스케줄**: Windows Task Scheduler, **14:30 KST** (2026-03-08 변경: 14:00 -> 14:30)

## 파이프라인

기재부 석간 PDF -> OCR -> 기사 매칭 -> `ocr_headlines.json` push to dashboard

## 매칭 기준

- OK: score >= 84
- REVIEW: score >= 65
- FAIL: score < 65

## 설정 정보

- **출력**: `output_daily/matched/matched_YYYYMMDD.xlsx` (14 columns)
- **Push**: `push_to_dashboard.py` -> `jobs/data/ocr_headlines.json`

---

## 알려진 이슈

현재 없음.

## 보류 중인 작업

현재 없음.

---

## 변경 이력

### 2026-03-08

- 스케줄 14:00 -> 14:30 KST (Windows Task Scheduler)
