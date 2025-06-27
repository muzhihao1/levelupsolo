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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc } from "drizzle-orm";
import { inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  setUserPassword(userId: string, hashedPassword: string): Promise<void>;
  getUserPassword(userId: string): Promise<string | undefined>;

  // Skills
  getSkills(userId: string): Promise<Skill[]>;
  getSkill(id: number): Promise<Skill | undefined>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill | undefined>;
  updateSkillExp(skillId: number, expToAdd: number): Promise<Skill | undefined>;
  addSkillExp(skillId: number, expToAdd: number): Promise<Skill | undefined>;

  // Tasks
  getTasks(userId: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  // Hierarchical task methods
  getTasksByType(userId: string, taskType: string): Promise<Task[]>;
  getSubTasks(parentTaskId: number): Promise<Task[]>;
  getMainTasks(userId: string): Promise<Task[]>;
  getDailyTasks(userId: string): Promise<Task[]>;
  getTasksByTag(userId: string, tag: string): Promise<Task[]>;

  // Goals
  getGoals(userId: string): Promise<any[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  getGoalWithMilestones(id: number): Promise<any>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: number, userId: string): Promise<boolean>;

  // Goal Tasks
  getGoalTasks(goalId: number): Promise<GoalTask[]>;
  createGoalTask(goalTask: InsertGoalTask): Promise<GoalTask>;
  updateGoalTask(id: number, goalTask: Partial<InsertGoalTask>): Promise<GoalTask | undefined>;
  deleteGoalTask(id: number): Promise<boolean>;

  // Activity Logs
  getActivityLogs(userId: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  removeTaskCompletionLog(taskId: number): Promise<boolean>;

  // Milestones
  getMilestones(goalId: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: number): Promise<boolean>;

  // Micro Tasks
  getMicroTasks(taskId: number): Promise<MicroTask[]>;
  createMicroTask(microTask: InsertMicroTask): Promise<MicroTask>;
  updateMicroTask(id: number, microTask: Partial<InsertMicroTask>): Promise<MicroTask | undefined>;
  generateMicroTasksForMainTask(taskId: number, userId: string): Promise<MicroTask[]>;



  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;

  // User Stats (Habitica-inspired)
  getUserStats(userId: string): Promise<UserStats | undefined>;
  createUserStats(stats: InsertUserStats): Promise<UserStats>;
  updateUserStats(userId: string, stats: Partial<InsertUserStats>): Promise<UserStats | undefined>;
  consumeEnergyBalls(userId: string, amount: number): Promise<UserStats | undefined>;
  restoreEnergyBalls(userId: string, amount: number): Promise<UserStats | undefined>;
  checkAndResetEnergyBalls(userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async setUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserPassword(userId: string): Promise<string | undefined> {
    const [user] = await db
      .select({ hashedPassword: users.hashedPassword })
      .from(users)
      .where(eq(users.id, userId));
    return user?.hashedPassword || undefined;
  }

  // Skills
  async getSkills(userId: string): Promise<Skill[]> {
    return await db.select().from(skills).where(eq(skills.userId, userId));
  }

  async getSkill(id: number): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill || undefined;
  }

  async createSkill(skillData: InsertSkill): Promise<Skill> {
    const result = await db
      .insert(skills)
      .values({
        ...skillData,
        level: skillData.level || 1,
        exp: skillData.exp || 0,
        maxExp: skillData.maxExp || 100,
        color: skillData.color || "#6366F1",
        icon: skillData.icon || "fas fa-star"
      })
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create skill: No data returned from database');
    }
    
    return result[0];
  }

  // Initialize the six core skills for a user
  async initializeCoreSkills(userId: string): Promise<void> {
    const coreSkills = [
      { 
        name: "身体掌控力", 
        color: "#EF4444", 
        icon: "fas fa-dumbbell",
        category: "Physical Mastery"
      },
      { 
        name: "情绪稳定力", 
        color: "#8B5CF6", 
        icon: "fas fa-heart",
        category: "Emotional Resilience"
      },
      { 
        name: "心智成长力", 
        color: "#06B6D4", 
        icon: "fas fa-brain",
        category: "Cognitive Agility"
      },
      { 
        name: "关系经营力", 
        color: "#10B981", 
        icon: "fas fa-users",
        category: "Relational Intelligence"
      },
      { 
        name: "财富掌控力", 
        color: "#F59E0B", 
        icon: "fas fa-coins",
        category: "Financial Wisdom"
      },
      { 
        name: "意志执行力", 
        color: "#DC2626", 
        icon: "fas fa-target",
        category: "Purposeful Action"
      }
    ];

    const existingSkills = await db.select().from(skills).where(eq(skills.userId, userId));

    for (const coreSkill of coreSkills) {
      const exists = existingSkills.find(skill => skill.name === coreSkill.name);
      if (!exists) {
        await this.createSkill({
          name: coreSkill.name,
          userId,
          level: 1,
          exp: 0,
          maxExp: 100,
          color: coreSkill.color,
          icon: coreSkill.icon,
          skillType: "core",
          category: coreSkill.category,
          talentPoints: 0,
          prestige: 0,
          unlocked: true,
          prerequisites: null
        });
      }
    }
  }

  async findOrCreateSkill(name: string, userId: string, icon?: string, color?: string): Promise<Skill> {
    // Map task descriptions to core skills instead of creating new ones
    const skillMapping = {
      "学习": "心智成长力",
      "研究": "心智成长力", 
      "写作": "心智成长力",
      "工作": "意志执行力",
      "运动": "身体掌控力",
      "健身": "身体掌控力",
      "锻炼": "身体掌控力",
      "社交": "关系经营力",
      "交流": "关系经营力",
      "沟通": "关系经营力",
      "理财": "财富掌控力",
      "投资": "财富掌控力",
      "赚钱": "财富掌控力",
      "情绪": "情绪稳定力",
      "心理": "情绪稳定力",
      "冥想": "情绪稳定力",
      "执行": "意志执行力",
      "计划": "意志执行力"
    };

    // Find the appropriate core skill based on task content
    let targetSkillName = "意志执行力"; // default
    for (const [keyword, skillName] of Object.entries(skillMapping)) {
      if (name.toLowerCase().includes(keyword)) {
        targetSkillName = skillName;
        break;
      }
    }

    // Find existing core skill
    const existingSkills = await db.select().from(skills).where(eq(skills.userId, userId));
    const existingSkill = existingSkills.find(skill => skill.name === targetSkillName);

    if (existingSkill) {
      return existingSkill;
    }

    // Initialize core skills if they don't exist
    await this.initializeCoreSkills(userId);

    // Try to find the skill again
    const updatedSkills = await db.select().from(skills).where(eq(skills.userId, userId));
    const foundSkill = updatedSkills.find(skill => skill.name === targetSkillName);

    if (foundSkill) {
      return foundSkill;
    }

    // Fallback: create the skill (should not happen with core skills)
    const skillData: InsertSkill = {
      name: targetSkillName,
      userId,
      level: 1,
      exp: 0,
      maxExp: 100,
      color: color || this.getSkillColor(targetSkillName),
      icon: icon || this.getSkillIcon(name)
    };

    return this.createSkill(skillData);
  }

  private getSkillColor(skillName: string): string {
    const colorMap: { [key: string]: string } = {
      '学习': '#06B6D4', '阅读': '#0891B2', '记忆': '#0E7490', '理解': '#155E75',
      '研究': '#8B5CF6', '调研': '#7C3AED', '实验': '#6D28D9', '分析': '#5B21B6',
      '写作': '#10B981', '编辑': '#059669', '论文': '#047857', '文档': '#065F46',
      '设计': '#F59E0B', '绘画': '#D97706', '创意': '#B45309', '美工': '#92400E',
      '编程': '#6366F1', '开发': '#4F46E5', '算法': '#4338CA', '调试': '#3730A3',
      '管理': '#EF4444', '领导': '#DC2626', '规划': '#B91C1C', '组织': '#991B1B',
      '沟通': '#EC4899', '演讲': '#DB2777', '表达': '#BE185D', '协作': '#9D174D',
      '科研': '#8B5CF6', '学术': '#7C3AED', '理论': '#6D28D9', '实践': '#5B21B6'
    };

    for (const [keyword, color] of Object.entries(colorMap)) {
      if (skillName.includes(keyword)) {
        return color;
      }
    }
    return '#6366F1';
  }

  private getSkillIcon(skillName: string): string {
    const iconMap: { [key: string]: string } = {
      '学习': 'fas fa-book-open', '阅读': 'fas fa-glasses', '记忆': 'fas fa-brain', '理解': 'fas fa-lightbulb',
      '研究': 'fas fa-search', '调研': 'fas fa-microscope', '实验': 'fas fa-flask', '分析': 'fas fa-chart-line',
      '写作': 'fas fa-pen', '编辑': 'fas fa-edit', '论文': 'fas fa-file-alt', '文档': 'fas fa-file-word',
      '设计': 'fas fa-palette', '绘画': 'fas fa-paint-brush', '创意': 'fas fa-magic', '美工': 'fas fa-image',
      '编程': 'fas fa-code', '开发': 'fas fa-laptop-code', '算法': 'fas fa-cogs', '调试': 'fas fa-bug',
      '管理': 'fas fa-tasks', '领导': 'fas fa-crown', '规划': 'fas fa-calendar-alt', '组织': 'fas fa-sitemap',
      '沟通': 'fas fa-comments', '演讲': 'fas fa-microphone', '表达': 'fas fa-bullhorn', '协作': 'fas fa-handshake',
      '科研': 'fas fa-graduation-cap', '学术': 'fas fa-university', '理论': 'fas fa-atom', '实践': 'fas fa-hammer'
    };

    for (const [keyword, icon] of Object.entries(iconMap)) {
      if (skillName.includes(keyword)) {
        return icon;
      }
    }
    return 'fas fa-star';
  }

  async updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill | undefined> {
    const [updated] = await db
      .update(skills)
      .set(skill)
      .where(eq(skills.id, id))
      .returning();
    return updated || undefined;
  }

  async updateSkillExp(skillId: number, expToAdd: number): Promise<Skill | undefined> {
    // Get current skill data
    const currentSkill = await this.getSkill(skillId);
    if (!currentSkill) return undefined;

    let newExp = currentSkill.exp + expToAdd;
    let newLevel = currentSkill.level;
    let newMaxExp = currentSkill.maxExp;

    // Handle level ups
    while (newExp >= newMaxExp) {
      newExp -= newMaxExp;
      newLevel += 1;
      newMaxExp = Math.floor(newMaxExp * 1.5); // Increase max exp by 50% each level
    }

    const [updated] = await db
      .update(skills)
      .set({
        exp: newExp,
        level: newLevel,
        maxExp: newMaxExp
      })
      .where(eq(skills.id, skillId))
      .returning();

    return updated || undefined;
  }

  async addSkillExp(skillId: number, expToAdd: number): Promise<Skill | undefined> {
    return this.updateSkillExp(skillId, expToAdd);
  }

  // Tasks
  async getTasks(userId: string): Promise<Task[]> {
    const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
    
    // Fetch micro tasks for each task
    const tasksWithMicroTasks = await Promise.all(
      userTasks.map(async (task) => {
        const taskMicroTasks = await db.select().from(microTasks)
          .where(eq(microTasks.taskId, task.id))
          .orderBy(microTasks.order);
        
        return { ...task, microTasks: taskMicroTasks };
      })
    );

    return tasksWithMicroTasks;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db
      .insert(tasks)
      .values({
        ...task,
        completed: task.completed || false,
        expReward: task.expReward || 0,
        estimatedDuration: task.estimatedDuration ?? 25
      })
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create task: No data returned from database');
    }
    
    return result[0];
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const updateData: any = { ...task };
    if (task.completed) {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      // First delete related micro tasks
      await db.delete(microTasks).where(eq(microTasks.taskId, id));
      
      // Then delete related activity logs
      await db.delete(activityLogs).where(eq(activityLogs.taskId, id));

      // Finally delete the task
      const result = await db.delete(tasks).where(eq(tasks.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  // Hierarchical task methods
  async getTasksByType(userId: string, taskType: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.taskType, taskType)))
      .orderBy(asc(tasks.order), desc(tasks.createdAt));
  }

  async getSubTasks(parentTaskId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId))
      .orderBy(asc(tasks.order), desc(tasks.createdAt));
  }

  async getMainTasks(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.taskType, 'main')))
      .orderBy(asc(tasks.order), desc(tasks.createdAt));
  }

  async getDailyTasks(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.isRecurring, true)))
      .orderBy(asc(tasks.order), desc(tasks.createdAt));
  }

  async getTasksByTag(userId: string, tag: string): Promise<Task[]> {
    // Simple filtering - will implement proper array filtering when needed
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));

    return allTasks.filter(task => 
      task.tags && task.tags.includes(tag)
    );
  }

  // Goals
  async getGoals(userId: string): Promise<Goal[]> {
    const userGoals = await db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));

    // Fetch milestones and warmup tasks for each goal
    const goalsWithDetails = await Promise.all(
      userGoals.map(async (goal) => {
        const goalMilestones = await db.select().from(milestones)
          .where(eq(milestones.goalId, goal.id))
          .orderBy(milestones.order);
        
        // Remove warmup tasks from goals - they're now associated with tasks
        
        return { ...goal, milestones: goalMilestones };
      })
    );

    return goalsWithDetails;
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async getGoalWithMilestones(id: number): Promise<any> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    if (!goal) return undefined;

    const goalMilestones = await db.select().from(milestones)
      .where(eq(milestones.goalId, id))
      .orderBy(milestones.order);

    return { ...goal, milestones: goalMilestones };
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const result = await db
      .insert(goals)
      .values({
        ...goal,
        completed: goal.completed || false,
        progress: goal.progress || 0,
        expReward: goal.expReward || 0
      })
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create goal: No data returned from database');
    }
    
    return result[0];
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const updateData: any = { ...goal };
    if (goal.completed) {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteGoal(id: number, userId: string): Promise<boolean> {
    try {
      // 确保只操作用户自己的目标
      const goal = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId))).limit(1);
      if (goal.length === 0) {
        return false;
      }

      // 1. 先删除引用该目标的普通任务的goalId引用 (设为null而不是删除任务)
      await db.update(tasks).set({ goalId: null }).where(and(eq(tasks.goalId, id), eq(tasks.userId, userId)));

      // 2. 删除相关的里程碑
      await db.delete(milestones).where(and(eq(milestones.goalId, id), eq(milestones.userId, userId)));

      // 3. 删除相关的目标任务
      await db.delete(goalTasks).where(eq(goalTasks.goalId, id));

      // 4. 最后删除目标本身
      const result = await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Delete goal error:', error);
      return false;
    }
  }

  // Goal Tasks
  async getGoalTasks(goalId: number): Promise<GoalTask[]> {
    return await db.select().from(goalTasks).where(eq(goalTasks.goalId, goalId));
  }

  async createGoalTask(goalTask: InsertGoalTask): Promise<GoalTask> {
    const result = await db
      .insert(goalTasks)
      .values({
        ...goalTask,
        completed: goalTask.completed || false,
        expReward: goalTask.expReward || 0
      })
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create goal task: No data returned from database');
    }
    
    return result[0];
  }

  async updateGoalTask(id: number, goalTask: Partial<InsertGoalTask>): Promise<GoalTask | undefined> {
    const [updated] = await db
      .update(goalTasks)
      .set(goalTask)
      .where(eq(goalTasks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(goalTasks).where(eq(goalTasks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Activity Logs
  async getActivityLogs(userId: string): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.date));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const result = await db
      .insert(activityLogs)
      .values({
        ...log,
        expGained: log.expGained || 0
      })
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create activity log: No data returned from database');
    }
    
    return result[0];
  }

  async removeTaskCompletionLog(taskId: number): Promise<boolean> {
    const result = await db
      .delete(activityLogs)
      .where(and(
        eq(activityLogs.taskId, taskId),
        eq(activityLogs.action, 'task_completed')
      ));
    return result.rowCount ? result.rowCount > 0 : false;
  }



  // Milestones
  async getMilestones(goalId: number): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.goalId, goalId));
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const result = await db
      .insert(milestones)
      .values({
        ...milestone,
        completed: milestone.completed ?? false,
        order: milestone.order ?? 0
      })
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create milestone: No data returned from database');
    }
    
    return result[0];
  }

  async updateMilestone(id: number, milestoneData: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const updateData: any = { ...milestoneData };
    if (milestoneData.completed) {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(milestones)
      .set(updateData)
      .where(eq(milestones.id, id))
      .returning();

    if (updated && updated.goalId) {
      const progress = await this.calculateGoalProgress(updated.goalId);
      await this.updateGoal(updated.goalId, { progress });
    }

    return updated || undefined;
  }

  async deleteMilestone(id: number): Promise<boolean> {
    const result = await db.delete(milestones).where(eq(milestones.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Micro Tasks - only for main tasks (goal-related tasks)
  async getMicroTasks(taskId: number): Promise<MicroTask[]> {
    return await db.select().from(microTasks)
      .where(eq(microTasks.taskId, taskId))
      .orderBy(asc(microTasks.order));
  }

  async generateMicroTasksForMainTask(taskId: number, userId: string): Promise<MicroTask[]> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Only generate micro tasks for main tasks (goal-related tasks)
    if (task.taskCategory !== 'goal') {
      throw new Error('Micro tasks are only available for main tasks');
    }

    // Delete existing micro tasks for this task to avoid duplicates
    await db.delete(microTasks).where(eq(microTasks.taskId, taskId));

    // Generate micro tasks based on the main task
    const microTasksData = [
      {
        userId,
        taskId,
        title: `分解步骤：${task.title}`,
        description: `将"${task.title}"分解为3-5个具体的执行步骤`,
        duration: 5,
        expReward: 8,
        difficulty: 'easy' as const,
        order: 0,
      },
      {
        userId,
        taskId,
        title: `资源准备：${task.title}`,
        description: `收集完成"${task.title}"所需的工具、资料和资源`,
        duration: 8,
        expReward: 12,
        difficulty: 'medium' as const,
        order: 1,
      },
      {
        userId,
        taskId,
        title: `环境设置：${task.title}`,
        description: `创建适合完成"${task.title}"的专注工作环境`,
        duration: 3,
        expReward: 6,
        difficulty: 'easy' as const,
        order: 2,
      },
      {
        userId,
        taskId,
        title: `开始执行：${task.title}`,
        description: `开始执行"${task.title}"的第一个关键步骤`,
        duration: 10,
        expReward: 15,
        difficulty: 'medium' as const,
        order: 3,
      },
    ];

    const createdTasks = await Promise.all(
      microTasksData.map(data => this.createMicroTask(data))
    );

    return createdTasks;
  }



  async calculateGoalProgress(goalId: number): Promise<number> {
    const goalMilestones = await this.getMilestones(goalId);
    if (goalMilestones.length === 0) return 0;

    const completedMilestones = goalMilestones.filter(m => m.completed).length;
    return completedMilestones / goalMilestones.length;
  }

  async mergeSkills(sourceSkillIds: number[], targetSkillName: string, targetSkillColor?: string) {
    if (!Array.isArray(sourceSkillIds) || sourceSkillIds.length < 2) {
      throw new Error("至少需要两个技能进行合并");
    }

    // Get source skills
    const sourceSkills = await Promise.all(
      sourceSkillIds.map(id => this.getSkill(id))
    );

    // Check if all skills exist
    const missingSkills = sourceSkills.filter(skill => !skill);
    if (missingSkills.length > 0) {
      throw new Error("某些技能不存在");
    }

    const validSourceSkills = sourceSkills.filter(Boolean) as Skill[];

    // Calculate merged skill properties
    const totalExp = validSourceSkills.reduce((sum, skill) => sum + skill.exp, 0);
    const maxLevel = Math.max(...validSourceSkills.map(skill => skill.level));
    const avgMaxExp = Math.round(validSourceSkills.reduce((sum, skill) => sum + skill.maxExp, 0) / validSourceSkills.length);

    // Create merged skill
    const mergedSkillData: InsertSkill = {
      userId: validSourceSkills[0].userId,
      name: targetSkillName.trim(),
      level: maxLevel,
      exp: totalExp,
      maxExp: avgMaxExp,
      color: targetSkillColor || validSourceSkills[0].color,
      icon: this.getSkillIcon(targetSkillName),
      skillType: 'basic',
      category: 'general',
      talentPoints: Math.max(...validSourceSkills.map(skill => skill.talentPoints || 0)),
      prestige: Math.max(...validSourceSkills.map(skill => skill.prestige || 0)),
      unlocked: true,
      prerequisites: null
    };

    const [mergedSkill] = await db.insert(skills).values(mergedSkillData).returning();

    // Update all tasks that reference the source skills
    await db.update(tasks)
      .set({ skillId: mergedSkill.id })
      .where(inArray(tasks.skillId, sourceSkillIds));

    // Update all activity logs that reference the source skills
    await db.update(activityLogs)
      .set({ skillId: mergedSkill.id })
      .where(inArray(activityLogs.skillId, sourceSkillIds));

    // Create merge activity log
    await this.createActivityLog({
      userId: validSourceSkills[0].userId,
      action: 'skill_merge',
      description: `合并 ${validSourceSkills.length} 个技能为"${targetSkillName}"`,
      skillId: mergedSkill.id,
      expGained: 0
    });

    // Delete source skills
    await db.delete(skills).where(inArray(skills.id, sourceSkillIds));

    return {
      mergedSkill,
      transferredTasks: [], // We could fetch these if needed
      sourceSkills: validSourceSkills
    };
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    return result[0];
  }

  async upsertUserProfile(profileData: InsertUserProfile): Promise<UserProfile> {
    const existing = await this.getUserProfile(profileData.userId);

    if (existing) {
      // Update existing profile
      const [updated] = await db
        .update(userProfiles)
        .set({ ...profileData, updatedAt: new Date() })
        .where(eq(userProfiles.userId, profileData.userId))
        .returning();
      return updated;
    } else {
      // Create new profile
      const [created] = await db.insert(userProfiles).values(profileData).returning();
      return created;
    }
  }

  // User Stats (Habitica-inspired)
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const result = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
    return result[0];
  }

  async createUserStats(statsData: InsertUserStats): Promise<UserStats> {
    const [created] = await db.insert(userStats).values(statsData).returning();
    return created;
  }

  async updateUserStats(userId: string, statsData: Partial<InsertUserStats>): Promise<UserStats | undefined> {
    const [updated] = await db
      .update(userStats)
      .set({ ...statsData, updatedAt: new Date() })
      .where(eq(userStats.userId, userId))
      .returning();
    return updated;
  }

  async consumeEnergyBalls(userId: string, amount: number): Promise<UserStats | undefined> {
    const stats = await this.getUserStats(userId);
    if (!stats) return undefined;

    const newEnergyBalls = Math.max(0, stats.energyBalls - amount);
    return await this.updateUserStats(userId, { energyBalls: newEnergyBalls });
  }

  async restoreEnergyBalls(userId: string, amount: number): Promise<UserStats | undefined> {
    const stats = await this.getUserStats(userId);
    if (!stats) return undefined;

    const maxEnergyBalls = stats.maxEnergyBalls || 18;
    const newEnergyBalls = Math.min(maxEnergyBalls, stats.energyBalls + amount);
    return await this.updateUserStats(userId, { energyBalls: newEnergyBalls });
  }

  async checkAndResetEnergyBalls(userId: string): Promise<boolean> {
    const stats = await this.getUserStats(userId);
    if (!stats) return false;

    const now = new Date();
    const lastReset = stats.lastEnergyReset ? new Date(stats.lastEnergyReset) : null;

    // Check if it's been more than 24 hours since last reset OR if it's a new day (past midnight)
    const shouldReset = !lastReset || 
      (now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000) ||
      (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear());

    if (shouldReset) {
      console.log(`Resetting energy balls for user ${userId}: ${stats.energyBalls} -> ${stats.maxEnergyBalls}`);

      // Use direct database update to ensure the change is committed
      const [updated] = await db
        .update(userStats)
        .set({ 
          energyBalls: stats.maxEnergyBalls,
          lastEnergyReset: now,
          updatedAt: now
        })
        .where(eq(userStats.userId, userId))
        .returning();

      if (updated) {
        console.log(`Energy balls reset successful for user ${userId}: ${updated.energyBalls}/${updated.maxEnergyBalls}`);
        return true;
      } else {
        console.error(`Failed to reset energy balls for user ${userId}`);
        return false;
      }
    }

    return false;
  }

  async addExperience(userId: string, expGained: number): Promise<void> {
    const stats = await this.getUserStats(userId);

    if (stats) {
      const newExperience = stats.experience + expGained;

      // Calculate level ups
      const { level, experience, experienceToNext } = this.calculateLevelUp(newExperience, stats.level);

      await this.updateUserStats(userId, {
        level,
        experience,
        experienceToNext
      });
    } else {
      // Create initial stats if they don't exist
      await this.createUserStats({
        userId,
        level: 1,
        experience: expained,
        energyBalls: 18,
        maxEnergyBalls: 18,
        streak: 0
      });
    }
  }

  // Calculate required energy balls for a task based on estimated duration and difficulty
  calculateRequiredEnergyBalls(estimatedDuration: number = 25, difficulty: string = "medium", taskType: string = "simple"): number {
    let baseBalls = Math.ceil(estimatedDuration / 15); // Each energy ball = 15 minutes

    // Adjust for difficulty
    const difficultyMultiplier = {
      "trivial": 0.5,
      "easy": 0.8,
      "medium": 1.0,
      "hard": 1.5
    }[difficulty] || 1.0;

    // Adjust for task type
    const typeMultiplier = {
      "simple": 1.0,
      "daily": 0.8,
      "main": 2.0,
      "stage": 1.5
    }[taskType] || 1.0;

    return Math.max(1, Math.round(baseBalls * difficultyMultiplier * typeMultiplier));
  }

  // Calculate level progression based on experience
  private calculateLevelUp(totalExperience: number, currentLevel: number): { level: number, experience: number, experienceToNext: number } {
    let level = 1;
    let remainingExp = totalExperience;

    // Each level requires progressively more experience
    while (remainingExp > 0) {
      const expForNextLevel = this.getExperienceRequiredForLevel(level);

      if (remainingExp >= expForNextLevel) {
        remainingExp -= expForNextLevel;
        level++;
      } else {
        break;
      }
    }

    const experienceToNext = this.getExperienceRequiredForLevel(level);

    return {
      level,
      experience: remainingExp,
      experienceToNext
    };
  }

  // Calculate experience required for a specific level
  private getExperienceRequiredForLevel(level: number): number {
    // Progressive experience scaling: level * 100 + (level - 1) * 50
    return level * 100 + Math.max(0, level - 1) * 50;
  }

  async addActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(logData).returning();
    return created;
  }

}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private userStats: Map<string, UserStats> = new Map();
  private skills: Map<number, Skill> = new Map();
  private tasks: Map<number, Task> = new Map();
  private goals: Map<number, Goal> = new Map();
  private goalTasks: Map<number, GoalTask> = new Map<number, GoalTask>();
  private activityLogs: Map<number, ActivityLog> = new Map();
  private achievements: Map<number, Achievement> = new Map();

  // Milestones
  private milestones = new Map<number, Milestone>();
  private currentMilestoneId = 1;

  private currentSkillId = 1;
  private currentTaskId = 1;
  private currentGoalId = 1;
  private currentGoalTaskId = 1;
  private currentActivityLogId = 1;
  private currentMilestoneId = 1;

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Initialize the six core skills
    const defaultSkills: InsertSkill[] = [
      { 
        name: "身体掌控力", 
        level: 1, 
        exp: 0, 
        maxExp: 100, 
        color: "#EF4444", 
        icon: "fas fa-dumbbell",
        skillType: "core",
        category: "Physical Mastery",
        userId: "default"
      },
      { 
        name: "情绪稳定力", 
        level: 1, 
        exp: 0, 
        maxExp: 100, 
        color: "#8B5CF6", 
        icon: "fas fa-heart",
        skillType: "core",
        category: "Emotional Resilience",
        userId: "default"
      },
      { 
        name: "心智成长力", 
        level: 1, 
        exp: 0, 
        maxExp: 100, 
        color: "#06B6D4", 
        icon: "fas fa-brain",
        skillType: "core",
        category: "Cognitive Agility",
        userId: "default"
      },
      { 
        name: "关系经营力", 
        level: 1, 
        exp: 0, 
        maxExp: 100, 
        color: "#10B981", 
        icon: "fas fa-users",
        skillType: "core",
        category: "Relational Intelligence",
        userId: "default"
      },
      { 
        name: "财富掌控力", 
        level: 1, 
        exp: 0, 
        maxExp: 100, 
        color: "#F59E0B", 
        icon: "fas fa-coins",
        skillType: "core",
        category: "Financial Wisdom",
        userId: "default"
      },
      { 
        name: "意志执行力", 
        level: 1, 
        exp: 0, 
        maxExp: 100, 
        color: "#DC2626", 
        icon: "fas fa-target",
        skillType: "core",
        category: "Purposeful Action",
        userId: "default"
      }
    ];

    defaultSkills.forEach(skill => {
      const newSkill: Skill = { 
        ...skill, 
        id: this.currentSkillId,
        color: skill.color || "#6366F1",
        level: skill.level || 1,
        exp: skill.exp || 0,
        maxExp: skill.maxExp || 100,
        icon: skill.icon || "fas fa-star"
      };
      this.skills.set(this.currentSkillId, newSkill);
      this.currentSkillId++;
    });

    // Initialize some default goals
    const defaultGoals: InsertGoal[] = [
      {
        title: "掌握前端开发技能",
        description: "学习React、Vue等现代前端框架，完成至少3个实际项目",
        progress: 0.6,
        expReward: 500,
        targetDate: new Date("2024-06-30")
      },
      {
        title: "提高英语口语能力",
        description: "通过每日练习和实际对话，达到能够流利进行技术讨论的水平",
        progress: 0.35,
        expReward: 400,
        targetDate: new Date("2024-08-15")
      },
      {
        title: "建立健康生活习惯",
        description: "每天运动30分钟，保持健康的作息时间",
        progress: 0.8,
        expReward: 300,
        completed: false
      }
    ];

    defaultGoals.forEach(goal => {
      const newGoal: Goal = {
        id: this.currentGoalId,
        title: goal.title,
        description: goal.description || null,
        completed: goal.completed || false,
        progress: goal.progress || 0,
        targetDate: goal.targetDate || null,
        expReward: goal.expReward || 0,
        skillTags: goal.skillTags ?? null,
        createdAt: new Date(),
        completedAt: null
      };
      this.goals.set(this.currentGoalId, newGoal);
      this.currentGoalId++;
    });
  }

  // Skills
  async getSkills(): Promise<Skill[]> {
    return Array.from(this.skills.values());
  }

  async getSkill(id: number): Promise<Skill | undefined> {
    return this.skills.get(id);
  }

  async createSkill(skillData: InsertSkill): Promise<Skill> {
    const skill: Skill = {
      ...skillData,
      id: this.currentSkillId,
      level: skillData.level || 1,
      exp: skillData.exp || 0,
      maxExp: skillData.maxExp || 100,
      color: skillData.color || "#6366F1",
      icon: skillData.icon || "fas fa-star"
    };

    this.skills.set(this.currentSkillId, skill);
    this.currentSkillId++;
    return skill;
  }

  async findOrCreateSkill(name: string, icon?: string, color?: string): Promise<Skill> {
    // 查找是否已存在相同或相似的技能
    const existingSkill = Array.from(this.skills.values()).find(skill => 
      skill.name === name || skill.name.includes(name) || name.includes(skill.name)
    );

    if (existingSkill) {
      return existingSkill;
    }

    // 创建新技能
    const skillData: InsertSkill = {
      name,
      level: 1,
      exp: 0,
      maxExp: 100,
      color: color || this.getSkillColor(name),
      icon: icon || this.getSkillIcon(name)
    };

    return this.createSkill(skillData);
  }

  private getSkillColor(skillName: string): string {
    const colorMap: { [key: string]: string } = {
      // 基础技能
      '学习': '#06B6D4',
      '阅读': '#0891B2',
      '记忆': '#0E7490',
      '理解': '#155E75',

      // 研究技能
      '研究': '#8B5CF6',
      '调研': '#7C3AED',
      '实验': '#6D28D9',
      '分析': '#5B21B6',

      // 表达技能
      '写作': '#10B981',
      '编辑': '#059669',
      '论文': '#047857',
      '文档': '#065F46',

      // 创作技能
      '设计': '#F59E0B',
      '绘画': '#D97706',
      '创意': '#B45309',
      '美工': '#92400E',

      // 技术技能
      '编程': '#6366F1',
      '开发': '#4F46E5',
      '算法': '#4338CA',
      '调试': '#3730A3',

      // 管理技能
      '管理': '#EF4444',
      '领导': '#DC2626',
      '规划': '#B91C1C',
      '组织': '#991B1B',

      // 社交技能
      '沟通': '#EC4899',
      '演讲': '#DB2777',
      '表达': '#BE185D',
      '协作': '#9D174D',

      // 学术技能
      '科研': '#8B5CF6',
      '学术': '#7C3AED',
      '理论': '#6D28D9',
      '实践': '#5B21B6'
    };

    for (const [keyword, color] of Object.entries(colorMap)) {
      if (skillName.includes(keyword)) {
        return color;
      }
    }
    return '#6366F1'; // 默认颜色
  }

  private getSkillIcon(skillName: string): string {
    const iconMap: { [key: string]: string } = {
      // 基础技能
      '学习': 'fas fa-book-open',
      '阅读': 'fas fa-glasses',
      '记忆': 'fas fa-brain',
      '理解': 'fas fa-lightbulb',

      // 研究技能
      '研究': 'fas fa-search',
      '调研': 'fas fa-microscope',
      '实验': 'fas fa-flask',
      '分析': 'fas fa-chart-line',

      // 表达技能
      '写作': 'fas fa-pen',
      '编辑': 'fas fa-edit',
      '论文': 'fas fa-file-alt',
      '文档': 'fas fa-file-word',

      // 创作技能
      '设计': 'fas fa-palette',
      '绘画': 'fas fa-paint-brush',
      '创意': 'fas fa-magic',
      '美工': 'fas fa-image',

      // 技术技能
      '编程': 'fas fa-code',
      '开发': 'fas fa-laptop-code',
      '算法': 'fas fa-cogs',
      '调试': 'fas fa-bug',

      // 管理技能
      '管理': 'fas fa-tasks',
      '领导': 'fas fa-crown',
      '规划': 'fas fa-calendar-alt',
      '组织': 'fas fa-sitemap',

      // 社交技能
      '沟通': 'fas fa-comments',
      '演讲': 'fas fa-microphone',
      '表达': 'fas fa-bullhorn',
      '协作': 'fas fa-handshake',

      // 学术技能
      '科研': 'fas fa-graduation-cap',
      '学术': 'fas fa-university',
      '理论': 'fas fa-atom',
      '实践': 'fas fa-hammer',

      // 其他常见技能
      '图片': 'fas fa-image',
      '报告': 'fas fa-file-powerpoint',
      '数据': 'fas fa-database',
      '网络': 'fas fa-network-wired'
    };

    for (const [keyword, icon] of Object.entries(iconMap)) {
      if (skillName.includes(keyword)) {
        return icon;
      }
    }
    return 'fas fa-star'; // 默认图标
  }

  async updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill | undefined> {
    const existing = this.skills.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...skill };
    this.skills.set(id, updated);
    return updated;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const newTask: Task = { 
      id: this.currentTaskId,
      title: task.title,
      description: task.description ?? null,
      completed: task.completed || false,
      skillId: task.skillId ?? null,
      goalId: task.goalId ?? null,
      goalTags: task.goalTags ?? null,
      expReward: task.expReward || 0,
      estimatedDuration: task.estimatedDuration ?? 25,
      actualDuration: task.actualDuration ?? null,
      pomodoroSessionId: task.pomodoroSessionId ?? null,
      startedAt: task.startedAt ?? null,
      createdAt: new Date(),
      completedAt: null
    };
    this.tasks.set(this.currentTaskId, newTask);
    this.currentTaskId++;
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...task,
      completedAt: task.completed && !existing.completed ? new Date() : existing.completedAt
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Goals
  async getGoals(): Promise<Goal[]> {
    return Array.from(this.goals.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const newGoal: Goal = { 
      id: this.currentGoalId,
      title: goal.title,
      description: goal.description ?? null,
      completed: goal.completed || false,
      progress: goal.progress || 0,
      targetDate: goal.targetDate ?? null,
      expReward: goal.expReward || 0,
      skillTags: goal.skillTags ?? null,
      createdAt: new Date(),
      completedAt: null
    };
    this.goals.set(this.currentGoalId, newGoal);
    this.currentGoalId++;
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const existing = this.goals.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...goal,
      completedAt: goal.completed && !existing.completed ? new Date() : existing.completedAt
    };
    this.goals.set(id, updated);

    // Update goal progress based on milestones
    const progress = await this.calculateGoalProgress(id);
    updated.progress = progress;

    // Automatically complete goal if progress is 100%
    if (progress === 1 && !updated.completed) {
        updated.completed = true;
        updated.completedAt = new Date();
    }

    this.goals.set(id, updated);
    return updated;
  }

  async deleteGoal(id: number, userId: string): Promise<boolean> {
    const goal = this.goals.get(id);
    if (!goal || goal.userId !== userId) return false;
    return this.goals.delete(id);
  }

  // Goal Tasks
  async getGoalTasks(goalId: number): Promise<GoalTask[]> {
    return Array.from(this.goalTasks.values()).filter(task => task.goalId === goalId);
  }

  async createGoalTask(goalTask: InsertGoalTask): Promise<GoalTask> {
    const newGoalTask: GoalTask = { 
      ...goalTask, 
      id: this.currentGoalTaskId,
      completed: goalTask.completed || false,
      expReward: goalTask.expReward || 0
    };
    this.goalTasks.set(this.currentGoalTaskId, newGoalTask);
    this.currentGoalTaskId++;
    return newGoalTask;
  }

  async updateGoalTask(id: number, goalTask: Partial<InsertGoalTask>): Promise<GoalTask | undefined> {
    const existing = this.goalTasks.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...goalTask };
    this.goalTasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.goalTasks.delete(id);
  }

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const newLog: ActivityLog = { 
      ...log, 
      id: this.currentActivityLogId,
      date: new Date(),
      description: log.description || null,
      skillId: log.skillId || null,
      taskId: log.taskId || null,
      expGained: log.expGained || 0
    };
    this.activityLogs.set(this.currentActivityLogId, newLog);
    this.currentActivityLogId++;
    return newLog;
  }

  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values()).sort((a, b) => 
      new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
    );
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const newAchievement: Achievement = { 
      ...achievement, 
      id: this.currentAchievementId,
      icon: achievement.icon || "fas fa-trophy",
      expReward: achievement.expReward || 0,
      unlockedAt: new Date()
    };
    this.achievements.set(this.currentAchievementId, newAchievement);
    this.currentAchievementId++;
    return newAchievement;
  }

  // Milestones methods
  async getMilestones(goalId: number): Promise<Milestone[]> {
    const allMilestones = Array.from(this.milestones.values());
    return allMilestones.filter(m => m.goalId === goalId);
  }

  async createMilestone(milestoneData: InsertMilestone): Promise<Milestone> {
    const milestone: Milestone = {
      id: this.currentMilestoneId,
      goalId: milestoneData.goalId,
      title: milestoneData.title,
      description: milestoneData.description || null,
      completed: milestoneData.completed ?? false,
      order: milestoneData.order ?? 0,
      createdAt: new Date(),
      completedAt: null
    };

    this.milestones.set(this.currentMilestoneId, milestone);
    this.currentMilestoneId++;

    return milestone;
  }

  async updateMilestone(id: number, milestoneData: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const milestone = this.milestones.get(id);
    if (!milestone) return undefined;

    const updatedMilestone: Milestone = {
      ...milestone,
      ...milestoneData,
      completedAt: milestoneData.completed ? new Date() : milestone.completedAt
    };

    this.milestones.set(id, updatedMilestone);

    // Update goal progress based on milestones
    if (updatedMilestone.goalId) {
      const progress = await this.calculateGoalProgress(updatedMilestone.goalId);
      await this.updateGoal(updatedMilestone.goalId, { progress });
    }

    return updatedMilestone;
  }

  async deleteMilestone(id: number): Promise<boolean> {
    return this.milestones.delete(id);
  }

  // Calculate goal progress based on milestones
  async calculateGoalProgress(goalId: number): Promise<number> {
    const milestones = await this.getMilestones(goalId);

    if (milestones.length === 0) {
      return 0; // 没有里程碑时进度为0
    }

    const completedCount = milestones.filter(m => m.completed).length;
    return completedCount / milestones.length; // 返回完成比例
  }

    async mergeSkills(sourceSkillIds: number[], targetSkillName: string, targetSkillColor?: string) {
    // Validate sourceSkillIds
    if (!Array.isArray(sourceSkillIds) || sourceSkillIds.length === 0) {
      throw new Error("sourceSkillIds must be a non-empty array.");
    }

    // Validate targetSkillName
    if (!targetSkillName || typeof targetSkillName !== 'string' || targetSkillName.trim() === "") {
      throw new Error("targetSkillName must be a non-empty string.");
    }

    const sourceSkills: Skill[] = [];
    let totalExp = 0;
    let maxLevel = 0;
    let totalMaxExp = 0;

    for (const skillId of sourceSkillIds) {
      const skill = this.skills.get(skillId);
      if (!skill) {
        throw new Error(`Skill with id ${skillId} not found.`);
      }
      sourceSkills.push(skill);
      totalExp += skill.exp;
      maxLevel = Math.max(maxLevel, skill.level);
      totalMaxExp += skill.maxExp;
    }

    const newMaxExp = totalMaxExp / sourceSkills.length;

    // Create or update the target skill
    let mergedSkill: Skill;
    const existingSkill = Array.from(this.skills.values()).find(skill => skill.name === targetSkillName);

    if (existingSkill) {
      // Update existing skill
      mergedSkill = {
        ...existingSkill,
        level: maxLevel,
        exp: totalExp,
        maxExp: Math.round(newMaxExp),
        color: targetSkillColor || existingSkill.color,
        icon: existingSkill.icon // or allow specifying a new icon?
      };
      this.skills.set(mergedSkill.id, mergedSkill);
    } else {
      // Create new skill
      mergedSkill = {
        id: this.currentSkillId++,
        name: targetSkillName,
        level: maxLevel,
        exp: totalExp,
        maxExp: Math.round(newMaxExp),
        color: targetSkillColor || sourceSkills[0].color,
        icon: sourceSkills[0].icon
      };
      this.skills.set(mergedSkill.id, mergedSkill);
    }

    // Transfer all related tasks
    for (const taskId of Array.from(this.tasks.keys())) {
      const task = this.tasks.get(taskId);
      if (task && sourceSkillIds.includes(task.skillId!)) {
        task.skillId = mergedSkill.id;
        this.tasks.set(taskId, task);
      }
    }

    // Transfer activity logs
    for (const logId of Array.from(this.activityLogs.keys())) {
      const log = this.activityLogs.get(logId);
      if (log && sourceSkillIds.includes(log.skillId!)) {
        log.skillId = mergedSkill.id;
        this.activityLogs.set(logId, log);
      }
    }

    // Delete source skills
    for (const skillId of sourceSkillIds) {
      this.skills.delete(skillId);
    }

    // Log the merge activity
    const newLog: ActivityLog = {
      id: this.currentActivityLogId++,
      date: new Date(),
      action: 'skill_merge',
      description: `Merged ${sourceSkills.length} skills into "${targetSkillName}"`,
      skillId: mergedSkill.id,
      taskId: null,
      expGained: 0
    };
    this.activityLogs.set(newLog.id, newLog);

    return {
      mergedSkill,
      transferredTasks: [], // we don't track this in memory
      sourceSkills
    };
  }
    private userStates: Map<string, any> = new Map();

  async getUserState(userId: string): Promise<any | null> {
    return this.userStates.get(userId) || null;
  }

  async updateUserState(userId: string, state: any): Promise<void> {
    this.userStates.set(userId, state);
  }
}

export const storage = new DatabaseStorage();