import { pgTable, text, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";
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

export const keywordCategories = pgTable("keyword_categories", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  quota: integer("quota").default(5).notNull(),
  priority: integer("priority").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const keywords = pgTable("keywords", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => keywordCategories.id, { onDelete: "cascade" }).notNull(),
  keyword: text("keyword").notNull(),
  weight: integer("weight").default(1).notNull(),
  isNegative: boolean("is_negative").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type KeywordCategory = typeof keywordCategories.$inferSelect;
export type Keyword = typeof keywords.$inferSelect;
