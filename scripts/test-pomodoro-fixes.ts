// Test script to verify Pomodoro timer fixes
import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function testPomodoroFixes() {
  console.log('🧪 Testing Pomodoro Timer Fixes...\n');
  
  try {
    // Test 1: Check task category distribution
    console.log('📊 Test 1: Task Category Distribution');
    const categories = await db.execute(sql`
      SELECT task_category, COUNT(*) as count
      FROM tasks
      WHERE completed = false
      GROUP BY task_category
    `);
    
    console.log('Active task categories:');
    const categoryRows = categories.rows || categories;
    if (Array.isArray(categoryRows)) {
      categoryRows.forEach((row: any) => {
        console.log(`  ${row.task_category || 'NULL'}: ${row.count} tasks`);
      });
    } else {
      console.log('  No category data found');
    }
    
    // Test 2: Check normalized categories
    console.log('\n🔄 Test 2: Category Normalization');
    const { normalizeTaskCategory } = require('../server/utils/task-category-mapper');
    
    const testCategories = ['side', 'sidequest', 'daily', 'habit', 'todo', 'main', null];
    console.log('Category normalization tests:');
    testCategories.forEach(cat => {
      console.log(`  "${cat}" → "${normalizeTaskCategory(cat)}"`);
    });
    
    // Test 3: Check API endpoint response
    console.log('\n🌐 Test 3: API Endpoint Response');
    console.log('To test the API endpoint:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Login to the application');
    console.log('3. Open browser console and run:');
    console.log(`
fetch('/api/pomodoro/available-tasks', {
  credentials: 'include'
}).then(r => r.json()).then(data => {
  console.log('Goals:', data.goals?.length || 0);
  console.log('Tasks (支线任务):', data.tasks?.length || 0);
  console.log('Habits (习惯):', data.habits?.length || 0);
});
    `);
    
    // Test 4: Check if any tasks need category fixing
    console.log('\n🔧 Test 4: Tasks Needing Category Fix');
    const needsFix = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE task_category IS NULL 
        OR task_category NOT IN ('todo', 'habit', 'goal')
    `);
    
    const fixResult = needsFix.rows || needsFix;
    const fixCount = fixResult[0]?.count || 0;
    if (fixCount > 0) {
      console.log(`⚠️  Found ${fixCount} tasks with non-standard categories`);
      console.log('Run the fix script to update them:');
      console.log('  npx tsx scripts/fix-task-categories.ts');
    } else {
      console.log('✅ All tasks have standard categories!');
    }
    
    // Test 5: Sample tasks by category
    console.log('\n📝 Test 5: Sample Tasks by Category');
    const sampleTasks = await db.execute(sql`
      SELECT 
        task_category,
        title,
        task_type,
        completed,
        completed_at
      FROM tasks
      ORDER BY task_category, created_at DESC
      LIMIT 15
    `);
    
    console.log('Sample tasks:');
    const sampleRows = sampleTasks.rows || sampleTasks;
    if (Array.isArray(sampleRows) && sampleRows.length > 0) {
      sampleRows.forEach((task: any) => {
        const status = task.completed ? '✓' : '○';
        const completedInfo = task.completed_at ? ` (completed: ${new Date(task.completed_at).toLocaleDateString()})` : '';
        console.log(`  ${status} [${task.task_category || 'NULL'}] "${task.title}"${completedInfo}`);
      });
    } else {
      console.log('  No tasks found');
    }
    
    // Test 6: Check habit completion dates
    console.log('\n🔄 Test 6: Habit Completion Analysis');
    const habitAnalysis = await db.execute(sql`
      SELECT 
        id,
        title,
        completed,
        completed_at,
        task_category
      FROM tasks
      WHERE task_category = 'habit'
      ORDER BY completed DESC, title
    `);
    
    const habitRows = habitAnalysis.rows || habitAnalysis;
    const today = new Date().toDateString();
    let completedToday = 0;
    let completedPreviously = 0;
    let notCompleted = 0;
    
    if (Array.isArray(habitRows)) {
      habitRows.forEach((habit: any) => {
        if (!habit.completed) {
          notCompleted++;
        } else if (habit.completed_at) {
          const completedDate = new Date(habit.completed_at).toDateString();
          if (completedDate === today) {
            completedToday++;
          } else {
            completedPreviously++;
          }
        }
      });
      
      console.log(`Total habits: ${habitRows.length}`);
      console.log(`  - Not completed: ${notCompleted}`);
      console.log(`  - Completed today: ${completedToday}`);
      console.log(`  - Completed previously: ${completedPreviously} (should be available again)`);
      console.log(`\nExpected available habits in Pomodoro: ${notCompleted + completedPreviously}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testPomodoroFixes();