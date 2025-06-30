import { 
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
import { IStorage } from "./storage";
import bcrypt from "bcryptjs";

// In-memory storage implementation for development
export class MockStorage implements IStorage {
  private users: Map<string, User & { hashedPassword?: string }> = new Map();
  private usersByEmail: Map<string, string> = new Map(); // email -> userId
  private skills: Map<number, Skill> = new Map();
  private tasks: Map<number, Task> = new Map();
  private goals: Map<number, Goal> = new Map();
  private goalTasks: Map<number, GoalTask> = new Map();
  private activityLogs: Map<number, ActivityLog> = new Map();
  private milestones: Map<number, Milestone> = new Map();
  private microTasks: Map<number, MicroTask> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private userStats: Map<string, UserStats> = new Map();
  
  private nextId = {
    skill: 1,
    task: 1,
    goal: 1,
    goalTask: 1,
    activityLog: 1,
    milestone: 1,
    microTask: 1,
    userProfile: 1,
    userStats: 1
  };

  constructor() {
    // Initialize with demo user
    const demoUser = {
      id: "31581595",
      email: "demo@levelupsolo.net",
      firstName: "Demo",
      lastName: "User",
      profileImageUrl: null,
      hashedPassword: bcrypt.hashSync("demo1234", 10),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(demoUser.id, demoUser);
    this.usersByEmail.set(demoUser.email, demoUser.id);
    
    console.log("MockStorage initialized with demo user");
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const { hashedPassword, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const userId = this.usersByEmail.get(email);
    if (!userId) return undefined;
    return this.getUser(userId);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user = {
      ...userData,
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(user.id, user);
    if (user.email) {
      this.usersByEmail.set(user.email, user.id);
    }
    
    const { hashedPassword, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async setUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.hashedPassword = hashedPassword;
      user.updatedAt = new Date();
    }
  }

  async getUserPassword(userId: string): Promise<string | undefined> {
    const user = this.users.get(userId);
    return user?.hashedPassword;
  }

  // Skills
  async getSkills(userId: string): Promise<Skill[]> {
    return Array.from(this.skills.values()).filter(skill => skill.userId === userId);
  }

  async getSkill(id: number): Promise<Skill | undefined> {
    return this.skills.get(id);
  }

  async createSkill(skill: InsertSkill): Promise<Skill> {
    const newSkill: Skill = {
      id: this.nextId.skill++,
      ...skill,
      level: skill.level || 1,
      exp: skill.exp || 0,
      maxExp: skill.maxExp || 100,
      color: skill.color || "#6366F1",
      icon: skill.icon || "fas fa-star",
      skillType: skill.skillType || "basic",
      category: skill.category || "general",
      talentPoints: skill.talentPoints || 0,
      prestige: skill.prestige || 0,
      unlocked: skill.unlocked ?? true,
      prerequisites: skill.prerequisites || null
    };
    this.skills.set(newSkill.id, newSkill);
    return newSkill;
  }

  async updateSkill(id: number, updates: Partial<InsertSkill>): Promise<Skill | undefined> {
    const skill = this.skills.get(id);
    if (!skill) return undefined;
    
    const updatedSkill = { ...skill, ...updates };
    this.skills.set(id, updatedSkill);
    return updatedSkill;
  }

  async updateSkillExp(skillId: number, expToAdd: number): Promise<Skill | undefined> {
    const skill = this.skills.get(skillId);
    if (!skill) return undefined;
    
    skill.exp += expToAdd;
    while (skill.exp >= skill.maxExp) {
      skill.exp -= skill.maxExp;
      skill.level++;
      skill.maxExp = Math.floor(skill.maxExp * 1.2);
    }
    
    return skill;
  }

  async addSkillExp(skillId: number, expToAdd: number): Promise<Skill | undefined> {
    return this.updateSkillExp(skillId, expToAdd);
  }

  // Tasks
  async getTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const newTask: Task = {
      id: this.nextId.task++,
      ...task,
      completed: task.completed || false,
      expReward: task.expReward || 0,
      estimatedDuration: task.estimatedDuration || 25,
      accumulatedTime: task.accumulatedTime || 0,
      taskCategory: task.taskCategory || "todo",
      taskType: task.taskType || "simple",
      order: task.order || 0,
      createdAt: task.createdAt || new Date()
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getTasksByType(userId: string, taskType: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.userId === userId && task.taskType === taskType
    );
  }

  async getSubTasks(parentTaskId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.parentTaskId === parentTaskId
    );
  }

  async getMainTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.userId === userId && task.taskType === "main"
    );
  }

  async getDailyTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.userId === userId && task.taskCategory === "habit"
    );
  }

  async getTasksByTag(userId: string, tag: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.userId === userId && task.goalTags?.includes(tag)
    );
  }

  // Goals (simplified implementation)
  async getGoals(userId: string): Promise<any[]> {
    return Array.from(this.goals.values()).filter(goal => goal.userId === userId);
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async getGoalWithMilestones(id: number): Promise<any> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const milestones = Array.from(this.milestones.values()).filter(m => m.goalId === id);
    return { ...goal, milestones };
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const newGoal: Goal = {
      id: this.nextId.goal++,
      ...goal,
      progress: goal.progress || 0,
      energyBallsAllocated: goal.energyBallsAllocated || 0,
      isArchived: goal.isArchived || false,
      createdAt: goal.createdAt || new Date()
    };
    this.goals.set(newGoal.id, newGoal);
    return newGoal;
  }

  async updateGoal(id: number, updates: Partial<InsertGoal>): Promise<Goal | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { ...goal, ...updates };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteGoal(id: number, userId: string): Promise<boolean> {
    const goal = this.goals.get(id);
    if (goal?.userId === userId) {
      return this.goals.delete(id);
    }
    return false;
  }

  // Goal Tasks
  async getGoalTasks(goalId: number): Promise<GoalTask[]> {
    return Array.from(this.goalTasks.values()).filter(gt => gt.goalId === goalId);
  }

  async createGoalTask(goalTask: InsertGoalTask): Promise<GoalTask> {
    const newGoalTask: GoalTask = {
      id: this.nextId.goalTask++,
      ...goalTask,
      completed: goalTask.completed || false,
      createdAt: goalTask.createdAt || new Date()
    };
    this.goalTasks.set(newGoalTask.id, newGoalTask);
    return newGoalTask;
  }

  async updateGoalTask(id: number, updates: Partial<InsertGoalTask>): Promise<GoalTask | undefined> {
    const goalTask = this.goalTasks.get(id);
    if (!goalTask) return undefined;
    
    const updatedGoalTask = { ...goalTask, ...updates };
    this.goalTasks.set(id, updatedGoalTask);
    return updatedGoalTask;
  }

  async deleteGoalTask(id: number): Promise<boolean> {
    return this.goalTasks.delete(id);
  }

  // Activity Logs
  async getActivityLogs(userId: string): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).filter(log => log.userId === userId);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const newLog: ActivityLog = {
      id: this.nextId.activityLog++,
      ...log,
      createdAt: log.createdAt || new Date()
    };
    this.activityLogs.set(newLog.id, newLog);
    return newLog;
  }

  async removeTaskCompletionLog(taskId: number): Promise<boolean> {
    const logs = Array.from(this.activityLogs.values());
    const log = logs.find(l => l.taskId === taskId);
    if (log) {
      return this.activityLogs.delete(log.id);
    }
    return false;
  }

  // Milestones
  async getMilestones(goalId: number): Promise<Milestone[]> {
    return Array.from(this.milestones.values()).filter(m => m.goalId === goalId);
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const newMilestone: Milestone = {
      id: this.nextId.milestone++,
      ...milestone,
      completed: milestone.completed || false,
      createdAt: milestone.createdAt || new Date()
    };
    this.milestones.set(newMilestone.id, newMilestone);
    return newMilestone;
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const milestone = this.milestones.get(id);
    if (!milestone) return undefined;
    
    const updatedMilestone = { ...milestone, ...updates };
    this.milestones.set(id, updatedMilestone);
    return updatedMilestone;
  }

  async deleteMilestone(id: number): Promise<boolean> {
    return this.milestones.delete(id);
  }

  // Micro Tasks
  async getMicroTasks(taskId: number): Promise<MicroTask[]> {
    return Array.from(this.microTasks.values()).filter(mt => mt.taskId === taskId);
  }

  async createMicroTask(microTask: InsertMicroTask): Promise<MicroTask> {
    const newMicroTask: MicroTask = {
      id: this.nextId.microTask++,
      ...microTask,
      completed: microTask.completed || false,
      estimatedDuration: microTask.estimatedDuration || 25,
      actualDuration: microTask.actualDuration || 0,
      order: microTask.order || 0,
      createdAt: microTask.createdAt || new Date()
    };
    this.microTasks.set(newMicroTask.id, newMicroTask);
    return newMicroTask;
  }

  async updateMicroTask(id: number, updates: Partial<InsertMicroTask>): Promise<MicroTask | undefined> {
    const microTask = this.microTasks.get(id);
    if (!microTask) return undefined;
    
    const updatedMicroTask = { ...microTask, ...updates };
    this.microTasks.set(id, updatedMicroTask);
    return updatedMicroTask;
  }

  async generateMicroTasksForMainTask(taskId: number, userId: string): Promise<MicroTask[]> {
    // Simplified implementation - just create a few default micro tasks
    const microTasks = [
      { title: "Plan approach", estimatedDuration: 15 },
      { title: "Implement core functionality", estimatedDuration: 45 },
      { title: "Test and refine", estimatedDuration: 30 }
    ];
    
    const created: MicroTask[] = [];
    for (const mt of microTasks) {
      const microTask = await this.createMicroTask({
        ...mt,
        taskId,
        userId,
        completed: false,
        actualDuration: 0
      });
      created.push(microTask);
    }
    
    return created;
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(userId);
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const existing = this.userProfiles.get(profile.userId);
    const newProfile: UserProfile = {
      id: existing?.id || this.nextId.userProfile++,
      ...profile,
      hasCompletedOnboarding: profile.hasCompletedOnboarding ?? false,
      hasCompletedTutorial: profile.hasCompletedTutorial ?? false,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.userProfiles.set(profile.userId, newProfile);
    return newProfile;
  }

  // User Stats
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    return this.userStats.get(userId);
  }

  async createUserStats(stats: InsertUserStats): Promise<UserStats> {
    const newStats: UserStats = {
      id: this.nextId.userStats++,
      ...stats,
      level: stats.level || 1,
      experience: stats.experience || 0,
      experienceToNext: stats.experienceToNext || 100,
      energyBalls: stats.energyBalls || 18,
      maxEnergyBalls: stats.maxEnergyBalls || 18,
      energyBallDuration: stats.energyBallDuration || 15,
      energyPeakStart: stats.energyPeakStart || 9,
      energyPeakEnd: stats.energyPeakEnd || 12,
      streak: stats.streak || 0,
      totalTasksCompleted: stats.totalTasksCompleted || 0,
      lastEnergyReset: stats.lastEnergyReset || new Date(),
      createdAt: stats.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.userStats.set(stats.userId, newStats);
    return newStats;
  }

  async updateUserStats(userId: string, updates: Partial<InsertUserStats>): Promise<UserStats | undefined> {
    const stats = this.userStats.get(userId);
    if (!stats) return undefined;
    
    const updatedStats = { ...stats, ...updates, updatedAt: new Date() };
    this.userStats.set(userId, updatedStats);
    return updatedStats;
  }

  async consumeEnergyBalls(userId: string, amount: number): Promise<UserStats | undefined> {
    const stats = this.userStats.get(userId);
    if (!stats) return undefined;
    
    stats.energyBalls = Math.max(0, stats.energyBalls - amount);
    stats.updatedAt = new Date();
    return stats;
  }

  async restoreEnergyBalls(userId: string, amount: number): Promise<UserStats | undefined> {
    const stats = this.userStats.get(userId);
    if (!stats) return undefined;
    
    stats.energyBalls = Math.min(stats.maxEnergyBalls, stats.energyBalls + amount);
    stats.updatedAt = new Date();
    return stats;
  }

  async checkAndResetEnergyBalls(userId: string): Promise<boolean> {
    const stats = this.userStats.get(userId);
    if (!stats) return false;
    
    const now = new Date();
    const lastReset = new Date(stats.lastEnergyReset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24) {
      stats.energyBalls = stats.maxEnergyBalls;
      stats.lastEnergyReset = now;
      stats.updatedAt = now;
      return true;
    }
    
    return false;
  }

  // Initialize core skills
  async initializeCoreSkills(userId: string): Promise<void> {
    const coreSkills = [
      { name: "身体掌控力", color: "#EF4444", icon: "fas fa-dumbbell", category: "Physical Mastery" },
      { name: "情绪稳定力", color: "#8B5CF6", icon: "fas fa-heart", category: "Emotional Resilience" },
      { name: "心智成长力", color: "#06B6D4", icon: "fas fa-brain", category: "Cognitive Agility" },
      { name: "关系经营力", color: "#10B981", icon: "fas fa-users", category: "Relational Intelligence" },
      { name: "财富掌控力", color: "#F59E0B", icon: "fas fa-coins", category: "Financial Wisdom" },
      { name: "意志执行力", color: "#DC2626", icon: "fas fa-target", category: "Purposeful Action" }
    ];

    for (const skill of coreSkills) {
      await this.createSkill({
        ...skill,
        userId,
        level: 1,
        exp: 0,
        maxExp: 100,
        skillType: "basic",
        talentPoints: 0,
        prestige: 0,
        unlocked: true
      });
    }
  }
}