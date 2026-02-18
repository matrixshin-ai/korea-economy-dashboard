import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, asc } from "drizzle-orm";
import { pgTable, text, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "../_lib/admin-auth";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await verifyToken(req);
  if (!auth.valid) {
    return res.status(401).json({ message: auth.error });
  }

  const db = getDb();

  try {
    if (req.method === "GET") {
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

    if (req.method === "PUT") {
      const { categories: catData } = req.body || {};
      if (!Array.isArray(catData)) {
        return res.status(400).json({ message: "categories array required" });
      }

      // Use a single connection for transaction-like behavior
      const client = postgres(process.env.DATABASE_URL!);
      const txDb = drizzle(client);

      try {
        for (const cat of catData) {
          if (!cat.id) continue;

          // Update category quota/priority
          await txDb
            .update(keywordCategories)
            .set({
              quota: cat.quota,
              priority: cat.priority ?? 0,
              updatedAt: new Date(),
            })
            .where(eq(keywordCategories.id, cat.id));

          // Delete existing keywords for this category
          await txDb
            .delete(keywords)
            .where(eq(keywords.categoryId, cat.id));

          // Insert new keywords
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

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}
