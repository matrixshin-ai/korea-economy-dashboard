import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const briefingPath = join(process.cwd(), "latest_briefing.json");
    if (existsSync(briefingPath)) {
      const data = readFileSync(briefingPath, "utf-8");
      const briefing = JSON.parse(data);
      res.json({
        generatedAt: briefing.generated_at,
        date: briefing.date,
        isRealData: true,
        isUpdating: false,
        isStale: false,
        staleReason: "fresh",
        ageHours: 0
      });
    } else {
      res.json({ generatedAt: null, date: null, isRealData: false, isUpdating: false, isStale: true, staleReason: "no_data" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to load news meta" });
  }
}
