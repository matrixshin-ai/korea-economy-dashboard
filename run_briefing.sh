#!/usr/bin/env bash
set -euo pipefail

cd /home/runner/workspace

# 1) poll 실행 (jobs 폴더)
python jobs/poll.py

# 2) 렌더 실행 (jobs/render.py — OCR headlines 포함)
python jobs/render.py
