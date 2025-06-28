import { 
  skills, tasks, goals, goalTasks, activityLogs, milestones, microTasks, users, userProfiles, userStats,
  type Skill, type InsertSkill,
  type Task, type InsertTask,
  type Goal, type InsertGoal,
  type GoalTask, type InsertGoalTask,
  type ActivityLog, type InsertActivityLog,
  type Milestone, type InsertMilestone,
  type MicroTask, type InsertMicroTask,
  type User, type UpsertUser,
  type UserProfile, type InsertUserProfile,
  type UserStats, type InsertUserStats
} from "../../shared/schema";
import { db } from "./db";
import { eq, desc, and, asc } from "drizzle-orm";
import { inArray } from "drizzle-orm";

// Simplified storage implementation for Vercel serverless functions
export const storage = {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  },

  async upsertUser(user: UpsertUser): Promise<User> {
    const [result] = await db.insert(users).values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  },

  // Skills
  async getSkills(userId: string): Promise<Skill[]> {
    return db.select().from(skills).where(eq(skills.userId, userId)).orderBy(asc(skills.id));
  },

  async getSkill(id: number): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill || undefined;
  },

  async createSkill(skill: InsertSkill): Promise<Skill> {
    const [result] = await db.insert(skills).values(skill).returning();
    return result;
  },

  async updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill | undefined> {
    const [result] = await db.update(skills)
      .set(skill)
      .where(eq(skills.id, id))
      .returning();
    return result || undefined;
  },

  async updateSkillExp(skillId: number, expToAdd: number): Promise<Skill | undefined> {
    const skill = await this.getSkill(skillId);
    if (!skill) return undefined;
    
    const newExp = (skill.exp || 0) + expToAdd;
    return this.updateSkill(skillId, { exp: newExp });
  },

  // Tasks
  async getTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
  },

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  },

  async createTask(task: InsertTask): Promise<Task> {
    const [result] = await db.insert(tasks).values(task).returning();
    return result;
  },

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [result] = await db.update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return result || undefined;
  },

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  },

  // Goals
  async getGoals(userId: string): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  },

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  },

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [result] = await db.insert(goals).values(goal).returning();
    return result;
  },

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const [result] = await db.update(goals)
      .set(goal)
      .where(eq(goals.id, id))
      .returning();
    return result || undefined;
  },

  async deleteGoal(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
    return result.rowCount > 0;
  },

  // Activity Logs
  async getActivityLogs(userId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.date))
      .limit(100);
  },

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  },

  async addActivityLog(data: {
    userId: string;
    taskId?: number | null;
    skillId?: number | null;
    expGained?: number;
    action: string;
    description: string;
  }): Promise<ActivityLog> {
    return this.createActivityLog(data);
  },

  // User Stats
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats || undefined;
  },

  async createUserStats(stats: InsertUserStats): Promise<UserStats> {
    const [result] = await db.insert(userStats).values(stats).returning();
    return result;
  },

  async updateUserStats(userId: string, stats: Partial<InsertUserStats>): Promise<UserStats | undefined> {
    const [result] = await db.update(userStats)
      .set(stats)
      .where(eq(userStats.userId, userId))
      .returning();
    return result || undefined;
  },

  async addExperience(userId: string, expToAdd: number): Promise<UserStats | undefined> {
    const stats = await this.getUserStats(userId);
    if (!stats) return undefined;
    
    const newExp = (stats.experience || 0) + expToAdd;
    const { level, experience, experienceToNext } = this.calculateLevelUp(newExp, stats.level || 1);
    
    return this.updateUserStats(userId, {
      level,
      experience,
      experienceToNext
    });
  },

  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  },

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [result] = await db.insert(userProfiles).values(profile)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          name: profile.name,
          age: profile.age,
          occupation: profile.occupation,
          mission: profile.mission,
          hasCompletedOnboarding: profile.hasCompletedOnboarding,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  },

  // Helper methods
  calculateLevelUp(totalExp: number, currentLevel: number): { level: number; experience: number; experienceToNext: number } {
    let level = 1;
    let remainingExp = totalExp;
    let expForCurrentLevel = 100;
    
    while (remainingExp >= expForCurrentLevel) {
      remainingExp -= expForCurrentLevel;
      level++;
      expForCurrentLevel = Math.floor(100 * Math.pow(1.15, level - 1));
    }
    
    return {
      level,
      experience: remainingExp,
      experienceToNext: expForCurrentLevel
    };
  },

  // Core skills initialization
  async initializeCoreSkills(userId: string): Promise<void> {
    const CORE_SKILLS = [
      { name: "身体掌控力", category: "physical", icon: "fas fa-dumbbell", color: "red" },
      { name: "情绪稳定力", category: "emotional", icon: "fas fa-heart", color: "pink" },
      { name: "心智成长力", category: "mental", icon: "fas fa-brain", color: "purple" },
      { name: "关系经营力", category: "social", icon: "fas fa-users", color: "blue" },
      { name: "财富掌控力", category: "financial", icon: "fas fa-coins", color: "yellow" },
      { name: "意志执行力", category: "spiritual", icon: "fas fa-fire", color: "orange" }
    ];

    const existingSkills = await this.getSkills(userId);
    
    for (const coreSkill of CORE_SKILLS) {
      const exists = existingSkills.some(skill => skill.name === coreSkill.name);
      if (!exists) {
        await this.createSkill({
          userId,
          ...coreSkill,
          level: 1,
          exp: 0,
          maxExp: 100
        });
      }
    }
  },

  // Milestones
  async getMilestones(goalId: number): Promise<Milestone[]> {
    return db.select().from(milestones).where(eq(milestones.goalId, goalId)).orderBy(asc(milestones.order));
  },

  async getMilestonesByUserId(userId: string): Promise<Milestone[]> {
    const userGoals = await this.getGoals(userId);
    if (userGoals.length === 0) return [];
    
    const goalIds = userGoals.map(g => g.id);
    return db.select().from(milestones)
      .where(inArray(milestones.goalId, goalIds))
      .orderBy(asc(milestones.goalId), asc(milestones.order));
  },

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [result] = await db.insert(milestones).values(milestone).returning();
    return result;
  },

  // Goal with milestones
  async getGoalWithMilestones(goalId: number): Promise<Goal & { milestones: Milestone[] } | undefined> {
    const goal = await this.getGoal(goalId);
    if (!goal) return undefined;
    
    const goalMilestones = await this.getMilestones(goalId);
    return { ...goal, milestones: goalMilestones };
  },

  // Find or create skill
  async findOrCreateSkill(skillName: string, userId: string): Promise<Skill | null> {
    const SKILL_MAPPING: Record<string, string> = {
      "运动能力": "身体掌控力",
      "体育运动": "身体掌控力",
      "健身": "身体掌控力",
      "身体健康": "身体掌控力",
      "学习能力": "心智成长力",
      "阅读": "心智成长力",
      "研究": "心智成长力",
      "思考": "心智成长力",
      "工作技能": "意志执行力",
      "工作任务": "意志执行力",
      "项目管理": "意志执行力",
      "目标达成": "意志执行力",
      "社交能力": "关系经营力",
      "沟通": "关系经营力",
      "团队合作": "关系经营力",
      "人际关系": "关系经营力",
      "理财": "财富掌控力",
      "投资": "财富掌控力",
      "经济管理": "财富掌控力",
      "资源优化": "财富掌控力",
      "情绪管理": "情绪稳定力",
      "心理健康": "情绪稳定力",
      "压力调节": "情绪稳定力",
      "内心平衡": "情绪稳定力"
    };

    await this.initializeCoreSkills(userId);
    const userSkills = await this.getSkills(userId);
    
    const mappedSkillName = SKILL_MAPPING[skillName] || skillName;
    const skill = userSkills.find(s => s.name === mappedSkillName);
    
    return skill || null;
  }
};