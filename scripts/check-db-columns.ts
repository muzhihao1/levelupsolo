// Check actual database columns
import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDatabaseColumns() {
  console.log('🔍 Checking Database Table Columns...\n');
  
  try {
    // Check tasks table columns
    console.log('📊 Tasks Table Columns:');
    console.log('======================');
    const tasksColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      ORDER BY ordinal_position
    `);
    
    const taskCols = tasksColumns.rows || tasksColumns;
    taskCols.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check micro_tasks table columns
    console.log('\n📊 Micro Tasks Table Columns:');
    console.log('=============================');
    const microTasksColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'micro_tasks' 
      ORDER BY ordinal_position
    `);
    
    const microTaskCols = microTasksColumns.rows || microTasksColumns;
    if (microTaskCols.length === 0) {
      console.log('  ❌ Table not found or no columns');
    } else {
      microTaskCols.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Check if description columns exist
    console.log('\n⚠️  Column Check Results:');
    console.log('========================');
    
    const hasTasksDescription = taskCols.some((col: any) => col.column_name === 'description');
    const hasMicroTasksDescription = microTaskCols.some((col: any) => col.column_name === 'description');
    
    console.log(`Tasks table has 'description' column: ${hasTasksDescription ? '✅ Yes' : '❌ No'}`);
    console.log(`Micro_tasks table has 'description' column: ${hasMicroTasksDescription ? '✅ Yes' : '❌ No'}`);
    
    if (!hasTasksDescription || !hasMicroTasksDescription) {
      console.log('\n💡 Solution: The schema expects these columns but they don\'t exist in the database.');
      console.log('   You may need to run database migrations or update the schema.');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run check
checkDatabaseColumns();