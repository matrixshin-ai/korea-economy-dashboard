"""
Migrate keyword_rules.json and NEGATIVE_KEYWORDS to database.

Usage:
    DATABASE_URL=... python jobs/migrate_keywords.py
"""

import json
import os
import sys

def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    import psycopg2
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # --- 1. Load keyword_rules.json ---
    rules_path = os.path.join(os.path.dirname(__file__), "..", "keyword_rules.json")
    rules_path = os.path.abspath(rules_path)
    print(f"Loading rules from: {rules_path}")

    with open(rules_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    sections = payload.get("sections", {})
    if not sections:
        print("ERROR: No sections found in keyword_rules.json")
        sys.exit(1)

    # Priority: higher priority for sections listed first
    priority = len(sections)

    for section_name, section_data in sections.items():
        quota = section_data.get("quota", 5)
        keywords = section_data.get("keywords", [])

        # Insert category
        cur.execute(
            """
            INSERT INTO keyword_categories (name, quota, priority, created_at, updated_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            ON CONFLICT (name) DO UPDATE SET quota = EXCLUDED.quota, priority = EXCLUDED.priority, updated_at = NOW()
            RETURNING id
            """,
            (section_name, quota, priority),
        )
        cat_id = cur.fetchone()[0]
        print(f"  Category '{section_name}' -> id={cat_id}, quota={quota}, priority={priority}")

        # Delete existing keywords for this category (in case of re-run)
        cur.execute("DELETE FROM keywords WHERE category_id = %s", (cat_id,))

        # Insert keywords
        count = 0
        for kw_item in keywords:
            if isinstance(kw_item, str):
                keyword = kw_item.strip()
                weight = 1
            elif isinstance(kw_item, dict):
                keyword = (kw_item.get("keyword") or kw_item.get("kw") or kw_item.get("text") or "").strip()
                weight = kw_item.get("weight", 1)
                if weight is None:
                    weight = 1
            else:
                continue

            if not keyword:
                continue

            cur.execute(
                """
                INSERT INTO keywords (category_id, keyword, weight, is_negative, created_at)
                VALUES (%s, %s, %s, false, NOW())
                """,
                (cat_id, keyword, weight),
            )
            count += 1

        print(f"    Inserted {count} keywords")
        priority -= 1

    # --- 2. Insert negative keywords ---
    negative_keywords = [
        "연예", "스포츠", "날씨", "사건사고", "교통", "지역행사", "주말나들이",
        "맛집", "여행", "축제", "공연", "영화", "드라마", "아이돌",
        "결혼", "이혼", "폭행", "살인", "화재", "사고", "실종",
    ]

    # Create a special "제외 키워드" category for negative keywords
    cur.execute(
        """
        INSERT INTO keyword_categories (name, quota, priority, created_at, updated_at)
        VALUES (%s, %s, %s, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
        RETURNING id
        """,
        ("제외 키워드", 0, -1),
    )
    neg_cat_id = cur.fetchone()[0]
    print(f"  Category '제외 키워드' -> id={neg_cat_id}")

    # Delete existing negative keywords for this category
    cur.execute("DELETE FROM keywords WHERE category_id = %s", (neg_cat_id,))

    neg_count = 0
    for neg_kw in negative_keywords:
        cur.execute(
            """
            INSERT INTO keywords (category_id, keyword, weight, is_negative, created_at)
            VALUES (%s, %s, %s, true, NOW())
            """,
            (neg_cat_id, neg_kw, 1),
        )
        neg_count += 1

    print(f"    Inserted {neg_count} negative keywords")

    conn.commit()
    cur.close()
    conn.close()
    print("\nMigration complete!")


if __name__ == "__main__":
    main()
