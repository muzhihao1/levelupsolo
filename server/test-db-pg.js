// Test with native pg client instead of postgres
require("dotenv").config();
const { Client } = require('pg');

async function testWithPg() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("No DATABASE_URL found");
    return;
  }
  
  console.log("Testing with pg client...");
  console.log("URL preview:", DATABASE_URL.substring(0, 60) + "...");
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log("✅ Connected successfully with pg client!");
    
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log("Database:", result.rows[0].current_database);
    console.log("User:", result.rows[0].current_user);
    console.log("Version:", result.rows[0].version.split(' ')[1]);
    
    await client.end();
  } catch (error) {
    console.error("❌ pg client error:", error.message);
    console.error("Error code:", error.code);
  }
}

// Also test URL parsing
function parseAndCheckUrl() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) return;
  
  console.log("\n🔍 Analyzing DATABASE_URL format:");
  
  try {
    const url = new URL(DATABASE_URL);
    console.log("Protocol:", url.protocol);
    console.log("Username:", url.username);
    console.log("Hostname:", url.hostname);
    console.log("Port:", url.port);
    console.log("Database:", url.pathname.substring(1));
    console.log("Search params:", url.search);
    
    // Check if it's proper Supabase pooler format
    if (url.hostname.includes('pooler.supabase.com') && url.port === '6543') {
      console.log("✅ Correct Supabase Session Pooler format");
    } else {
      console.log("⚠️  Unexpected format");
    }
    
    // Check username format
    if (url.username.startsWith('postgres.')) {
      console.log("✅ Username has correct format (postgres.xxx)");
    } else {
      console.log("⚠️  Username format might be incorrect");
    }
  } catch (error) {
    console.error("Failed to parse URL:", error.message);
  }
}

parseAndCheckUrl();
testWithPg();