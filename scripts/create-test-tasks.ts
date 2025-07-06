// Create test tasks for current user
import 'dotenv/config';
import { db } from '../server/db';
import { tasks } from '@shared/schema';

async function createTestTasks() {
  const userId = 'user_1751478716499'; // muzhihao@kmmu.edu.cn
  
  console.log(`Creating test tasks for user: ${userId}`);
  
  const testTasks = [
    // Habits (习惯)
    {
      userId,
      title: '每天跑步30分钟',
      taskCategory: 'habit',
      taskType: 'daily',
      completed: false,
      expReward: 20,
      estimatedDuration: 30,
      requiredEnergyBalls: 2,
      difficulty: 'medium'
    },
    {
      userId,
      title: '八段锦练习',
      taskCategory: 'habit', 
      taskType: 'daily',
      completed: false,
      expReward: 15,
      estimatedDuration: 15,
      requiredEnergyBalls: 1,
      difficulty: 'easy'
    },
    {
      userId,
      title: '阅读1小时',
      taskCategory: 'habit',
      taskType: 'daily', 
      completed: false,
      expReward: 25,
      estimatedDuration: 60,
      requiredEnergyBalls: 4,
      difficulty: 'medium'
    },
    // Todos (支线任务)
    {
      userId,
      title: '完成项目报告',
      taskCategory: 'todo',
      taskType: 'once',
      completed: false,
      expReward: 35,
      estimatedDuration: 90,
      requiredEnergyBalls: 6,
      difficulty: 'hard'
    },
    {
      userId,
      title: '整理工作笔记',
      taskCategory: 'todo',
      taskType: 'once',
      completed: false,
      expReward: 20,
      estimatedDuration: 45,
      requiredEnergyBalls: 3,
      difficulty: 'medium'
    },
    {
      userId,
      title: '学习React新特性',
      taskCategory: 'todo',
      taskType: 'once',
      completed: false,
      expReward: 30,
      estimatedDuration: 60,
      requiredEnergyBalls: 4,
      difficulty: 'medium'
    }
  ];
  
  try {
    for (const task of testTasks) {
      const result = await db.insert(tasks).values(task).returning();
      console.log(`✅ Created: [${task.taskCategory}] ${task.title}`);
    }
    
    console.log('\n✨ Test tasks created successfully!');
    console.log('You should now see:');
    console.log('  - 3 habits (习惯)');
    console.log('  - 3 todos (支线任务)');
    
  } catch (error) {
    console.error('❌ Error creating tasks:', error);
  }
}

// Run
createTestTasks();