import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      urlsMatch: process.env.DATABASE_URL === process.env.SUPABASE_DATABASE_URL,
    },
    tests: []
  };

  // Test 1: Try to import db module
  try {
    results.tests.push({ test: "import db module", status: "starting" });
    const { getDb } = await import('./_lib/db');
    results.tests.push({ test: "import db module", status: "success" });
    
    // Test 2: Try to get db instance
    try {
      results.tests.push({ test: "get db instance", status: "starting" });
      const db = getDb();
      results.tests.push({ test: "get db instance", status: "success" });
      
      // Test 3: Try a simple query
      try {
        results.tests.push({ test: "simple query", status: "starting" });
        const result = await db.execute(sql`SELECT 1 as test`);
        results.tests.push({ 
          test: "simple query", 
          status: "success",
          result: result.rows[0]
        });
        
        // Test 4: Check if users table exists
        try {
          results.tests.push({ test: "check users table", status: "starting" });
          const tableCheck = await db.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'users'
            ) as exists
          `);
          results.tests.push({ 
            test: "check users table", 
            status: "success",
            tableExists: tableCheck.rows[0]?.exists
          });
        } catch (tableError: any) {
          results.tests.push({ 
            test: "check users table", 
            status: "error",
            error: tableError.message
          });
        }
        
      } catch (queryError: any) {
        results.tests.push({ 
          test: "simple query", 
          status: "error",
          error: queryError.message,
          hint: "Database connection might be failing"
        });
      }
      
    } catch (dbError: any) {
      results.tests.push({ 
        test: "get db instance", 
        status: "error",
        error: dbError.message,
        hint: "Check DATABASE_URL format"
      });
    }
    
  } catch (importError: any) {
    results.tests.push({ 
      test: "import db module", 
      status: "error",
      error: importError.message,
      stack: importError.stack
    });
  }

  const hasErrors = results.tests.some((t: any) => t.status === "error");
  return res.status(hasErrors ? 500 : 200).json(results);
}