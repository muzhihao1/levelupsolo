import type { 
  User, UpsertUser, 
  UserProfile, InsertUserProfile,
  UserStats, InsertUserStats,
  Skill, InsertSkill,
  Task, InsertTask,
  Goal, InsertGoal,
  Milestone, InsertMilestone,
  MicroTask, InsertMicroTask
} from "../shared/schema";

/**
 * Test Data Fixtures for Level Up Solo
 * 用于测试和开发的标准测试数据
 */

// Test Users
export const testUsers = {
  alice: {
    id: "test_user_alice",
    email: "alice@test.com",
    firstName: "Alice",
    lastName: "Johnson",
    profileImageUrl: null,
    hashedPassword: "$2a$10$YourHashedPasswordHere" // password: test123
  } as UpsertUser,
  
  bob: {
    id: "test_user_bob",
    email: "bob@test.com",
    firstName: "Bob",
    lastName: "Smith",
    profileImageUrl: null,
    hashedPassword: "$2a$10$YourHashedPasswordHere" // password: test123
  } as UpsertUser,
  
  charlie: {
    id: "test_user_charlie",
    email: "charlie@test.com",
    firstName: "Charlie",
    lastName: "Brown",
    profileImageUrl: null,
    hashedPassword: "$2a$10$YourHashedPasswordHere" // password: test123
  } as UpsertUser
};

// User Profiles
export const testUserProfiles = {
  alice: {
    userId: testUsers.alice.id,
    name: "Alice Johnson",
    age: "28",
    occupation: "软件工程师",
    mission: "成为全栈开发专家，创建有影响力的产品",
    hasCompletedOnboarding: true,
    hasCompletedTutorial: true
  } as InsertUserProfile,
  
  bob: {
    userId: testUsers.bob.id,
    name: "Bob Smith",
    age: "35",
    occupation: "产品经理",
    mission: "打造用户喜爱的产品，提升团队效率",
    hasCompletedOnboarding: true,
    hasCompletedTutorial: false
  } as InsertUserProfile
};

// User Stats
export const testUserStats = {
  alice: {
    userId: testUsers.alice.id,
    level: 5,
    experience: 450,
    experienceToNext: 600,
    energyBalls: 15,
    maxEnergyBalls: 18,
    energyBallDuration: 15,
    energyPeakStart: 9,
    energyPeakEnd: 12,
    streak: 7,
    totalTasksCompleted: 45
  } as InsertUserStats,
  
  bob: {
    userId: testUsers.bob.id,
    level: 3,
    experience: 180,
    experienceToNext: 300,
    energyBalls: 18,
    maxEnergyBalls: 18,
    energyBallDuration: 15,
    energyPeakStart: 8,
    energyPeakEnd: 11,
    streak: 3,
    totalTasksCompleted: 20
  } as InsertUserStats
};

// Core Skills (六大核心技能)
export const coreSkills = [
  {
    name: "身体掌控力",
    level: 1,
    exp: 0,
    maxExp: 100,
    color: "#EF4444",
    icon: "fas fa-running",
    skillType: "basic",
    category: "physical",
    talentPoints: 0,
    prestige: 0,
    unlocked: true,
    prerequisites: []
  },
  {
    name: "心智成长力",
    level: 1,
    exp: 0,
    maxExp: 100,
    color: "#3B82F6",
    icon: "fas fa-brain",
    skillType: "basic",
    category: "mental",
    talentPoints: 0,
    prestige: 0,
    unlocked: true,
    prerequisites: []
  },
  {
    name: "意志执行力",
    level: 1,
    exp: 0,
    maxExp: 100,
    color: "#8B5CF6",
    icon: "fas fa-fist-raised",
    skillType: "basic",
    category: "willpower",
    talentPoints: 0,
    prestige: 0,
    unlocked: true,
    prerequisites: []
  },
  {
    name: "关系经营力",
    level: 1,
    exp: 0,
    maxExp: 100,
    color: "#10B981",
    icon: "fas fa-users",
    skillType: "basic",
    category: "social",
    talentPoints: 0,
    prestige: 0,
    unlocked: true,
    prerequisites: []
  },
  {
    name: "财富掌控力",
    level: 1,
    exp: 0,
    maxExp: 100,
    color: "#F59E0B",
    icon: "fas fa-coins",
    skillType: "basic",
    category: "financial",
    talentPoints: 0,
    prestige: 0,
    unlocked: true,
    prerequisites: []
  },
  {
    name: "情绪稳定力",
    level: 1,
    exp: 0,
    maxExp: 100,
    color: "#EC4899",
    icon: "fas fa-heart",
    skillType: "basic",
    category: "emotional",
    talentPoints: 0,
    prestige: 0,
    unlocked: true,
    prerequisites: []
  }
];

