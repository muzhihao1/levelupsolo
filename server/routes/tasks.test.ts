/**
 * Example test file for tasks API endpoints
 * Demonstrates server-side testing with mock database
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockStorage, createMockContext } from '../test-utils/db-mock';
import { taskFactory, userFactory } from '@/test-utils/mock-data';

// Mock the storage module
vi.mock('../storage', () => {
  const mockStorage = createMockStorage();
  return {
    storage: mockStorage.storage,
    mockDb: mockStorage.db, // Expose for test access
  };
});

describe('Tasks API Endpoints', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  
  beforeEach(async () => {
    // Reset mock database before each test
    const { mockDb } = await import('../storage') as any;
    mockDb.reset();
    mockStorage = createMockStorage();
  });

  describe('GET /api/tasks', () => {
    it('returns tasks for authenticated user', async () => {
      // Create test user and tasks
      const user = userFactory.create();
      const tasks = taskFactory.createMany(5, { userId: user.id });
      
      // Seed mock database
      await mockStorage.db.userOps.create(user);
      for (const task of tasks) {
        await mockStorage.db.taskOps.create(task);
      }
      
      // Create mock request context
      const { req, res } = createMockContext({ user });
      
      // Import and call the handler (in a real test, you'd import the actual handler)
      const getTasks = async (req: any, res: any) => {
        const userTasks = await mockStorage.storage.tasks.findByUserId(req.user.id);
        res.status(200).json({ success: true, data: userTasks });
      };
      
      await getTasks(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: user.id,
            id: expect.any(String),
          }),
        ]),
      });
      expect(res.json.mock.calls[0][0].data).toHaveLength(5);
    });

    it('filters tasks by type', async () => {
      const user = userFactory.create();
      const habits = taskFactory.createMany(3, { userId: user.id, type: 'habit' });
      const mainQuests = taskFactory.createMany(2, { userId: user.id, type: 'main_quest' });
      
      // Seed database
      await mockStorage.db.userOps.create(user);
      for (const task of [...habits, ...mainQuests]) {
        await mockStorage.db.taskOps.create(task);
      }
      
      const { req, res } = createMockContext({ 
        user, 
        query: { type: 'habit' } 
      });
      
      // Handler with filtering
      const getTasks = async (req: any, res: any) => {
        const filters = req.query.type ? { type: req.query.type } : undefined;
        const userTasks = await mockStorage.storage.tasks.findByUserId(
          req.user.id, 
          filters
        );
        res.status(200).json({ success: true, data: userTasks });
      };
      
      await getTasks(req, res);
      
      // Verify only habits are returned
      const response = res.json.mock.calls[0][0];
      expect(response.data).toHaveLength(3);
      expect(response.data.every((t: any) => t.type === 'habit')).toBe(true);
    });

    it('returns 401 for unauthenticated requests', async () => {
      const { req, res } = createMockContext({ user: null });
      
      // Auth middleware simulation
      const requireAuth = (req: any, res: any, next: any) => {
        if (!req.user) {
          return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
          });
        }
        next();
      };
      
      requireAuth(req, res, vi.fn());
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a new task', async () => {
      const user = userFactory.create();
      await mockStorage.db.userOps.create(user);
      
      const newTaskData = {
        title: 'New Task',
        description: 'Task description',
        type: 'side_quest',
        priority: 'medium',
        skills: ['mental', 'willpower'],
        xpReward: 50,
        energyCost: 2,
      };
      
      const { req, res } = createMockContext({ 
        user, 
        body: newTaskData 
      });
      
      // Create task handler
      const createTask = async (req: any, res: any) => {
        const task = await mockStorage.storage.tasks.create({
          ...req.body,
          id: 'task-123',
          userId: req.user.id,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        res.status(201).json({ success: true, data: task });
      };
      
      await createTask(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          title: 'New Task',
          userId: user.id,
          type: 'side_quest',
        }),
      });
    });

    it('validates required fields', async () => {
      const user = userFactory.create();
      const { req, res } = createMockContext({ 
        user, 
        body: { title: '' } // Missing required fields
      });
      
      // Validation handler
      const validateTask = (req: any, res: any, next: any) => {
        if (!req.body.title || !req.body.type) {
          return res.status(400).json({ 
            success: false, 
            error: 'Title and type are required' 
          });
        }
        next();
      };
      
      validateTask(req, res, vi.fn());
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Title and type are required',
      });
    });
  });

  describe('PUT /api/tasks/:id/complete', () => {
    it('completes a task and awards XP', async () => {
      const user = userFactory.create();
      const task = taskFactory.create({ 
        userId: user.id, 
        status: 'active',
        xpReward: 100,
        skills: ['physical', 'mental'],
      });
      
      // Seed database
      await mockStorage.db.userOps.create(user);
      await mockStorage.db.taskOps.create(task);
      await mockStorage.db.statsOps.create({
        id: 'stats-1',
        userId: user.id,
        level: 1,
        totalXp: 0,
        currentEnergy: 10,
        maxEnergy: 18,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const { req, res } = createMockContext({ 
        user, 
        params: { id: task.id } 
      });
      
      // Complete task handler
      const completeTask = async (req: any, res: any) => {
        const taskId = req.params.id;
        const completedTask = await mockStorage.storage.tasks.complete(taskId);
        
        if (!completedTask) {
          return res.status(404).json({ 
            success: false, 
            error: 'Task not found' 
          });
        }
        
        // Award XP
        const stats = await mockStorage.storage.userStats.findByUserId(req.user.id);
        if (stats) {
          await mockStorage.storage.userStats.update(req.user.id, {
            totalXp: stats.totalXp + completedTask.xpReward,
          });
        }
        
        res.status(200).json({ success: true, data: completedTask });
      };
      
      await completeTask(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      });
      
      // Verify XP was awarded
      const updatedStats = await mockStorage.db.statsOps.findByUserId(user.id);
      expect(updatedStats?.totalXp).toBe(100);
    });

    it('updates habit streak', async () => {
      const user = userFactory.create();
      const habit = taskFactory.createHabit({ 
        userId: user.id, 
        streak: 5,
      });
      
      await mockStorage.db.userOps.create(user);
      await mockStorage.db.taskOps.create(habit);
      
      const { req, res } = createMockContext({ 
        user, 
        params: { id: habit.id } 
      });
      
      // Complete habit handler
      const completeTask = async (req: any, res: any) => {
        const completedTask = await mockStorage.storage.tasks.complete(req.params.id);
        res.status(200).json({ success: true, data: completedTask });
      };
      
      await completeTask(req, res);
      
      const response = res.json.mock.calls[0][0];
      expect(response.data.streak).toBe(6);
      expect(response.data.lastCompletedAt).toBeTruthy();
    });
  });
});