import type { VercelRequest, VercelResponse } from "@vercel/node";
import { signToken } from "../_lib/admin-auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ message: "Password required" });
    }

    const token = await signToken(password);
    if (!token) {
      return res.status(401).json({ message: "Invalid password" });
    }

    return res.json({ token });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}
