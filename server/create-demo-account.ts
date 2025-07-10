import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, userProfiles, userStats, skills, tasks, goals, activityLogs } from "@shared/schema";

// Load environment variables
config();

/**
 * Creates a demo account for Apple App Store review
 * Email: demo@levelupsolo.net
 * Password: Demo123456
 */
async function createDemoAccount() {
  console.log("Creating demo account for App Store review...");

  try {
    // Check if demo account already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "demo@levelupsolo.net"))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("Demo account already exists!");
      return;
    }

    // Create user with hashed password
    const hashedPassword = await bcrypt.hash("Demo123456", 10);
    const [newUser] = await db
      .insert(users)
      .values({
        email: "demo@levelupsolo.net",
        hashedPassword: hashedPassword,
        createdAt: new Date(),
      })
      .returning();

    console.log("Created user:", newUser.id);

    // Create user profile with additional demo data
    await db.insert(userProfiles).values({
      userId: newUser.id,
      name: "Demo User",
      age: "25",
      occupation: "Software Developer",
      mission: "Master personal growth through gamification",
      hasCompletedOnboarding: true,
      hasCompletedTutorial: true,
    });

    // Create user stats with some progress
    await db.insert(userStats).values({
      userId: newUser.id,
      level: 5,
      experience: 450,
      experienceToNext: 600,
      energyBalls: 15,
      maxEnergyBalls: 18,
      streak: 7,
      totalTasksCompleted: 42,
    });

    // Initialize skills with varied progress
    const skillData = [
      { name: "身体", level: 4, exp: 320, color: "#EF4444", icon: "fas fa-heart" },
      { name: "情绪", level: 3, exp: 180, color: "#F59E0B", icon: "fas fa-smile" },
      { name: "思维", level: 6, exp: 550, color: "#3B82F6", icon: "fas fa-brain" },
      { name: "人际关系", level: 2, exp: 90, color: "#10B981", icon: "fas fa-users" },
      { name: "财务", level: 3, exp: 210, color: "#8B5CF6", icon: "fas fa-dollar-sign" },
      { name: "意志力", level: 5, exp: 420, color: "#EC4899", icon: "fas fa-fire" },
    ];

    const insertedSkills = await db
      .insert(skills)
      .values(
        skillData.map((skill) => ({
          userId: newUser.id,
          name: skill.name,
          level: skill.level,
          exp: skill.exp,
          maxExp: skill.level * 100,
          color: skill.color,
          icon: skill.icon,
        }))
      )
      .returning();

    console.log("Created skills:", insertedSkills.length);

    // Create some active goals
    const goalsData = [
      {
        title: "Complete Marathon Training",
        description: "Train for and complete a full marathon in 6 months",
        progress: 0.35,
        status: "active",
        priority: "high",
        skillId: insertedSkills[0].id, // Physical skill
      },
      {
        title: "Learn React Native",
        description: "Build and publish a mobile app using React Native",
        progress: 0.65,
        status: "active",
        priority: "medium",
        skillId: insertedSkills[2].id, // Mental skill
      },
      {
        title: "Build Emergency Fund",
        description: "Save 6 months of expenses for emergency fund",
        progress: 0.25,
        status: "active",
        priority: "high",
        skillId: insertedSkills[4].id, // Financial skill
      },
    ];

    const insertedGoals = await db
      .insert(goals)
      .values(
        goalsData.map((goal) => ({
          userId: newUser.id,
          ...goal,
          targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
        }))
      )
      .returning();

    console.log("Created goals:", insertedGoals.length);

    // Create various tasks
    const tasksData = [
      // Daily habits
      {
        title: "Morning Meditation",
        description: "10 minutes of mindfulness meditation",
        taskCategory: "habit",
        taskType: "daily",
        skillId: insertedSkills[1].id, // Emotional
        expReward: 20,
        requiredEnergyBalls: 1,
        difficulty: "easy",
        completed: true,
        completionCount: 7,
      },
      {
        title: "Evening Run",
        description: "5km run in the park",
        taskCategory: "habit",
        taskType: "daily",
        skillId: insertedSkills[0].id, // Physical
        expReward: 30,
        requiredEnergyBalls: 2,
        difficulty: "medium",
        completed: false,
        completionCount: 5,
      },
      // Main quests
      {
        title: "Complete React Native Course Module 3",
        description: "Learn about navigation and state management",
        taskCategory: "todo",
        taskType: "main",
        skillId: insertedSkills[2].id, // Mental
        goalId: insertedGoals[1].id,
        expReward: 50,
        requiredEnergyBalls: 3,
        difficulty: "hard",
        completed: false,
      },
      {
        title: "Week 4 Marathon Training",
        description: "Complete all scheduled runs for week 4",
        taskCategory: "todo",
        taskType: "main",
        skillId: insertedSkills[0].id, // Physical
        goalId: insertedGoals[0].id,
        expReward: 40,
        requiredEnergyBalls: 4,
        difficulty: "hard",
        completed: true,
        completionCount: 1,
      },
      // Side quests
      {
        title: "Review Investment Portfolio",
        description: "Check and rebalance investment allocations",
        taskCategory: "todo",
        taskType: "simple",
        skillId: insertedSkills[4].id, // Financial
        expReward: 25,
        requiredEnergyBalls: 1,
        difficulty: "medium",
        completed: false,
      },
      {
        title: "Call Mom",
        description: "Weekly catch-up call with family",
        taskCategory: "todo",
        taskType: "simple",
        skillId: insertedSkills[3].id, // Relationship
        expReward: 15,
        requiredEnergyBalls: 1,
        difficulty: "easy",
        completed: true,
        completionCount: 1,
      },
      {
        title: "Read 'Atomic Habits'",
        description: "Read 30 pages before bed",
        taskCategory: "habit",
        taskType: "daily",
        skillId: insertedSkills[2].id, // Mental
        expReward: 20,
        requiredEnergyBalls: 1,
        difficulty: "easy",
        completed: true,
        completionCount: 10,
      },
    ];

    const insertedTasks = await db
      .insert(tasks)
      .values(
        tasksData.map((task) => ({
          userId: newUser.id,
          ...task,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Created 7 days ago
          lastCompletedAt: task.completed ? new Date() : null,
          completedAt: task.completed ? new Date() : null,
        }))
      )
      .returning();

    console.log("Created tasks:", insertedTasks.length);

    // Create some activity logs
    const activityData = [
      {
        action: "task_completed",
        taskId: insertedTasks[0].id,
        skillId: insertedSkills[1].id,
        expGained: 20,
        details: { taskTitle: "Morning Meditation" },
      },
      {
        action: "skill_levelup",
        skillId: insertedSkills[2].id,
        expGained: 0,
        details: { skillName: "思维", newLevel: 6 },
      },
      {
        action: "task_completed",
        taskId: insertedTasks[3].id,
        skillId: insertedSkills[0].id,
        expGained: 40,
        details: { taskTitle: "Week 4 Marathon Training" },
      },
    ];

    await db
      .insert(activityLogs)
      .values(
        activityData.map((activity) => ({
          userId: newUser.id,
          ...activity,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
        }))
      );

    console.log("Created activity logs");

    console.log("\n✅ Demo account created successfully!");
    console.log("Email: demo@levelupsolo.net");
    console.log("Password: Demo123456");
    console.log("\nDemo account includes:");
    console.log("- Level 5 user with 7-day streak");
    console.log("- 6 skills with varied progress");
    console.log("- 3 active goals");
    console.log("- 7 tasks (mix of habits, main quests, and side quests)");
    console.log("- Recent activity history");

  } catch (error) {
    console.error("Error creating demo account:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
createDemoAccount();