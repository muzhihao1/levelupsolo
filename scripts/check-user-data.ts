// Script to check if user has data in the database

import 'dotenv/config';
import { storage } from '../server/storage';

async function checkUserData(userEmail: string) {
  console.log('🔍 Checking user data...\n');
  console.log(`Email: ${userEmail}`);
  console.log(`Storage Type: ${storage.constructor.name}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

  try {
    // Step 1: Get user
    console.log('Step 1: Finding user...');
    const user = await storage.getUserByEmail(userEmail);
    
    if (!user) {
      console.log('❌ User not found');
      console.log('\n💡 Try registering the user first:');
      console.log('   npm run test:register-user');
      return;
    }
    
    console.log('✅ User found');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log('');

    // Step 2: Get user stats
    console.log('Step 2: Getting user stats...');
    try {
      const stats = await storage.getUserStats(user.id);
      console.log('✅ User stats:');
      console.log(`   Level: ${stats?.level || 0}`);
      console.log(`   Experience: ${stats?.experience || 0}`);
      console.log(`   Total Tasks: ${stats?.totalTasksCompleted || 0}`);
    } catch (error) {
      console.log('❌ No user stats found');
    }
    console.log('');

    // Step 3: Get goals
    console.log('Step 3: Getting goals...');
    try {
      const goals = await storage.getGoals(user.id);
      const activeGoals = goals.filter(g => !g.completedAt);
      console.log(`✅ Total goals: ${goals.length}`);
      console.log(`   Active goals: ${activeGoals.length}`);
      if (activeGoals.length > 0) {
        console.log('   Sample goal:', activeGoals[0].title);
      }
    } catch (error) {
      console.log('❌ Error getting goals:', error);
    }
    console.log('');

    // Step 4: Get tasks
    console.log('Step 4: Getting tasks...');
    try {
      const tasks = await storage.getTasks(user.id);
      const activeTasks = tasks.filter(t => !t.completed);
      const habits = tasks.filter(t => t.taskCategory === 'habit');
      console.log(`✅ Total tasks: ${tasks.length}`);
      console.log(`   Active tasks: ${activeTasks.length}`);
      console.log(`   Habits: ${habits.length}`);
      if (activeTasks.length > 0) {
        console.log('   Sample task:', activeTasks[0].title);
      }
    } catch (error) {
      console.log('❌ Error getting tasks:', error);
    }
    console.log('');

    // Step 5: Get skills
    console.log('Step 5: Getting skills...');
    try {
      const skills = await storage.getSkills(user.id);
      console.log(`✅ Total skills: ${skills.length}`);
      if (skills.length > 0) {
        console.log('   Skills:', skills.map(s => s.name).join(', '));
      }
    } catch (error) {
      console.log('❌ Error getting skills:', error);
    }

    console.log('\n🎉 Data check complete!');
    
    // Summary
    console.log('\n📊 Summary:');
    console.log('If the user has no goals, tasks, or habits, the task selector will show "没有找到可用的任务"');
    console.log('To add test data, run: npm run seed:test');

  } catch (error) {
    console.error('\n❌ Check failed:', error);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'test@example.com';
checkUserData(email);