// Test Tasks
export const testTasks = {
  // Habits (日常习惯)
  morningExercise: {
    title: "晨跑30分钟",
    description: "每天早上6:30开始晨跑，保持身体健康",
    completed: false,
    expReward: 20,
    estimatedDuration: 30,
    taskCategory: "habit",
    taskType: "daily",
    difficulty: "medium",
    requiredEnergyBalls: 2,
    tags: ["健康", "运动"],
    skills: ["身体掌控力"],
    habitDirection: "positive",
    habitStreak: 5,
    habitValue: 2.5,
    isDailyTask: true,
    dailyStreak: 5,
    isRecurring: true,
    recurringPattern: "daily",
    order: 0
  } as InsertTask,
  
  dailyReading: {
    title: "阅读专业书籍",
    description: "每天阅读30分钟技术或管理书籍",
    completed: false,
    expReward: 25,
    estimatedDuration: 30,
    taskCategory: "habit",
    taskType: "daily",
    difficulty: "medium",
    requiredEnergyBalls: 2,
    tags: ["学习", "成长"],
    skills: ["心智成长力"],
    habitDirection: "positive",
    habitStreak: 12,
    habitValue: 3,
    isDailyTask: true,
    dailyStreak: 12,
    isRecurring: true,
    recurringPattern: "daily",
    order: 1
  } as InsertTask,
  
  // Main Quests (主线任务)
  learnReactNative: {
    title: "掌握React Native开发",
    description: "学习React Native并开发一个完整的移动应用",
    completed: false,
    expReward: 100,
    estimatedDuration: 480, // 8小时
    taskCategory: "todo",
    taskType: "main",
    difficulty: "hard",
    requiredEnergyBalls: 32, // 8小时
    tags: ["技术", "学习", "项目"],
    skills: ["心智成长力", "意志执行力"],
    order: 0
  } as InsertTask,
  
  // Side Quests (支线任务)
  writeArticle: {
    title: "写一篇技术博客",
    description: "分享最近学到的技术知识",
    completed: false,
    expReward: 35,
    estimatedDuration: 90,
    taskCategory: "todo",
    taskType: "simple",
    difficulty: "medium",
    requiredEnergyBalls: 6,
    tags: ["写作", "分享"],
    skills: ["心智成长力"],
    order: 0
  } as InsertTask,
  
  organizeMeeting: {
    title: "组织团队会议",
    description: "准备并主持本周的团队进度会议",
    completed: false,
    expReward: 20,
    estimatedDuration: 60,
    taskCategory: "todo",
    taskType: "simple",
    difficulty: "easy",
    requiredEnergyBalls: 4,
    tags: ["工作", "沟通"],
    skills: ["关系经营力"],
    order: 1
  } as InsertTask
};

// Test Goals
export const testGoals = {
  becomeFullStack: {
    title: "成为全栈开发工程师",
    description: "在6个月内掌握前后端开发技能，能够独立完成完整项目",
    completed: false,
    progress: 0.3,
    targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6个月后
    expReward: 200,
    pomodoroExpReward: 10,
    requiredEnergyBalls: 4,
    skillTags: ["心智成长力", "意志执行力"],
    relatedSkillIds: []
  } as InsertGoal,
  
  fitnessGoal: {
    title: "达到理想体重和体能",
    description: "通过规律运动和健康饮食，在3个月内减重10公斤",
    completed: false,
    progress: 0.15,
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3个月后
    expReward: 150,
    pomodoroExpReward: 8,
    requiredEnergyBalls: 3,
    skillTags: ["身体掌控力", "意志执行力"],
    relatedSkillIds: []
  } as InsertGoal
};

