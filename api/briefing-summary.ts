import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const lang = req.query.lang === 'EN' ? 'en' : 'kr';
    const summaryPath = join(process.cwd(), `cached_summary_${lang}.json`);
    if (existsSync(summaryPath)) {
      const data = readFileSync(summaryPath, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.status(404).json({ error: "Summary not available" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to load summary" });
  }
}
