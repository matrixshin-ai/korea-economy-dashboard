"""
Migration: Add AND-logic support to keyword_categories/keywords tables.

1. ALTER TABLE keyword_categories ADD COLUMN and_logic
2. ALTER TABLE keywords ADD COLUMN keyword_group
3. INSERT "AI와 경제" category (and_logic=true) + keywords (group A/B)
4. DELETE "인공지능" from 산업·과학

Usage:
    DATABASE_URL=... python jobs/migrate_and_logic.py
"""

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

    # --- 1. ALTER keyword_categories: add and_logic column ---
    print("Step 1: Adding and_logic column to keyword_categories...")
    cur.execute("""
        ALTER TABLE keyword_categories
        ADD COLUMN IF NOT EXISTS and_logic BOOLEAN NOT NULL DEFAULT false
    """)
    print("  Done.")

    # --- 2. ALTER keywords: add keyword_group column ---
    print("Step 2: Adding keyword_group column to keywords...")
    cur.execute("""
        ALTER TABLE keywords
        ADD COLUMN IF NOT EXISTS keyword_group VARCHAR(1) DEFAULT NULL
    """)
    print("  Done.")

    # --- 3. INSERT "AI와 경제" category ---
    print("Step 3: Inserting 'AI와 경제' category...")
    cur.execute("""
        INSERT INTO keyword_categories (name, quota, priority, and_logic, created_at, updated_at)
        VALUES (%s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE
            SET quota = EXCLUDED.quota,
                priority = EXCLUDED.priority,
                and_logic = EXCLUDED.and_logic,
                updated_at = NOW()
        RETURNING id
    """, ("AI와 경제", 5, 1, True))
    cat_id = cur.fetchone()[0]
    print(f"  Category 'AI와 경제' -> id={cat_id}")

    # Delete existing keywords for this category (in case of re-run)
    cur.execute("DELETE FROM keywords WHERE category_id = %s", (cat_id,))

    # --- 4. INSERT keywords_a (group='A') ---
    keywords_a = [
        "AI", "인공지능", "생성형 AI", "LLM", "대규모언어모델",
        "AI 에이전트", "AI agent", "자율 에이전트",
        "AI 기본법", "AI 규제", "디지털 전환",
        "공공 AI", "정부 AI", "행정 AI", "전자정부",
        "AI 칩", "데이터센터", "클라우드", "토큰 비용", "AI 인프라",
        "딥페이크",
    ]

    count_a = 0
    for kw in keywords_a:
        cur.execute("""
            INSERT INTO keywords (category_id, keyword, weight, is_negative, keyword_group, created_at)
            VALUES (%s, %s, %s, false, 'A', NOW())
        """, (cat_id, kw, 1))
        count_a += 1
    print(f"  Group A: {count_a} keywords inserted")

    # --- 5. INSERT keywords_b (group='B') ---
    keywords_b = ["경제", "생산성", "성장", "투자", "고용"]

    count_b = 0
    for kw in keywords_b:
        cur.execute("""
            INSERT INTO keywords (category_id, keyword, weight, is_negative, keyword_group, created_at)
            VALUES (%s, %s, %s, false, 'B', NOW())
        """, (cat_id, kw, 1))
        count_b += 1
    print(f"  Group B: {count_b} keywords inserted")

    # --- 6. DELETE "인공지능" from 산업·과학 ---
    print("Step 4: Removing '인공지능' from '산업·과학'...")
    cur.execute("""
        DELETE FROM keywords
        WHERE keyword = '인공지능'
          AND category_id = (
              SELECT id FROM keyword_categories WHERE name = '산업·과학'
          )
    """)
    deleted = cur.rowcount
    print(f"  Deleted {deleted} row(s)")

    conn.commit()
    cur.close()
    conn.close()
    print("\nMigration complete!")


if __name__ == "__main__":
    main()
