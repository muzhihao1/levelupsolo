import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow this endpoint in development or with a secret key
  const secretKey = req.headers['x-debug-key'];
  if (process.env.NODE_ENV === 'production' && secretKey !== process.env.DEBUG_KEY) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    console.log("[DB Test] Starting database connection test...");
    
    // Test 1: Basic connection
    const db = getDb();
    console.log("[DB Test] Database instance created");

    // Test 2: Simple query
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as pg_version`);
    console.log("[DB Test] Query executed successfully");

    // Test 3: Check tables exist
    const tablesQuery = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const tables = tablesQuery.rows.map((row: any) => row.table_name);

    return res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: result.rows[0]?.current_time,
        version: result.rows[0]?.pg_version,
        tables: tables,
        tableCount: tables.length
      }
    });
  } catch (error) {
    console.error("[DB Test] Database connection error:", error);
    
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name || 'UnknownError',
        hint: error instanceof Error && error.message.includes('DATABASE_URL') 
          ? 'Ensure DATABASE_URL and SUPABASE_DATABASE_URL are set in Vercel environment variables'
          : null
      }
    });
  }
}