import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, asc } from "drizzle-orm";
import { pgTable, text, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// =============================================================================
// Auth helpers (inlined from _lib/admin-auth.ts)
// =============================================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SECRET = process.env.ADMIN_JWT_SECRET || ADMIN_PASSWORD;
const TOKEN_EXPIRY = 24 * 60 * 60;

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

async function signToken(password: string): Promise<string | null> {
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

async function verifyToken(
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

// =============================================================================
// DB schema & helpers
// =============================================================================

const keywordCategories = pgTable("keyword_categories", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  quota: integer("quota").default(5).notNull(),
  priority: integer("priority").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const keywords = pgTable("keywords", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => keywordCategories.id, { onDelete: "cascade" }).notNull(),
  keyword: text("keyword").notNull(),
  weight: integer("weight").default(1).notNull(),
  isNegative: boolean("is_negative").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

function getDb() {
  const client = postgres(process.env.DATABASE_URL!);
  return drizzle(client);
}

// =============================================================================
// Action handlers
// =============================================================================

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ message: "Password required" });
  }
  const token = await signToken(password);
  if (!token) {
    return res.status(401).json({ message: "Invalid password" });
  }
  return res.json({ token });
}

async function handleGetKeywords(res: VercelResponse) {
  const db = getDb();
  const categories = await db
    .select()
    .from(keywordCategories)
    .orderBy(asc(keywordCategories.priority));

  const allKeywords = await db
    .select()
    .from(keywords)
    .orderBy(asc(keywords.id));

  const result = categories.map((cat) => ({
    ...cat,
    keywords: allKeywords.filter((kw) => kw.categoryId === cat.id),
  }));

  return res.json(result);
}

async function handleUpdateKeywords(req: VercelRequest, res: VercelResponse) {
  const { categories: catData } = req.body || {};
  if (!Array.isArray(catData)) {
    return res.status(400).json({ message: "categories array required" });
  }

  const client = postgres(process.env.DATABASE_URL!);
  const txDb = drizzle(client);

  try {
    for (const cat of catData) {
      if (!cat.id) continue;

      await txDb
        .update(keywordCategories)
        .set({
          quota: cat.quota,
          priority: cat.priority ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(keywordCategories.id, cat.id));

      await txDb.delete(keywords).where(eq(keywords.categoryId, cat.id));

      if (Array.isArray(cat.keywords) && cat.keywords.length > 0) {
        const keywordRows = cat.keywords.map((kw: any) => ({
          categoryId: cat.id,
          keyword: kw.keyword,
          weight: kw.weight ?? 1,
          isNegative: kw.isNegative ?? false,
        }));
        await txDb.insert(keywords).values(keywordRows);
      }
    }

    await client.end();
    return res.json({ message: "Updated successfully" });
  } catch (err) {
    await client.end();
    throw err;
  }
}

async function handleAddCategory(req: VercelRequest, res: VercelResponse) {
  const { name, quota, priority } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: "Category name required" });
  }

  const db = getDb();
  const result = await db
    .insert(keywordCategories)
    .values({ name, quota: quota ?? 5, priority: priority ?? 0 })
    .returning();

  return res.status(201).json(result[0]);
}

async function handleDeleteCategory(req: VercelRequest, res: VercelResponse) {
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ message: "Category ID required" });
  }

  const db = getDb();
  const result = await db
    .delete(keywordCategories)
    .where(eq(keywordCategories.id, Number(id)))
    .returning();

  if (!result.length) {
    return res.status(404).json({ message: "Category not found" });
  }

  return res.json({ message: "Deleted" });
}

// =============================================================================
// Main handler
// =============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const auth = await verifyToken(req);
      if (!auth.valid) return res.status(401).json({ message: auth.error });
      return handleGetKeywords(res);
    }

    if (req.method === "POST") {
      const action = req.body?.action;
      if (action === "login") {
        return handleLogin(req, res);
      }
      const auth = await verifyToken(req);
      if (!auth.valid) return res.status(401).json({ message: auth.error });
      if (action === "add-category") {
        return handleAddCategory(req, res);
      }
      return res.status(400).json({ message: "Unknown action" });
    }

    if (req.method === "PUT") {
      const auth = await verifyToken(req);
      if (!auth.valid) return res.status(401).json({ message: auth.error });
      return handleUpdateKeywords(req, res);
    }

    if (req.method === "DELETE") {
      const auth = await verifyToken(req);
      if (!auth.valid) return res.status(401).json({ message: auth.error });
      return handleDeleteCategory(req, res);
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}
