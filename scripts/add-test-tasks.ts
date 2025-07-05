// Script to add test tasks and habits to the database

import 'dotenv/config';
import { storage } from '../server/storage';

async function addTestTasks() {
  console.log('🎯 Adding test tasks and habits...\n');
  
  const testEmail = 'test@example.com';
  
  try {
    // Get user
    const user = await storage.getUserByEmail(testEmail);
    if (!user) {
      console.log('❌ User not found. Please register first with:');
      console.log('   npm run test:register-user');
      return;
    }
    
    console.log('✅ User found:', user.id);
    
    // Get skills
    const skills = await storage.getSkills(user.id);
    const firstSkill = skills[0];
    console.log('Using skill:', firstSkill?.name || 'None');
    
    // Add some side quests (tasks)
    const sideTasks = [
      {
        userId: user.id,
        title: "阅读技术文档30分钟",
        description: "学习新的编程概念",
        taskCategory: 'todo',
        taskType: 'once',
        estimatedDuration: 30,
        energyBalls: 2,
        expReward: 20,
        skillId: firstSkill?.id || null,
        completed: false
      },
      {
        userId: user.id,
        title: "整理工作区域",
        description: "清理桌面，整理文件",
        taskCategory: 'todo',
        taskType: 'once',
        estimatedDuration: 15,
        energyBalls: 1,
        expReward: 10,
        skillId: firstSkill?.id || null,
        completed: false
      },
      {
        userId: user.id,
        title: "写日记总结今天",
        description: "反思今天的成就和挑战",
        taskCategory: 'todo',
        taskType: 'once',
        estimatedDuration: 20,
        energyBalls: 1,
        expReward: 15,
        skillId: firstSkill?.id || null,
        completed: false
      }
    ];
    
    // Add some habits
    const habits = [
      {
        userId: user.id,
        title: "晨间运动",
        description: "30分钟有氧运动或瑜伽",
        taskCategory: 'habit',
        taskType: 'daily',
        estimatedDuration: 30,
        energyBalls: 2,
        expReward: 25,
        skillId: firstSkill?.id || null,
        completed: false
      },
      {
        userId: user.id,
        title: "冥想5分钟",
        description: "正念冥想，保持专注",
        taskCategory: 'habit',
        taskType: 'daily',
        estimatedDuration: 5,
        energyBalls: 1,
        expReward: 10,
        skillId: firstSkill?.id || null,
        completed: false
      },
      {
        userId: user.id,
        title: "喝8杯水",
        description: "保持充足的水分摄入",
        taskCategory: 'habit',
        taskType: 'daily',
        estimatedDuration: 5,
        energyBalls: 1,
        expReward: 5,
        skillId: firstSkill?.id || null,
        completed: false
      }
    ];
    
    console.log('\n📝 Creating side quests...');
    for (const task of sideTasks) {
      try {
        const created = await storage.createTask(task);
        console.log(`✅ Created: ${task.title}`);
      } catch (error) {
        console.error(`❌ Failed to create ${task.title}:`, error.message);
      }
    }
    
    console.log('\n🔄 Creating habits...');
    for (const habit of habits) {
      try {
        const created = await storage.createTask(habit);
        console.log(`✅ Created: ${habit.title}`);
      } catch (error) {
        console.error(`❌ Failed to create ${habit.title}:`, error.message);
      }
    }
    
    // Verify what we have now
    console.log('\n📊 Current task summary:');
    const allTasks = await storage.getTasks(user.id);
    const tasksByCategory = allTasks.reduce((acc, task) => {
      const category = task.taskCategory || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Tasks by category:', tasksByCategory);
    console.log('Total tasks:', allTasks.length);
    console.log('Active tasks:', allTasks.filter(t => !t.completed).length);
    
    console.log('\n✅ Test data added successfully!');
    
  } catch (error) {
    console.error('❌ Failed to add test tasks:', error);
  }
}

addTestTasks();