import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

// Database connection for Vercel
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";

if (!connectionString) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL environment variable is required");
}

// Create postgres client
const client = postgres(connectionString, {
  max: 1, // Limit connections for serverless
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });