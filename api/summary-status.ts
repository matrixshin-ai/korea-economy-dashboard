import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const lang = (req.query.lang === 'EN' ? 'EN' : 'KR').toLowerCase();

    const briefingPath = join(process.cwd(), "latest_briefing.json");
    const summaryPath = join(process.cwd(), `cached_summary_${lang}.json`);

    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const todayKST = new Date(now.getTime() + kstOffset).toISOString().slice(0, 10);

    let briefingDate = null;
    let briefingReady = false;
    if (existsSync(briefingPath)) {
      const briefing = JSON.parse(readFileSync(briefingPath, "utf-8"));
      briefingDate = briefing.date;
      briefingReady = briefing.date === todayKST;
    }

    let summaryDate = null;
    let summaryReady = false;
    let summaryGeneratedAt = null;
    if (existsSync(summaryPath)) {
      const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));
      summaryDate = summary.date;
      summaryGeneratedAt = summary.generated_at;
      summaryReady = summary.date === todayKST;
    }

    res.json({
      today: todayKST,
      briefing: { date: briefingDate, ready: briefingReady },
      summary: { date: summaryDate, ready: summaryReady, generated_at: summaryGeneratedAt },
      allReady: briefingReady && summaryReady
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check status" });
  }
}
