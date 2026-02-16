import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const filePath = join(process.cwd(), "latest_korea_stats.json");
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.status(404).json({ error: "Korea stats not available" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to load Korea stats" });
  }
}
