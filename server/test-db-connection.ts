// Test database connection directly
import { db } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

async function testConnection() {
  console.log("Testing database connection...");
  
  try {
    // Test 1: Simple query
    console.log("\n1. Testing simple query...");
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("✅ Simple query successful:", result);
    
    // Test 2: List tables
    console.log("\n2. Listing tables...");
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    console.log("✅ Tables found:", tables.map((t: any) => t.table_name));
    
    // Test 3: Query users
    console.log("\n3. Querying users table...");
    const userList = await db.select().from(users).limit(5);
    console.log("✅ Users found:", userList.length);
    userList.forEach(u => console.log(`  - ${u.id}: ${u.email}`));
    
  } catch (error) {
    console.error("❌ Database test failed:", error);
    console.error("Error details:", {
      message: (error as any).message,
      code: (error as any).code,
      detail: (error as any).detail
    });
  }
  
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  testConnection();
}