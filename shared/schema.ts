import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const essays = pgTable("essays", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  content: text("content").notNull(),
  contentEn: text("content_en"),
  author: text("author").notNull(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

export const insertEssaySchema = createInsertSchema(essays).omit({
  id: true,
  publishedAt: true,
});

export type InsertEssay = z.infer<typeof insertEssaySchema>;
export type Essay = typeof essays.$inferSelect;
