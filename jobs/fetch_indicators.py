#!/usr/bin/env python3
"""
Fetch real economic indicators from Yahoo Finance, FRED, and BOK ECOS API
Scheduled to run daily at 00:00 KST
"""
import csv
import io
import json
import os
from datetime import datetime, timedelta

import requests
import yfinance as yf

OUTPUT_FILE = "latest_indicators.json"

# BOK ECOS API indicator definitions
BOK_INDICATORS = [
    {
        "stat_code": "722Y001", "item_code": "0101000",
        "id": "kr_base_rate", "name": "한국 기준금리", "category": "rate",
    },
    {
        "stat_code": "802Y001", "item_code": "0001000",
        "id": "kospi", "name": "KOSPI", "category": "stock",
    },
    {
        "stat_code": "802Y001", "item_code": "0089000",
        "id": "kosdaq", "name": "KOSDAQ", "category": "stock",
    },
    {
        "stat_code": "731Y001", "item_code": "0000001",
        "id": "krw_usd", "name": "원/달러 환율", "category": "currency",
    },
    {
        "stat_code": "817Y002", "item_code": "010200000",
        "id": "kr_3y", "name": "국고채 3년", "category": "rate",
    },
    {
        "stat_code": "817Y002", "item_code": "010210000",
        "id": "kr_10y", "name": "국고채 10년", "category": "rate",
    },
]


def get_yahoo_data(ticker: str, name: str, category: str, id_override: str = None):
    """Fetch data from Yahoo Finance"""
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="5d")
        if hist.empty:
            return None

        latest = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else hist.iloc[-1]

        close = float(latest["Close"])
        prev_close = float(prev["Close"])
        change_pct = ((close - prev_close) / prev_close) * 100 if prev_close else 0

        trend = []
        for idx, row in hist.iterrows():
            trend.append({
                "date": idx.strftime("%Y-%m-%d"),
                "value": round(float(row["Close"]), 2)
            })

        if category == "currency":
            value_str = f"{close:,.2f}"
        elif category == "rate":
            value_str = f"{close:.2f}%"
        elif category == "commodity":
            value_str = f"${close:,.2f}"
        else:
            value_str = f"{close:,.2f}"

        ticker_id = id_override or ticker.replace("^", "").replace("=X", "").replace(".", "_").lower()

        return {
            "id": ticker_id,
            "name": name,
            "value": value_str,
            "change": round(change_pct, 2),
            "category": category,
            "trend": trend
        }
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        return None


def _format_bok_value(value: float, category: str) -> str:
    """Format a BOK indicator value for display"""
    if category == "rate":
        return f"{value:.2f}%"
    return f"{value:,.2f}"


def fetch_bok_indicators():
    """Fetch Korean indicators from BOK ECOS API with 6-month history"""
    api_key = os.environ.get("BOK_ECOS_API_KEY")
    if not api_key:
        print("BOK_ECOS_API_KEY not set, skipping BOK indicators")
        return []

    end_date = datetime.now().strftime("%Y%m%d")
    start_date = (datetime.now() - timedelta(days=180)).strftime("%Y%m%d")
    results = []

    for ind in BOK_INDICATORS:
        try:
            url = (
                f"https://ecos.bok.or.kr/api/StatisticSearch/{api_key}/json/kr"
                f"/1/200/{ind['stat_code']}/D/{start_date}/{end_date}/{ind['item_code']}"
            )
            resp = requests.get(url, timeout=15)
            if resp.status_code != 200:
                print(f"BOK API {ind['id']}: HTTP {resp.status_code}")
                continue

            data = resp.json()
            if "StatisticSearch" not in data:
                print(f"BOK API {ind['id']}: no data - {data.get('RESULT', {}).get('MESSAGE', 'unknown')}")
                continue

            rows = data["StatisticSearch"].get("row", [])
            if not rows:
                print(f"BOK API {ind['id']}: empty result")
                continue

            # Build trend — sample to ~30 points evenly across the period
            step = max(1, len(rows) // 30)
            trend = []
            for i, row in enumerate(rows):
                if i == 0 or i == len(rows) - 1 or i % step == 0:
                    date_str = row["TIME"]
                    value = float(row["DATA_VALUE"])
                    formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                    trend.append({"date": formatted_date, "value": value})

            current_val = float(rows[-1]["DATA_VALUE"])
            prev_val = float(rows[-2]["DATA_VALUE"]) if len(rows) > 1 else current_val
            change_pct = ((current_val - prev_val) / prev_val) * 100 if prev_val else 0

            results.append({
                "id": ind["id"],
                "name": ind["name"],
                "value": _format_bok_value(current_val, ind["category"]),
                "change": round(change_pct, 2),
                "category": ind["category"],
                "trend": trend
            })
            print(f"BOK API: {ind['name']} = {current_val} (trend: {len(trend)} points)")

        except Exception as e:
            print(f"BOK API {ind['id']}: error - {e}")

    return results


def _load_cached_indicator(output_file: str, indicator_id: str):
    """기존 JSON 파일에서 특정 indicator의 마지막 값을 읽어 반환 (FRED 차단 시 fallback)"""
    try:
        with open(output_file, encoding="utf-8") as f:
            data = json.load(f)
        for ind in data.get("indicators", []):
            if ind["id"] == indicator_id:
                return ind
    except Exception:
        pass
    return None


def get_fred_rate(series_id: str, name: str, indicator_id: str):
    """Fetch interest rate data from FRED public CSV (no API key required).

    Uses the public CSV download endpoint:
    https://fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES_ID>

    Recommended series:
      DFEDTARU  — Fed Funds Target Range Upper Limit (현재 사용)
      DFEDTARL  — Fed Funds Target Range Lower Limit
      DFF       — Effective Federal Funds Rate (daily, most recent business day)
    """
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "korea-economy-dashboard/1.0"})
        resp.raise_for_status()

        reader = csv.DictReader(io.StringIO(resp.text))
        # FRED CSV 헤더: observation_date, <SERIES_ID>
        rows = [row for row in reader if row.get("observation_date") and row.get(series_id) and row[series_id] != "."]

        if not rows:
            print(f"FRED {series_id}: no data rows")
            return None

        # Build 6-month trend (~30 sample points)
        cutoff = (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")
        recent = [r for r in rows if r["observation_date"] >= cutoff] or rows[-60:]

        step = max(1, len(recent) // 30)
        trend = [
            {"date": r["observation_date"], "value": round(float(r[series_id]), 2)}
            for i, r in enumerate(recent)
            if i == 0 or i == len(recent) - 1 or i % step == 0
        ]

        current_val = float(rows[-1][series_id])
        prev_val = float(rows[-2][series_id]) if len(rows) > 1 else current_val
        change_pct = ((current_val - prev_val) / prev_val) * 100 if prev_val else 0

        print(f"FRED {series_id}: {name} = {current_val}% (trend: {len(trend)} points)")
        return {
            "id": indicator_id,
            "name": name,
            "value": f"{current_val:.2f}%",
            "change": round(change_pct, 2),
            "category": "rate",
            "trend": trend,
        }

    except Exception as e:
        print(f"FRED {series_id}: error - {e}")
        return None


def update_indicators():
    """Main function to update all indicators"""
    print(f"[{datetime.now()}] Fetching real economic indicators...")

    # International indicators from Yahoo Finance
    yahoo_tickers = [
        ("^GSPC", "S&P 500", "stock", "sp500"),
        ("^IXIC", "Nasdaq", "stock", "nasdaq"),
        ("^DJI", "Dow Jones", "stock", "dow"),
        ("JPY=X", "엔/달러", "currency", "jpy_usd"),
        ("CNY=X", "위안/달러", "currency", "cny_usd"),
        ("DX-Y.NYB", "달러 인덱스 (DXY)", "currency", "dxy"),
        ("CL=F", "WTI 원유", "commodity", "wti"),
        ("GC=F", "금", "commodity", "gold"),
        ("^TNX", "미국 국채 10년", "rate", "us_10y"),
        ("^TYX", "미국 국채 30년", "rate", "us_30y"),
        # ^IRX (13주 T-Bill) 제거 → FRED DFF로 교체 (아래)
    ]

    indicators = []
    for ticker, name, category, id_override in yahoo_tickers:
        data = get_yahoo_data(ticker, name, category, id_override)
        if data:
            indicators.append(data)

    # 미국 기준금리: FRED DFEDTARU (Fed Funds Target Range Upper Limit) — API 키 불필요
    # GitHub Actions IP 차단 시 기존 latest_indicators.json의 마지막 값을 fallback으로 사용
    fred_rate = get_fred_rate("DFEDTARU", "미국 기준금리 (Fed)", "us_rate")
    if fred_rate is None:
        fred_rate = _load_cached_indicator(OUTPUT_FILE, "us_rate")
        if fred_rate:
            print(f"FRED DFEDTARU: using cached fallback value ({fred_rate['value']})")
    if fred_rate:
        indicators.append(fred_rate)

    # Korean indicators from BOK ECOS API
    bok_data = fetch_bok_indicators()
    indicators.extend(bok_data)

    indicators.sort(key=lambda x: (
        0 if x["category"] == "stock" else
        1 if x["category"] == "rate" else
        2 if x["category"] == "currency" else 3
    ))

    if indicators:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "updated_at": datetime.now().isoformat(),
                "indicators": indicators
            }, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(indicators)} indicators to {OUTPUT_FILE}")
    else:
        print("No indicators fetched")

    return indicators


def main():
    """Run the indicator update"""
    update_indicators()


if __name__ == "__main__":
    main()
