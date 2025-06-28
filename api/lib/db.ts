import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../../shared/schema";

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

// Log environment status for debugging
console.log("[DB] Environment check:", {
  hasDatabaseUrl: !!databaseUrl,
  hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
  hasRegularUrl: !!process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
});

// Create a lazy-initialized database connection
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  
  if (!databaseUrl) {
    console.error("[DB] DATABASE_URL is not defined in environment variables");
    console.error("[DB] Available env vars:", Object.keys(process.env).filter(k => !k.includes('SECRET')));
    throw new Error("DATABASE_URL is not defined. Please set DATABASE_URL or SUPABASE_DATABASE_URL in your environment variables.");
  }

  try {
    console.log("[DB] Initializing database connection...");
    const sql = neon(databaseUrl);
    _db = drizzle(sql, { schema });
    console.log("[DB] Database connection initialized successfully");
    return _db;
  } catch (error) {
    console.error("[DB] Failed to initialize database connection:", error);
    throw error;
  }
}

// Export a getter for backward compatibility
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop, receiver) {
    const database = getDb();
    return Reflect.get(database, prop, receiver);
  }
});