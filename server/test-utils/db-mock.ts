/**
 * Database mocking utilities for server-side testing
 * Provides mock implementations of database operations
 * Uses in-memory storage for fast, isolated tests
 */

import { vi } from 'vitest';
import type { User, UserStats, Skill, Task, Goal, MicroTask } from '@shared/schema';

/**
 * In-memory database storage
 * Simulates database tables with Maps
 */
export class MockDatabase {
  private users = new Map<string, User>();
  private userStats = new Map<string, UserStats>();
  private skills = new Map<string, Skill>();
  private tasks = new Map<string, Task>();
  private goals = new Map<string, Goal>();
  private microTasks = new Map<string, MicroTask>();
  
  /**
   * Reset all data
   * Call between tests to ensure isolation
   */
  reset() {
    this.users.clear();
    this.userStats.clear();
    this.skills.clear();
    this.tasks.clear();
    this.goals.clear();
    this.microTasks.clear();
  }
  
  /**
   * User operations
   */
  userOps = {
    create: async (user: User): Promise<User> => {
      this.users.set(user.id, user);
      return user;
    },
    
    findById: async (id: string): Promise<User | null> => {
      return this.users.get(id) || null;
    },
    
    findByEmail: async (email: string): Promise<User | null> => {
      return Array.from(this.users.values()).find(u => u.email === email) || null;
    },
    
    update: async (id: string, updates: Partial<User>): Promise<User | null> => {
      const user = this.users.get(id);
      if (!user) return null;
      
      const updated = { ...user, ...updates };
      this.users.set(id, updated);
      return updated;
    },
    
    delete: async (id: string): Promise<boolean> => {
      return this.users.delete(id);
    },
  };
  
  /**
   * UserStats operations
   */
  statsOps = {
    create: async (stats: UserStats): Promise<UserStats> => {
      this.userStats.set(stats.userId, stats);
      return stats;
    },
    
    findByUserId: async (userId: string): Promise<UserStats | null> => {
      return this.userStats.get(userId) || null;
    },
    
    update: async (userId: string, updates: Partial<UserStats>): Promise<UserStats | null> => {
      const stats = this.userStats.get(userId);
      if (!stats) return null;
      
      const updated = { ...stats, ...updates };
      this.userStats.set(userId, updated);
      return updated;
    },
  };
  
  /**
   * Skill operations
   */
  skillOps = {
    create: async (skill: Skill): Promise<Skill> => {
      this.skills.set(skill.id, skill);
      return skill;
    },
    
    findByUserId: async (userId: string): Promise<Skill[]> => {
      return Array.from(this.skills.values()).filter(s => s.userId === userId);
    },
    
    update: async (id: string, updates: Partial<Skill>): Promise<Skill | null> => {
      const skill = this.skills.get(id);
      if (!skill) return null;
      
      const updated = { ...skill, ...updates };
      this.skills.set(id, updated);
      return updated;
    },
    
    addXp: async (id: string, xp: number): Promise<Skill | null> => {
      const skill = this.skills.get(id);
      if (!skill) return null;
      
      const newXp = skill.currentXp + xp;
      const newLevel = Math.floor(newXp / 100) + 1; // Simple level calculation
      
      const updated = { ...skill, currentXp: newXp, level: newLevel };
      this.skills.set(id, updated);
      return updated;
    },
  };
  
  /**
   * Task operations
   */
  taskOps = {
    create: async (task: Task): Promise<Task> => {
      this.tasks.set(task.id, task);
      return task;
    },
    
    findById: async (id: string): Promise<Task | null> => {
      return this.tasks.get(id) || null;
    },
    
    findByUserId: async (userId: string, filters?: {
      type?: string;
      status?: string;
      goalId?: string;
    }): Promise<Task[]> => {
      let tasks = Array.from(this.tasks.values()).filter(t => t.userId === userId);
      
      if (filters?.type) {
        tasks = tasks.filter(t => t.type === filters.type);
      }
      if (filters?.status) {
        tasks = tasks.filter(t => t.status === filters.status);
      }
      if (filters?.goalId) {
        tasks = tasks.filter(t => t.goalId === filters.goalId);
      }
      
      return tasks;
    },
    
    update: async (id: string, updates: Partial<Task>): Promise<Task | null> => {
      const task = this.tasks.get(id);
      if (!task) return null;
      
      const updated = { ...task, ...updates, updatedAt: new Date() };
      this.tasks.set(id, updated);
      return updated;
    },
    
    complete: async (id: string): Promise<Task | null> => {
      const task = this.tasks.get(id);
      if (!task) return null;
      
      const now = new Date();
      const updates: Partial<Task> = {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      };
      
      if (task.type === 'habit') {
        updates.lastCompletedAt = now;
        updates.streak = (task.streak || 0) + 1;
      }
      
      const updated = { ...task, ...updates };
      this.tasks.set(id, updated);
      return updated;
    },
    
    delete: async (id: string): Promise<boolean> => {
      return this.tasks.delete(id);
    },
  };
  
