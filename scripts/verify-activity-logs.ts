import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { storage } from "../server/storage";

/**
 * Verify activity logs are working after schema fix
 */
async function verifyActivityLogs() {
  console.log('🔍 Verifying activity logs fix...\n');
  
  try {
    // Get a real user
    const users = await db.execute(sql`
      SELECT id, email FROM users LIMIT 1
    `);
    
    const user = Array.isArray(users) ? users[0] : users.rows?.[0];
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`👤 Using user: ${user.email} (ID: ${user.id})\n`);
    
    // Test 1: Create a new activity log
    console.log('1️⃣ Creating test activity log...');
    try {
      const newLog = await storage.createActivityLog({
        userId: user.id,
        action: 'test_verification',
        details: { 
          description: 'Schema fix verification test',
          timestamp: new Date().toISOString()
        },
        expGained: 10
      });
      
      console.log('✅ Created successfully:', newLog);
    } catch (error: any) {
      console.error('❌ Failed to create:', error.message);
      return;
    }
    
    // Test 2: Retrieve activity logs
    console.log('\n2️⃣ Retrieving activity logs...');
    try {
      const logs = await storage.getActivityLogs(user.id);
      console.log(`✅ Retrieved ${logs.length} logs`);
      
      if (logs.length > 0) {
        console.log('\n📊 Recent logs:');
        logs.slice(0, 3).forEach((log: any) => {
          const description = log.details?.description || 'No description';
          const date = new Date(log.createdAt || log.created_at).toLocaleString();
          console.log(`  - ${log.action}: ${description} (${date})`);
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to retrieve:', error.message);
    }
    
    // Test 3: Clean up test data
    console.log('\n3️⃣ Cleaning up test data...');
    try {
      await db.execute(sql`
        DELETE FROM activity_logs 
        WHERE user_id = ${user.id} 
        AND action = 'test_verification'
      `);
      console.log('✅ Cleanup complete');
    } catch (error: any) {
      console.error('❌ Cleanup failed:', error.message);
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error);
  }
}

// Run verification
verifyActivityLogs()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));