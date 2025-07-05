const { Pool } = require('pg');

async function debugDatabaseSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== DATABASE SCHEMA DEBUG ===\n');
    
    // 1. Check if tasks table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks'
      );
    `);
    console.log('Tasks table exists:', tableCheck.rows[0].exists);
    
    // 2. Get all columns in tasks table
    const columns = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nTasks table columns:');
    console.log('-------------------');
    columns.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable} | ${col.column_default || 'null'}`);
    });
    
    // 3. Check for specific columns we're having issues with
    const problemColumns = ['lastCompletedAt', 'last_completed_at', 'completionCount', 'completion_count'];
    console.log('\nChecking problem columns:');
    console.log('------------------------');
    
    for (const colName of problemColumns) {
      const exists = columns.rows.some(col => col.column_name === colName);
      console.log(`${colName.padEnd(20)} | ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    }
    
    // 4. Check database timezone
    const timezone = await pool.query('SHOW timezone;');
    console.log('\nDatabase timezone:', timezone.rows[0].timezone);
    
    // 5. Test NOW() function
    const nowTest = await pool.query('SELECT NOW() as current_time;');
    console.log('NOW() returns:', nowTest.rows[0].current_time);
    
    // 6. Check for any constraints or triggers
    const constraints = await pool.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint 
      WHERE conrelid = 'tasks'::regclass;
    `);
    
    if (constraints.rows.length > 0) {
      console.log('\nConstraints on tasks table:');
      console.log('--------------------------');
      constraints.rows.forEach(con => {
        console.log(`${con.constraint_name} | Type: ${con.constraint_type}`);
      });
    }
    
    // 7. Sample task data
    const sampleTask = await pool.query(`
      SELECT id, task_category, user_id, last_completed_at, completion_count
      FROM tasks 
      WHERE task_category = 'habit' 
      LIMIT 1;
    `);
    
    if (sampleTask.rows.length > 0) {
      console.log('\nSample habit task:');
      console.log('-----------------');
      console.log(JSON.stringify(sampleTask.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

// Run the debug script
debugDatabaseSchema();