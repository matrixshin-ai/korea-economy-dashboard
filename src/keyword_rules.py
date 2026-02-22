import json
import os

RULES_JSON = os.environ.get("KEYWORD_RULES_JSON", "keyword_rules.json")


def load_rules():
    """Load rules: DB first, JSON fallback."""
    rules = _load_from_db()
    if rules:
        return rules
    return _load_from_json()


def _load_from_json():
    with open(RULES_JSON, "r", encoding="utf-8") as f:
        payload = json.load(f)
    sections = payload.get("sections", {})
    if not sections:
        raise ValueError("keyword_rules.json has no 'sections'.")
    return sections


def _load_from_db():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return None
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, quota, "
            "COALESCE(and_logic, false) "
            "FROM keyword_categories ORDER BY priority DESC"
        )
        categories = cur.fetchall()
        if not categories:
            conn.close()
            return None
        rules = {}
        for cat_id, name, quota, and_logic in categories:
            cur.execute(
                "SELECT keyword, weight, keyword_group FROM keywords "
                "WHERE category_id = %s AND is_negative = false",
                (cat_id,),
            )
            rows = cur.fetchall()

            if and_logic:
                kws_a = [{"keyword": r[0], "weight": r[1]}
                         for r in rows if r[2] == "A"]
                kws_b = [{"keyword": r[0], "weight": r[1]}
                         for r in rows if r[2] == "B"]
                rules[name] = {
                    "quota": quota,
                    "and_logic": True,
                    "keywords_a": kws_a,
                    "keywords_b": kws_b,
                }
            else:
                kws = [{"keyword": r[0], "weight": r[1]} for r in rows]
                rules[name] = {"quota": quota, "keywords": kws}
        conn.close()
        return rules
    except Exception:
        return None


def load_negative_keywords():
    """Load negative keywords from DB, fallback to None (caller uses defaults)."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return None
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT keyword FROM keywords WHERE is_negative = true")
        rows = cur.fetchall()
        conn.close()
        if not rows:
            return None
        return [r[0] for r in rows]
    except Exception:
        return None
