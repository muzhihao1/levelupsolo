import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";

// Database connection for Vercel
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";

if (!connectionString) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL environment variable is required");
}

// Create postgres client with error handling
let client;
try {
  client = postgres(connectionString, {
    max: 1, // Limit connections for serverless
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require', // Ensure SSL for Supabase
  });
} catch (error) {
  console.error("Failed to create database client:", error);
  throw error;
}

export const db = drizzle(client, { schema });