#!/usr/bin/env python3
"""
Fetch economic indicators from World Bank API (no authentication required)
Covers Korea, US, China, Japan, Germany, UK
"""
import json
from datetime import datetime

import requests

OUTPUT_FILE = "latest_economic_calendar.json"

COUNTRIES = {
    "KOR": "한국",
    "USA": "미국",
    "CHN": "중국",
    "JPN": "일본",
    "DEU": "독일",
    "GBR": "영국",
}

INDICATORS = {
    "NY.GDP.MKTP.CD": ("GDP", "십억 달러"),
    "NY.GDP.MKTP.KD.ZG": ("GDP 성장률", "%"),
    "FP.CPI.TOTL.ZG": ("물가상승률", "%"),
    "SL.UEM.TOTL.ZS": ("실업률", "%"),
    "NE.EXP.GNFS.ZS": ("수출/GDP 비율", "%"),
    "BN.CAB.XOKA.CD": ("경상수지", "백만 달러"),
    "GC.DOD.TOTL.GD.ZS": ("정부부채/GDP", "%"),
}


def fetch_world_bank_data(indicator_code, countries, start_year=2020, end_year=2024):
    """Fetch data from World Bank API"""
    country_str = ";".join(countries)
    url = f"https://api.worldbank.org/v2/country/{country_str}/indicator/{indicator_code}"
    params = {
        "format": "json",
        "date": f"{start_year}:{end_year}",
        "per_page": 500,
    }
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            if len(data) > 1 and data[1]:
                return data[1]
    except Exception as e:
        print(f"Error fetching {indicator_code}: {e}")
    
    return []


def format_value(value, unit):
    """Format value with unit"""
    if value is None:
        return "N/A"
    
    if "십억" in unit:
        value = value / 1e9
        return f"{value:,.1f}"
    elif "백만" in unit:
        value = value / 1e6
        return f"{value:,.1f}"
    elif "%" in unit:
        return f"{value:.1f}"
    else:
        return f"{value:,.2f}"


def update_economic_calendar():
    """Main function to update economic calendar from World Bank"""
    print(f"[{datetime.now()}] Fetching economic indicators from World Bank API...")
    
    all_data = {}
    
    for indicator_code, (indicator_name, unit) in INDICATORS.items():
        print(f"  Fetching {indicator_name}...")
        raw_data = fetch_world_bank_data(indicator_code, list(COUNTRIES.keys()))
        
        for item in raw_data:
            if item.get("value") is not None:
                country_code = item["countryiso3code"]
                country_name = COUNTRIES.get(country_code, country_code)
                year = item["date"]
                value = item["value"]
                
                if country_name not in all_data:
                    all_data[country_name] = []
                
                all_data[country_name].append({
                    "indicator": indicator_name,
                    "indicator_code": indicator_code,
                    "year": year,
                    "value": value,
                    "formatted_value": format_value(value, unit),
                    "unit": unit,
                })
    
    for country in all_data:
        all_data[country].sort(key=lambda x: (x["indicator"], x["year"]), reverse=True)
    
    latest_by_country = {}
    for country, indicators in all_data.items():
        latest = {}
        for ind in indicators:
            key = ind["indicator"]
            if key not in latest:
                latest[key] = ind
        latest_by_country[country] = list(latest.values())
    
    result = {
        "updated_at": datetime.now().isoformat(),
        "source": "World Bank",
        "countries": list(COUNTRIES.values()),
        "indicators_by_country": latest_by_country,
        "all_data": all_data,
    }
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    total = sum(len(v) for v in latest_by_country.values())
    print(f"Saved {total} latest indicators to {OUTPUT_FILE}")
    return result


if __name__ == "__main__":
    update_economic_calendar()
