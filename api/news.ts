import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SECTION_MAP: { [key: string]: string } = {
  "거시경제·재정": "Macro",
  "금융시장": "Finance",
  "산업·과학": "Industry",
  "부동산": "RealEstate",
  "국제경제": "International",
  "AI와 경제": "AI & Economy",
  "기타": "Others"
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const briefingPath = join(process.cwd(), "latest_briefing.json");
    if (!existsSync(briefingPath)) {
      return res.status(404).json({ error: "Briefing not available" });
    }
    const data = readFileSync(briefingPath, "utf-8");
    const briefing = JSON.parse(data);
    const categories: { [key: string]: any[] } = {};
    let idCounter = 1;
    for (const [korSection, items] of Object.entries(briefing.sections)) {
      const engSection = SECTION_MAP[korSection] || korSection;
      categories[engSection] = (items as any[]).map((item: any) => {
        const publishedDate = item.published ? new Date(item.published) : new Date();
        return {
          id: `rss-${idCounter++}`,
          title: item.title,
          summary: item.summary || "",
          source: item.source.replace(/\s*[-|:]\s*.*$/, ""),
          date: publishedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(".", ".").slice(0, -1),
          category: engSection,
          important: item.score >= 20,
          url: item.link,
          content: item.summary
        };
      });
    }
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to load news" });
  }
}
