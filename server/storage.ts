import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc } from "drizzle-orm";
import { type User, type InsertUser, type Essay, type InsertEssay, users, essays } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Essay CRUD operations
  getEssays(): Promise<Essay[]>;
  getEssay(id: number): Promise<Essay | undefined>;
  createEssay(essay: InsertEssay): Promise<Essay>;
  updateEssay(id: number, essay: Partial<InsertEssay>): Promise<Essay | undefined>;
  deleteEssay(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString);
    this.db = drizzle(client);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getEssays(): Promise<Essay[]> {
    return await this.db.select().from(essays).orderBy(desc(essays.publishedAt));
  }

  async getEssay(id: number): Promise<Essay | undefined> {
    const result = await this.db.select().from(essays).where(eq(essays.id, id));
    return result[0];
  }

  async createEssay(essay: InsertEssay): Promise<Essay> {
    const result = await this.db.insert(essays).values(essay).returning();
    return result[0];
  }

  async updateEssay(id: number, essay: Partial<InsertEssay>): Promise<Essay | undefined> {
    const result = await this.db.update(essays).set(essay).where(eq(essays.id, id)).returning();
    return result[0];
  }

  async deleteEssay(id: number): Promise<boolean> {
    const result = await this.db.delete(essays).where(eq(essays.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
