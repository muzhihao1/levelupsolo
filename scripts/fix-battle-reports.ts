import { sql } from "../lib/db";
import fs from "fs";
import path from "path";

async function fixBattleReports() {
  try {
    console.log("Fixing battle reports table...");
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(
      path.join(__dirname, "fix-battle-reports-table.sql"),
      "utf8"
    );
    
    // Execute the SQL
    await sql.unsafe(sqlContent);
    
    console.log("✅ Battle reports tables created/updated successfully!");
    
    // Verify the tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('daily_battle_reports', 'pomodoro_sessions')
      ORDER BY table_name
    `;
    
    console.log("\nVerified tables:");
    tables.forEach(t => console.log(`- ${t.table_name}`));
    
    // Check column types for daily_battle_reports
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'daily_battle_reports'
      ORDER BY ordinal_position
    `;
    
    console.log("\ndaily_battle_reports columns:");
    columns.forEach(c => console.log(`- ${c.column_name}: ${c.data_type}`));
    
  } catch (error) {
    console.error("❌ Error fixing battle reports:", error);
    throw error;
  } finally {
    await sql.end();
    process.exit(0);
  }
}

fixBattleReports();