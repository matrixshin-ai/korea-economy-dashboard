#!/usr/bin/env python3
"""
Scheduler for daily economic data updates
Runs at 07:00 KST for news and indicators
"""
import subprocess
import sys
from datetime import datetime

from apscheduler.schedulers.blocking import BlockingScheduler

scheduler = BlockingScheduler(timezone="Asia/Seoul")


def run_poll():
    """Run the RSS + Naver polling job"""
    print(f"[{datetime.now()}] Running jobs/poll.py...")
    subprocess.run([sys.executable, "jobs/poll.py"], check=True)


def sync_cache_for_renderer():
    """Ensure cache_candidates.json is where render.py expects it (/home/runner)."""
    print(f"[{datetime.now()}] Syncing cache_candidates.json for render.py...")
    subprocess.run(
        ["bash", "-lc", "cp -f /home/runner/workspace/cache_candidates.json /home/runner/cache_candidates.json"],
        check=True,
    )


def run_render():
    """Run the briefing render job (workspace/render.py)"""
    print(f"[{datetime.now()}] Running render.py...")
    subprocess.run([sys.executable, "render.py"], check=True)


def run_fetch_indicators():
    """Run the indicator fetch job"""
    print(f"[{datetime.now()}] Running jobs/fetch_indicators.py...")
    subprocess.run([sys.executable, "jobs/fetch_indicators.py"], check=True)


def run_fetch_economic_calendar():
    """Run the economic calendar fetch job"""
    print(f"[{datetime.now()}] Running jobs/fetch_economic_calendar.py...")
    subprocess.run([sys.executable, "jobs/fetch_economic_calendar.py"], check=True)


def run_fetch_korea_stats():
    """Run the Korea stats fetch job"""
    print(f"[{datetime.now()}] Running jobs/fetch_korea_stats.py...")
    subprocess.run([sys.executable, "jobs/fetch_korea_stats.py"], check=True)


def daily_update():
    """Combined daily update task at 07:00 KST"""
    print("\n" + "=" * 60)
    print(f"Daily Update Started at {datetime.now()} KST")
    print("=" * 60 + "\n")

    try:
        run_fetch_indicators()
        run_fetch_economic_calendar()
        run_fetch_korea_stats()

        run_poll()
        sync_cache_for_renderer()
        run_render()

        # Keep a workspace copy as well (app-friendly path)
        subprocess.run(
            ["bash", "-lc", "cp -f /home/runner/latest_briefing.json /home/runner/workspace/latest_briefing.json"],
            check=True,
        )

        print(f"\n[{datetime.now()}] Daily update completed successfully!")
    except Exception as e:
        print(f"\n[{datetime.now()}] Daily update failed: {e}")


def start_scheduler():
    """Start the scheduler with 07:00 KST daily job"""
    scheduler.add_job(
        daily_update,
        trigger="cron",
        hour=7,
        minute=0,
        id="daily_0700_kst",
        replace_existing=True,
    )

    print(f"Scheduler started at {datetime.now()}")
    print("Scheduled jobs:")
    print("  - Daily full update: 07:00 KST")
    print("\nPress Ctrl+C to stop.")
    scheduler.start()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--now":
        daily_update()
    else:
        daily_update()
        start_scheduler()
