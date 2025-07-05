// Test script to debug available tasks endpoint

import 'dotenv/config';
import { storage } from '../server/storage';

async function debugAvailableTasks() {
  console.log('🔍 Debugging Available Tasks Data...\n');
  
  const testEmail = 'test@example.com';
  
  try {
    // Get user
    const user = await storage.getUserByEmail(testEmail);
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.id);
    console.log('');
    
    // Get all tasks
    console.log('📋 Fetching all tasks...');
    const allTasks = await storage.getTasks(user.id);
    console.log(`Total tasks: ${allTasks.length}`);
    
    // Separate by category
    const habits = allTasks.filter(t => t.taskCategory === 'habit');
    const todos = allTasks.filter(t => t.taskCategory === 'todo');
    const goalTasks = allTasks.filter(t => t.taskCategory === 'goal');
    
    console.log(`- Habits: ${habits.length}`);
    console.log(`- Todos: ${todos.length}`);
    console.log(`- Goal tasks: ${goalTasks.length}`);
    console.log('');
    
    // Show active tasks
    const activeTasks = allTasks.filter(t => !t.completed);
    console.log(`Active tasks: ${activeTasks.length}`);
    
    // Show sample data
    if (activeTasks.length > 0) {
      console.log('\nSample active tasks:');
      activeTasks.slice(0, 3).forEach(task => {
        console.log(`- [${task.taskCategory}] ${task.title} (ID: ${task.id}, Completed: ${task.completed})`);
      });
    }
    
    // Get goals
    console.log('\n📌 Fetching goals...');
    const goals = await storage.getGoals(user.id);
    const activeGoals = goals.filter(g => !g.completedAt);
    console.log(`Total goals: ${goals.length}`);
    console.log(`Active goals: ${activeGoals.length}`);
    
    if (activeGoals.length > 0) {
      console.log('\nSample active goals:');
      activeGoals.slice(0, 3).forEach(goal => {
        console.log(`- ${goal.title} (ID: ${goal.id})`);
      });
    }
    
    // Simulate API response
    console.log('\n📡 Simulated API Response:');
    const apiResponse = {
      goals: activeGoals.map(g => ({
        id: g.id,
        title: g.title || 'Untitled Goal',
        type: 'goal',
        energyBalls: 3,
        skillId: g.skillId || null,
        category: g.category || null
      })),
      tasks: activeTasks.filter(t => t.taskCategory !== 'habit').map(t => ({
        id: t.id,
        title: t.title || 'Untitled Task',
        type: 'task',
        energyBalls: t.energyBalls || 1,
        skillId: t.skillId || null
      })),
      habits: activeTasks.filter(t => t.taskCategory === 'habit').map(h => ({
        id: h.id,
        title: h.title || 'Untitled Habit',
        type: 'habit',
        energyBalls: h.energyBalls || 1,
        skillId: h.skillId || null
      }))
    };
    
    console.log(JSON.stringify(apiResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugAvailableTasks();