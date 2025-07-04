// Optimized storage methods to improve performance
// These can replace the existing methods in storage.ts

import { db } from "./db";
import { skills, users, userStats, tasks, activityLogs } from "@shared/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";

// Cache for skill initialization status to prevent duplicate operations
const skillInitCache = new Map<string, Promise<void>>();

/**
 * Optimized core skills initialization - batched operation
 * Reduces 12 potential queries to just 2
 */
export async function initializeCoreSkillsOptimized(userId: string): Promise<void> {
  // Check if initialization is already in progress for this user
  const cacheKey = `skills_${userId}`;
  if (skillInitCache.has(cacheKey)) {
    return skillInitCache.get(cacheKey)!;
  }

  // Create promise for initialization
  const initPromise = (async () => {
    try {
      // Define core skills
      const coreSkillsData = [
        { name: "身体素质", skillType: "physical", category: "physical", icon: "fas fa-dumbbell", color: "#EF4444" },
        { name: "情绪调节", skillType: "emotional", category: "emotional", icon: "fas fa-heart", color: "#F59E0B" },
        { name: "思维能力", skillType: "mental", category: "mental", icon: "fas fa-brain", color: "#3B82F6" },
        { name: "人际关系", skillType: "relationship", category: "relationship", icon: "fas fa-users", color: "#10B981" },
        { name: "财务管理", skillType: "financial", category: "financial", icon: "fas fa-coins", color: "#8B5CF6" },
        { name: "意志力", skillType: "willpower", category: "willpower", icon: "fas fa-fire", color: "#EC4899" }
      ];

      // Batch fetch all existing skills for user
      const existingSkills = await db
        .select({ name: skills.name })
        .from(skills)
        .where(eq(skills.userId, userId));

      const existingNames = new Set(existingSkills.map(s => s.name));
      
      // Filter skills that need to be created
      const skillsToInsert = coreSkillsData
        .filter(skill => !existingNames.has(skill.name))
        .map(skill => ({
          userId,
          name: skill.name,
          level: 1,
          exp: 0,
          maxExp: 100,
          color: skill.color,
          icon: skill.icon,
          skillType: skill.skillType,
          category: skill.category,
          talentPoints: 0,
          prestige: 0,
          unlocked: true
        }));

      // Batch insert all missing skills at once
      if (skillsToInsert.length > 0) {
        await db.insert(skills).values(skillsToInsert);
      }
    } finally {
      // Clean up cache after 5 minutes
      setTimeout(() => skillInitCache.delete(cacheKey), 5 * 60 * 1000);
    }
  })();

  skillInitCache.set(cacheKey, initPromise);
  return initPromise;
}

/**
 * Get user skills with optimized query
 * Uses single query with proper indexing
 */
export async function getUserSkillsOptimized(userId: string): Promise<typeof skills.$inferSelect[]> {
  return db
    .select()
    .from(skills)
    .where(eq(skills.userId, userId))
    .orderBy(skills.category);
}

/**
 * Create task with minimal operations
 * Defers AI processing to background
 */
export async function createTaskOptimized(
  task: typeof tasks.$inferInsert,
  skipAI: boolean = false
): Promise<typeof tasks.$inferSelect> {
  // Create task immediately with provided data
  const [newTask] = await db.insert(tasks).values(task).returning();

  // Log activity asynchronously (don't wait)
  setImmediate(() => {
    db.insert(activityLogs).values({
      userId: task.userId,
      action: "task_created",
      taskId: newTask.id,
      expGained: task.expReward || 0,
      details: { taskTitle: task.title }
    }).catch(err => console.error("Failed to log activity:", err));
  });

  return newTask;
}

/**
 * Batch fetch multiple related data in parallel
 * Useful for dashboard and task list views
 */
export async function batchFetchUserData(userId: string) {
  const [userTasks, userSkills, userStatsData] = await Promise.all([
    db.select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.createdAt),
    
    db.select()
      .from(skills)
      .where(eq(skills.userId, userId)),
    
    db.select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1)
  ]);

  return {
    tasks: userTasks,
    skills: userSkills,
    stats: userStatsData[0] || null
  };
}