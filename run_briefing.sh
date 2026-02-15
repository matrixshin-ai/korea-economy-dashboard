#!/usr/bin/env bash
set -euo pipefail

cd /home/runner/workspace

# 1) poll 실행 (jobs 폴더)
python jobs/poll.py

# 2) render.py가 읽는 위치(/home/runner)로 캐시 복사
cp -f cache_candidates.json /home/runner/cache_candidates.json

# 3) 렌더 실행 (출력: /home/runner/latest_briefing.json)
python render.py
