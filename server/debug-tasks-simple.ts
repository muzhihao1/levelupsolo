import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugTasks() {
  console.log('=== SIMPLE TASK CATEGORY DEBUG ===\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // 1. Check all unique task categories
    console.log('1. All unique task categories in database:');
    const categoriesResult = await pool.query(`
      SELECT task_category, COUNT(*) as count 
      FROM tasks 
      GROUP BY task_category
      ORDER BY count DESC
    `);
    console.table(categoriesResult.rows);
    
    // 2. Check specific user tasks
    const userEmail = process.argv[2] || 'muzhihao1@gmail.com';
    console.log(`\n2. Checking tasks for user: ${userEmail}`);
    
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`User ID: ${userId}`);
    
    // 3. Get task breakdown for user
    console.log('\n3. User task categories:');
    const userTasksResult = await pool.query(`
      SELECT 
        task_category,
        completed,
        COUNT(*) as count
      FROM tasks
      WHERE user_id = $1
      GROUP BY task_category, completed
      ORDER BY task_category, completed
    `, [userId]);
    console.table(userTasksResult.rows);
    
    // 4. Sample tasks
    console.log('\n4. Sample incomplete tasks:');
    const sampleResult = await pool.query(`
      SELECT 
        id,
        title,
        task_category,
        completed,
        created_at
      FROM tasks
      WHERE user_id = $1 AND completed = false
      LIMIT 10
    `, [userId]);
    console.table(sampleResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugTasks().catch(console.error);