import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../../shared/schema";

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not defined in environment variables");
  throw new Error("DATABASE_URL is not defined");
}

// Create database client
let sql;
let db;

try {
  sql = neon(databaseUrl);
  db = drizzle(sql, { schema });
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  throw error;
}

export { db };