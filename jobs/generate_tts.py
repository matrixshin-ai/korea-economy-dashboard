"""
Google Cloud TTS — KR 브리핑 오디오 생성
GOOGLE_TTS_CREDENTIALS 환경변수(서비스 계정 JSON) 필요
cached_summary_kr.json → ko-KR-Wavenet-A → client/public/audio/briefing-kr.mp3
"""
import base64
import json
import os
import re
import sys
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
MAX_CHARS = 4800  # Google TTS limit: 5000 chars, 버퍼 포함


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
    resp.raise_for_status()
    return base64.b64decode(resp.json()["audioContent"])


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
    if len(text) > MAX_CHARS:
        print(f"  WARNING: text {len(text)} chars > {MAX_CHARS}, truncating")
        text = text[:MAX_CHARS]

    # 같은 날짜면 스킵
    if os.path.exists(META_PATH) and os.path.exists(AUDIO_PATH):
        try:
            meta = json.loads(open(META_PATH, encoding="utf-8").read())
            if meta.get("date") == briefing_date:
                print(f"  TTS already up to date (date={briefing_date}) - skipping")
                return
        except (json.JSONDecodeError, KeyError):
            pass

    print(f"Generating TTS: date={briefing_date}, chars={len(text)}, voice={VOICE_NAME}")

    token = get_access_token(credentials_info)
    print("  Access token obtained")

    audio_bytes = synthesize(text, token)
    print(f"  Synthesized {len(audio_bytes):,} bytes")

    os.makedirs(AUDIO_DIR, exist_ok=True)

    with open(AUDIO_PATH, "wb") as f:
        f.write(audio_bytes)

    meta = {
        "date": briefing_date,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "voice": VOICE_NAME,
        "chars": len(text),
        "size_bytes": len(audio_bytes),
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"  Saved: {AUDIO_PATH}")
    print(f"  Meta:  {META_PATH}")


if __name__ == "__main__":
    main()
