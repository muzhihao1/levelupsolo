// Database initialization check
import { db } from "./db";

export function isDatabaseInitialized(): boolean {
  return db !== undefined && db !== null;
}

export function assertDatabaseInitialized(): void {
  if (!isDatabaseInitialized()) {
    throw new Error("Database is not initialized. Check DATABASE_URL environment variable.");
  }
}

export function getDatabaseError(): { error: string; details: any } {
  if (!process.env.DATABASE_URL && !process.env.SUPABASE_DATABASE_URL) {
    return {
      error: "No database URL configured",
      details: {
        availableEnvVars: Object.keys(process.env).filter(k => 
          k.includes('DATABASE') || k.includes('SUPABASE') || k.includes('DB')
        ),
        hint: "Set DATABASE_URL or SUPABASE_DATABASE_URL in Railway environment variables"
      }
    };
  }
  
  return {
    error: "Database connection failed",
    details: {
      url: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'not set',
      environment: process.env.NODE_ENV || 'development'
    }
  };
}