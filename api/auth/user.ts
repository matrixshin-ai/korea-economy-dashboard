import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function verifyToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", ADMIN_PASSWORD)
    .update(encoded)
    .digest("base64url");
  if (sig !== expectedSig) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    return payload.role === "admin" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ") || !verifyToken(auth.slice(7))) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.json({ role: "admin" });
}
