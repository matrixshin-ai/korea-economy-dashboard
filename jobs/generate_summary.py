"""
Gemini AI Briefing Summary Generator
- Reads latest_briefing.json
- Calls Gemini API to generate KR/EN news anchor narration
- Writes cached_summary_kr.json and cached_summary_en.json
"""
import json
import os
import re
import sys
import hashlib
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BRIEFING_PATH = os.path.join(BASE_DIR, "latest_briefing.json")

KR_PROMPT_TEMPLATE = """당신은 한국의 저명한 경제 전문 앵커입니다. 다음 뉴스들을 읽고, 5분 분량의 뉴스 방송 나레이션을 작성해주세요.

요구사항:
- 청취자에게 직접 말하듯이 자연스럽고 전문적인 톤으로 작성
- "안녕하십니까, 오늘의 한국 경제 뉴스를 전해드립니다"로 시작
- 각 주요 뉴스를 상세히 설명하고 경제적 의미와 배경을 분석
- 관련 뉴스들을 자연스럽게 연결하여 전체 경제 흐름을 보여줌
- 마무리에는 투자자와 일반 시청자를 위한 시사점 제시
- 반드시 2000-2500자 분량으로 작성 (5분 읽기 분량)
- 문단 구분을 명확히 하여 읽기 쉽게 구성

뉴스 내용:
{news_content}"""

EN_PROMPT_TEMPLATE = """You are a distinguished Korean economic news anchor. Read the following news and write a 5-minute news broadcast narration.

Requirements:
- Write in a natural and professional tone as if speaking directly to listeners
- Start directly with "Good morning. Here is today's Korean economic news briefing." - DO NOT introduce yourself or say "I'm your host" or use placeholders like "[Your Name]"
- Explain each major news item in detail, analyzing its economic significance and background
- Connect related news naturally to show the overall economic flow
- Include implications for investors and general viewers at the end
- Write exactly 800-1000 words (5-minute reading length)
- Use clear paragraph breaks for easy reading
- Write ONLY in English. Do NOT include any Korean characters.

News content:
{news_content}"""

STRUCTURED_EN_PROMPT_TEMPLATE = """You are an expert economic analyst. Read the following Korean economic news and produce a structured English summary as a JSON object.

CRITICAL: Return ONLY valid JSON. No markdown code fences, no extra text.

The JSON must have this exact structure:
{{
  "key_headlines": [
    {{ "title": "English title of headline", "summary": "1-2 sentence summary in English" }}
  ],
  "sections": {{
    "Hot Economy News": "3-5 sentence paragraph summarizing the hottest economic news",
    "Macro & Fiscal Policy": "3-5 sentence paragraph",
    "Financial Markets": "3-5 sentence paragraph",
    "Industry & Technology": "3-5 sentence paragraph",
    "Real Estate": "3-5 sentence paragraph",
    "International Economy": "3-5 sentence paragraph",
    "AI & Economy": "3-5 sentence paragraph",
    "Others": "3-5 sentence paragraph"
  }}
}}

Rules:
- key_headlines: Pick the top 5 most important headlines and translate/summarize them into English
- sections: For each section, write a 3-5 sentence English paragraph summarizing the key news
- If a section has no news, write "No significant updates in this category today."
- Write ONLY in English. Do NOT include any Korean characters.
- The section names in Korean map to English as follows:
  오늘의 핵심이슈 → Hot Economy News
  거시경제·재정 → Macro & Fiscal Policy
  금융시장 → Financial Markets
  산업·과학 → Industry & Technology
  부동산 → Real Estate
  국제경제 → International Economy
  AI와 경제 → AI & Economy
  기타 → Others

News content:
{news_content}"""


def build_news_content(briefing: dict) -> str:
    """Build news content text from briefing data."""
    lines = []
    lines.append(f"Date: {briefing.get('date', '')}")

    lines.append("\n=== 오늘의 핵심이슈 (Key Headlines) ===")
    for item in briefing.get("headlines", [])[:5]:
        title = item.get("title", "")
        summary = item.get("summary", "")
        lines.append(f"- {title}: {summary}")

    for section, items in briefing.get("sections", {}).items():
        lines.append(f"\n=== {section} ===")
        for item in items[:5]:
            title = item.get("title", "")
            summary = item.get("summary", "")
            lines.append(f"- {title}: {summary}")

    return "\n".join(lines)


def count_korean_chars(text: str) -> int:
    """Count Korean characters in text."""
    return len(re.findall(r'[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]', text))


def remove_korean_text(text: str) -> str:
    """Remove Korean characters from text."""
    text = re.sub(r'[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+', '', text)
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()


