#!/usr/bin/env python3
"""
Fetch Korea economic statistics from World Bank API (batch request)
"""
import json
from datetime import datetime

import requests

OUTPUT_FILE = "latest_korea_stats.json"

KOREA_INDICATORS = [
    ("NE.CON.PRVT.CD", "연간 민간소비", "조원", 1e12, 1300),
    ("NE.GDI.TOTL.CD", "연간 총 투자", "조원", 1e12, 1300),
    ("NE.CON.GOVT.CD", "정부 소비지출", "조원", 1e12, 1300),
    ("NE.EXP.GNFS.CD", "연간 총 수출", "십억불", 1e9, 1),
    ("NE.IMP.GNFS.CD", "연간 총 수입", "십억불", 1e9, 1),
    ("BN.CAB.XOKA.CD", "경상수지", "십억불", 1e9, 1),
    ("FI.RES.TOTL.CD", "외환보유액", "십억불", 1e9, 1),
]


def fetch_all_indicators():
    """Fetch all indicators in batch"""
    current_year = datetime.now().year
    
    stats = []
    
    for indicator_code, label, unit, divisor, multiplier in KOREA_INDICATORS:
        url = f"https://api.worldbank.org/v2/country/KOR/indicator/{indicator_code}"
        params = {
            "format": "json",
            "date": f"{current_year-3}:{current_year}",
            "per_page": 10,
        }
        
        try:
            resp = requests.get(url, params=params, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if len(data) > 1 and data[1]:
                    for item in data[1]:
                        if item.get("value") is not None:
                            value = (item["value"] / divisor) * multiplier
                            year = item["date"]
                            
                            if unit == "조원":
                                formatted_value = f"{value:.0f}"
                            else:
                                formatted_value = f"{value:.1f}"
                            
                            if indicator_code == "BN.CAB.XOKA.CD":
                                change = "흑자" if item["value"] > 0 else "적자"
                            else:
                                change = ""
                            
                            stats.append({
                                "label": label,
                                "value": formatted_value,
                                "unit": unit,
                                "change": change,
                                "year": year,
                            })
                            print(f"  {label}: {formatted_value} {unit} ({year})")
                            break
        except Exception as e:
            print(f"  Error fetching {label}: {e}")
    
    return stats


def update_korea_stats():
    """Main function to update Korea stats"""
    print(f"[{datetime.now()}] Fetching Korea economic statistics from World Bank...")
    
    stats = fetch_all_indicators()
    
    result = {
        "updated_at": datetime.now().isoformat(),
        "source": "World Bank",
        "stats": stats,
    }
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"Saved {len(stats)} Korea stats to {OUTPUT_FILE}")
    return result


if __name__ == "__main__":
    update_korea_stats()
