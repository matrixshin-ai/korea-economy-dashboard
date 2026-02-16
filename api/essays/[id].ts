import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const essays = pgTable("essays", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  content: text("content").notNull(),
  contentEn: text("content_en"),
  author: text("author").notNull(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

function getDb() {
  const client = postgres(process.env.DATABASE_URL!);
  return drizzle(client);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number(req.query.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

  const db = getDb();
  try {
    if (req.method === "GET") {
      const result = await db.select().from(essays).where(eq(essays.id, id));
      if (!result[0]) return res.status(404).json({ message: "Essay not found" });
      return res.json(result[0]);
    }
    if (req.method === "PATCH") {
      const result = await db.update(essays).set(req.body).where(eq(essays.id, id)).returning();
      if (!result[0]) return res.status(404).json({ message: "Essay not found" });
      return res.json(result[0]);
    }
    if (req.method === "DELETE") {
      const result = await db.delete(essays).where(eq(essays.id, id)).returning();
      if (!result.length) return res.status(404).json({ message: "Essay not found" });
      return res.status(204).send(null);
    }
    res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
