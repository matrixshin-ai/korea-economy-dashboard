import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pgTable, text, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "../../_lib/admin-auth";

const keywordCategories = pgTable("keyword_categories", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  quota: integer("quota").default(5).notNull(),
  priority: integer("priority").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
    if (req.method === "POST") {
      const { name, quota, priority } = req.body || {};
      if (!name) {
        return res.status(400).json({ message: "Category name required" });
      }

      const result = await db
        .insert(keywordCategories)
        .values({
          name,
          quota: quota ?? 5,
          priority: priority ?? 0,
        })
        .returning();

      return res.status(201).json(result[0]);
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ message: "Category ID required" });
      }

      const result = await db
        .delete(keywordCategories)
        .where(eq(keywordCategories.id, Number(id)))
        .returning();

      if (!result.length) {
        return res.status(404).json({ message: "Category not found" });
      }

      return res.status(204).send(null);
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}
