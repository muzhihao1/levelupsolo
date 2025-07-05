import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tasks, type Task } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugTaskCategories() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const queryClient = postgres(connectionString);
  const db = drizzle(queryClient);

  try {
    console.log('Connecting to database...\n');
    
    // Get all tasks
    const allTasks = await db.select().from(tasks);
    console.log(`Total tasks in database: ${allTasks.length}`);
    
    // Group by taskCategory
    const categoryCounts = allTasks.reduce((acc, task) => {
      const category = task.taskCategory || 'null';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nTask Category Distribution:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  "${category}": ${count} tasks`);
    });
    
    // Group by taskType
    const typeCounts = allTasks.reduce((acc, task) => {
      const type = task.taskType || 'null';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nTask Type Distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  "${type}": ${count} tasks`);
    });
    
    // Show active (not completed) tasks by category
    const activeTasks = allTasks.filter(task => !task.completed);
    console.log(`\nActive tasks (not completed): ${activeTasks.length}`);
    
    const activeCategoryCounts = activeTasks.reduce((acc, task) => {
      const category = task.taskCategory || 'null';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nActive Task Category Distribution:');
    Object.entries(activeCategoryCounts).forEach(([category, count]) => {
      console.log(`  "${category}": ${count} tasks`);
    });
    
    // Show some sample tasks with their categories
    console.log('\nSample Active Tasks:');
    activeTasks.slice(0, 10).forEach(task => {
      console.log(`  ID: ${task.id}, Title: "${task.title}", Category: "${task.taskCategory}", Type: "${task.taskType}", Completed: ${task.completed}`);
    });
    
    // Check for specific category values
    const sideQuests = activeTasks.filter(task => 
      task.taskCategory === '支线任务' || 
      task.taskCategory === 'side' || 
      task.taskCategory === 'todo'
    );
    console.log(`\nSide quests (支线任务/side/todo): ${sideQuests.length}`);
    
    const habits = activeTasks.filter(task => 
      task.taskCategory === '习惯' || 
      task.taskCategory === 'habit' || 
      task.taskCategory === 'daily'
    );
    console.log(`Habits (习惯/habit/daily): ${habits.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await queryClient.end();
  }
}

debugTaskCategories();