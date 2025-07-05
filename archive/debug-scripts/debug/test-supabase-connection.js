// Test Supabase connection locally
require("dotenv").config();

async function testConnection() {
  const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("❌ No DATABASE_URL found in environment");
    return;
  }
  
  console.log("Testing connection to:", DATABASE_URL.substring(0, 60) + "...");
  
  try {
    const postgres = require("postgres");
    
    // Try with different SSL configurations
    const configs = [
      { name: "Config 1: SSL require", ssl: 'require' },
      { name: "Config 2: SSL with rejectUnauthorized false", ssl: { rejectUnauthorized: false } },
      { name: "Config 3: No SSL", ssl: false }
    ];
    
    for (const config of configs) {
      console.log(`\nTrying ${config.name}...`);
      
      try {
        const sql = postgres(DATABASE_URL, {
          ssl: config.ssl,
          connect_timeout: 10,
          max: 1
        });
        
        const result = await sql`SELECT current_database() as db, current_user as user`;
        console.log("✅ Success with", config.name);
        console.log("   Database:", result[0].db);
        console.log("   User:", result[0].user);
        
        await sql.end();
        break;
      } catch (error) {
        console.log("❌ Failed with", config.name);
        console.log("   Error:", error.message);
      }
    }
  } catch (error) {
    console.error("❌ General error:", error.message);
  }
}

// Also test with Supabase client
async function testSupabaseClient() {
  console.log("\n\nTesting with Supabase client...");
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.log("❌ SUPABASE_URL or SUPABASE_ANON_KEY not set");
    return;
  }
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, key);
    
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log("❌ Supabase query error:", error.message);
    } else {
      console.log("✅ Supabase client connected successfully");
    }
  } catch (error) {
    console.log("❌ Supabase client error:", error.message);
  }
}

testConnection()
  .then(() => testSupabaseClient())
  .then(() => process.exit(0));