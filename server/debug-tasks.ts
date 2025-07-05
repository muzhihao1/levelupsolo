import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { tasks, users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function debugTasks() {
  console.log('=== TASK CATEGORY DEBUG REPORT ===\n');
  
  try {
    // 1. Check all unique task categories in the database
    console.log('1. All unique task categories in database:');
    const categories = await db
      .select({ 
        category: tasks.taskCategory,
        count: sql<number>`count(*)::int`
      })
      .from(tasks)
      .groupBy(tasks.taskCategory);
    
    console.table(categories);
    
    // 2. Check tasks for a specific user (you'll need to update the email)
    const userEmail = process.argv[2] || 'test@example.com';
    console.log(`\n2. Checking tasks for user: ${userEmail}`);
    
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    if (user.length === 0) {
      console.log(`User not found: ${userEmail}`);
      console.log('\nAvailable users:');
      const allUsers = await db.select({ email: users.email }).from(users);
      console.table(allUsers);
      return;
    }
    
    const userId = user[0].id;
    console.log(`User ID: ${userId}`);
    
    // 3. Get all tasks for this user grouped by category
    console.log('\n3. User tasks by category:');
    const userTasksByCategory = await db
      .select({ 
        category: tasks.taskCategory,
        isCompleted: tasks.isCompleted,
        count: sql<number>`count(*)::int`
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .groupBy(tasks.taskCategory, tasks.isCompleted);
    
    console.table(userTasksByCategory);
    
    // 4. Get sample tasks for each category
    console.log('\n4. Sample tasks for each category:');
    const taskCategories = ['main_quest', 'side_quest', 'daily_quest'];
    
    for (const category of taskCategories) {
      console.log(`\n--- ${category.toUpperCase()} ---`);
      const sampleTasks = await db
        .select({
          id: tasks.id,
          description: tasks.description,
          taskCategory: tasks.taskCategory,
          isCompleted: tasks.isCompleted,
          createdAt: tasks.createdAt
        })
        .from(tasks)
        .where(sql`${tasks.userId} = ${userId} AND ${tasks.taskCategory} = ${category}`)
        .limit(3);
      
      if (sampleTasks.length === 0) {
        console.log('No tasks found for this category');
      } else {
        console.table(sampleTasks);
      }
    }
    
    // 5. Check for any NULL or unexpected taskCategory values
    console.log('\n5. Tasks with NULL or unexpected categories:');
    const problematicTasks = await db
      .select({
        id: tasks.id,
        description: tasks.description,
        taskCategory: tasks.taskCategory,
        createdAt: tasks.createdAt
      })
      .from(tasks)
      .where(sql`
        ${tasks.userId} = ${userId} AND 
        (${tasks.taskCategory} IS NULL OR 
         ${tasks.taskCategory} NOT IN ('main_quest', 'side_quest', 'daily_quest'))
      `);
    
    if (problematicTasks.length === 0) {
      console.log('No problematic tasks found');
    } else {
      console.table(problematicTasks);
    }
    
    // 6. Test the exact query used in the API
    console.log('\n6. Testing API query (incomplete tasks only):');
    const apiQuery = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.userId} = ${userId} AND ${tasks.isCompleted} = false`);
    
    const apiTasksByCategory = apiQuery.reduce((acc, task) => {
      const category = task.taskCategory || 'unknown';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category]++;
      return acc;
    }, {} as Record<string, number>);
    
    console.table(apiTasksByCategory);
    console.log(`Total incomplete tasks: ${apiQuery.length}`);
    
  } catch (error) {
    console.error('Error during debug:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug script
debugTasks().catch(console.error);