// Test Milestones
export const testMilestones = {
  frontendBasics: {
    title: "掌握前端基础",
    description: "完成HTML、CSS、JavaScript基础学习",
    completed: true,
    order: 1
  } as InsertMilestone,
  
  reactMastery: {
    title: "精通React框架",
    description: "深入学习React及其生态系统",
    completed: false,
    order: 2
  } as InsertMilestone,
  
  backendDevelopment: {
    title: "后端开发能力",
    description: "学习Node.js和数据库设计",
    completed: false,
    order: 3
  } as InsertMilestone
};

// Test MicroTasks
export const testMicroTasks = {
  setupEnvironment: {
    title: "搭建开发环境",
    description: "安装Node.js、VS Code和必要的扩展",
    completed: true,
    duration: 15,
    expReward: 5,
    difficulty: "easy",
    order: 1
  } as InsertMicroTask,
  
  readDocumentation: {
    title: "阅读官方文档",
    description: "阅读React Native官方入门指南",
    completed: false,
    duration: 30,
    expReward: 10,
    difficulty: "medium",
    order: 2
  } as InsertMicroTask,
  
  firstComponent: {
    title: "创建第一个组件",
    description: "实现一个简单的Hello World组件",
    completed: false,
    duration: 20,
    expReward: 8,
    difficulty: "easy",
    order: 3
  } as InsertMicroTask
};

// Helper functions for creating test data
export async function createTestUser(storage: any, userKey: keyof typeof testUsers) {
  const user = await storage.upsertUser(testUsers[userKey]);
  
  // Create profile
  if (testUserProfiles[userKey]) {
    await storage.upsertUserProfile(testUserProfiles[userKey]);
  }
  
  // Create stats
  if (testUserStats[userKey]) {
    await storage.createUserStats(testUserStats[userKey]);
  }
  
  // Initialize core skills
  await storage.initializeCoreSkills(user.id);
  
  return user;
}

export async function createTestTasksForUser(storage: any, userId: string) {
  const tasks = [];
  
  for (const [key, taskData] of Object.entries(testTasks)) {
    const task = await storage.createTask({
      ...taskData,
      userId
    });
    tasks.push(task);
  }
  
  return tasks;
}

export async function createTestGoalsForUser(storage: any, userId: string) {
  const goals = [];
  
  for (const [key, goalData] of Object.entries(testGoals)) {
    const goal = await storage.createGoal({
      ...goalData,
      userId
    });
    goals.push(goal);
  }
  
  return goals;
}

// Complete test data setup
export async function setupCompleteTestData(storage: any) {
  // Create Alice with full data
  const alice = await createTestUser(storage, 'alice');
  const aliceTasks = await createTestTasksForUser(storage, alice.id);
  const aliceGoals = await createTestGoalsForUser(storage, alice.id);
  
  // Create Bob with partial data
  const bob = await createTestUser(storage, 'bob');
  
  return {
    users: { alice, bob },
    tasks: { alice: aliceTasks },
    goals: { alice: aliceGoals }
  };
}

// Cleanup function
export async function cleanupTestData(storage: any, db: any) {
  // Delete in reverse order of dependencies
  const testUserIds = Object.values(testUsers).map(u => u.id);
  
  // Use raw SQL for cleanup if storage doesn't have delete methods
  await db.execute(`DELETE FROM activity_logs WHERE user_id = ANY($1)`, [testUserIds]);
  await db.execute(`DELETE FROM micro_tasks WHERE user_id = ANY($1)`, [testUserIds]);
  await db.execute(`DELETE FROM milestones WHERE user_id = ANY($1)`, [testUserIds]);
  await db.execute(`DELETE FROM goal_tasks WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ANY($1))`, [testUserIds]);
  await db.execute(`DELETE FROM tasks WHERE user_id = ANY($1)`, [testUserIds]);
  await db.execute(`DELETE FROM goals WHERE user_id = ANY($1)`, [testUserIds]);
  await db.execute(`DELETE FROM skills WHERE user_id = ANY($1)`, [testUserIds]);
  await db.execute(`DELETE FROM user_stats WHERE user_id = ANY($1)`, [testUserIds]);
  await db.execute(`DELETE FROM user_profiles WHERE user_id = ANY($1)`, [testUserIds]);
  await db.execute(`DELETE FROM users WHERE id = ANY($1)`, [testUserIds]);
}