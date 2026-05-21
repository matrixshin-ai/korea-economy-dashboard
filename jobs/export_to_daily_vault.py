import base64
import json
import os
from datetime import datetime, timezone, timedelta

import requests

KST = timezone(timedelta(hours=9))
today = datetime.now(KST).strftime("%Y-%m-%d")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KR_CACHE = os.path.join(BASE_DIR, "cached_summary_kr.json")

REPO = "matrixshin-ai/obsidian-vault"
REMOTE_PATH = f"daily/{today}-economy-briefing.md"
API_URL = f"https://api.github.com/repos/{REPO}/contents/{REMOTE_PATH}"

VAULT_PAT = os.environ.get("VAULT_PAT", "")
if not VAULT_PAT:
    raise RuntimeError("VAULT_PAT environment variable not set")

with open(KR_CACHE, encoding="utf-8") as f:
    cache = json.load(f)

narration = cache.get("summary", "").strip()
narration_lines = narration.splitlines()
if narration_lines and narration_lines[0].startswith("#"):
    narration = "\n".join(narration_lines[1:]).lstrip("\n")

content_md = "\n".join([
    "---",
    f"date: {today}",
    "tags: [economy, daily-briefing, auto-generated]",
    "source: korea-economy-dashboard",
    "---",
    "",
    f"# {today} 오늘의 경제 브리핑",
    "",
    narration,
])

briefing_date = cache.get("date", "")
if briefing_date != today:
    print(f"WARNING: cached_summary_kr.json date ({briefing_date}) != today ({today}). Skipping push.")
    raise SystemExit(0)

now_kst = datetime.now(KST)
market_close = now_kst.replace(hour=15, minute=30, second=0, microsecond=0)
if now_kst < market_close:
    print(f"WARNING: Current KST time {now_kst.strftime('%H:%M')} is before 15:30. Skipping push.")
    raise SystemExit(0)

content_b64 = base64.b64encode(content_md.encode("utf-8")).decode("ascii")

headers = {
    "Authorization": f"Bearer {VAULT_PAT}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

# GET: check if file already exists (need sha for update)
sha = None
resp = requests.get(API_URL, headers=headers)
if resp.status_code == 200:
    sha = resp.json().get("sha")
    print(f"File exists (sha={sha[:7]}), updating...")
elif resp.status_code == 404:
    print("File does not exist, creating...")
else:
    resp.raise_for_status()

# PUT: create or update
payload = {
    "message": f"daily briefing: {today}",
    "content": content_b64,
}
if sha:
    payload["sha"] = sha

put_resp = requests.put(API_URL, headers=headers, json=payload)
put_resp.raise_for_status()

action = "updated" if sha else "created"
print(f"Successfully {action}: {REMOTE_PATH}")
