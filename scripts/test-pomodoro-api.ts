// Test the Pomodoro API endpoint directly
import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as auth from '../server/auth-jwt';
import { storage } from '../server/storage';
import { normalizeTaskCategory } from '../server/utils/task-category-mapper';

async function testPomodoroAPI() {
  console.log('🍅 Testing Pomodoro API Logic...\n');
  
  try {
    // 1. Get user
    const targetEmail = '279838958@qq.com';
    const user = await storage.getUserByEmail(targetEmail);
    
    if (!user) {
      console.log(`❌ User ${targetEmail} not found`);
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})\n`);
    
    // 2. Simulate API logic
    console.log('📊 Simulating /api/pomodoro/available-tasks logic:');
    console.log('================================================');
    
    // Get tasks
    const tasks = await storage.getTasks(user.id);
    console.log(`Total tasks fetched: ${tasks.length}`);
    
    // Get today's date for habit filtering
    const today = new Date().toDateString();
    console.log(`Today's date: ${today}\n`);
    
    // Filter active tasks
    const activeTasks = tasks.filter(t => {
      if (!t) return false;
      
      // For habits, check if completed today
      if (normalizeTaskCategory(t.taskCategory) === 'habit') {
        if (!t.completed) return true;
        const completedDate = t.completedAt ? new Date(t.completedAt).toDateString() : null;
        return completedDate !== today;
      }
      
      // For non-habits, simply check if not completed
      return !t.completed;
    });
    
    console.log(`Active tasks after filtering: ${activeTasks.length}`);
    
    // Separate by category
    const habits = activeTasks.filter(t => normalizeTaskCategory(t.taskCategory) === 'habit');
    const todoTasks = activeTasks.filter(t => normalizeTaskCategory(t.taskCategory) === 'todo');
    const goalTasks = activeTasks.filter(t => normalizeTaskCategory(t.taskCategory) === 'goal');
    
    console.log(`\n📝 Task Breakdown:`);
    console.log(`   - Todo tasks (支线任务): ${todoTasks.length}`);
    console.log(`   - Habits (习惯): ${habits.length}`);
    console.log(`   - Goal tasks: ${goalTasks.length}`);
    
    // Show sample tasks
    console.log('\n📋 Sample Todo Tasks:');
    todoTasks.slice(0, 3).forEach(t => {
      console.log(`   - [${t.id}] "${t.title}" (category: ${t.taskCategory}, completed: ${t.completed})`);
    });
    
    console.log('\n📋 Sample Habits:');
    habits.slice(0, 3).forEach(h => {
      console.log(`   - [${h.id}] "${h.title}" (category: ${h.taskCategory}, completed: ${h.completed}, completedAt: ${h.completedAt || 'never'})`);
    });
    
    // 3. Build response
    console.log('\n🚀 Building API Response:');
    const response = {
      goals: [],
      tasks: todoTasks.map(t => ({
        id: t.id,
        title: t.title || 'Untitled Task',
        type: 'task',
        energyBalls: t.requiredEnergyBalls || t.energyBalls || 1,
        skillId: t.skillId || null,
        category: t.taskCategory || 'todo',
        difficulty: t.difficulty || 'medium'
      })),
      habits: habits.map(h => ({
        id: h.id,
        title: h.title || 'Untitled Habit',
        type: 'habit',
        energyBalls: h.requiredEnergyBalls || h.energyBalls || 1,
        skillId: h.skillId || null,
        category: h.taskCategory || 'habit',
        difficulty: h.difficulty || 'medium'
      }))
    };
    
    console.log(`\n✅ API Response Summary:`);
    console.log(`   - Goals: ${response.goals.length}`);
    console.log(`   - Tasks (支线任务): ${response.tasks.length}`);
    console.log(`   - Habits (习惯): ${response.habits.length}`);
    
    // 4. Test with actual HTTP request
    console.log('\n🌐 Testing with actual HTTP request:');
    console.log('====================================');
    
    // Generate a token for the user
    const tokens = auth.generateTokens(user.id, user.email);
    console.log('Generated auth token for API call');
    
    const apiUrl = 'http://localhost:5000/api/pomodoro/available-tasks';
    console.log(`\nTo test the API directly, run:`);
    console.log(`curl -H "Authorization: Bearer ${tokens.accessToken.substring(0, 50)}..." ${apiUrl}`);
    
    console.log('\n💡 Debugging Tips:');
    console.log('1. Check browser console for API response');
    console.log('2. Verify Authorization header is sent with requests');
    console.log('3. Check Network tab to see actual API response');
    console.log('4. Make sure you are logged in with 279838958@qq.com');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testPomodoroAPI();