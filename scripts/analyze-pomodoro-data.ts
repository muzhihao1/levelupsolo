// Quick analysis of Pomodoro data issues
import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function analyzePomodoroData() {
  console.log('🔍 Analyzing Pomodoro Data Issues...\n');
  
  try {
    // Get all tasks
    const allTasks = await db.execute(sql`
      SELECT 
        id,
        title,
        task_category,
        task_type,
        completed,
        completed_at,
        created_at
      FROM tasks
      ORDER BY task_category, created_at DESC
    `);
    
    const tasks = allTasks.rows || allTasks;
    
    // Categorize tasks
    const tasksByCategory: Record<string, any[]> = {};
    const activeTasksByCategory: Record<string, any[]> = {};
    
    tasks.forEach((task: any) => {
      const category = task.task_category || 'uncategorized';
      
      // All tasks
      if (!tasksByCategory[category]) {
        tasksByCategory[category] = [];
      }
      tasksByCategory[category].push(task);
      
      // Active tasks (what should show in Pomodoro)
      const isActive = !task.completed || 
        (category === 'habit' && task.completed_at && 
         new Date(task.completed_at).toDateString() !== new Date().toDateString());
      
      if (isActive) {
        if (!activeTasksByCategory[category]) {
          activeTasksByCategory[category] = [];
        }
        activeTasksByCategory[category].push(task);
      }
    });
    
    console.log('📊 Task Summary:');
    console.log('================\n');
    
    // Summary table
    console.log('Category    | Total | Active | Should Show in Pomodoro');
    console.log('------------|-------|--------|------------------------');
    
    Object.keys(tasksByCategory).forEach(category => {
      const total = tasksByCategory[category].length;
      const active = activeTasksByCategory[category]?.length || 0;
      console.log(
        `${category.padEnd(11)} | ${total.toString().padStart(5)} | ${active.toString().padStart(6)} | ${active > 0 ? '✅ Yes' : '❌ No'}`
      );
    });
    
    console.log('\n📝 Detailed Analysis:');
    console.log('====================\n');
    
    // Detailed breakdown
    ['habit', 'todo', 'goal'].forEach(category => {
      const categoryTasks = tasksByCategory[category] || [];
      const activeTasks = activeTasksByCategory[category] || [];
      
      console.log(`\n${category.toUpperCase()}S (${activeTasks.length} active / ${categoryTasks.length} total):`);
      
      if (categoryTasks.length === 0) {
        console.log('  No tasks in this category');
      } else {
        categoryTasks.slice(0, 5).forEach((task: any) => {
          const status = task.completed ? '✓' : '○';
          const completedInfo = task.completed_at 
            ? ` (completed: ${new Date(task.completed_at).toLocaleDateString()})` 
            : '';
          const isActive = activeTasks.some(t => t.id === task.id);
          const activeStatus = isActive ? ' [ACTIVE]' : '';
          
          console.log(`  ${status} "${task.title}"${completedInfo}${activeStatus}`);
        });
        
        if (categoryTasks.length > 5) {
          console.log(`  ... and ${categoryTasks.length - 5} more`);
        }
      }
    });
    
    console.log('\n🎯 Expected Pomodoro Selector Counts:');
    console.log('=====================================');
    console.log(`主线任务 (Goals): ${activeTasksByCategory['goal']?.length || 0}`);
    console.log(`支线任务 (Todos): ${activeTasksByCategory['todo']?.length || 0}`);
    console.log(`习惯 (Habits): ${activeTasksByCategory['habit']?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run analysis
analyzePomodoroData();