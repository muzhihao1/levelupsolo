import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { skills, tasks, goals, activityLogs, microTasks } from "@shared/schema";
import OpenAI from "openai";
import { RecommendationEngine } from './recommendationEngine';
import bcrypt from "bcryptjs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Auto-merge skills when user has more than 6 skills
// Removed auto-merge functionality - now using fixed core skills system

// Zod schemas
const insertSkillSchema = createInsertSchema(skills);
const insertTaskSchema = createInsertSchema(tasks);
const insertGoalSchema = createInsertSchema(goals);
const insertMicroTaskSchema = createInsertSchema(microTasks);

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS protection for production
  app.use((req, res, next) => {
    const allowedOrigins = [
      'https://levelupsolo.net',
      'https://www.levelupsolo.net',
      'http://localhost:5173', // Local development
      'http://localhost:5000', // Local development
      'http://localhost:3000', // Local development
      /^https:\/\/.*\.up\.railway\.app$/, // Railway domains
    ];

    const origin = req.headers.origin;
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin || '');
      }
      return allowed === origin;
    });
    
    if (isAllowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  });

  // Auth middleware
  await setupAuth(app);

  // Simple health check endpoint
  app.get('/api/health', async (_req, res) => {
    let dbStatus = 'unknown';
    let userCount = -1;
    let dbError = null;
    
    try {
      // Test database connection
      const users = await storage.getUserByEmail('test@example.com');
      dbStatus = 'connected';
      
      // Try to count users (optional)
      try {
        const testUser = await storage.getUser('test');
        userCount = testUser ? 1 : 0;
      } catch (e) {
        // Ignore count error
      }
    } catch (error) {
      dbStatus = 'error';
      dbError = (error as any).message;
      console.error('Database connection error:', error);
    }
    
    res.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        error: dbError,
        userCount: userCount
      },
      env: {
        hasDatabase: !!process.env.DATABASE_URL,
        databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'not set',
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasJWT: !!process.env.JWT_SECRET,
        port: process.env.PORT || 3000
      }
    });
  });

  // Database schema check endpoint
  app.get('/api/test/db-check', async (req, res) => {
    try {
      const results: any = {};
      
      // Import at the top of the file instead of dynamic require
      // These are already imported, just use them
      const { sql } = await import('drizzle-orm');
      const { db } = await import('./db').then(m => ({ db: m.db }));
      
      // Check if tables exist
      try {
        const tables = await db.execute(sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `);
        results.tables = tables.map((r: any) => r.table_name);
      } catch (e) {
        results.tables = 'Error: ' + (e as any).message;
      }
      
      // Check users table structure
      try {
        const userColumns = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'users'
          ORDER BY ordinal_position
        `);
        results.userColumns = userColumns;
        
        // Check if hashedPassword column exists
        results.hasPasswordColumn = userColumns.some((col: any) => 
          col.column_name === 'hashed_password'
        );
      } catch (e) {
        results.userColumns = 'Error: ' + (e as any).message;
      }
      
      // Try to count users
      try {
        const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
        results.userCount = userCount[0]?.count || 0;
      } catch (e) {
        results.userCount = 'Error: ' + (e as any).message;
      }
      
      // Check if we can query with storage
      try {
        const testUser = await storage.getUserByEmail('test@example.com');
        results.storageWorking = true;
        results.testUserExists = !!testUser;
      } catch (e) {
        results.storageWorking = false;
        results.storageError = (e as any).message;
      }
      
      res.json({
        success: true,
        database: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
        results
      });
    } catch (error) {
      console.error('Database check error:', error);
      res.status(500).json({
        success: false,
        error: (error as any).message,
        stack: process.env.NODE_ENV === 'development' ? (error as any).stack : undefined
      });
    }
  });

  // Simple test endpoint
  app.get('/api/test/simple', (req, res) => {
    res.json({
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasDB: !!process.env.DATABASE_URL,
        hasJWT: !!process.env.JWT_SECRET
      }
    });
  });

  // Test endpoint to create a test user (REMOVE IN PRODUCTION)
  app.post('/api/test/create-user', async (req, res) => {
    console.log('=== CREATE TEST USER START ===');
    try {
      // First check if table exists
      console.log('Checking if users table exists...');
      try {
        const count = await storage.getUserByEmail('check@test.com');
        console.log('Users table exists');
      } catch (tableError) {
        console.error('Users table might not exist:', tableError);
        return res.status(500).json({
          message: 'Database table might not exist',
          error: (tableError as any).message,
          hint: 'Run npm run db:push locally'
        });
      }

      // Create test user
      const testUser = {
        id: 'test_user_' + Date.now(),
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        hashedPassword: await bcrypt.hash('password123', 10)
      };
      
      console.log('Creating user:', testUser.email);
      await storage.upsertUser(testUser);
      console.log('User created successfully');
      
      // Verify user was created
      const verifyUser = await storage.getUserByEmail('test@example.com');
      console.log('User verified:', !!verifyUser);
      
      res.json({
        message: 'Test user created successfully',
        email: 'test@example.com',
        password: 'password123',
        userExists: !!verifyUser,
        note: 'This endpoint should be removed in production'
      });
      console.log('=== CREATE TEST USER SUCCESS ===');
    } catch (error) {
      console.error('=== CREATE TEST USER FAILED ===');
      console.error('Error:', error);
      res.status(500).json({ 
        message: 'Failed to create test user',
        error: (error as any).message,
        code: (error as any).code,
        hint: (error as any).code === '42P01' ? 'Table does not exist. Run npm run db:push' : undefined
      });
    }
  });

  // Security health check endpoint
  app.get('/api/security/status', (req, res) => {
    const securityCheck = {
      domain: req.hostname,
      timestamp: new Date().toISOString(),
      protocol: req.protocol,
      forwardedProto: req.header('x-forwarded-proto'),
      isSecure: req.secure || req.header('x-forwarded-proto') === 'https',
      headers: {
        hsts: res.getHeader('Strict-Transport-Security') ? 'enabled' : 'disabled',
        xContentType: res.getHeader('X-Content-Type-Options') ? 'enabled' : 'disabled',
        xFrame: res.getHeader('X-Frame-Options') ? 'enabled' : 'disabled',
        xss: res.getHeader('X-XSS-Protection') ? 'enabled' : 'disabled',
        csp: res.getHeader('Content-Security-Policy') ? 'enabled' : 'disabled',
        referrer: res.getHeader('Referrer-Policy') ? 'enabled' : 'disabled'
      },
      auth: {
        configured: !!process.env.REPLIT_DOMAINS,
        strategiesCount: Object.keys((require('passport') as any)._strategies || {}).length
      },
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(securityCheck);
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Initialize core skills for user
  app.post("/api/skills/initialize-core", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      await (storage as any).initializeCoreSkills(userId);
      console.log(`Initialized core skills for user ${userId}`);

      const skills = await storage.getSkills(userId);

      res.json({ 
        message: `Initialized ${skills.length} core skills successfully`,
        skills: skills
      });
    } catch (error) {
      console.error("Error initializing core skills:", error);
      res.status(500).json({ message: "Failed to create test skills" });
    }
  });

  // Skills routes
  app.get("/api/skills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Initialize core skills if they don't exist
      await (storage as any).initializeCoreSkills(userId);

      const skills = await storage.getSkills(userId);
      res.json(skills);
    } catch (error) {
      console.error("Error fetching skills:", error);
      res.status(500).json({ message: "Failed to fetch skills" });
    }
  });

  app.post("/api/skills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const skillData = insertSkillSchema.parse({
        ...req.body,
        userId
      });

      const skill = await storage.createSkill(skillData);
      res.json(skill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid skill data", errors: error.errors });
      } else {
        console.error("Error creating skill:", error);
        res.status(500).json({ message: "Failed to create skill" });
      }
    }
  });

  app.patch("/api/skills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const skillId = parseInt(req.params.id);
      const updates = req.body;

      const skill = await storage.updateSkill(skillId, updates);

      if (!skill) {
        return res.status(404).json({ message: "Skill not found" });
      }

      res.json(skill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid skill data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update skill" });
      }
    }
  });

  // Tasks routes
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId
      });

      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      const userId = (req.user as any)?.claims?.sub;

      // Get current task to check if it's a habit
      const currentTask = await storage.getTask(taskId);
      if (!currentTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Handle habit completion logic
      if (currentTask.taskCategory === "habit" && updates.completed !== undefined) {
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        const lastCompleted = currentTask.lastCompletedDate ? new Date(currentTask.lastCompletedDate).toISOString().split('T')[0] : null;

        if (updates.completed) {
          // Completing a habit
          if (lastCompleted !== today) {
            // First completion today - award experience and update streak
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const wasCompletedYesterday = lastCompleted === yesterdayStr;

            updates.habitStreak = wasCompletedYesterday ? (currentTask.habitStreak || 0) + 1 : 1;
            updates.lastCompletedDate = now;
            updates.habitValue = Math.min((currentTask.habitValue || 0) + 0.25, 3);

            // Award experience for habit completion
            const baseExp = currentTask.expReward || 20;
            const streakBonus = updates.habitStreak > 7 ? Math.floor(updates.habitStreak / 7) * 5 : 0;
            const totalExp = baseExp + streakBonus;

            // Add experience to user
            await storage.addExperience(userId, totalExp);

            // Update related skill if exists
            if (currentTask.skillId) {
              await storage.updateSkillExp(currentTask.skillId, Math.floor(totalExp * 0.8));
            }

            // Log the activity
            await storage.addActivityLog({
              userId,
              taskId: currentTask.id,
              skillId: currentTask.skillId,
              expGained: totalExp,
              action: "habit_complete",
              description: `完成习惯: ${currentTask.title} (连续${updates.habitStreak}天)`
            });
          } else {
            // Already completed today - don't allow multiple completions
            return res.status(400).json({ message: "今天已经完成过这个习惯了" });
          }
        } else {
          // Uncompleting a habit - only allow if completed today
          if (lastCompleted === today) {
            updates.completed = false;
            // Reset last completed date when uncompleting
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            updates.lastCompletedDate = lastCompleted === today ? null : currentTask.lastCompletedDate;
          } else {
            return res.status(400).json({ message: "只能取消今天完成的习惯" });
          }
        }
      }

      const task = await storage.updateTask(taskId, updates);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Award experience to associated skill when task is completed
      if (updates.completed && task.skillId) {
        try {
          const expToAward = task.expReward || 20;
          await storage.addSkillExp(task.skillId, expToAward);

          // Core skills system - no auto-merge needed
          console.log(`Task completed, skill experience awarded to user ${userId}`);
        } catch (error) {
          console.error("Error awarding skill experience:", error);
        }
      }

      // Handle energy ball consumption/restoration
      if (updates.completed !== undefined && task.requiredEnergyBalls) {
        try {
          const userId = req.user.claims.sub;
          if (updates.completed && !currentTask.completed) {
            // Completing a task - consume energy balls
            await storage.consumeEnergyBalls(userId, task.requiredEnergyBalls);
          } else if (!updates.completed && currentTask.completed) {
            // Uncompleting a task - restore energy balls
            await storage.restoreEnergyBalls(userId, task.requiredEnergyBalls);
          }
        } catch (error) {
          console.error("Error handling energy balls:", error);
        }
      }

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Failed to update task" });
      }
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const success = await storage.deleteTask(taskId);

      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // AI-powered task creation with automatic type classification
  app.post("/api/tasks/intelligent-create", isAuthenticated, async (req: any, res) => {
    try {
      const { description } = req.body;
      const userId = (req.user as any)?.claims?.sub;

      if (!description) {
        return res.status(400).json({ message: "Task description is required" });
      }

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
        console.warn("OpenAI API key not configured, using simple task creation");
        
        // Simple rule-based task creation without AI
        const taskCategory = description.includes("每天") || description.includes("坚持") || description.includes("养成") 
          ? "habit" 
          : "todo";
        
        const difficulty = description.length > 50 ? "hard" : description.length > 20 ? "medium" : "easy";
        const energyBalls = difficulty === "hard" ? 4 : difficulty === "medium" ? 2 : 1;
        
        const taskData = {
          userId,
          title: description.trim(),
          description: null,
          taskCategory: taskCategory,
          taskType: taskCategory,
          difficulty: difficulty,
          expReward: difficulty === "hard" ? 35 : difficulty === "medium" ? 20 : 10,
          estimatedDuration: energyBalls * 15,
          requiredEnergyBalls: energyBalls,
          tags: [],
          skills: [],
          skillId: null,
          completed: false,
          ...(taskCategory === "habit" && {
            isRecurring: true,
            recurringPattern: "daily",
            habitStreak: 0,
            habitValue: 0,
            habitDirection: "positive"
          })
        };

        const newTask = await storage.createTask(taskData);
        return res.json({ 
          task: newTask, 
          analysis: {
            category: taskCategory,
            title: description.trim(),
            difficulty: difficulty,
            skillName: null,
            energyBalls: energyBalls
          }
        });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `分析以下任务描述，判断是习惯还是支线任务，并分配合适的核心技能和能量球需求：

任务描述："${description}"

分类判定规则：
- 习惯(habit)：需要长期坚持养成的重复性行为，强调"养成"和"坚持"
  例如：每天运动、坚持阅读、定期冥想、保持早睡、养成记录习惯、坚持学习等
  关键词：每天、坚持、养成、定期、保持、习惯、打卡

- 支线任务(todo)：有明确完成状态的具体任务，包括一次性阅读、学习特定内容等
  例如：读某篇文章、看某个视频、完成某个报告、学习某个技能、参加某个会议、购买某物品等
  关键词：读、看、完成、学习、参加、购买、处理、解决、制作、写、研究

特殊说明：
- "读生财帖子"、"看教程"、"学习某技术" → todo（有具体完成目标的学习任务）
- "坚持每天阅读"、"养成学习习惯" → habit（强调养成的重复行为）

核心技能分类（必须从以下六个固定技能中选择一个）：
- 身体掌控力：体育运动、健身、身体健康、体能训练等
- 心智成长力：学习、阅读、研究、思考、认知提升等
- 意志执行力：工作任务、项目执行、目标达成、自律行为等
- 关系经营力：社交、沟通、团队合作、人际关系等
- 财富掌控力：理财、投资、经济管理、资源优化等
- 情绪稳定力：情绪管理、心理健康、压力调节、内心平衡等

能量球系统（每个能量球=15分钟专注时间）：
- 简单任务：1个能量球（15分钟）
- 中等任务：2-3个能量球（30-45分钟）
- 困难任务：4-6个能量球（60-90分钟）

返回JSON格式：
{
  "category": "habit|todo",
  "title": "简洁的任务标题", 
  "difficulty": "easy|medium|hard",
  "skillName": "对应的核心技能名称",
  "energyBalls": 1-6
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 200
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");

      const difficultyRewards = {
        easy: { xp: 10 },
        medium: { xp: 20 },
        hard: { xp: 35 }
      } as const;

      const difficulty = analysis.difficulty || "medium";
      const rewards = difficultyRewards[difficulty as keyof typeof difficultyRewards];
      const taskCategory = analysis.category || "todo";
      const skillName = analysis.skillName;
      const requiredEnergyBalls = analysis.energyBalls || (() => {
        // Fallback energy ball calculation based on difficulty
        switch(difficulty) {
          case "easy": return 1;
          case "medium": return 2;
          case "hard": return 4;
          default: return 2;
        }
      })();

      // Map AI response to core skills and find matching skill
      let skillId = null;
      if (skillName) {
        // Initialize core skills if they don't exist
        await (storage as any).initializeCoreSkills(userId);

        // Get user's core skills
        const userSkills = await storage.getSkills(userId);
        let skill = userSkills.find(s => s.name === skillName);

        // If exact match not found, use core skill mapping
        if (!skill) {
          skill = await (storage as any).findOrCreateSkill(skillName, userId);
        }

        if (skill) {
          skillId = skill.id;
        }
      }

      // Create task with AI-determined category and skill assignment
      const taskData = {
        userId,
        title: analysis.title || description.trim(),
        description: null,
        taskCategory: taskCategory,
        taskType: taskCategory,
        difficulty: difficulty,
        expReward: rewards.xp,
        estimatedDuration: requiredEnergyBalls * 15, // Energy balls * 15 minutes
        requiredEnergyBalls: requiredEnergyBalls,
        tags: skillName ? [skillName] : [],
        skills: skillName ? [skillName] : [],
        skillId: skillId,
        completed: false,
        // Add habit-specific properties for habit tasks
        ...(taskCategory === "habit" && {
          isRecurring: true,
          recurringPattern: "daily",
          habitStreak: 0,
          habitValue: 0,
          habitDirection: "positive"
        })
      };

      const newTask = await storage.createTask(taskData);

      res.json({ task: newTask, analysis });
    } catch (error) {
      console.error("Error creating intelligent task:", error);
      res.status(500).json({ message: "Failed to create intelligent task" });
    }
  });

  // Auto-assign skills to existing tasks that don't have them
  app.post("/api/tasks/auto-assign-skills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      // Get all tasks without skills
      const allTasks = await storage.getTasks(userId);
      const tasksWithoutSkills = allTasks.filter(task => !task.skillId && !task.skills?.length);

      if (tasksWithoutSkills.length === 0) {
        return res.json({ message: "All tasks already have skills assigned", updatedCount: 0 });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      let updatedCount = 0;

      for (const task of tasksWithoutSkills) {
        try {
          const prompt = `根据任务标题分配合适的技能类别：

任务标题："${task.title}"
任务描述："${task.description || ''}"

技能分类：
- 运动能力：体育运动、健身、户外活动等
- 学习能力：阅读、研究、学习新知识等  
- 工作技能：工作任务、项目管理、职业发展等
- 生活技能：日常生活、家务、个人管理等
- 创作能力：写作、设计、创意工作等
- 社交能力：人际交往、沟通、团队合作等

返回JSON格式：
{
  "skillName": "对应的技能名称"
}`;

          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            max_tokens: 100
          });

          const analysis = JSON.parse(response.choices[0].message.content || "{}");
          const skillName = analysis.skillName;

          if (skillName) {
            // Initialize core skills if they don't exist
            await (storage as any).initializeCoreSkills(userId);

            // Find matching core skill or map to closest core skill
            const userSkills = await storage.getSkills(userId);
            let skill = userSkills.find(s => s.name === skillName);

            if (!skill) {
              // Use core skill mapping for AI-assigned skills
              const foundSkill = await (storage as any).findOrCreateSkill(skillName, userId);
              if (foundSkill) {
                skill = foundSkill;
              }
            }

            // Update task with skill assignment
            if (skill) {
              await storage.updateTask(task.id, {
                skillId: skill.id,
                tags: [skillName],
                skills: [skillName]
              });
            }

            updatedCount++;
          }
        } catch (taskError) {
          console.error(`Error processing task ${task.id}:`, taskError);
        }
      }

      res.json({ 
        message: `Successfully assigned skills to ${updatedCount} tasks`,
        updatedCount,
        totalTasksProcessed: tasksWithoutSkills.length
      });
    } catch (error) {
      console.error("Error auto-assigning skills:", error);
      res.status(500).json({ message: "Failed to auto-assign skills" });
    }
  });

  // Daily habit reset endpoint
  app.post("/api/tasks/reset-daily-habits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      // Get all habit tasks for the user
      const habitTasks = await storage.getTasks(userId);
      const habits = habitTasks.filter((task: any) => task.taskCategory === "habit");

      let resetCount = 0;
      for (const habit of habits) {
        // Reset all completed habits to be available again
        if (habit.completed) {
          await storage.updateTask(habit.id, { 
            completed: false
          });
          resetCount++;
        }
      }

      // Check if energy balls need daily reset
      const energyBallsRestored = await storage.checkAndResetEnergyBalls(userId);

      console.log(`Reset ${resetCount} habits and ${energyBallsRestored ? 'restored energy balls' : 'energy already restored today'} for user ${userId}`);

      res.json({ 
        message: `Reset ${resetCount} habits for new day${energyBallsRestored ? ' and restored energy balls' : ''}`, 
        resetCount,
        energyBallsRestored 
      });
    } catch (error) {
      console.error("Error resetting daily habits:", error);
      res.status(500).json({ message: "Failed to reset daily habits" });
    }
  });

  // Task analysis endpoint
  app.post("/api/tasks/analyze-task", isAuthenticated, async (req: any, res) => {
    try {
      const { title, description } = req.body;
      console.log("Analyzing task:", { title, description });

      if (!title) {
        return res.status(400).json({ message: "Task title is required" });
      }

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
        console.warn("OpenAI API key not configured, returning default analysis");
        // Return a default analysis when OpenAI is not available
        return res.json({
          category: "todo",
          difficulty: "medium",
          skills: ["通用技能"],
          estimatedDuration: 30,
          reasoning: "AI分析暂时不可用，使用默认设置"
        });
      }

      console.log("OpenAI API Key length:", process.env.OPENAI_API_KEY.length);
      
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `分析以下任务，智能建议最适合的分类和难度。任务标题："${title}"，描述："${description || '无'}"。

请返回JSON格式，包含：
{
  "category": "habit|daily|todo",
  "difficulty": "easy|medium|hard",
  "skills": ["相关技能1", "相关技能2"],
  "estimatedDuration": 30,
  "reasoning": "分析原因"
}

分类建议：
- habit: 需要重复培养的习惯（如运动、学习、阅读）
- daily: 每日必须完成的任务（如工作、例行检查）
- todo: 一次性待办事项（如购物、修理、项目任务）`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 300
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing task:", error);
      console.error("Error details:", error.response?.data || error.message);
      
      // Check if it's an OpenAI API error
      if (error.status === 401) {
        console.error("OpenAI API authentication failed. Please check your API key.");
        return res.status(500).json({ 
          message: "AI服务认证失败，请检查API配置",
          error: "Authentication failed"
        });
      } else if (error.status === 429) {
        console.error("OpenAI API rate limit exceeded.");
        return res.status(503).json({ 
          message: "AI服务暂时繁忙，请稍后再试",
          error: "Rate limit exceeded"
        });
      } else if (error.code === 'ENOTFOUND') {
        console.error("Cannot reach OpenAI API. Check network connection.");
        return res.status(503).json({ 
          message: "无法连接AI服务，请检查网络",
          error: "Network error"
        });
      }
      
      res.status(500).json({ 
        message: "Failed to analyze task",
        error: error.message || "Unknown error"
      });
    }
  });

  // Goals routes
  app.get("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const goals = await storage.getGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  // AI milestone generation
  app.post("/api/goals/generate-milestones", isAuthenticated, async (req: any, res) => {
    try {
      const { title, description } = req.body;

      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }

      const prompt = `基于以下目标信息，生成3个合理的里程碑事件。每个里程碑应该是实现这个目标的重要阶段性成果。

目标标题：${title}
目标描述：${description}

请返回一个简单的字符串数组，每个字符串是一个里程碑的标题。里程碑应该：
1. 按逻辑顺序排列（从初级到高级）
2. 具体可衡量
3. 切实可行
4. 与目标高度相关

示例格式：
["掌握基础概念", "完成第一个项目", "获得认证"]

请直接返回3个字符串的数组，不要额外解释。`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      });

      const content = response.choices[0].message.content?.trim();
      if (!content) {
        return res.status(500).json({ message: "Failed to generate milestones" });
      }

      try {
        // Extract array from response
        const milestones = JSON.parse(content);
        if (Array.isArray(milestones)) {
          res.json(milestones.slice(0, 3)); // 限制为3个里程碑
        } else {
          // Fallback: split by lines if not JSON array
          const lines = content.split('\n').filter(line => 
            line.trim() && !line.trim().startsWith('[') && !line.trim().startsWith(']')
          ).map(line => line.replace(/^["\-\*\d\.\s]+/, '').replace(/[",\s]*$/, ''));
          res.json(lines.slice(0, 3)); // 限制为3个里程碑
        }
      } catch (parseError) {
        // Fallback: extract milestones from text
        const lines = content.split('\n').filter(line => 
          line.trim() && line.includes('里程碑') || line.match(/^\d+\./) || line.startsWith('-')
        ).map(line => line.replace(/^["\-\*\d\.\s]+/, '').replace(/[",\s]*$/, ''));
        res.json(lines.slice(0, 3)); // 限制为3个里程碑
      }
    } catch (error) {
      console.error("Error generating milestones:", error);
      res.status(500).json({ message: "Failed to generate milestones" });
    }
  });

  // AI-powered intelligent goal creation
  app.post("/api/goals/intelligent-create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { description } = req.body;

      if (!description?.trim()) {
        return res.status(400).json({ message: "目标描述不能为空" });
      }

      // Get user's existing skills for context
      const userSkills = await storage.getSkills(userId);
      const skillsContext = userSkills.map(skill => `${skill.name} (${skill.category})`).join(", ");

      const analysisPrompt = `你是一个专业的目标管理和技能发展顾问。请分析以下目标描述并提供详细的分析结果。

目标描述: "${description}"

用户现有技能: ${skillsContext || "暂无技能"}

请以JSON格式回复，包含以下字段：
{
  "title": "简洁明确的目标标题",
  "description": "详细的目标描述",
  "expReward": 目标完成奖励经验值(50-200),
  "goldReward": 目标完成奖励金币(25-100),
  "pomodoroExpReward": 每个番茄钟经验奖励(5-15),
  "pomodoroGoldReward": 每个番茄钟金币奖励(2-8),
  "relatedSkillNames": ["从用户现有技能中选择最相关的技能名称"],
  "milestones": [
    {"title": "里程碑1标题", "description": "里程碑1描述"},
    {"title": "里程碑2标题", "description": "里程碑2描述"},
    {"title": "里程碑3标题", "description": "里程碑3描述"}
  ]
}

请确保：
1. 奖励值合理匹配目标难度
2. relatedSkillNames只能从用户现有技能中选择，不要创造新的技能名称
3. 恰好生成3个里程碑
4. 里程碑循序渐进且可衡量`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "你是一个专业的目标管理助手，帮助用户创建结构化的目标和里程碑。"
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const analysisResult = JSON.parse(response.choices[0].message.content || "{}");

      // Find skill IDs from related skill names
      const relatedSkillIds: number[] = [];
      if (analysisResult.relatedSkillNames && Array.isArray(analysisResult.relatedSkillNames)) {
        for (const skillName of analysisResult.relatedSkillNames) {
          const matchingSkill = userSkills.find(skill => 
            skill.name.toLowerCase() === skillName.toLowerCase()
          );
          if (matchingSkill) {
            relatedSkillIds.push(matchingSkill.id);
          }
        }
      }

      // Create the goal with AI-generated data
      const goalData = {
        userId,
        title: analysisResult.title,
        description: analysisResult.description,
        expReward: analysisResult.expReward,
        goldReward: analysisResult.goldReward,
        pomodoroExpReward: analysisResult.pomodoroExpReward,
        pomodoroGoldReward: analysisResult.pomodoroGoldReward,
        skillTags: analysisResult.relatedSkillNames, // Keep as readable names for display
        relatedSkillIds, // Use actual skill IDs for system integration
        completed: false,
        progress: 0
      };

      const goal = await storage.createGoal(goalData);

      // Generate warm-up tasks using AI
      const warmupPrompt = `基于目标："${analysisResult.title}"，生成3个简单的热身任务。这些任务应该：
1. 每个耗时5-10分钟
2. 帮助用户快速开始，建立动力
3. 循序渐进，由易到难

请以JSON格式回复：
{
  "microTasks": [
    {"title": "任务1标题", "description": "任务1描述", "duration": 5, "expReward": 5, "difficulty": "easy"},
    {"title": "任务2标题", "description": "任务2描述", "duration": 8, "expReward": 8, "difficulty": "easy"},
    {"title": "任务3标题", "description": "任务3描述", "duration": 10, "expReward": 10, "difficulty": "medium"}
  ]
}`;

      try {
        const warmupResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "你是一个专业的任务分解助手，帮助用户创建简单易行的热身任务。"
            },
            {
              role: "user",
              content: warmupPrompt
            }
          ],
          response_format: { type: "json_object" }
        });

        const warmupResult = JSON.parse(warmupResponse.choices[0].message.content || "{}");
        
        // Create warmup tasks
        if (warmupResult.microTasks && Array.isArray(warmupResult.microTasks)) {
          for (let i = 0; i < warmupResult.microTasks.length; i++) {
            const warmupTask = warmupResult.microTasks[i];
            if (warmupTask.title && warmupTask.title.trim()) {
              await storage.createMicroTask({
                userId,
                goalId: goal.id,
                title: warmupTask.title.trim(),
                description: warmupTask.description || null,
                duration: warmupTask.duration || 5,
                expReward: warmupTask.expReward || 5,
                difficulty: warmupTask.difficulty || 'easy',
                order: i,
                completed: false
              });
            }
          }
        }
      } catch (warmupError) {
        console.error("Error generating warmup tasks:", warmupError);
        // Continue without warmup tasks if AI generation fails
      }

      // Create the 3 milestones
      if (analysisResult.milestones && analysisResult.milestones.length === 3) {
        for (let i = 0; i < 3; i++) {
          const milestone = analysisResult.milestones[i];
          await storage.createMilestone({
            userId,
            goalId: goal.id,
            title: milestone.title,
            description: milestone.description,
            order: i,
            completed: false
          });
        }
      }

      // Return goal with milestones
      const goalWithMilestones = await storage.getGoalWithMilestones(goal.id);
      res.json(goalWithMilestones);

    } catch (error) {
      console.error("Error in intelligent goal creation:", error);
      res.status(500).json({ message: "智能目标创建失败" });
    }
  });

  app.post("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { milestones, ...goalData } = req.body;
      console.log("Creating goal with data:", goalData);
      console.log("Milestones received:", milestones);

      const parsedGoalData = insertGoalSchema.parse({
        ...goalData,
        userId
      });

      const goal = await storage.createGoal(parsedGoalData);
      console.log("Goal created:", goal);

      // Create milestones if provided
      if (milestones && Array.isArray(milestones) && milestones.length > 0) {
        console.log("Processing milestones:", milestones.length);
        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i];
          if (milestone.title && milestone.title.trim()) {
            console.log("Creating milestone:", milestone.title);
            const createdMilestone = await storage.createMilestone({
              userId,
              goalId: goal.id,
              title: milestone.title.trim(),
              description: milestone.description || null,
              order: i,
              completed: false
            });
            console.log("Milestone created:", createdMilestone);
          }
        }
      } else {
        console.log("No milestones provided or milestones array is empty");
      }

      // Return goal with milestones
      const goalWithMilestones = await storage.getGoalWithMilestones(goal.id);
      res.json(goalWithMilestones);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        console.error("Error creating goal:", error);
        res.status(500).json({ message: "Failed to create goal" });
      }
    }
  });

  // Goal pomodoro completion reward
  app.post("/api/goals/:id/pomodoro-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const goalId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }

      // Get the goal to check rewards
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      const expGained = goal.pomodoroExpReward || 10;

      // Update user stats
      await storage.addExperience(userId, expGained);

      // Award experience to related skills if any
      if (goal.skillTags && goal.skillTags.length > 0) {
        for (const skillTag of goal.skillTags) {
          // Find skill by name
          const skills = await storage.getSkills(userId);
          const matchingSkill = skills.find(skill => 
            skill.name.toLowerCase().includes(skillTag.toLowerCase()) ||
            skillTag.toLowerCase().includes(skill.name.toLowerCase())
          );

          if (matchingSkill) {
            await storage.updateSkillExp(matchingSkill.id, Math.floor(expGained / 2));
          }
        }
      }

      // Log the activity
      await storage.addActivityLog({
        userId,
        taskId: null,
        skillId: null,
        expGained,
        action: "goal_pomodoro_complete",
        description: `完成主线任务番茄钟: ${goal.title}`
      });

      res.json({ 
        expGained, 
        message: "番茄钟完成奖励已发放" 
      });

    } catch (error) {
      console.error("Error completing goal pomodoro:", error);
      res.status(500).json({ message: "Failed to complete goal pomodoro" });
    }
  });

  app.delete("/api/goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const goalId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }

      await storage.deleteGoal(goalId, userId);
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Warmup Task routes - support both tasks and goals
  app.get('/api/tasks/:taskId/micro-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }

      const microTasks = await storage.getMicroTasks(taskId);
      res.json(microTasks);
    } catch (error) {
      console.error('Error fetching warmup tasks:', error);
      res.status(500).json({ message: 'Failed to fetch warmup tasks' });
    }
  });

  app.post('/api/tasks/:taskId/micro-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const taskId = parseInt(req.params.taskId);
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }

      const warmupTaskData = {
        ...req.body,
        userId,
        taskId
      };

      const warmupTask = await storage.createMicroTask(warmupTaskData);
      res.json(warmupTask);
    } catch (error) {
      console.error('Error creating warmup task:', error);
      res.status(500).json({ message: 'Failed to create warmup task' });
    }
  });

  app.post('/api/tasks/:taskId/generate-warmups', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (isNaN(taskId)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }

      // Check if this is a goal first (since we're calling from goals interface)
      let microTasks;
      try {
        // Try to get as goal first
        const goal = await storage.getGoal(taskId);
        if (goal) {
          microTasks = await storage.generateWarmupTasksForGoal(taskId, userId);
        } else {
          // If not a goal, try as task
          microTasks = await storage.generateMicroTasksForMainTask(taskId, userId);
        }
      } catch (error) {
        throw new Error('Task or goal not found');
      }
      
      res.json(microTasks);
    } catch (error) {
      console.error('Error generating warmup tasks:', error);
      res.status(500).json({ message: 'Failed to generate warmup tasks' });
    }
  });

  app.patch('/api/micro-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid warmup task ID' });
      }

      const warmupTask = await storage.updateMicroTask(id, req.body);
      if (!warmupTask) {
        return res.status(404).json({ message: 'Warmup task not found' });
      }

      res.json(warmupTask);
    } catch (error) {
      console.error('Error updating warmup task:', error);
      res.status(500).json({ message: 'Failed to update warmup task' });
    }
  });

  app.delete('/api/micro-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid warmup task ID' });
      }

      const deleted = await storage.deleteMicroTask(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Warmup task not found' });
      }

      res.json({ message: 'Warmup task deleted successfully' });
    } catch (error) {
      console.error('Error deleting warmup task:', error);
      res.status(500).json({ message: 'Failed to delete warmup task' });
    }
  });

  // Update user state
  app.post('/api/user-state', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { energyLevel, availableTime, mood, focusLevel } = req.body;
      const userState = {
        energyLevel,
        availableTime,
        mood,
        focusLevel,
        lastUpdated: new Date().toISOString()
      };

      await storage.updateUserState(userId, userState);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user state:', error);
      res.status(500).json({ error: 'Failed to update user state' });
    }
  });

  // Get task recommendations
  app.get('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const userState = await storage.getUserStats(userId);
      const goals = await storage.getGoals(userId);
      const userHistory = await storage.getActivityLogs(userId);

      // 收集所有可用的微任务
      const allMicroTasks = goals.flatMap(goal => (goal as any).microTasks || []);

      const recommendations = RecommendationEngine.recommendTasks(
        userState,
        allMicroTasks,
        userHistory
      );

      res.json(recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // Complete micro task
  app.post('/api/micro-tasks/:taskId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { taskId } = req.params;
      const { goalId, timeSpent } = req.body;

      await storage.completeMicroTask(userId, goalId, taskId, timeSpent);

      // 计算经验值奖励
      const goal = await storage.getGoal(goalId);
      const microTask = goal?.microTasks?.find(t => t.id === taskId);

      if (microTask) {
        await storage.addSkillExp(userId, goal.skillTags[0], microTask.expReward);
        await storage.updateUserStats(userId, microTask.expReward);
      }

      res.json({ 
        success: true, 
        expGained: microTask?.expReward || 0,
        message: '微任务完成！获得经验值！'
      });
    } catch (error) {
      console.error('Error completing micro task:', error);
      res.status(500).json({ error: 'Failed to complete micro task' });
    }
  });

  // Activity logs routes
  app.get("/api/activity-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const logs = await storage.getActivityLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // User Stats API endpoints for Habitica-inspired gamification
  app.get('/api/user-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      let stats = await storage.getUserStats(userId);

      // Create default stats if they don't exist
      if (!stats) {
        stats = await storage.createUserStats({
          userId,
          level: 1,
          experience: 0,
          experienceToNext: 100,
          energyBalls: 18,
          maxEnergyBalls: 18,
          energyBallDuration: 15,
          streak: 0,
          totalTasksCompleted: 0,
        });
      }

      // Automatically check and reset energy balls if it's a new day
      const energyBallsRestored = await storage.checkAndResetEnergyBalls(userId);
      if (energyBallsRestored) {
        // Fetch updated stats after potential reset
        stats = await storage.getUserStats(userId);
        console.log(`Energy balls automatically restored for user ${userId}`);
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.patch('/api/user-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const updates = req.body;

      const updatedStats = await storage.updateUserStats(userId, updates);
      if (!updatedStats) {
        return res.status(404).json({ message: "User stats not found" });
      }

      res.json(updatedStats);
    } catch (error) {
      console.error("Error updating user stats:", error);
      res.status(500).json({ message: "Failed to update user stats" });
    }
  });

  // Recalculate user level based on current experience
  app.post('/api/user-stats/recalculate-level', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const currentStats = await storage.getUserStats(userId);

      if (!currentStats) {
        return res.status(404).json({ message: "User stats not found" });
      }

      // Use the new level calculation logic
      const { level, experience, experienceToNext } = (storage as any).calculateLevelUp(currentStats.experience, currentStats.level);

      const updatedStats = await storage.updateUserStats(userId, {
        level,
        experience,
        experienceToNext
      });

      res.json({
        message: "Level recalculated successfully",
        stats: updatedStats
      });
    } catch (error) {
      console.error("Error recalculating level:", error);
      res.status(500).json({ message: "Failed to recalculate level" });
    }
  });

  // Energy ball management routes
  app.post('/api/user-stats/restore-energy', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const updatedStats = await storage.restoreEnergyBalls(userId);

      if (!updatedStats) {
        return res.status(404).json({ message: "User stats not found" });
      }

      res.json(updatedStats);
    } catch (error) {
      console.error("Error restoring energy balls:", error);
      res.status(500).json({ message: "Failed to restore energy balls" });
    }
  });

  // Force reset energy balls (bypasses time checks)
  app.post('/api/user-stats/force-reset-energy', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      // Force reset regardless of timing
      const updatedStats = await storage.updateUserStats(userId, { 
        energyBalls: 18, // Force to max
        lastEnergyReset: new Date()
      });

      if (!updatedStats) {
        return res.status(404).json({ message: "User stats not found" });
      }

      console.log(`Force reset energy balls for user ${userId}: ${updatedStats.energyBalls}/${updatedStats.maxEnergyBalls}`);
      res.json({ 
        message: "Energy balls force reset successful",
        stats: updatedStats 
      });
    } catch (error) {
      console.error("Error force resetting energy balls:", error);
      res.status(500).json({ message: "Failed to force reset energy balls" });
    }
  });

  // User Profile API routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const profile = await storage.getUserProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const profileData = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const profile = await storage.upsertUserProfile({
        userId,
        ...profileData
      });

      res.json(profile);
    } catch (error) {
      console.error("Error saving user profile:", error);
      res.status(500).json({ message: "Failed to save user profile" });
    }
  });

  // AI Routes
  app.use('/api/ai', (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  });

  app.post('/api/ai/chat', isAuthenticated, async (req, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.user?.id;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      let contextPrompt = `你是一个专业的个人成长AI助手，帮助用户在技能发展、目标达成和任务管理方面获得成功。

用户背景信息:
- 用户ID: ${userId}`;

      if (context?.profile) {
        contextPrompt += `
- 姓名: ${context.profile.name || '未设置'}
- 年龄: ${context.profile.age || '未设置'}
- 职业: ${context.profile.occupation || '未设置'}
- 个人使命: ${context.profile.mission || '未设置'}`;
      }

      if (context?.goals && context.goals.length > 0) {
        contextPrompt += `

当前目标:
${context.goals.map((goal: any) => `- ${goal.title}: ${goal.description || '无描述'} (完成度: ${Math.round((goal.progress || 0) * 100)}%)`).join('\n')}`;
      }

      if (context?.skills && context.skills.length > 0) {
        contextPrompt += `

技能情况:
${context.skills.map((skill: any) => `- ${skill.name}: 等级 ${skill.level}, 经验 ${skill.exp}/${skill.maxExp}`).join('\n')}`;
      }

      if (context?.tasks && context.tasks.length > 0) {
        const activeTasks = context.tasks.filter((task: any) => !task.completed);
        if (activeTasks.length > 0) {
          contextPrompt += `

待完成任务:
${activeTasks.slice(0, 5).map((task: any) => `- ${task.title}: ${task.description || '无描述'}`).join('\n')}`;
        }
      }

      contextPrompt += `

请根据以上信息，以友好、专业、激励的语气回答用户的问题。如果提供建议或洞察，请基于用户的实际情况。回答要简洁明了，重点突出。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: contextPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0].message.content;

      let category = 'general';
      const messageContent = message.toLowerCase();
      if (messageContent.includes('建议') || messageContent.includes('推荐')) {
        category = 'suggestion';
      } else if (messageContent.includes('分析') || messageContent.includes('进度')) {
        category = 'insight';
      } else if (messageContent.includes('如何') || messageContent.includes('怎么')) {
        category = 'advice';
      }

      res.json({
        response: aiResponse,
        category,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("AI Chat error:", error);
      res.status(500).json({ 
        error: "AI服务暂时不可用，请稍后再试",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.post('/api/ai/suggestions', isAuthenticated, async (req, res) => {
    try {
      const { context } = req.body;

      let prompt = `你是一个专业的个人成长AI助手。基于用户当前的情况，提供3-5个具体、可执行的建议。

用户情况分析:`;

      if (context?.goals && context.goals.length > 0) {
        const activeGoals = context.goals.filter((goal: any) => !goal.completed);
        prompt += `
目标状态: 有 ${activeGoals.length} 个活跃目标
${activeGoals.map((goal: any) => `- ${goal.title} (完成度: ${Math.round((goal.progress || 0) * 100)}%)`).join('\n')}`;
      } else {
        prompt += `
目标状态: 暂无活跃目标`;
      }

      if (context?.skills && context.skills.length > 0) {
        const skillLevels = context.skills.map((skill: any) => ({ name: skill.name, level: skill.level }));
        prompt += `

技能等级: ${skillLevels.map((s: any) => `${s.name}(Lv.${s.level})`).join(', ')}`;
      }

      if (context?.tasks && context.tasks.length > 0) {
        const activeTasks = context.tasks.filter((task: any) => !task.completed);
        prompt += `

待完成任务数: ${activeTasks.length}个`;
      }

      prompt += `

请提供具体的建议，包括:
1. 基于当前进度的任务优化建议
2. 技能发展的下一步行动
3. 目标推进的策略建议
4. 时间管理和效率提升建议

每个建议要简洁明了，可直接执行。用"•"开头列出建议。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.8,
      });

      const suggestions = response.choices[0].message.content
        ?.split('\n')
        .filter(line => line.trim().startsWith('•'))
        .map(line => line.trim()) || [];

      res.json({
        suggestions,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("AI Suggestions error:", error);
      res.status(500).json({ 
        error: "AI建议服务暂时不可用",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // User state management
  app.post('/api/user-state', async (req, res) => {
    try {
      const { energyLevel, availableTime, mood, focusLevel } = req.body;

    // 这里可以存储用户状态到数据库，目前先返回成功
      res.json({
        success: true,
        message: 'User state updated successfully',
        state: { energyLevel, availableTime, mood, focusLevel }
      });
    } catch (error) {
      console.error('Error updating user state:', error);
      res.status(500).json({ error: 'Failed to update user state' });
    }
  });

  app.get('/api/user-state', async (req, res) => {
    try {
      // 返回默认用户状态
      res.json({
        energyLevel: 'medium',
        availableTime: 30,
        mood: 'neutral',
        focusLevel: 5
      });
    } catch (error) {
      console.error('Error getting user state:', error);
      res.status(500).json({ error: 'Failed to get user state' });
    }
  });

  // Generic data endpoint for client compatibility
  app.get('/api/data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const type = req.query.type;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      switch (type) {
        case 'tasks':
          const tasks = await storage.getTasks(userId);
          return res.json(tasks);
        
        case 'skills':
          await (storage as any).initializeCoreSkills(userId);
          const skills = await storage.getSkills(userId);
          return res.json(skills);
        
        case 'goals':
          const goals = await storage.getGoals(userId);
          return res.json(goals);
        
        case 'stats':
          let stats = await storage.getUserStats(userId);
          if (!stats) {
            stats = await storage.createUserStats({
              userId,
              level: 1,
              experience: 0,
              experienceToNext: 100,
              energyBalls: 18,
              maxEnergyBalls: 18,
              energyBallDuration: 15,
              streak: 0,
              totalTasksCompleted: 0,
            });
          }
          // Check and reset energy balls if needed
          await storage.checkAndResetEnergyBalls(userId);
          stats = await storage.getUserStats(userId);
          return res.json(stats);
        
        case 'profile':
          const profile = await storage.getUserProfile(userId);
          return res.json(profile);
        
        default:
          return res.status(400).json({ message: "Invalid data type" });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "数据库操作失败", error: error.message });
    }
  });

  // Generic crud endpoint for client compatibility
  app.post('/api/crud', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const resource = req.query.resource;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      switch (resource) {
        case 'tasks':
          const taskData = insertTaskSchema.parse({
            ...req.body,
            userId
          });
          const task = await storage.createTask(taskData);
          return res.json(task);
        
        case 'skills':
          const skillData = insertSkillSchema.parse({
            ...req.body,
            userId
          });
          const skill = await storage.createSkill(skillData);
          return res.json(skill);
        
        case 'goals':
          const { milestones, ...goalData } = req.body;
          const parsedGoalData = insertGoalSchema.parse({
            ...goalData,
            userId
          });
          const goal = await storage.createGoal(parsedGoalData);
          
          // Create milestones if provided
          if (milestones && Array.isArray(milestones) && milestones.length > 0) {
            for (let i = 0; i < milestones.length; i++) {
              const milestone = milestones[i];
              if (milestone.title && milestone.title.trim()) {
                await storage.createMilestone({
                  userId,
                  goalId: goal.id,
                  title: milestone.title.trim(),
                  description: milestone.description || null,
                  order: i,
                  completed: false
                });
              }
            }
          }
          
          const goalWithMilestones = await storage.getGoalWithMilestones(goal.id);
          return res.json(goalWithMilestones);
        
        default:
          return res.status(400).json({ message: "Invalid resource type" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating resource:", error);
        res.status(500).json({ message: "数据库操作失败", error: error.message });
      }
    }
  });

  app.patch('/api/crud', isAuthenticated, async (req: any, res) => {
    try {
      const resource = req.query.resource;
      const id = parseInt(req.query.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      switch (resource) {
        case 'tasks':
          const updatedTask = await storage.updateTask(id, req.body);
          if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
          }
          return res.json(updatedTask);
        
        case 'skills':
          const updatedSkill = await storage.updateSkill(id, req.body);
          if (!updatedSkill) {
            return res.status(404).json({ message: "Skill not found" });
          }
          return res.json(updatedSkill);
        
        default:
          return res.status(400).json({ message: "Invalid resource type" });
      }
    } catch (error) {
      console.error("Error updating resource:", error);
      res.status(500).json({ message: "数据库操作失败", error: error.message });
    }
  });

  app.delete('/api/crud', isAuthenticated, async (req: any, res) => {
    try {
      const resource = req.query.resource;
      const id = parseInt(req.query.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      switch (resource) {
        case 'tasks':
          const success = await storage.deleteTask(id);
          if (!success) {
            return res.status(404).json({ message: "Task not found" });
          }
          return res.json({ message: "Task deleted successfully" });
        
        default:
          return res.status(400).json({ message: "Invalid resource type" });
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      res.status(500).json({ message: "数据库操作失败", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}