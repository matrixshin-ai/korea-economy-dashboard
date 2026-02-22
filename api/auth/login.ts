import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function signToken(): string {
  const payload = JSON.stringify({
    role: "admin",
    exp: Date.now() + 24 * 60 * 60 * 1000,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto
    .createHmac("sha256", ADMIN_PASSWORD)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { password } = req.body || {};
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid password" });
  }

  res.json({ token: signToken() });
}
