import type { VercelRequest } from "@vercel/node";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SECRET = process.env.ADMIN_JWT_SECRET || ADMIN_PASSWORD;
const TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

function base64url(buf: ArrayBuffer): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Buffer {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

async function hmacSign(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64url(sig);
}

export async function signToken(password: string): Promise<string | null> {
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return null;
  }
  const payload = {
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY,
  };
  const payloadStr = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSign(payloadStr);
  return `${payloadStr}.${signature}`;
}

export async function verifyToken(
  req: VercelRequest,
): Promise<{ valid: boolean; error?: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const token = authHeader.slice(7);
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid token format" };
  }

  const [payloadStr, signature] = parts;
  const expectedSig = await hmacSign(payloadStr);
  if (signature !== expectedSig) {
    return { valid: false, error: "Invalid token signature" };
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(payloadStr)),
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Token expired" };
    }
    if (payload.role !== "admin") {
      return { valid: false, error: "Invalid role" };
    }
  } catch {
    return { valid: false, error: "Invalid token payload" };
  }

  return { valid: true };
}