  /**
   * Goal operations
   */
  goalOps = {
    create: async (goal: Goal): Promise<Goal> => {
      this.goals.set(goal.id, goal);
      return goal;
    },
    
    findById: async (id: string): Promise<Goal | null> => {
      return this.goals.get(id) || null;
    },
    
    findByUserId: async (userId: string): Promise<Goal[]> => {
      return Array.from(this.goals.values()).filter(g => g.userId === userId);
    },
    
    update: async (id: string, updates: Partial<Goal>): Promise<Goal | null> => {
      const goal = this.goals.get(id);
      if (!goal) return null;
      
      const updated = { ...goal, ...updates, updatedAt: new Date() };
      this.goals.set(id, updated);
      return updated;
    },
    
    updateProgress: async (id: string): Promise<Goal | null> => {
      const goal = this.goals.get(id);
      if (!goal) return null;
      
      // Calculate progress based on completed tasks
      const tasks = await this.taskOps.findByUserId(goal.userId, { goalId: id });
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const progress = tasks.length > 0 
        ? Math.round((completedTasks.length / tasks.length) * 100)
        : 0;
      
      const updated = { ...goal, progress, updatedAt: new Date() };
      this.goals.set(id, updated);
      return updated;
    },
    
    delete: async (id: string): Promise<boolean> => {
      return this.goals.delete(id);
    },
  };
  
  /**
   * MicroTask operations
   */
  microTaskOps = {
    create: async (microTask: MicroTask): Promise<MicroTask> => {
      this.microTasks.set(microTask.id, microTask);
      return microTask;
    },
    
    findByTaskId: async (taskId: string): Promise<MicroTask[]> => {
      return Array.from(this.microTasks.values())
        .filter(mt => mt.taskId === taskId)
        .sort((a, b) => a.order - b.order);
    },
    
    toggle: async (id: string): Promise<MicroTask | null> => {
      const microTask = this.microTasks.get(id);
      if (!microTask) return null;
      
      const updated = { 
        ...microTask, 
        completed: !microTask.completed,
        updatedAt: new Date()
      };
      this.microTasks.set(id, updated);
      return updated;
    },
    
    delete: async (id: string): Promise<boolean> => {
      return this.microTasks.delete(id);
    },
  };
}

/**
 * Create mock storage module
 * Replaces the real storage module in tests
 */
export function createMockStorage() {
  const db = new MockDatabase();
  
  return {
    db,
    storage: {
      users: db.userOps,
      userStats: db.statsOps,
      skills: db.skillOps,
      tasks: db.taskOps,
      goals: db.goalOps,
      microTasks: db.microTaskOps,
    },
  };
}

/**
 * Mock transaction helper
 * Simulates database transactions
 */
export function mockTransaction<T>(
  fn: () => Promise<T>
): Promise<T> {
  // In real implementation, this would handle rollback on error
  // For mocks, we just execute the function
  return fn();
}

/**
 * Mock query builder
 * Simulates Drizzle ORM query syntax for testing
 */
export class MockQueryBuilder<T> {
  private data: T[] = [];
  private filters: Array<(item: T) => boolean> = [];
  private sortFn?: (a: T, b: T) => number;
  private limitValue?: number;
  private offsetValue?: number;
  
  constructor(data: T[]) {
    this.data = [...data];
  }
  
  where(filter: (item: T) => boolean) {
    this.filters.push(filter);
    return this;
  }
  
  orderBy(fn: (a: T, b: T) => number) {
    this.sortFn = fn;
    return this;
  }
  
  limit(n: number) {
    this.limitValue = n;
    return this;
  }
  
  offset(n: number) {
    this.offsetValue = n;
    return this;
  }
  
  async execute(): Promise<T[]> {
    let result = [...this.data];
    
    // Apply filters
    for (const filter of this.filters) {
      result = result.filter(filter);
    }
    
    // Apply sorting
    if (this.sortFn) {
      result.sort(this.sortFn);
    }
    
    // Apply offset and limit
    if (this.offsetValue !== undefined) {
      result = result.slice(this.offsetValue);
    }
    if (this.limitValue !== undefined) {
      result = result.slice(0, this.limitValue);
    }
    
    return result;
  }
  
  async first(): Promise<T | null> {
    const results = await this.execute();
    return results[0] || null;
  }
  
  async count(): Promise<number> {
    let result = [...this.data];
    for (const filter of this.filters) {
      result = result.filter(filter);
    }
    return result.length;
  }
}

/**
 * Helper to create mock API context
 * Simulates Express request/response objects
 */
export function createMockContext(overrides?: {
  user?: User;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
}) {
  const mockReq = {
    user: overrides?.user || null,
    params: overrides?.params || {},
    query: overrides?.query || {},
    body: overrides?.body || {},
    headers: {},
    session: {
      userId: overrides?.user?.id || null,
    },
  };
  
  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    locals: {},
  };
  
  const mockNext = vi.fn();
  
  return {
    req: mockReq,
    res: mockRes,
    next: mockNext,
  };
}

/**
 * Test database seeder
 * Seeds mock database with test data
 */
export async function seedTestDatabase(db: MockDatabase, options?: {
  userCount?: number;
  taskCount?: number;
  goalCount?: number;
}) {
  const { userCount = 3, taskCount = 10, goalCount = 2 } = options || {};
  
  // Import mock data factories
  const { userFactory, skillFactory, taskFactory, goalFactory, userStatsFactory } = 
    await import('@/test-utils/mock-data');
  
  // Create users with stats and skills
  for (let i = 0; i < userCount; i++) {
    const user = await db.userOps.create(userFactory.create());
    await db.statsOps.create(userStatsFactory.create({ userId: user.id }));
    
    // Create all 6 skills for each user
    const skills = skillFactory.createAll(user.id);
    for (const skill of skills) {
      await db.skillOps.create(skill);
    }
    
    // Create goals
    for (let j = 0; j < goalCount; j++) {
      await db.goalOps.create(goalFactory.create({ userId: user.id }));
    }
    
    // Create tasks
    for (let k = 0; k < taskCount; k++) {
      await db.taskOps.create(taskFactory.create({ userId: user.id }));
    }
  }
}