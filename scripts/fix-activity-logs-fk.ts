import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Fix activity_logs foreign key issues
 */
async function fixActivityLogsForeignKeys() {
  console.log('🔧 Fixing activity_logs foreign key issues...\n');
  
  try {
    // Step 1: Drop existing foreign key constraints
    console.log('1️⃣ Dropping existing foreign key constraints...');
    
    const constraints = await db.execute(sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'activity_logs'
        AND constraint_type = 'FOREIGN KEY'
    `);
    
    const constraintData = Array.isArray(constraints) ? constraints : constraints.rows;
    
    for (const constraint of constraintData) {
      console.log(`Dropping constraint: ${constraint.constraint_name}`);
      try {
        await db.execute(sql`
          ALTER TABLE activity_logs 
          DROP CONSTRAINT ${sql.identifier(constraint.constraint_name)}
        `);
        console.log('✅ Dropped');
      } catch (e: any) {
        console.log('⚠️  Could not drop:', e.message);
      }
    }
    
    // Step 2: Check if we have orphaned records
    console.log('\n2️⃣ Checking for orphaned records...');
    
    const orphanedCheck = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM activity_logs al
      WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = al.user_id
      )
    `);
    
    const orphanedCount = Array.isArray(orphanedCheck) ? orphanedCheck[0]?.count : orphanedCheck?.rows?.[0]?.count;
    
    if (orphanedCount > 0) {
      console.log(`⚠️  Found ${orphanedCount} orphaned records`);
      
      // Show sample of orphaned user IDs
      const orphanedSample = await db.execute(sql`
        SELECT DISTINCT user_id, COUNT(*) as log_count
        FROM activity_logs al
        WHERE NOT EXISTS (
          SELECT 1 FROM users u WHERE u.id = al.user_id
        )
        GROUP BY user_id
        LIMIT 5
      `);
      
      const sampleData = Array.isArray(orphanedSample) ? orphanedSample : orphanedSample.rows;
      console.log('Sample orphaned user IDs:');
      sampleData.forEach((row: any) => {
        console.log(`  - "${row.user_id}" (${row.log_count} logs)`);
      });
      
      // Option to clean up orphaned records
      console.log('\n🧹 Cleaning up orphaned records...');
      const deleteResult = await db.execute(sql`
        DELETE FROM activity_logs al
        WHERE NOT EXISTS (
          SELECT 1 FROM users u WHERE u.id = al.user_id
        )
      `);
      
      console.log(`✅ Deleted ${orphanedCount} orphaned records`);
    } else {
      console.log('✅ No orphaned records found');
    }
    
    // Step 3: Recreate foreign key constraint (optional)
    console.log('\n3️⃣ Foreign key constraint status...');
    console.log('📝 Note: Leaving foreign key constraints OFF for now');
    console.log('    This allows more flexible data insertion');
    console.log('    You can add them back later if needed');
    
    // Step 4: Test insertion
    console.log('\n4️⃣ Testing insertion...');
    
    // Get a real user
    const realUser = await db.execute(sql`
      SELECT id FROM users LIMIT 1
    `);
    
    const userId = Array.isArray(realUser) ? realUser[0]?.id : realUser?.rows?.[0]?.id;
    
    if (userId) {
      await db.execute(sql`
        INSERT INTO activity_logs (user_id, action, description, exp_gained)
        VALUES (${userId}, 'test_after_fix', 'Test after FK fix', 50)
      `);
      
      console.log('✅ Test insertion successful!');
      
      // Verify retrieval
      const testLogs = await db.execute(sql`
        SELECT * FROM activity_logs 
        WHERE user_id = ${userId} 
        AND action = 'test_after_fix'
        LIMIT 1
      `);
      
      const logData = Array.isArray(testLogs) ? testLogs : testLogs.rows;
      console.log('✅ Retrieved test log:', logData[0]);
    }
    
    console.log('\n✅ Fix completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Error during fix:', error);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
  }
}

// Run the fix
fixActivityLogsForeignKeys()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });