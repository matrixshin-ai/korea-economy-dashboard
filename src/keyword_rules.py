import json
import os

RULES_JSON = os.environ.get("KEYWORD_RULES_JSON", "keyword_rules.json")


def load_rules():
    with open(RULES_JSON, "r", encoding="utf-8") as f:
        payload = json.load(f)
    sections = payload.get("sections", {})
    if not sections:
        raise ValueError("keyword_rules.json has no 'sections'.")
    return sections
