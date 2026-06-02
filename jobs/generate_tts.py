"""
Google Cloud TTS — KR 브리핑 오디오 생성
GOOGLE_TTS_CREDENTIALS 환경변수(서비스 계정 JSON) 필요
cached_summary_kr.json → ko-KR-Wavenet-A → client/public/audio/briefing-kr.mp3
텍스트를 4,900 bytes 청크로 나눠 여러 번 호출 후 MP3 합산
"""
import base64
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

import requests
from google.oauth2 import service_account
import google.auth.transport.requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHED_SUMMARY_KR = os.path.join(BASE_DIR, "cached_summary_kr.json")
AUDIO_DIR = os.path.join(BASE_DIR, "client", "public", "audio")
AUDIO_PATH = os.path.join(AUDIO_DIR, "briefing-kr.mp3")
META_PATH = os.path.join(AUDIO_DIR, "briefing-meta.json")

TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize"
SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
VOICE_NAME = "ko-KR-Wavenet-A"
MAX_CHUNK_BYTES = 4900


def clean_markdown(text: str) -> str:
    """TTS에 불필요한 마크다운 제거."""
    text = re.sub(r"^#{1,3}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def get_access_token(info: dict) -> str:
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    req = google.auth.transport.requests.Request()
    creds.refresh(req)
    return creds.token


def split_text_into_chunks(text: str, max_bytes: int = MAX_CHUNK_BYTES) -> list[str]:
    """텍스트를 max_bytes 이하의 청크로 분리 (문장/줄바꿈 단위 우선, UTF-8 경계 보장)."""

    def safe_cut(data: bytes, limit: int) -> tuple[bytes, bytes]:
        end = min(limit, len(data))
        while end > 0:
            try:
                data[:end].decode("utf-8")
                break
            except UnicodeDecodeError:
                end -= 1
        return data[:end], data[end:]

    chunks: list[str] = []
    current_parts: list[str] = []
    current_bytes = 0

    lines = text.splitlines(keepends=True)

    for line in lines:
        if len(line.encode("utf-8")) > max_bytes:
            segments = re.split(r"(?<=[.!?。])\s*", line)
        else:
            segments = [line]

        for seg in segments:
            seg_bytes = len(seg.encode("utf-8"))

            if seg_bytes > max_bytes:
                # 마지막 수단: UTF-8 경계에서 강제 분할
                if current_parts:
                    chunks.append("".join(current_parts).strip())
                    current_parts, current_bytes = [], 0
                remaining = seg.encode("utf-8")
                while remaining:
                    chunk_data, remaining = safe_cut(remaining, max_bytes)
                    if not chunk_data:
                        break
                    chunks.append(chunk_data.decode("utf-8").strip())
                continue

            if current_bytes + seg_bytes > max_bytes:
                if current_parts:
                    chunks.append("".join(current_parts).strip())
                current_parts, current_bytes = [seg], seg_bytes
            else:
                current_parts.append(seg)
                current_bytes += seg_bytes

    if current_parts:
        chunks.append("".join(current_parts).strip())

    return [c for c in chunks if c.strip()]


def synthesize(text: str, token: str) -> bytes:
    resp = requests.post(
        TTS_ENDPOINT,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "input": {"text": text},
            "voice": {"languageCode": "ko-KR", "name": VOICE_NAME},
            "audioConfig": {"audioEncoding": "MP3"},
        },
        timeout=60,
    )
    if not resp.ok:
        print(f"  TTS API error {resp.status_code}: {resp.text}")
    resp.raise_for_status()
    return base64.b64decode(resp.json()["audioContent"])


def synthesize_chunk(text: str, token: str) -> bytes:
    """synthesize() 재활용 — 일시적 오류(429/500/503) 시 최대 3회 재시도."""
    for attempt in range(1, 4):
        try:
            return synthesize(text, token)
        except requests.HTTPError as e:
            status = e.response.status_code if e.response is not None else 0
            if status in (429, 500, 503) and attempt < 3:
                wait = 2 ** attempt
                print(f"    TTS error {status}, retry {attempt}/3 in {wait}s...")
                time.sleep(wait)
            else:
                raise


def main() -> None:
    creds_raw = os.environ.get("GOOGLE_TTS_CREDENTIALS", "")
    if not creds_raw:
        print("GOOGLE_TTS_CREDENTIALS not set - skipping TTS generation")
        return

    credentials_info = json.loads(creds_raw)

    if not os.path.exists(CACHED_SUMMARY_KR):
        print(f"No KR summary at {CACHED_SUMMARY_KR}")
        sys.exit(1)

    with open(CACHED_SUMMARY_KR, encoding="utf-8") as f:
        summary_data = json.load(f)

    briefing_date = summary_data.get("date", "")
    raw_text = summary_data.get("summary", "")
    if not raw_text:
        print("Empty KR summary - skipping")
        return

    text = clean_markdown(raw_text)

    # 같은 날짜면 스킵
    if os.path.exists(META_PATH) and os.path.exists(AUDIO_PATH):
        try:
            meta = json.loads(open(META_PATH, encoding="utf-8").read())
            if meta.get("date") == briefing_date:
                print(f"  TTS already up to date (date={briefing_date}) - skipping")
                return
        except (json.JSONDecodeError, KeyError):
            pass

    total_bytes = len(text.encode("utf-8"))
    chunks = split_text_into_chunks(text, max_bytes=MAX_CHUNK_BYTES)
    print(f"Generating TTS: date={briefing_date}, chars={len(text)}, total_bytes={total_bytes}, chunks={len(chunks)}, voice={VOICE_NAME}")
    for i, chunk in enumerate(chunks):
        print(f"  chunk[{i}]: {len(chunk.encode('utf-8'))} bytes")

    token = get_access_token(credentials_info)
    print("  Access token obtained")

    start = time.time()
    mp3_parts: list[bytes] = []

    for i, chunk in enumerate(chunks):
        t0 = time.time()
        mp3 = synthesize_chunk(chunk, token)
        elapsed = time.time() - t0
        print(f"  chunk[{i}]: {len(mp3):,} bytes MP3 ({elapsed:.1f}s)")
        mp3_parts.append(mp3)

    total_mp3 = b"".join(mp3_parts)
    total_elapsed = time.time() - start

    os.makedirs(AUDIO_DIR, exist_ok=True)

    with open(AUDIO_PATH, "wb") as f:
        f.write(total_mp3)

    meta = {
        "date": briefing_date,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "voice": VOICE_NAME,
        "chars": len(text),
        "chunks": len(chunks),
        "size_bytes": len(total_mp3),
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"\n  Saved: {AUDIO_PATH} ({len(total_mp3):,} bytes)")
    print(f"  Total: {len(chunks)} chunks, {total_elapsed:.1f}s elapsed")


if __name__ == "__main__":
    main()
