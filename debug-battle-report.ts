import { sql } from "./lib/db";

async function debugBattleReport() {
  try {
    console.log("Checking if daily_battle_reports table exists...");
    
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_battle_reports'
      ) as exists
    `;
    
    console.log("Table exists:", tableExists[0].exists);
    
    if (tableExists[0].exists) {
      // Check table structure
      const tableInfo = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'daily_battle_reports'
        ORDER BY ordinal_position
      `;
      
      console.log("\nTable structure:");
      tableInfo.forEach((col) => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
      
      // Check for any data
      const rowCount = await sql`
        SELECT COUNT(*) as count FROM daily_battle_reports
      `;
      
      console.log("\nRow count:", rowCount[0].count);
      
      // Test a simple query
      const testQuery = await sql`
        SELECT * FROM daily_battle_reports LIMIT 1
      `;
      
      console.log("\nSample row:", testQuery[0] || "No data");
      
    } else {
      console.log("\nTable does not exist! Running migration...");
      
      // Check which migrations have been applied
      const migrations = await sql`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('daily_battle_reports', 'pomodoro_sessions')
      `;
      
      console.log("\nExisting migration tables:", migrations.map(m => m.table_name));
    }
    
  } catch (error) {
    console.error("Error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
  } finally {
    process.exit(0);
  }
}

debugBattleReport();