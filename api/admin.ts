import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, asc } from "drizzle-orm";
import { pgTable, text, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { signToken, verifyToken } from "./_lib/admin-auth";

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

// --- Action handlers ---

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

// --- Main handler ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // GET: keywords list (authenticated)
    if (req.method === "GET") {
      const auth = await verifyToken(req);
      if (!auth.valid) return res.status(401).json({ message: auth.error });
      return handleGetKeywords(res);
    }

    // POST: login or add-category (based on action)
    if (req.method === "POST") {
      const action = req.body?.action;
      if (action === "login") {
        return handleLogin(req, res);
      }
      // All other POST actions require auth
      const auth = await verifyToken(req);
      if (!auth.valid) return res.status(401).json({ message: auth.error });
      if (action === "add-category") {
        return handleAddCategory(req, res);
      }
      return res.status(400).json({ message: "Unknown action" });
    }

    // PUT: update-keywords (authenticated)
    if (req.method === "PUT") {
      const auth = await verifyToken(req);
      if (!auth.valid) return res.status(401).json({ message: auth.error });
      return handleUpdateKeywords(req, res);
    }

    // DELETE: delete-category (authenticated)
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
