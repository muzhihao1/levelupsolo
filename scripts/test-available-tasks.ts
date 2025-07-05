import { config } from 'dotenv';
config();

import { storage } from '../server/storage';

async function testAvailableTasks() {
  console.log('Testing available tasks endpoint...\n');
  
  // Test with a demo user ID
  const userId = '31581595'; // Demo user ID from mock storage
  
  try {
    console.log('Storage type:', storage.constructor.name);
    
    console.log('\n1. Testing getGoals...');
    const goals = await storage.getGoals(userId);
    console.log(`Found ${goals?.length || 0} goals`);
    
    console.log('\n2. Testing getTasks...');
    const tasks = await storage.getTasks(userId);
    console.log(`Found ${tasks?.length || 0} tasks`);
    
    console.log('\n3. Filtering tasks...');
    if (tasks) {
      const habits = tasks.filter(t => t.taskCategory === 'habit');
      const regularTasks = tasks.filter(t => t.taskCategory !== 'habit');
      console.log(`- Habits: ${habits.length}`);
      console.log(`- Regular tasks: ${regularTasks.length}`);
    }
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
  }
}

testAvailableTasks();