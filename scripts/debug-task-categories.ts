// Debug script to check actual task categories in database

import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function debugTaskCategories() {
  console.log('🔍 Debugging Task Categories...\n');
  
  try {
    // Get all unique task categories
    const result = await db.execute(sql`
      SELECT DISTINCT task_category, COUNT(*) as count
      FROM tasks
      GROUP BY task_category
      ORDER BY count DESC
    `);
    
    console.log('📊 Task Categories Distribution:');
    console.log('================================');
    
    const categories = result.rows || result;
    categories.forEach((row: any) => {
      console.log(`${row.task_category || 'NULL'}: ${row.count} tasks`);
    });
    
    console.log('\n📋 Sample Tasks by Category:');
    console.log('================================');
    
    // Get sample tasks for each category
    for (const row of categories) {
      const category = row.task_category;
      console.log(`\n[${category || 'NULL'}]:`);
      
      const samples = await db.execute(sql`
        SELECT id, title, completed, task_type, user_id
        FROM tasks
        WHERE task_category = ${category}
        LIMIT 3
      `);
      
      const sampleTasks = samples.rows || samples;
      sampleTasks.forEach((task: any) => {
        console.log(`  - ID: ${task.id}, Title: "${task.title}", Type: ${task.task_type}, Completed: ${task.completed}`);
      });
    }
    
    // Check for specific user
    console.log('\n🧑 Checking specific user tasks:');
    console.log('================================');
    
    const userTasks = await db.execute(sql`
      SELECT id, title, task_category, task_type, completed
      FROM tasks
      WHERE user_id IN (
        SELECT id FROM users 
        WHERE email NOT LIKE '%test%' 
        LIMIT 1
      )
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    const tasks = userTasks.rows || userTasks;
    console.log(`Found ${tasks.length} tasks for non-test user:`);
    tasks.forEach((task: any) => {
      console.log(`  - Category: ${task.task_category}, Type: ${task.task_type}, Title: "${task.title}"`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugTaskCategories();