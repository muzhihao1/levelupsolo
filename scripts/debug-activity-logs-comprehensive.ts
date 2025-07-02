import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { storage } from "../server/storage";

/**
 * Comprehensive debug script for activity logs issues
 */
async function debugActivityLogs() {
  console.log('🔍 Starting comprehensive activity logs debug...\n');
  
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // Test 1: Check database connection and driver
  console.log('1️⃣ Testing database connection...');
  try {
    const testResult = await db.execute(sql`SELECT 1 as test`);
    const isPostgresJs = Array.isArray(testResult);
    results.tests.push({
      name: 'Database Connection',
      status: 'success',
      driver: isPostgresJs ? 'postgres.js' : 'node-postgres',
      resultFormat: isPostgresJs ? 'array' : 'object with rows'
    });
    console.log('✅ Database connected');
  } catch (error: any) {
    results.tests.push({
      name: 'Database Connection',
      status: 'failed',
      error: error.message
    });
    console.error('❌ Database connection failed:', error.message);
    return results;
  }
  
  // Test 2: Check users table and get sample user
  console.log('\n2️⃣ Checking users table...');
  try {
    const users = await db.execute(sql`
      SELECT id, email, created_at, 
             LENGTH(id) as id_length,
             pg_typeof(id) as id_type
      FROM users 
      LIMIT 5
    `);
    
    const userData = Array.isArray(users) ? users : users.rows;
    results.tests.push({
      name: 'Users Table',
      status: 'success',
      sampleUsers: userData,
      userCount: userData.length
    });
    
    if (userData.length > 0) {
      console.log('✅ Found users:');
      userData.forEach((u: any) => {
        console.log(`  - ID: "${u.id}" (length: ${u.id_length}, type: ${u.id_type})`);
      });
    }
  } catch (error: any) {
    results.tests.push({
      name: 'Users Table',
      status: 'failed',
      error: error.message
    });
    console.error('❌ Users table error:', error.message);
  }
  
  // Test 3: Check activity_logs table structure
  console.log('\n3️⃣ Checking activity_logs table...');
  try {
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'activity_logs'
      ) as exists
    `);
    
    const exists = Array.isArray(tableExists) ? tableExists[0]?.exists : tableExists?.rows?.[0]?.exists;
    
    if (!exists) {
      console.log('❌ activity_logs table does not exist!');
      console.log('🔧 Creating table...');
      
      // Create table without foreign keys first
      await db.execute(sql`
        CREATE TABLE activity_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL,
          date TIMESTAMP NOT NULL DEFAULT NOW(),
          task_id INTEGER,
          skill_id INTEGER,
          exp_gained INTEGER NOT NULL DEFAULT 0,
          action TEXT NOT NULL,
          description TEXT
        )
      `);
      
      console.log('✅ Table created');
    } else {
      console.log('✅ Table exists');
      
      // Check columns
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'activity_logs'
        ORDER BY ordinal_position
      `);
      
      const columnData = Array.isArray(columns) ? columns : columns.rows;
      console.log('📋 Columns:');
      columnData.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      results.tests.push({
        name: 'Activity Logs Table',
        status: 'success',
        exists: true,
        columns: columnData
      });
    }
  } catch (error: any) {
    results.tests.push({
      name: 'Activity Logs Table',
      status: 'failed',
      error: error.message
    });
    console.error('❌ Table check error:', error.message);
  }
  
  // Test 4: Check foreign key constraints
  console.log('\n4️⃣ Checking foreign key constraints...');
  try {
    const constraints = await db.execute(sql`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'activity_logs'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    const fkData = Array.isArray(constraints) ? constraints : constraints.rows;
    console.log(`Found ${fkData.length} foreign key constraints`);
    
    if (fkData.length > 0) {
      console.log('⚠️  Foreign keys found - these might cause insertion failures!');
      fkData.forEach((fk: any) => {
        console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }
    
    results.tests.push({
      name: 'Foreign Key Constraints',
      status: 'success',
      constraints: fkData
    });
  } catch (error: any) {
    results.tests.push({
      name: 'Foreign Key Constraints',
      status: 'failed',
      error: error.message
    });
  }
  
  // Test 5: Try direct SQL insertion
  console.log('\n5️⃣ Testing direct SQL insertion...');
  const testUserId = 'test-' + Date.now();
  
  try {
    // First, try without foreign key reference
    await db.execute(sql`
      INSERT INTO activity_logs (user_id, action, description, exp_gained)
      VALUES (${testUserId}, 'test_action', 'Direct SQL test', 10)
    `);
    
    console.log('✅ Direct insertion successful (no FK)');
    
    // Clean up
    await db.execute(sql`
      DELETE FROM activity_logs WHERE user_id = ${testUserId}
    `);
    
    results.tests.push({
      name: 'Direct SQL Insert (No FK)',
      status: 'success'
    });
  } catch (error: any) {
    console.error('❌ Direct insertion failed:', error.message);
    results.tests.push({
      name: 'Direct SQL Insert (No FK)',
      status: 'failed',
      error: error.message,
      errorCode: error.code
    });
  }
  
  // Test 6: Try insertion with real user ID
  console.log('\n6️⃣ Testing insertion with real user ID...');
  try {
    // Get a real user ID
    const realUser = await db.execute(sql`
      SELECT id FROM users LIMIT 1
    `);
    
    const userId = Array.isArray(realUser) ? realUser[0]?.id : realUser?.rows?.[0]?.id;
    
    if (userId) {
      console.log(`Using real user ID: "${userId}"`);
      
      // Try direct SQL
      await db.execute(sql`
        INSERT INTO activity_logs (user_id, action, description, exp_gained, date)
        VALUES (${userId}, 'test_with_real_user', 'Test with real user ID', 20, NOW())
      `);
      
      console.log('✅ Insertion with real user ID successful');
      
      // Check if we can retrieve it
      const checkLogs = await db.execute(sql`
        SELECT * FROM activity_logs 
        WHERE user_id = ${userId} 
        ORDER BY date DESC 
        LIMIT 1
      `);
      
      const logData = Array.isArray(checkLogs) ? checkLogs : checkLogs.rows;
      console.log('✅ Retrieved inserted log:', logData[0]);
      
      results.tests.push({
        name: 'Insert with Real User',
        status: 'success',
        userId: userId,
        retrievedLog: logData[0]
      });
    }
  } catch (error: any) {
    console.error('❌ Real user insertion failed:', error.message);
    results.tests.push({
      name: 'Insert with Real User',
      status: 'failed',
      error: error.message,
      errorCode: error.code
    });
  }
  
  // Test 7: Test storage.createActivityLog
  console.log('\n7️⃣ Testing storage.createActivityLog...');
  try {
    // Get a real user ID
    const realUser = await db.execute(sql`
      SELECT id FROM users LIMIT 1
    `);
    
    const userId = Array.isArray(realUser) ? realUser[0]?.id : realUser?.rows?.[0]?.id;
    
    if (userId) {
      const log = await storage.createActivityLog({
        userId: userId,
        action: 'test_storage_method',
        description: 'Test via storage method',
        expGained: 30
      });
      
      console.log('✅ storage.createActivityLog successful:', log);
      
      results.tests.push({
        name: 'Storage Create Method',
        status: 'success',
        createdLog: log
      });
    }
  } catch (error: any) {
    console.error('❌ storage.createActivityLog failed:', error.message);
    results.tests.push({
      name: 'Storage Create Method',
      status: 'failed',
      error: error.message,
      stack: error.stack
    });
  }
  
  // Test 8: Test storage.getActivityLogs
  console.log('\n8️⃣ Testing storage.getActivityLogs...');
  try {
    // Get a real user ID
    const realUser = await db.execute(sql`
      SELECT id FROM users LIMIT 1
    `);
    
    const userId = Array.isArray(realUser) ? realUser[0]?.id : realUser?.rows?.[0]?.id;
    
    if (userId) {
      const logs = await storage.getActivityLogs(userId);
      console.log(`✅ Retrieved ${logs.length} logs via storage method`);
      
      if (logs.length > 0) {
        console.log('Sample log:', logs[0]);
      }
      
      results.tests.push({
        name: 'Storage Get Method',
        status: 'success',
        userId: userId,
        logCount: logs.length,
        sampleLog: logs[0]
      });
    }
  } catch (error: any) {
    console.error('❌ storage.getActivityLogs failed:', error.message);
    results.tests.push({
      name: 'Storage Get Method',
      status: 'failed',
      error: error.message,
      stack: error.stack
    });
  }
  
  // Test 9: Check for user ID type mismatches
  console.log('\n9️⃣ Checking for user ID mismatches in activity_logs...');
  try {
    const mismatchCheck = await db.execute(sql`
      SELECT 
        al.user_id as log_user_id,
        u.id as user_id,
        al.id as log_id,
        CASE 
          WHEN u.id IS NULL THEN 'User not found'
          ELSE 'User exists'
        END as status
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LIMIT 10
    `);
    
    const mismatchData = Array.isArray(mismatchCheck) ? mismatchCheck : mismatchCheck.rows;
    
    const orphanedLogs = mismatchData.filter((row: any) => row.status === 'User not found');
    
    console.log(`Found ${orphanedLogs.length} orphaned logs (user not in users table)`);
    
    if (orphanedLogs.length > 0) {
      console.log('⚠️  Orphaned logs found:');
      orphanedLogs.forEach((log: any) => {
        console.log(`  - Log ID ${log.log_id}: user_id "${log.log_user_id}" not found`);
      });
    }
    
    results.tests.push({
      name: 'User ID Consistency',
      status: orphanedLogs.length === 0 ? 'success' : 'warning',
      orphanedLogs: orphanedLogs.length,
      sample: orphanedLogs.slice(0, 3)
    });
  } catch (error: any) {
    results.tests.push({
      name: 'User ID Consistency',
      status: 'failed',
      error: error.message
    });
  }
  
  console.log('\n📊 Final Results:', JSON.stringify(results, null, 2));
  return results;
}

// Run the debug script
debugActivityLogs()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });