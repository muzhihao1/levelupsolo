// Script to fix task categories based on likely patterns

import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixTaskCategories() {
  console.log('🔧 Fixing Task Categories...\n');
  
  try {
    // First, let's see what we have
    console.log('📊 Current task_category distribution:');
    const categories = await db.execute(sql`
      SELECT task_category, COUNT(*) as count
      FROM tasks
      GROUP BY task_category
    `);
    
    console.log(categories.rows || categories);
    
    // Common patterns to fix
    const fixes = [
      // If task_category is null but task_type exists
      {
        name: "Fix NULL categories based on task_type",
        query: sql`
          UPDATE tasks 
          SET task_category = CASE
            WHEN task_type = 'once' OR task_type = 'single' THEN 'todo'
            WHEN task_type = 'daily' OR task_type = 'recurring' THEN 'habit'
            WHEN task_type = 'goal' OR task_type = 'main' THEN 'goal'
            ELSE 'todo'
          END
          WHERE task_category IS NULL
        `
      },
      // Fix common variations
      {
        name: "Fix 'side' to 'todo'",
        query: sql`UPDATE tasks SET task_category = 'todo' WHERE task_category = 'side' OR task_category = 'sidequest'`
      },
      {
        name: "Fix 'main' to 'goal'",
        query: sql`UPDATE tasks SET task_category = 'goal' WHERE task_category = 'main' OR task_category = 'mainquest'`
      },
      {
        name: "Fix 'daily' to 'habit'",
        query: sql`UPDATE tasks SET task_category = 'habit' WHERE task_category = 'daily' OR task_category = 'routine'`
      }
    ];
    
    // Ask for confirmation
    console.log('\n⚠️  This will update task categories to match expected values.');
    console.log('Expected values: "todo" (支线任务), "habit" (习惯), "goal" (主线任务)');
    console.log('\nDo you want to proceed? (yes/no)');
    
    // For automated execution, we'll just show what would be done
    console.log('\n📝 Changes that would be made:');
    
    for (const fix of fixes) {
      console.log(`\n- ${fix.name}`);
      // Show preview of affected rows
      if (fix.name.includes("NULL")) {
        const preview = await db.execute(sql`
          SELECT COUNT(*) as count FROM tasks WHERE task_category IS NULL
        `);
        console.log(`  Would affect: ${(preview.rows?.[0] || preview[0])?.count || 0} rows`);
      }
    }
    
    // To actually run the fixes, uncomment below:
    /*
    for (const fix of fixes) {
      console.log(`\nRunning: ${fix.name}`);
      const result = await db.execute(fix.query);
      console.log(`  Updated: ${result.rowCount || 0} rows`);
    }
    */
    
    // Show final distribution
    console.log('\n📊 Final task_category distribution:');
    const finalCategories = await db.execute(sql`
      SELECT task_category, COUNT(*) as count
      FROM tasks
      GROUP BY task_category
    `);
    
    console.log(finalCategories.rows || finalCategories);
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Also export a function to check a specific user's tasks
export async function checkUserTasks(userEmail: string) {
  console.log(`\n🔍 Checking tasks for user: ${userEmail}`);
  
  try {
    const result = await db.execute(sql`
      SELECT t.id, t.title, t.task_category, t.task_type, t.completed
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE u.email = ${userEmail}
      ORDER BY t.created_at DESC
    `);
    
    const tasks = result.rows || result;
    console.log(`\nFound ${tasks.length} tasks:`);
    
    // Group by category
    const byCategory: Record<string, any[]> = {};
    tasks.forEach((task: any) => {
      const cat = task.task_category || 'UNCATEGORIZED';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(task);
    });
    
    Object.entries(byCategory).forEach(([category, tasks]) => {
      console.log(`\n[${category}]: ${tasks.length} tasks`);
      tasks.slice(0, 3).forEach(task => {
        console.log(`  - "${task.title}" (type: ${task.task_type}, completed: ${task.completed})`);
      });
    });
    
  } catch (error) {
    console.error('Error checking user tasks:', error);
  }
}

// Run the fix
fixTaskCategories();

// Uncomment to check specific user:
// checkUserTasks('your-email@example.com');