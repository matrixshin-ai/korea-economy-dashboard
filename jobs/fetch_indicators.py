#!/usr/bin/env python3
"""
Fetch real economic indicators from Yahoo Finance and other sources
Scheduled to run daily at 00:00 KST
"""
import json
import os
import re
from datetime import datetime

import requests
import yfinance as yf

OUTPUT_FILE = "latest_indicators.json"


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


def load_historical_data():
    """Load existing historical bond data to accumulate over time"""
    history_file = "kr_bond_history.json"
    if os.path.exists(history_file):
        with open(history_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"kr_3y": [], "kr_10y": [], "kr_base_rate": []}


def save_historical_data(history):
    """Save historical bond data"""
    history_file = "kr_bond_history.json"
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def scrape_korean_yields():
    """Scrape Korean government bond yields from Trading Economics and accumulate history"""
    history = load_historical_data()
    today = datetime.now().strftime("%Y-%m-%d")
    
    urls = [
        ("kr_base_rate", "https://tradingeconomics.com/south-korea/interest-rate", "한국 기준금리"),
        ("kr_3y", "https://tradingeconomics.com/gvsk3y:gov", "국고채 3년"),
        ("kr_10y", "https://tradingeconomics.com/south-korea/government-bond-yield", "국고채 10년"),
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    scraped_values = {}
    for rate_id, url, name in urls:
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                html = resp.text
                match = re.search(r'id="p"[^>]*>([0-9.]+)', html)
                if not match:
                    # Fallback: extract from meta description (e.g. "last recorded at 2.50 percent")
                    match = re.search(r'last recorded at ([0-9.]+) percent', html)
                if match:
                    value = float(match.group(1))
                    scraped_values[rate_id] = value
                    print(f"Scraped {name}: {value}%")
                    
                    if rate_id not in history:
                        history[rate_id] = []
                    
                    if not history[rate_id] or history[rate_id][-1]["date"] != today:
                        history[rate_id].append({"date": today, "value": value})
                    else:
                        history[rate_id][-1]["value"] = value
                    
                    history[rate_id] = history[rate_id][-30:]
        except Exception as e:
            print(f"Error scraping {name}: {e}")
    
    save_historical_data(history)
    
    yields_data = []
    defaults = {
        "kr_base_rate": ("한국 기준금리", 2.50),
        "kr_3y": ("국고채 3년", 2.80),
        "kr_10y": ("국고채 10년", 3.00),
    }
    
    for rate_id, (name, default_val) in defaults.items():
        trend = history.get(rate_id, [])
        if not trend:
            trend = [{"date": today, "value": default_val}]
        
        current_val = scraped_values.get(rate_id, trend[-1]["value"] if trend else default_val)
        prev_val = trend[-2]["value"] if len(trend) > 1 else current_val
        change_pct = ((current_val - prev_val) / prev_val) * 100 if prev_val else 0
        
        yields_data.append({
            "id": rate_id,
            "name": name,
            "value": f"{current_val:.2f}%",
            "change": round(change_pct, 2),
            "category": "rate",
            "trend": trend
        })
    
    return yields_data


def update_indicators():
    """Main function to update all indicators"""
    print(f"[{datetime.now()}] Fetching real economic indicators...")
    
    yahoo_tickers = [
        ("^KS11", "KOSPI", "stock", "kospi"),
        ("^KQ11", "KOSDAQ", "stock", "kosdaq"),
        ("^GSPC", "S&P 500", "stock", "sp500"),
        ("^IXIC", "Nasdaq", "stock", "nasdaq"),
        ("^DJI", "Dow Jones", "stock", "dow"),
        ("KRW=X", "원/달러 환율", "currency", "krw_usd"),
        ("JPY=X", "엔/달러", "currency", "jpy_usd"),
        ("CNY=X", "위안/달러", "currency", "cny_usd"),
        ("DX-Y.NYB", "달러 인덱스 (DXY)", "currency", "dxy"),
        ("CL=F", "WTI 원유", "commodity", "wti"),
        ("GC=F", "금", "commodity", "gold"),
        ("^TNX", "미국 국채 10년", "rate", "us_10y"),
        ("^TYX", "미국 국채 30년", "rate", "us_30y"),
        ("^IRX", "미국 기준금리 (Fed)", "rate", "us_rate"),
    ]
    
    indicators = []
    for ticker, name, category, id_override in yahoo_tickers:
        data = get_yahoo_data(ticker, name, category, id_override)
        if data:
            indicators.append(data)
    
    korean_yields = scrape_korean_yields()
    indicators.extend(korean_yields)
    
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