def generate_summary(api_key: str, news_content: str, lang: str) -> str:
    """Call Gemini API to generate summary."""
    from google import genai

    client = genai.Client(api_key=api_key)

    if lang == "KR":
        prompt = KR_PROMPT_TEMPLATE.format(news_content=news_content)
    else:
        prompt = EN_PROMPT_TEMPLATE.format(news_content=news_content)

    max_attempts = 3 if lang == "EN" else 1
    best_summary = ""
    best_korean_count = float("inf")

    for attempt in range(1, max_attempts + 1):
        retry_prompt = prompt
        if lang == "EN" and attempt > 1:
            retry_prompt += (
                "\n\n[SYSTEM WARNING: Previous attempts contained Korean text. "
                "You MUST write ONLY in English. Any Korean characters will cause "
                "the response to be rejected. Translate ALL Korean content to English.]"
            )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=retry_prompt,
        )
        summary = response.text or ""

        if lang == "KR":
            return summary

        korean_count = count_korean_chars(summary)
        print(f"  EN attempt {attempt}: {korean_count} Korean chars")

        if korean_count < best_korean_count:
            best_korean_count = korean_count
            best_summary = summary

        if korean_count == 0:
            return summary

    if best_korean_count > 0:
        best_summary = remove_korean_text(best_summary)

    return best_summary


def generate_structured_en_summary(api_key: str, news_content: str) -> dict:
    """Call Gemini API to generate structured English summary as JSON."""
    from google import genai

    client = genai.Client(api_key=api_key)
    prompt = STRUCTURED_EN_PROMPT_TEMPLATE.format(news_content=news_content)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    text = (response.text or "").strip()

    # Strip markdown code fence if present
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        text = re.sub(r'^```\w*\n?', '', text)
        # Remove closing fence
        text = re.sub(r'\n?```$', '', text)
        text = text.strip()

    return json.loads(text)


def main():
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("GEMINI_API_KEY not set - skipping summary generation")
        return

    if not os.path.exists(BRIEFING_PATH):
        print(f"No briefing file at {BRIEFING_PATH}")
        sys.exit(1)

    with open(BRIEFING_PATH, "r", encoding="utf-8") as f:
        briefing = json.load(f)

    briefing_date = briefing.get("date", "")
    print(f"Generating summaries for date: {briefing_date}")

    news_content = build_news_content(briefing)
    briefing_hash = hashlib.sha256(news_content.encode("utf-8")).hexdigest()[:16]
    print(f"News content: {len(news_content)} chars (hash={briefing_hash})")

    for lang in ["KR", "EN"]:
        print(f"\nGenerating {lang} summary...")
        cache_path = os.path.join(BASE_DIR, f"cached_summary_{lang.lower()}.json")

        # Skip if cache has same date AND same briefing content hash
        if os.path.exists(cache_path):
            try:
                cached = json.load(open(cache_path, "r", encoding="utf-8"))
                if cached.get("date") == briefing_date and cached.get("briefing_hash") == briefing_hash:
                    print(f"  {lang} summary already up to date (date={briefing_date}, hash={briefing_hash})")
                    continue
                if cached.get("date") == briefing_date:
                    print(f"  {lang} briefing content changed (old_hash={cached.get('briefing_hash', 'none')}, new_hash={briefing_hash}) - regenerating")
            except (json.JSONDecodeError, KeyError):
                pass

        try:
            summary = generate_summary(api_key, news_content, lang)

            if lang == "EN" and count_korean_chars(summary) > 0:
                print(f"  WARNING: EN summary still has Korean chars - skipping")
                continue

            result = {
                "summary": summary,
                "date": briefing_date,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "lang": lang,
                "briefing_hash": briefing_hash,
            }

            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            print(f"  {lang} summary saved ({len(summary)} chars)")

        except Exception as e:
            print(f"  ERROR generating {lang} summary: {e}")
            continue

    # Generate structured English summary and inject into latest_briefing.json
    print("\nGenerating structured English summary...")
    existing_summary_en = briefing.get("summary_en")
    if (
        existing_summary_en
        and isinstance(existing_summary_en, dict)
        and existing_summary_en.get("date") == briefing_date
        and existing_summary_en.get("briefing_hash") == briefing_hash
    ):
        print(f"  Structured EN summary already up to date (hash={briefing_hash}) - skipping")
    else:
        try:
            structured = generate_structured_en_summary(api_key, news_content)
            briefing["summary_en"] = {
                "date": briefing_date,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "briefing_hash": briefing_hash,
                "key_headlines": structured.get("key_headlines", []),
                "sections": structured.get("sections", {}),
            }

            with open(BRIEFING_PATH, "w", encoding="utf-8") as f:
                json.dump(briefing, f, ensure_ascii=False, indent=2)

            print(f"  Structured EN summary saved to latest_briefing.json")
        except Exception as e:
            print(f"  ERROR generating structured EN summary: {e}")

    print("\nSummary generation complete.")


if __name__ == "__main__":
    main()
