import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    isUpdating: false,
    isStale: false,
    staleReason: "fresh",
    ageHours: 0,
    lastError: null
  });
}
