import "dotenv/config";
import { db, sql } from "../server/db";

/**
 * Comprehensive test script for activity logs table issues
 */
async function testActivityLogs() {
  console.log('🔍 Starting comprehensive activity logs test...\n');
  
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
  };
  
  // Test 1: Database connection
  console.log('1️⃣ Testing database connection...');
  try {
    const testResult = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful');
    results.dbConnection = 'success';
    results.dbDriver = Array.isArray(testResult) ? 'postgres.js' : 'node-postgres';
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    results.dbConnection = 'failed';
    results.dbError = error.message;
    return results;
  }
  
  // Test 2: Check if activity_logs table exists
  console.log('\n2️⃣ Checking if activity_logs table exists...');
  try {
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'activity_logs'
      ) as exists
    `);
    
    // Handle different result formats
    let exists = false;
    if (Array.isArray(tableExists)) {
      exists = tableExists[0]?.exists === true;
    } else if (tableExists?.rows) {
      exists = tableExists.rows[0]?.exists === true;
    }
    
    console.log(exists ? '✅ Table exists' : '❌ Table does not exist');
    results.tableExists = exists;
    
    if (!exists) {
      console.log('\n🔧 Attempting to create table...');
      try {
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
        console.log('✅ Table created successfully');
        results.tableCreated = true;
      } catch (createError: any) {
        console.error('❌ Failed to create table:', createError.message);
        results.tableCreated = false;
        results.createError = createError.message;
      }
    }
  } catch (error: any) {
    console.error('❌ Error checking table existence:', error.message);
    results.tableCheckError = error.message;
  }
  
  // Test 3: Check table structure
  console.log('\n3️⃣ Checking table structure...');
  try {
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'activity_logs'
      ORDER BY ordinal_position
    `);
    
    const columnData = Array.isArray(columns) ? columns : columns.rows;
    console.log('📋 Table columns:');
    columnData.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    results.columns = columnData;
  } catch (error: any) {
    console.error('❌ Error checking table structure:', error.message);
    results.structureError = error.message;
  }
  
  // Test 4: Try to insert a test record
  console.log('\n4️⃣ Testing insert operation...');
  try {
    const testUserId = 'test-user-' + Date.now();
    await db.execute(sql`
      INSERT INTO activity_logs (user_id, action, description, exp_gained)
      VALUES (${testUserId}, 'test_action', 'Test activity log', 10)
    `);
    console.log('✅ Insert successful');
    results.insertTest = 'success';
    
    // Clean up
    await db.execute(sql`
      DELETE FROM activity_logs WHERE user_id = ${testUserId}
    `);
  } catch (error: any) {
    console.error('❌ Insert failed:', error.message);
    results.insertTest = 'failed';
    results.insertError = error.message;
  }
  
  // Test 5: Check indexes
  console.log('\n5️⃣ Checking indexes...');
  try {
    const indexes = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'activity_logs'
    `);
    
    const indexData = Array.isArray(indexes) ? indexes : indexes.rows;
    console.log('📊 Indexes:');
    indexData.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}`);
    });
    results.indexes = indexData.map((idx: any) => idx.indexname);
  } catch (error: any) {
    console.error('❌ Error checking indexes:', error.message);
    results.indexError = error.message;
  }
  
  // Test 6: Check foreign key constraints
  console.log('\n6️⃣ Checking foreign key constraints...');
  try {
    const constraints = await db.execute(sql`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'activity_logs'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    const constraintData = Array.isArray(constraints) ? constraints : constraints.rows;
    if (constraintData.length > 0) {
      console.log('🔗 Foreign keys:');
      constraintData.forEach((fk: any) => {
        console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('⚠️  No foreign key constraints found');
    }
    results.foreignKeys = constraintData;
  } catch (error: any) {
    console.error('❌ Error checking constraints:', error.message);
    results.constraintError = error.message;
  }
  
  // Test 7: Test the actual storage.getActivityLogs function
  console.log('\n7️⃣ Testing storage.getActivityLogs...');
  try {
    const { storage } = require('../server/storage');
    // Get a real user ID
    const users = await db.execute(sql`SELECT id FROM users LIMIT 1`);
    const userData = Array.isArray(users) ? users : users.rows;
    
    if (userData.length > 0) {
      const userId = userData[0].id;
      const logs = await storage.getActivityLogs(userId);
      console.log(`✅ Retrieved ${logs.length} activity logs`);
      results.storageTest = 'success';
      results.logCount = logs.length;
    } else {
      console.log('⚠️  No users found to test with');
      results.storageTest = 'no_users';
    }
  } catch (error: any) {
    console.error('❌ Storage test failed:', error.message);
    results.storageTest = 'failed';
    results.storageError = error.message;
  }
  
  console.log('\n📊 Final Results:', JSON.stringify(results, null, 2));
  return results;
}

// Run the test
testActivityLogs()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });