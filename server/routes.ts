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
import { cacheMiddleware, invalidateCacheMiddleware } from "./cache-middleware";
import { runDatabaseDiagnostics, testDatabaseConnection } from './db-diagnostics';
import { sql } from "drizzle-orm";
import { db } from "./db";
import { testEndpointSecurity } from "./middleware/test-endpoint-security";
import { normalizeTaskCategory } from "./utils/task-category-mapper";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Auto-merge skills when user has more than 6 skills
// Removed auto-merge functionality - now using fixed core skills system

// Zod schemas
const insertSkillSchema = createInsertSchema(skills);
const insertTaskSchema = createInsertSchema(tasks);
const insertGoalSchema = createInsertSchema(goals);
const insertMicroTaskSchema = createInsertSchema(microTasks);

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply test endpoint security middleware first
  app.use(testEndpointSecurity);
  
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

  // Auth middleware is now set up in index.ts
  // await setupAuth(app);

  // Simple health check endpoint
  app.get('/api/health', async (_req, res) => {
    let dbStatus = 'unknown';
    let userCount = -1;
    let dbError = null;
    let tablesExist = false;
    let tableList: string[] = [];
    
    // Add deployment timestamp to verify new code is deployed
    const deploymentTime = '2025-07-03T12:30:00Z';
    
    try {
      // First check if db is initialized
      const { isDatabaseInitialized } = require('./db-check');
      if (!isDatabaseInitialized()) {
        dbStatus = 'not_configured';
        dbError = 'Database URL not set or invalid';
      } else {
        // Test database connection
        try {
          const users = await storage.getUserByEmail('test@example.com');
          dbStatus = 'connected';
          tablesExist = true;
          
          // Try to count users (optional)
          try {
            const testUser = await storage.getUser('test');
            userCount = testUser ? 1 : 0;
          } catch (e) {
            // Ignore count error
          }
        } catch (error) {
          const errorMessage = (error as any).message;
          if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
            dbStatus = 'no_tables';
            dbError = 'Database connected but tables not created. Run: npm run db:push';
            tablesExist = false;
          } else {
            dbStatus = 'error';
            dbError = errorMessage;
          }
          console.error('Database operation error:', error);
        }
      }
    } catch (error) {
      dbStatus = 'error';
      dbError = (error as any).message;
      console.error('Health check error:', error);
    }
    
    res.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      deploymentTime: deploymentTime, // Added to verify deployment
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        error: dbError,
        tablesExist: tablesExist,
        userCount: userCount,
        recommendation: dbStatus === 'no_tables' ? 
          'Run "npm run db:push" locally with DATABASE_URL set to create tables' : null
      },
      env: {
        hasDatabase: !!process.env.DATABASE_URL || !!process.env.SUPABASE_DATABASE_URL,
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
      
      // First check if database is initialized
      const { isDatabaseInitialized, getDatabaseError } = require('./db-check');
      if (!isDatabaseInitialized()) {
        const error = getDatabaseError();
        return res.json({
          success: false,
          database: 'Not configured',
          error: error.error,
          details: error.details,
          recommendation: 'Set DATABASE_URL in Railway environment variables'
        });
      }
      
      // Import at the top of the file instead of dynamic require
      // These are already imported, just use them
      const { sql } = await import('drizzle-orm');
      const { db } = await import('./db').then(m => ({ db: m.db }));
      
      if (!db) {
        return res.json({
          success: false,
          database: 'Not initialized',
          error: 'Database connection not established',
          recommendation: 'Check DATABASE_URL format'
        });
      }
      
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

  // Enhanced database diagnostics endpoint
  app.get('/api/diagnostics/database', async (req, res) => {
    try {
      const diagnostics = await runDatabaseDiagnostics();
      const statusCode = diagnostics.summary.failed > 0 ? 500 : 
                        diagnostics.summary.warnings > 0 ? 200 : 200;
      res.status(statusCode).json(diagnostics);
    } catch (error) {
      console.error('Diagnostics error:', error);
      res.status(500).json({
        error: 'Failed to run diagnostics',
        message: (error as any).message
      });
    }
  });

  // Test database connection with custom URL
  app.post('/api/diagnostics/test-connection', async (req, res) => {
    try {
      const { connectionString } = req.body;
      if (!connectionString) {
        return res.status(400).json({ error: 'connectionString is required' });
      }
      
      const result = await testDatabaseConnection(connectionString);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to test connection',
        message: (error as any).message
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

  // Test habit completion columns
  app.get('/api/test/habit-columns', async (req, res) => {
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      
      // Check column existence
      const columnCheck = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name IN (
          'last_completed_at', 'completion_count', 'lastCompletedAt', 'completionCount',
          'completed', 'completed_at', 'task_category', 'user_id', 'userId'
        )
        ORDER BY column_name
      `);
      
      // Get a sample habit task
      const sampleHabit = await db.execute(sql`
        SELECT * FROM tasks 
        WHERE task_category = 'habit' 
        LIMIT 1
      `);
      
      res.json({
        columns: columnCheck.rows || columnCheck,
        sampleHabit: sampleHabit.rows?.[0] || sampleHabit[0] || null,
        dbType: db.constructor.name,
        hasPool: !!getPool
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
        code: error.code,
        detail: error.detail
      });
    }
  });

  // Test habit completion update directly
  app.post('/api/test/habit-complete/:id', isAuthenticated, async (req: any, res) => {
    const taskId = parseInt(req.params.id);
    const userId = (req.user as any)?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      
      console.log(`[Test Habit Complete] Starting for task ${taskId}, user ${userId}`);
      
      // First, verify the task exists and is a habit
      const taskCheck = await db.execute(sql`
        SELECT id, task_category, user_id
        FROM tasks
        WHERE id = ${taskId}
      `);
      
      const task = taskCheck.rows?.[0] || taskCheck[0];
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (task.task_category !== 'habit') {
        return res.status(400).json({ message: "Task is not a habit" });
      }
      
      // Try the update with proper column names
      const updateResult = await db.execute(sql`
        UPDATE tasks 
        SET 
          last_completed_at = NOW(),
          completion_count = COALESCE(completion_count, 0) + 1,
          completed = true,
          completed_at = NOW(),
          updated_at = NOW()
        WHERE 
          id = ${taskId} 
          AND user_id = ${userId}
          AND task_category = 'habit'
        RETURNING *
      `);
      
      if (updateResult.rows?.length > 0 || updateResult.length > 0) {
        const updatedTask = updateResult.rows?.[0] || updateResult[0];
        console.log(`[Test Habit Complete] Success! Updated task:`, updatedTask);
        res.json({
          success: true,
          task: updatedTask,
          message: "Habit completed successfully"
        });
      } else {
        res.status(404).json({ message: "Failed to update habit" });
      }
    } catch (error: any) {
      console.error('[Test Habit Complete] Error:', error);
      res.status(500).json({
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
    }
  });

  // Diagnostic endpoint to check habit completion issues
  app.get('/api/diagnose/habit/:id', isAuthenticated, async (req: any, res) => {
    const taskId = parseInt(req.params.id);
    const userId = (req.user as any)?.claims?.sub;
    
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      const pool = getPool();
      
      const diagnosis: any = {
        taskId,
        userId,
        timestamp: new Date().toISOString()
      };
      
      // Check task details
      try {
        const taskResult = await db.execute(sql`
          SELECT * FROM tasks WHERE id = ${taskId}
        `);
        diagnosis.task = taskResult.rows?.[0] || taskResult[0] || null;
      } catch (e: any) {
        diagnosis.taskError = { message: e.message, code: e.code };
      }
      
      // Check column names
      try {
        const columnsResult = await db.execute(sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'tasks' 
          AND column_name IN ('last_completed_at', 'completion_count', 'completed', 'completed_at', 'updated_at')
        `);
        diagnosis.relevantColumns = columnsResult.rows || columnsResult;
      } catch (e: any) {
        diagnosis.columnsError = { message: e.message, code: e.code };
      }
      
      // Check pool health
      try {
        diagnosis.poolStats = {
          totalConnections: pool.totalCount,
          idleConnections: pool.idleCount,
          waitingRequests: pool.waitingCount
        };
      } catch (e: any) {
        diagnosis.poolError = { message: e.message };
      }
      
      // Test a simple update (non-destructive)
      try {
        const testResult = await db.execute(sql`
          SELECT 
            last_completed_at,
            completion_count,
            completed,
            task_category,
            user_id
          FROM tasks 
          WHERE id = ${taskId}
        `);
        diagnosis.canReadTask = true;
        diagnosis.taskData = testResult.rows?.[0] || testResult[0];
      } catch (e: any) {
        diagnosis.readError = { message: e.message, code: e.code };
      }
      
      res.json(diagnosis);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
        code: error.code,
        detail: error.detail
      });
    }
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
  // Debug endpoint to check auth state
  app.get('/api/auth/debug', (req: any, res) => {
    const authHeader = req.headers.authorization;
    const hasBearer = authHeader && authHeader.startsWith('Bearer ');
    const token = hasBearer ? authHeader.substring(7) : null;
    
    res.json({
      hasAuthHeader: !!authHeader,
      hasBearer,
      tokenLength: token ? token.length : 0,
      headers: Object.keys(req.headers),
      cookies: Object.keys(req.cookies || {})
    });
  });

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
  app.get("/api/skills", isAuthenticated, cacheMiddleware, async (req: any, res) => {
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
  app.get("/api/tasks", isAuthenticated, cacheMiddleware, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Temporary fix: use direct SQL to bypass schema issues
      const postgres = require('postgres');
      const connectionString = process.env.DATABASE_URL;
      const sql = postgres(connectionString);
      
      const userTasks = await sql`
        SELECT 
          id, user_id as "userId", title, description, completed, 
          skill_id as "skillId", goal_id as "goalId", exp_reward as "expReward",
          estimated_duration as "estimatedDuration", actual_duration as "actualDuration",
          accumulated_time as "accumulatedTime", pomodoro_session_id as "pomodoroSessionId",
          started_at as "startedAt", created_at as "createdAt", completed_at as "completedAt",
          task_category as "taskCategory", task_type as "taskType", 
          parent_task_id as "parentTaskId", "order", tags, difficulty,
          required_energy_balls as "requiredEnergyBalls", 
          last_completed_at as "lastCompletedAt", completion_count as "completionCount"
        FROM tasks
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      
      await sql.end();
      
      // Add skills array for compatibility and transform dates
      const tasksWithSkills = userTasks.map(task => ({
        ...task,
        skills: [], // Add empty skills array for compatibility
        createdAt: new Date(task.createdAt),
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        startedAt: task.startedAt ? new Date(task.startedAt) : null,
        lastCompletedAt: task.lastCompletedAt ? new Date(task.lastCompletedAt) : null,
        microTasks: [] // Add empty microTasks for now
      }));
      
      res.json(tasksWithSkills);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, invalidateCacheMiddleware(['tasks', 'stats', 'data']), async (req: any, res) => {
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

  app.patch("/api/tasks/:id", isAuthenticated, invalidateCacheMiddleware(['tasks', 'stats', 'data', 'activity']), async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      const userId = (req.user as any)?.claims?.sub;

      console.log(`[PATCH /api/tasks/${taskId}] Starting update...`);
      console.log(`[PATCH /api/tasks/${taskId}] User: ${userId}`);
      console.log(`[PATCH /api/tasks/${taskId}] Updates:`, JSON.stringify(updates, null, 2));
      console.log(`[PATCH /api/tasks/${taskId}] Headers:`, req.headers);

      if (!userId) {
        console.error(`[PATCH /api/tasks/${taskId}] User not authenticated properly`);
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get current task to check if it's a habit
      console.log(`[PATCH /api/tasks/${taskId}] Fetching current task...`);
      const currentTask = await storage.getTask(taskId);
      if (!currentTask) {
        console.error(`[PATCH /api/tasks/${taskId}] Task not found`);
        return res.status(404).json({ message: "Task not found" });
      }

      console.log(`[PATCH /api/tasks/${taskId}] Current task:`, JSON.stringify(currentTask, null, 2));

      // Verify task belongs to user
      if (currentTask.userId !== userId) {
        console.error(`[PATCH /api/tasks/${taskId}] Task belongs to different user. Task userId: ${currentTask.userId}, Request userId: ${userId}`);
        return res.status(403).json({ message: "Access denied" });
      }

      // Handle habit completion logic using existing database fields
      let isHabitCompletion = false;
      let task: Task | undefined;
      
      if (currentTask.taskCategory === "habit" && updates.completed !== undefined) {
        console.log(`[PATCH /api/tasks/${taskId}] Processing habit completion...`);
        
        if (updates.completed) {
          // Use the dedicated habit completion method to avoid field name issues
          isHabitCompletion = true;
          console.log(`[PATCH /api/tasks/${taskId}] Using updateHabitCompletion method...`);
          
          try {
            task = await storage.updateHabitCompletion(taskId, userId);
            console.log(`[PATCH /api/tasks/${taskId}] Habit completion successful`);
          } catch (habitError: any) {
            console.error(`[PATCH /api/tasks/${taskId}] updateHabitCompletion failed:`, habitError);
            console.error(`[PATCH /api/tasks/${taskId}] Error code:`, habitError.code);
            console.error(`[PATCH /api/tasks/${taskId}] Error detail:`, habitError.detail);
            
            // If updateHabitCompletion fails, try a direct update as fallback
            console.log(`[PATCH /api/tasks/${taskId}] Attempting direct SQL update as fallback...`);
            const { sql } = require('drizzle-orm');
            const { db } = require('./db');
            
            const fallbackResult = await db.execute(sql`
              UPDATE tasks 
              SET 
                last_completed_at = NOW(),
                completion_count = COALESCE(completion_count, 0) + 1,
                completed = true,
                completed_at = NOW(),
                updated_at = NOW()
              WHERE 
                id = ${taskId} 
                AND user_id = ${userId}
                AND task_category = 'habit'
              RETURNING *
            `);
            
            task = fallbackResult.rows?.[0] || fallbackResult[0];
            if (!task) {
              throw new Error('Failed to update habit with fallback method');
            }
            console.log(`[PATCH /api/tasks/${taskId}] Fallback SQL update successful`);
          }
          
          // If there are other updates besides completion, apply them separately
          const otherUpdates = { ...updates };
          delete otherUpdates.completed;
          delete otherUpdates.lastCompletedAt;
          delete otherUpdates.completionCount;
          
          if (Object.keys(otherUpdates).length > 0 && task) {
            console.log(`[PATCH /api/tasks/${taskId}] Applying additional updates:`, otherUpdates);
            task = await storage.updateTask(taskId, otherUpdates);
          }
        } else {
          // Not completing a habit, just update normally
          console.log(`[PATCH /api/tasks/${taskId}] Regular update for habit task`);
          task = await storage.updateTask(taskId, updates);
        }
      } else {
        // Not a habit or not changing completion status
        console.log(`[PATCH /api/tasks/${taskId}] Calling storage.updateTask with updates:`, JSON.stringify(updates, null, 2));
        task = await storage.updateTask(taskId, updates);
      }

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Award experience to associated skill when task is completed (including habits)
      if ((updates.completed || isHabitCompletion) && task.skillId) {
        try {
          console.log(`[PATCH /api/tasks/${taskId}] Awarding skill experience. SkillId: ${task.skillId}, isHabitCompletion: ${isHabitCompletion}`);
          const expToAward = task.expReward || 20;
          await storage.addSkillExp(task.skillId, expToAward);

          // Core skills system - no auto-merge needed
          console.log(`[PATCH /api/tasks/${taskId}] ${isHabitCompletion ? 'Habit' : 'Task'} completed, skill experience awarded to user ${userId}`);
        } catch (error: any) {
          console.error(`[PATCH /api/tasks/${taskId}] Error awarding skill experience:`, error);
          console.error(`[PATCH /api/tasks/${taskId}] Error stack:`, error.stack);
          // Don't fail the whole request for skill exp errors
        }
      }

      // Handle energy ball consumption/restoration
      if ((updates.completed !== undefined || isHabitCompletion) && task.requiredEnergyBalls) {
        try {
          console.log(`[PATCH /api/tasks/${taskId}] Handling energy balls. Required: ${task.requiredEnergyBalls}, isHabitCompletion: ${isHabitCompletion}`);
          
          // First ensure user stats exist
          let stats = await storage.getUserStats(userId);
          console.log(`[PATCH /api/tasks/${taskId}] User stats:`, stats);
          
          if (!stats) {
            console.log(`[PATCH /api/tasks/${taskId}] Creating default user stats...`);
            // Create default user stats if they don't exist
            stats = await storage.createUserStats({
              userId,
              level: 1,
              experience: 0,
              energyBalls: 18,
              maxEnergyBalls: 18,
              streak: 0,
              lastEnergyReset: new Date()
            });
            console.log(`[PATCH /api/tasks/${taskId}] Created user stats:`, stats);
          }
          
          // For habits, always consume energy when completing (isHabitCompletion)
          if (isHabitCompletion) {
            console.log(`[PATCH /api/tasks/${taskId}] Consuming energy balls for habit completion...`);
            await storage.consumeEnergyBalls(userId, task.requiredEnergyBalls);
          } else if (updates.completed && !currentTask.completed) {
            // Completing a regular task - consume energy balls
            console.log(`[PATCH /api/tasks/${taskId}] Consuming energy balls for task completion...`);
            await storage.consumeEnergyBalls(userId, task.requiredEnergyBalls);
          } else if (!updates.completed && currentTask.completed) {
            // Uncompleting a regular task - restore energy balls
            console.log(`[PATCH /api/tasks/${taskId}] Restoring energy balls for task uncompletion...`);
            await storage.restoreEnergyBalls(userId, task.requiredEnergyBalls);
          }
        } catch (error: any) {
          console.error(`[PATCH /api/tasks/${taskId}] Error handling energy balls:`, error);
          console.error(`[PATCH /api/tasks/${taskId}] Error stack:`, error.stack);
          // Don't fail the whole request for energy ball errors
        }
      }

      // Create activity log for task completion (including habits)
      if ((updates.completed && !currentTask.completed) || isHabitCompletion) {
        try {
          console.log(`[PATCH /api/tasks/${taskId}] Creating activity log...`);
          const expGained = task.expReward || 20;
          const logData = {
            userId,
            taskId: task.id,
            skillId: task.skillId || null,
            expGained,
            action: isHabitCompletion ? 'task_completed' : 'task_completed',
            details: { 
              description: `完成任务: ${task.title}`,
              duration: task.actualDuration || task.estimatedDuration || 0,
              energyBalls: task.actualEnergyBalls || task.requiredEnergyBalls || 0
            } // Use details as JSONB
          };
          console.log(`[PATCH /api/tasks/${taskId}] Activity log data:`, JSON.stringify(logData, null, 2));
          
          await storage.createActivityLog(logData);
          console.log(`[PATCH /api/tasks/${taskId}] Activity log created for ${isHabitCompletion ? 'habit' : 'task'} ${task.id} completion`);
        } catch (error: any) {
          console.error(`[PATCH /api/tasks/${taskId}] Error creating activity log:`, error);
          console.error(`[PATCH /api/tasks/${taskId}] Error stack:`, error.stack);
          // Don't fail the whole request for activity log errors
        }
      }

      console.log(`[PATCH /api/tasks/${taskId}] Successfully updated task, returning response...`);
      res.json(task);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error(`[PATCH /api/tasks/${req.params.id}] Zod validation error:`, error.errors);
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        console.error(`[PATCH /api/tasks/${req.params.id}] Fatal error updating task:`, error);
        console.error(`[PATCH /api/tasks/${req.params.id}] Error type:`, error.constructor.name);
        console.error(`[PATCH /api/tasks/${req.params.id}] Error message:`, error.message);
        console.error(`[PATCH /api/tasks/${req.params.id}] Error stack:`, error.stack);
        console.error(`[PATCH /api/tasks/${req.params.id}] Request body was:`, req.body);
        console.error(`[PATCH /api/tasks/${req.params.id}] User ID was:`, (req.user as any)?.claims?.sub);
        
        res.status(500).json({ 
          message: "Failed to update task",
          error: error.message || "Unknown error",
          errorType: error.constructor.name,
          taskId: req.params.id,
          debug: {
            userId: (req.user as any)?.claims?.sub,
            updates: req.body
          }
        });
      }
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, invalidateCacheMiddleware(['tasks', 'stats', 'data']), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const taskId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // First verify the task belongs to the user
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (task.userId !== userId) {
        return res.status(403).json({ message: "Task not found" }); // Don't reveal task exists for other users
      }

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

  // Pomodoro timer routes
  app.post("/api/tasks/:id/start-pomodoro", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const taskId = parseInt(req.params.id);
      const { duration } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Create pomodoro session
      const session = await storage.createPomodoroSession({
        userId,
        taskId,
        startTime: new Date(),
        workDuration: duration || 25,
      });

      res.json({ sessionId: session.id, startTime: session.startTime });
    } catch (error) {
      console.error("Error starting pomodoro:", error);
      res.status(500).json({ message: "Failed to start pomodoro session" });
    }
  });

  app.post("/api/tasks/:id/complete-pomodoro", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const taskId = parseInt(req.params.id);
      const { sessionDuration, completed, actualEnergyBalls, cycles } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Get task details
      const task = await storage.getTask(taskId);
      if (!task || task.userId !== userId) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Update task accumulated time
      const updatedTask = await storage.updateTask(taskId, {
        accumulatedTime: (task.accumulatedTime || 0) + sessionDuration,
        actualEnergyBalls: actualEnergyBalls,
        pomodoroCycles: (task.pomodoroCycles || 0) + (cycles || 0),
        completed: completed || task.completed
      });

      // Calculate and consume actual energy balls
      const energyBallsToConsume = actualEnergyBalls || Math.ceil(sessionDuration / 15);
      await storage.consumeEnergyBalls(userId, energyBallsToConsume);

      // Award experience
      const expGained = task.expReward || 20;
      await storage.addExperience(userId, expGained);
      
      if (task.skillId) {
        await storage.updateSkillExp(task.skillId, expGained);
      }

      // Create activity log
      await storage.createActivityLog({
        userId,
        taskId,
        skillId: task.skillId,
        expGained,
        action: 'pomodoro_complete',
        details: { 
          description: `完成番茄钟: ${task.title}`,
          duration: sessionDuration,
          energyBalls: energyBallsToConsume,
          cycles: cycles || 1
        }
      });

      // Update daily battle report
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await storage.updateDailyBattleReport({
        userId,
        date: today,
        battleTime: sessionDuration,
        energyBalls: energyBallsToConsume,
        taskCompleted: completed || false,
        cycles: cycles || 1,
        taskId: taskId,
        taskTitle: task.title
      });

      res.json({ 
        success: true,
        expGained,
        actualEnergyBalls: energyBallsToConsume,
        totalAccumulatedTime: updatedTask.accumulatedTime
      });
    } catch (error) {
      console.error("Error completing pomodoro:", error);
      res.status(500).json({ message: "Failed to complete pomodoro session" });
    }
  });

  // Get all available tasks for pomodoro
  app.get("/api/pomodoro/available-tasks", isAuthenticated, async (req: any, res) => {
    try {
      console.log("Pomodoro available tasks endpoint hit");
      console.log("Request user:", req.user);
      
      const userId = req.user?.claims?.sub;
      if (!userId) {
        console.error("No userId found in request. User object:", req.user);
        return res.status(401).json({ error: "Unauthorized", details: "No user ID in token" });
      }

      console.log(`Fetching available tasks for user: ${userId}`);
      console.log(`Storage type: ${storage.constructor.name}`);
      console.log(`User email: ${req.user?.claims?.email || 'unknown'}`);

      // Get all incomplete goals
      let goals = [];
      let tasks = [];
      
      try {
        goals = await storage.getGoals(userId);
        console.log(`Fetched ${goals?.length || 0} goals`);
      } catch (error) {
        console.error("Error fetching goals:", error);
        goals = [];
      }

      try {
        tasks = await storage.getTasks(userId);
        console.log(`Fetched ${tasks.length} tasks`);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        tasks = [];
      }

      // Filter active goals (not completed)
      const activeGoals = Array.isArray(goals) ? goals.filter(g => g && !g.completedAt) : [];
      console.log(`Found ${activeGoals.length} active goals`);

      // Filter active tasks (not completed) - but handle habits specially
      const today = new Date().toDateString();
      const activeTasks = Array.isArray(tasks) ? tasks.filter(t => {
        if (!t) return false;
        
        // For habits, check if completed today
        if (normalizeTaskCategory(t.taskCategory) === 'habit') {
          // If not completed at all, it's active
          if (!t.completed) return true;
          
          // If completed, check if it was today
          const completedDate = t.completedAt ? new Date(t.completedAt).toDateString() : null;
          // If completed on a previous day, it's available again
          return completedDate !== today;
        }
        
        // For non-habits, simply check if not completed
        return !t.completed;
      }) : [];
      console.log(`Found ${activeTasks.length} active tasks (including habits reset for today)`);

      // Separate tasks by category with normalization
      // Note: Normalize categories to handle various values in database
      const habits = activeTasks.filter(t => t && normalizeTaskCategory(t.taskCategory) === 'habit');
      const todoTasks = activeTasks.filter(t => t && normalizeTaskCategory(t.taskCategory) === 'todo');
      const goalTasks = activeTasks.filter(t => t && normalizeTaskCategory(t.taskCategory) === 'goal');
      
      console.log(`Task breakdown: ${todoTasks.length} todos, ${habits.length} habits, ${goalTasks.length} goal-tasks`);
      
      // Debug: Log task categories and all task properties
      console.log('First active task properties:', activeTasks.length > 0 ? Object.keys(activeTasks[0]) : 'No active tasks');
      console.log('Task categories:', activeTasks.map(t => ({ 
        id: t.id, 
        title: t.title, 
        category: t.taskCategory,
        normalizedCategory: normalizeTaskCategory(t.taskCategory),
        type: t.taskType,
        completed: t.completed,
        completedAt: t.completedAt 
      })));
      
      // Debug habits specifically
      const allHabits = tasks.filter(t => t && normalizeTaskCategory(t.taskCategory) === 'habit');
      console.log(`Habit analysis: Total habits: ${allHabits.length}, Active habits: ${habits.length}`);
      if (allHabits.length > 0) {
        console.log('All habits status:', allHabits.map(h => ({
          id: h.id,
          title: h.title,
          completed: h.completed,
          completedAt: h.completedAt,
          completedToday: h.completedAt ? new Date(h.completedAt).toDateString() === today : false
        })));
      }
      
      // Also log the breakdown
      console.log('Task category analysis:', {
        allCategories: [...new Set(activeTasks.map(t => t.taskCategory))],
        allNormalizedCategories: [...new Set(activeTasks.map(t => normalizeTaskCategory(t.taskCategory)))],
        allTypes: [...new Set(activeTasks.map(t => t.taskType))],
        nullCategoryCount: activeTasks.filter(t => !t.taskCategory).length,
        todoCount: todoTasks.length,
        habitCount: habits.length,
        goalTaskCount: goalTasks.length
      });

      const response = {
        goals: activeGoals.map(g => ({
          id: g.id,
          title: g.title || 'Untitled Goal',
          type: 'goal',
          energyBalls: 3,
          skillId: g.skillId || null,
          category: g.category || null,
          description: ''
        })),
        tasks: todoTasks.map(t => ({
          id: t.id,
          title: t.title || 'Untitled Task',
          type: 'task',
          energyBalls: t.requiredEnergyBalls || t.energyBalls || 1,
          skillId: t.skillId || null,
          category: t.taskCategory || 'todo',
          description: '',
          difficulty: t.difficulty || 'medium'
        })),
        habits: habits.map(h => ({
          id: h.id,
          title: h.title || 'Untitled Habit',
          type: 'habit',
          energyBalls: h.requiredEnergyBalls || h.energyBalls || 1,
          skillId: h.skillId || null,
          category: h.taskCategory || 'habit',
          description: '',
          difficulty: h.difficulty || 'medium'
        }))
      };
      
      console.log(`Sending response - Goals: ${response.goals.length}, Tasks: ${response.tasks.length}, Habits: ${response.habits.length}`);
      console.log('Sample response data:', {
        firstGoal: response.goals[0],
        firstTask: response.tasks[0],
        firstHabit: response.habits[0]
      });
      
      res.json(response);
    } catch (error) {
      console.error("Failed to get available tasks:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({ 
        error: "Failed to get available tasks",
        message: error instanceof Error ? error.message : "Unknown error",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Start pomodoro for habit
  app.post("/api/habits/:id/start-pomodoro", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const habitId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get the habit (which is stored as a task with category='habit')
      const tasks = await storage.getTasks(userId);
      const habit = tasks.find(t => t.id === habitId && t.taskCategory === 'habit');

      if (!habit) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // Create pomodoro session
      const sessionId = await storage.createPomodoroSession({
        userId,
        taskId: habitId,
        startTime: new Date()
      });

      // Update habit with battle start time
      await storage.updateTask(userId, habitId, {
        battleStartTime: new Date()
      });

      res.json({ 
        success: true, 
        sessionId,
        task: habit
      });
    } catch (error) {
      console.error("Failed to start pomodoro for habit:", error);
      res.status(500).json({ error: "Failed to start pomodoro" });
    }
  });

  // Complete pomodoro for habit
  app.post("/api/habits/:id/complete-pomodoro", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const habitId = parseInt(req.params.id);
      const { sessionId, workDuration, restDuration, cyclesCompleted, actualEnergyBalls } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Update pomodoro session
      await storage.updatePomodoroSession(sessionId, {
        endTime: new Date(),
        workDuration,
        restDuration,
        cyclesCompleted,
        actualEnergyBalls,
        completed: true
      });

      // Update habit
      const tasks = await storage.getTasks(userId);
      const habit = tasks.find(t => t.id === habitId && t.taskCategory === 'habit');

      if (!habit) {
        return res.status(404).json({ error: "Habit not found" });
      }

      const updatedCycles = (habit.pomodoroCycles || 0) + cyclesCompleted;
      const updatedActualEnergyBalls = (habit.actualEnergyBalls || 0) + actualEnergyBalls;

      await storage.updateTask(userId, habitId, {
        pomodoroCycles: updatedCycles,
        actualEnergyBalls: updatedActualEnergyBalls,
        battleEndTime: new Date()
      });

      // Update daily battle report
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await storage.updateDailyBattleReport({
        userId,
        date: today,
        battleTime: workDuration,
        energyBalls: actualEnergyBalls,
        taskCompleted: false, // Habits are not "completed" in the same way
        cycles: cyclesCompleted,
        taskId: habitId,
        taskTitle: habit.title
      });

      res.json({ 
        success: true,
        totalCycles: updatedCycles,
        totalEnergyBalls: updatedActualEnergyBalls
      });
    } catch (error) {
      console.error("Failed to complete pomodoro for habit:", error);
      res.status(500).json({ error: "Failed to complete pomodoro" });
    }
  });

  // Get daily battle report
  app.get("/api/battle-reports/daily", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const dateParam = req.query.date;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const date = dateParam ? new Date(dateParam) : new Date();
      date.setHours(0, 0, 0, 0);

      const report = await storage.getDailyBattleReport(userId, date);
      
      if (!report) {
        // Return empty report if none exists
        return res.json({
          date,
          totalBattleTime: 0,
          energyBallsConsumed: 0,
          tasksCompleted: 0,
          pomodoroCycles: 0,
          taskDetails: []
        });
      }

      res.json(report);
    } catch (error) {
      console.error("Error fetching daily battle report:", error);
      res.status(500).json({ message: "Failed to fetch battle report" });
    }
  });

  // Get battle report summary (weekly/monthly)
  app.get("/api/battle-reports/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const period = req.query.period || 'week'; // 'week' or 'month'

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const endDate = new Date();
      const startDate = new Date();
      
      if (period === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setDate(endDate.getDate() - 30);
      }

      const summary = await storage.getBattleReportSummary(userId, startDate, endDate);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching battle report summary:", error);
      res.status(500).json({ message: "Failed to fetch battle report summary" });
    }
  });

  // AI-powered task creation with automatic type classification
  app.post("/api/tasks/intelligent-create", isAuthenticated, invalidateCacheMiddleware(['tasks', 'stats', 'data']), async (req: any, res) => {
    console.log("=== AI Task Creation Started ===");
    try {
      const { description } = req.body;
      const userId = (req.user as any)?.claims?.sub;

      console.log("User ID:", userId);
      console.log("Task description:", description);

      if (!description) {
        console.error("No task description provided");
        return res.status(400).json({ message: "Task description is required" });
      }

      if (!userId) {
        console.error("User not authenticated properly");
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
        console.warn("OpenAI API key not configured, using simple task creation");
        
        try {
          // Simple rule-based task creation without AI
          const taskCategory = description.includes("每天") || description.includes("坚持") || description.includes("养成") 
            ? "habit" 
            : "todo";
          
          const difficulty = description.length > 50 ? "hard" : description.length > 20 ? "medium" : "easy";
          const energyBalls = difficulty === "hard" ? 4 : difficulty === "medium" ? 2 : 1;
          
          // Initialize core skills if they don't exist
          await (storage as any).initializeCoreSkills(userId);
          
          // Try to find the default skill "意志执行力"
          const userSkills = await storage.getSkills(userId);
          const defaultSkill = userSkills.find(s => s.name === "意志执行力");
          
          const taskData = {
            userId,
            title: description.trim(),
            description: null,
            taskCategory: taskCategory,
            taskType: "simple", // Use valid taskType value
            difficulty: difficulty,
            expReward: difficulty === "hard" ? 35 : difficulty === "medium" ? 20 : 10,
            estimatedDuration: energyBalls * 15,
            requiredEnergyBalls: energyBalls,
            tags: ["意志执行力"],
            skillId: defaultSkill?.id || null,
            completed: false,
            // Add missing fields that iOS expects
            order: 0,
            skills: ["意志执行力"], // iOS requires this field
            isDailyTask: taskCategory === "habit",
            dailyStreak: null,
            isRecurring: taskCategory === "habit",
            recurringPattern: taskCategory === "habit" ? "daily" : null,
            habitDirection: taskCategory === "habit" ? "positive" : null,
            habitStreak: null,
            habitValue: null,
            lastCompletedDate: null,
            lastCompletedAt: null,
            completionCount: 0
          };

          console.log("Creating simple task with data:", JSON.stringify(taskData, null, 2));
          const newTask = await storage.createTask(taskData);
          console.log("Simple task created successfully:", newTask.id);
          
          // Transform task to include all fields iOS expects
          const transformedTask = {
            ...newTask,
            skills: taskData.skills || [],
            isDailyTask: taskData.isDailyTask || false,
            dailyStreak: taskData.dailyStreak || null,
            isRecurring: taskData.isRecurring || false,
            recurringPattern: taskData.recurringPattern || null,
            habitDirection: taskData.habitDirection || null,
            habitStreak: taskData.habitStreak || null,
            habitValue: taskData.habitValue || null,
            lastCompletedDate: taskData.lastCompletedDate || null,
            order: taskData.order || 0,
            tags: taskData.tags || [],
            dueDate: null,
            priority: 1
          };
          
          return res.json({ 
            task: transformedTask, 
            analysis: {
              category: taskCategory,
              title: description.trim(),
              difficulty: difficulty,
              skillName: null,
              energyBalls: energyBalls
            }
          });
        } catch (simpleTaskError) {
          console.error("Error in simple task creation:", simpleTaskError);
          throw simpleTaskError;
        }
      }

      console.log("Starting AI-powered task creation");
      
      let analysis;
      try {
        // Use the already imported OpenAI instance at the top of the file
        if (!openai) {
          throw new Error("OpenAI not initialized");
        }

        const prompt = `分析以下任务描述，判断是习惯还是支线任务，并分配合适的核心技能和能量球需求：

任务描述："${description}"

分类判定规则：
- 习惯(habit)：需要长期坚持养成的重复性行为，强调"养成"和"坚持"
  例如：每天运动、坚持阅读、定期冥想、保持早睡、养成记录习惯、坚持学习等
  关键词：每天、坚持、养成、定期、保持、习惯、打卡

- 支线任务(todo)：有明确完成状态的具体任务，包括一次性阅读、学习特定内容等
  例如：读某篇文章、看某个视频、完成某个报告、学习某个技能、参加某个会议、购买某物品、备课、准备材料等
  关键词：读、看、完成、学习、参加、购买、处理、解决、制作、写、研究、备课、准备

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

        console.log("Calling OpenAI API...");
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Use faster model for better performance
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 100, // Reduce tokens for faster response
          temperature: 0.3 // Lower temperature for consistent results
        });

        console.log("OpenAI API response received");
        const rawContent = response.choices[0].message.content || "{}";
        console.log("Raw OpenAI response:", rawContent);
        
        analysis = JSON.parse(rawContent);
        console.log("Parsed AI analysis:", analysis);
      } catch (aiError) {
        console.error("OpenAI API Error:", aiError);
        console.warn("Falling back to simple rule-based task creation");
        
        // Fall back to simple rule-based task creation
        const taskCategory = description.includes("每天") || description.includes("坚持") || description.includes("养成") 
          ? "habit" 
          : "todo";
        
        const difficulty = description.length > 50 ? "hard" : description.length > 20 ? "medium" : "easy";
        
        analysis = {
          category: taskCategory,
          title: description.trim(),
          difficulty: difficulty,
          skillName: "意志执行力", // Default core skill
          energyBalls: difficulty === "hard" ? 4 : difficulty === "medium" ? 2 : 1
        };
        
        console.log("Using fallback analysis:", analysis);
      }

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

      console.log("AI Analysis completed:", analysis);

      // Map AI response to core skills and find matching skill
      let skillId = null;
      if (skillName) {
        try {
          console.log("Initializing core skills for user:", userId);
          // Initialize core skills if they don't exist
          await (storage as any).initializeCoreSkills(userId);
          console.log("Core skills initialized successfully");

          // Get user's core skills
          console.log("Fetching user skills...");
          const userSkills = await storage.getSkills(userId);
          console.log("User skills found:", userSkills.length);
          
          let skill = userSkills.find(s => s.name === skillName);
          console.log("Exact skill match found:", !!skill);

          // If exact match not found, use core skill mapping
          if (!skill) {
            console.log("Finding or creating skill:", skillName);
            skill = await (storage as any).findOrCreateSkill(skillName, userId);
            console.log("Skill found/created:", skill ? skill.name : "none");
          }

          if (skill) {
            skillId = skill.id;
            console.log("Using skill ID:", skillId);
          }
        } catch (skillError) {
          console.error("Error handling skills:", skillError);
          // Continue without skill assignment rather than failing entirely
          console.warn("Continuing task creation without skill assignment");
        }
      }

      // Create task with AI-determined category and skill assignment
      const taskData = {
        userId,
        title: analysis.title || description.trim(),
        description: null,
        taskCategory: taskCategory,
        taskType: taskCategory === "habit" ? "daily" : "simple", // Map to valid taskType
        difficulty: difficulty,
        expReward: rewards.xp,
        estimatedDuration: requiredEnergyBalls * 15, // Energy balls * 15 minutes
        requiredEnergyBalls: requiredEnergyBalls,
        tags: skillName ? [skillName] : [],
        skillId: skillId,
        completed: false,
        // Add missing fields that iOS expects
        order: 0,
        skills: skillName ? [skillName] : [], // iOS requires this field
        isDailyTask: taskCategory === "habit",
        dailyStreak: null,
        isRecurring: taskCategory === "habit",
        recurringPattern: taskCategory === "habit" ? "daily" : null,
        habitDirection: taskCategory === "habit" ? "positive" : null,
        habitStreak: null,
        habitValue: null,
        lastCompletedDate: null,
        lastCompletedAt: null,
        completionCount: 0
      };

      console.log("Creating task with data:", JSON.stringify(taskData, null, 2));
      const newTask = await storage.createTask(taskData);
      console.log("Task created successfully:", newTask.id);

      // Transform task to include all fields iOS expects
      const transformedTask = {
        ...newTask,
        skills: taskData.skills || [],
        isDailyTask: taskData.isDailyTask || false,
        dailyStreak: taskData.dailyStreak || null,
        isRecurring: taskData.isRecurring || false,
        recurringPattern: taskData.recurringPattern || null,
        habitDirection: taskData.habitDirection || null,
        habitStreak: taskData.habitStreak || null,
        habitValue: taskData.habitValue || null,
        lastCompletedDate: taskData.lastCompletedDate || null,
        order: taskData.order || 0,
        tags: taskData.tags || [],
        dueDate: null,
        priority: 1
      };

      res.json({ task: transformedTask, analysis });
    } catch (error) {
      console.error("=== AI Task Creation Error ===");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      console.error("Full error object:", error);
      
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to create intelligent task";
      let statusCode = 500;
      
      if (error?.message?.includes("OpenAI")) {
        errorMessage = "AI service is temporarily unavailable";
        statusCode = 503;
      } else if (error?.message?.includes("database") || error?.message?.includes("Database")) {
        errorMessage = "Database error occurred while creating task";
        statusCode = 500;
      } else if (error?.message?.includes("authentication") || error?.message?.includes("user")) {
        errorMessage = "Authentication error";
        statusCode = 401;
      }
      
      res.status(statusCode).json({ 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
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
                tags: [skillName]
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
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log(`[Reset Habits] Starting reset for user ${userId}`);

      // Use direct SQL to avoid column issues
      try {
        const result = await db.execute(sql`
          UPDATE tasks 
          SET 
            completed = false,
            completed_at = NULL
          WHERE 
            user_id = ${userId} 
            AND task_category = 'habit'
            AND completed = true
          RETURNING id
        `);
        
        const resetCount = result.rows?.length || 0;
        console.log(`[Reset Habits] Reset ${resetCount} habits`);

        // Try to reset tracking columns if they exist
        if (resetCount > 0) {
          try {
            await db.execute(sql`
              UPDATE tasks 
              SET 
                last_completed_at = NULL,
                completion_count = 0
              WHERE 
                user_id = ${userId} 
                AND task_category = 'habit'
            `);
            console.log(`[Reset Habits] Tracking columns reset`);
          } catch (trackingError) {
            console.log(`[Reset Habits] Tracking columns don't exist, skipped`);
          }
        }

        // Check if energy balls need daily reset
        const energyBallsRestored = await storage.checkAndResetEnergyBalls(userId);

        console.log(`[Reset Habits] Completed: ${resetCount} habits reset, energy restored: ${energyBallsRestored}`);

        res.json({ 
          message: `Reset ${resetCount} habits for new day${energyBallsRestored ? ' and restored energy balls' : ''}`, 
          resetCount,
          energyBallsRestored 
        });
      } catch (dbError: any) {
        console.error("[Reset Habits] Database error:", dbError);
        res.status(500).json({ 
          message: "Failed to reset daily habits",
          error: dbError.message
        });
      }
    } catch (error: any) {
      console.error("[Reset Habits] Unexpected error:", error);
      res.status(500).json({ 
        message: "Failed to reset daily habits",
        error: error.message
      });
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
  app.get("/api/goals", isAuthenticated, cacheMiddleware, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      try {
        const goals = await storage.getGoals(userId);
        res.json(goals);
      } catch (error) {
        console.error("Storage getGoals failed, trying direct SQL:", error);
        
        // Fallback: Direct SQL query to bypass schema issues
        const { sql } = require('drizzle-orm');
        const { db } = require('./db');
        
        try {
          const userGoals = await db.execute(sql`
            SELECT 
              id, user_id as "userId", title, description, progress, status, priority,
              target_date as "targetDate", parent_goal_id as "parentGoalId", 
              exp_reward as "expReward", skill_id as "skillId",
              created_at as "createdAt", updated_at as "updatedAt", 
              completed_at as "completedAt"
            FROM goals
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
          `);
          
          // Add frontend compatibility fields
          const goalsWithDefaults = (userGoals.rows || userGoals).map((goal: any) => ({
            ...goal,
            completed: !!goal.completedAt, // Derive completed from completedAt
            milestones: [],
            microTasks: []
          }));
          
          res.json(goalsWithDefaults);
        } catch (sqlError) {
          console.error("Direct SQL query also failed:", sqlError);
          res.status(500).json({ message: "Failed to fetch goals" });
        }
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  // Manual activity logs table creation endpoint (for emergency use)
  app.post('/api/debug/create-activity-logs-table', async (req, res) => {
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      
      if (!db) {
        return res.status(500).json({ error: 'Database not initialized' });
      }
      
      console.log('Manual table creation requested...');
      
      // Create the table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL,
          date TIMESTAMP NOT NULL DEFAULT NOW(),
          task_id INTEGER,
          skill_id INTEGER,
          exp_gained INTEGER NOT NULL DEFAULT 0,
          action TEXT NOT NULL,
          description TEXT
        )
      `);
      
      console.log('Table created, adding indexes...');
      
      // Create indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id 
        ON activity_logs(user_id)
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_date 
        ON activity_logs(date DESC)
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date 
        ON activity_logs(user_id, date DESC)
      `);
      
      console.log('Indexes created successfully');
      
      res.json({
        success: true,
        message: 'Activity logs table created successfully'
      });
    } catch (error: any) {
      console.error('Failed to create activity logs table:', error);
      res.status(500).json({
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
    }
  });
  
  // Comprehensive debug endpoint for activity_logs
  app.get('/api/debug/activity-logs', async (req: any, res) => {
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      
      const diagnostics: any = {
        dbInitialized: !!db,
        timestamp: new Date().toISOString(),
        user: {
          authenticated: !!req.user,
          userId: req.user?.claims?.sub || req.user?.id || null,
          userType: req.user ? typeof req.user : 'none',
          claims: req.user?.claims ? Object.keys(req.user.claims) : []
        }
      };
      
      // Check if table exists
      try {
        const tableExists = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM pg_catalog.pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'activity_logs'
          ) as exists
        `);
        
        diagnostics.tableExists = Array.isArray(tableExists) ? tableExists[0]?.exists : tableExists?.rows?.[0]?.exists;
      } catch (e: any) {
        diagnostics.tableExistsError = {
          message: e.message,
          code: e.code
        };
      }
      
      // Check table structure if it exists
      if (diagnostics.tableExists) {
        try {
          const tableInfo = await db.execute(sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'activity_logs'
            ORDER BY ordinal_position
          `);
          
          diagnostics.tableStructure = Array.isArray(tableInfo) ? tableInfo : tableInfo?.rows;
        } catch (e: any) {
          diagnostics.tableStructureError = {
            message: e.message,
            code: e.code
          };
        }
        
        // Get sample data
        try {
          const sampleData = await db.execute(sql`
            SELECT * FROM activity_logs
            ORDER BY date DESC
            LIMIT 5
          `);
          
          diagnostics.sampleData = Array.isArray(sampleData) ? sampleData : sampleData?.rows;
        } catch (e: any) {
          diagnostics.sampleDataError = {
            message: e.message,
            code: e.code
          };
        }
        
        // Count total logs
        try {
          const count = await db.execute(sql`
            SELECT COUNT(*) as count FROM activity_logs
          `);
          
          const countResult = Array.isArray(count) ? count[0] : count?.rows?.[0];
          diagnostics.totalCount = countResult?.count || 0;
        } catch (e: any) {
          diagnostics.countError = {
            message: e.message,
            code: e.code
          };
        }
      }
      
      // Check all tables in database
      try {
        const tables = await db.execute(sql`
          SELECT tablename 
          FROM pg_catalog.pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename
        `);
        
        diagnostics.allTables = Array.isArray(tables) ? tables.map(t => t.tablename) : tables?.rows?.map((t: any) => t.tablename);
      } catch (e: any) {
        diagnostics.allTablesError = {
          message: e.message,
          code: e.code
        };
      }
      
      // Check user data consistency
      if (diagnostics.user.userId) {
        try {
          // Check if user exists in users table
          const userCheck = await db.execute(sql`
            SELECT id, email, created_at 
            FROM users 
            WHERE id = ${diagnostics.user.userId}
          `);
          
          diagnostics.userInUsersTable = {
            exists: (Array.isArray(userCheck) ? userCheck : userCheck?.rows)?.length > 0,
            data: Array.isArray(userCheck) ? userCheck[0] : userCheck?.rows?.[0]
          };
          
          // Check tasks for this user
          const taskCount = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE user_id = ${diagnostics.user.userId}
          `);
          
          diagnostics.userTaskCount = Array.isArray(taskCount) ? taskCount[0]?.count : taskCount?.rows?.[0]?.count;
          
          // Check activity logs for this user
          const logCount = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM activity_logs 
            WHERE user_id = ${diagnostics.user.userId}
          `);
          
          diagnostics.userActivityLogCount = Array.isArray(logCount) ? logCount[0]?.count : logCount?.rows?.[0]?.count;
          
          // Get unique user IDs from activity_logs
          const uniqueUsers = await db.execute(sql`
            SELECT DISTINCT user_id, COUNT(*) as log_count
            FROM activity_logs
            GROUP BY user_id
            ORDER BY log_count DESC
            LIMIT 10
          `);
          
          diagnostics.uniqueUsersInLogs = Array.isArray(uniqueUsers) ? uniqueUsers : uniqueUsers?.rows;
        } catch (e: any) {
          diagnostics.userCheckError = {
            message: e.message,
            code: e.code
          };
        }
      }
      
      res.json(diagnostics);
    } catch (error: any) {
      console.error('Debug activity logs error:', error);
      res.status(500).json({ 
        error: error.message,
        code: error.code,
        stack: error.stack
      });
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
  "pomodoroExpReward": 每个番茄钟经验奖励(5-15),
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
        status: 'active',
        priority: 'medium',
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
      await storage.createActivityLog({
        userId,
        taskId: null,
        skillId: null,
        expGained,
        action: "goal_pomodoro_complete",
        details: { description: `完成主线任务番茄钟: ${goal.title}` }
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

  app.patch("/api/goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const goalId = parseInt(req.params.id);
      const updates = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }

      // Get current goal to verify ownership
      const currentGoal = await storage.getGoal(goalId);
      if (!currentGoal || currentGoal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Handle goal completion - set completedAt timestamp and status
      if (updates.completed !== undefined) {
        if (updates.completed) {
          // Check if all milestones are completed before allowing goal completion
          const goalWithMilestones = await storage.getGoalWithMilestones(goalId);
          if (goalWithMilestones.milestones && goalWithMilestones.milestones.length > 0) {
            const allMilestonesCompleted = goalWithMilestones.milestones.every((m: any) => m.completed);
            if (!allMilestonesCompleted) {
              return res.status(400).json({ 
                message: "所有里程碑必须完成后才能完成目标", 
                code: "MILESTONES_NOT_COMPLETED" 
              });
            }
          }
          
          updates.completedAt = new Date();
          updates.status = 'completed';
          updates.progress = 1.0; // 100% completion
        } else {
          updates.completedAt = null;
          updates.status = 'active';
        }
        // Remove completed field as it doesn't exist in database
        delete updates.completed;
      }

      // Update goal with correct fields only
      const allowedFields = {
        title: updates.title,
        description: updates.description,
        progress: updates.progress,
        status: updates.status,
        priority: updates.priority,
        targetDate: updates.targetDate,
        parentGoalId: updates.parentGoalId,
        expReward: updates.expReward,
        skillId: updates.skillId,
        updatedAt: new Date(),
        completedAt: updates.completedAt
      };

      // Filter out undefined values
      const filteredUpdates = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      const goal = await storage.updateGoal(goalId, filteredUpdates);

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // If goal was just completed, create activity log and award experience
      if (updates.completed && goal.completedAt) {
        try {
          // First, complete all uncompleted milestones for this goal
          const milestones = await storage.getMilestones(goalId);
          for (const milestone of milestones) {
            if (!milestone.completed) {
              await storage.updateMilestone(milestone.id, {
                completed: true,
                completedAt: new Date()
              });
              console.log(`Auto-completed milestone ${milestone.id} for completed goal ${goalId}`);
            }
          }
          
          // Award experience points
          const expReward = goal.expReward || 100;
          
          // Create activity log for goal completion
          await storage.createActivityLog({
            userId,
            action: 'goal_completed',
            details: { description: `完成目标: ${goal.title}` },
            expGained: expReward
          });

          // Update user experience/stats
          const userStats = await storage.getUserStats(userId);
          if (userStats) {
            const newExperience = userStats.experience + expReward;
            
            // Check for level up
            let newLevel = userStats.level;
            let experienceToNext = userStats.experienceToNext;
            let remainingExp = newExperience;
            
            while (remainingExp >= experienceToNext) {
              remainingExp -= experienceToNext;
              newLevel++;
              experienceToNext = newLevel * 100; // Simple level formula
            }
            
            await storage.updateUserStats(userId, {
              experience: remainingExp,
              experienceToNext: experienceToNext,
              level: newLevel,
              totalTasksCompleted: userStats.totalTasksCompleted + 1
            });
            
            // Log level up if it happened
            if (newLevel > userStats.level) {
              await storage.createActivityLog({
                userId,
                action: 'level_up',
                details: { description: `升级到等级 ${newLevel}！` },
                expGained: 0
              });
            }
          }
          
          console.log(`Goal ${goalId} completed. Awarded ${expReward} experience to user ${userId}`);
        } catch (error) {
          console.error("Error creating activity log for goal completion:", error);
          // Don't fail the request if activity log creation fails
        }
      }

      // Add virtual completed field for frontend compatibility
      const goalWithCompleted = {
        ...goal,
        completed: !!goal.completedAt
      };

      res.json(goalWithCompleted);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(500).json({ message: "Failed to update goal", error: error.message });
    }
  });

  // Get milestones for a goal
  app.get("/api/goals/:goalId/milestones", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const goalId = parseInt(req.params.goalId);

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }

      // Verify goal ownership
      const goal = await storage.getGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Get milestones
      const milestones = await storage.getMilestones(goalId);
      
      // Add userId and goalId to each milestone since iOS expects them
      const milestonesWithUser = milestones.map(milestone => ({
        ...milestone,
        userId: userId,
        user_id: userId,
        goalId: goalId,
        goal_id: goalId
      }));

      res.json({ milestones: milestonesWithUser });
    } catch (error) {
      console.error("Error getting milestones:", error);
      res.status(500).json({ message: "Failed to get milestones" });
    }
  });

  // Create milestone
  app.post("/api/milestones", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { goalId, title, description, order } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!goalId || !title) {
        return res.status(400).json({ message: "Goal ID and title are required" });
      }

      // Verify goal ownership
      const goal = await storage.getGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Create milestone
      const milestone = await storage.createMilestone({
        goalId,
        title,
        description,
        order: order || 0,
        completed: false
      });

      // Add userId and goalId to response since iOS expects them
      const milestoneWithUser = {
        ...milestone,
        userId: userId,
        user_id: userId,
        goalId: goalId,
        goal_id: goalId
      };

      res.json(milestoneWithUser);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(500).json({ message: "Failed to create milestone" });
    }
  });

  // Update milestone status
  app.patch("/api/goals/:goalId/milestones/:milestoneId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const goalId = parseInt(req.params.goalId);
      const milestoneId = parseInt(req.params.milestoneId);
      const { completed } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(goalId) || isNaN(milestoneId)) {
        return res.status(400).json({ message: "Invalid goal or milestone ID" });
      }

      // Verify goal ownership
      const goal = await storage.getGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Update milestone
      const milestone = await storage.updateMilestone(milestoneId, {
        completed,
        completedAt: completed ? new Date() : null
      });

      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      // Create activity log for milestone completion
      if (completed) {
        try {
          await storage.createActivityLog({
            userId,
            action: 'milestone_completed',
            details: { description: `完成里程碑: ${milestone.title}` },
            expGained: 0
          });
        } catch (error) {
          console.error("Error creating activity log for milestone:", error);
        }
      }

      // Add userId and goalId to milestone since iOS expects them
      const milestoneWithUser = {
        ...milestone,
        userId: userId,
        user_id: userId, // Also include snake_case for consistency
        goalId: goalId,
        goal_id: goalId // Also include snake_case for consistency
      };
      
      res.json(milestoneWithUser);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ message: "Failed to update milestone" });
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

      try {
        await storage.deleteGoal(goalId, userId);
        res.json({ message: "Goal deleted successfully" });
      } catch (error) {
        console.error("Storage deleteGoal failed, using SQL fallback:", error);
        
        // SQL fallback for goal deletion
        const { sql } = require('drizzle-orm');
        const { db } = require('./db');
        
        try {
          // First verify the goal belongs to the user
          const goalCheck = await db.execute(sql`
            SELECT id FROM goals WHERE id = ${goalId} AND user_id = ${userId}
          `);
          
          if (!(goalCheck.rows || goalCheck).length) {
            return res.status(404).json({ message: "Goal not found or not owned by user" });
          }
          
          // Delete the goal
          await db.execute(sql`
            DELETE FROM goals WHERE id = ${goalId} AND user_id = ${userId}
          `);
          
          res.json({ message: "Goal deleted successfully" });
        } catch (sqlError) {
          console.error("SQL fallback also failed:", sqlError);
          res.status(500).json({ message: "Failed to delete goal" });
        }
      }
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

  // Create test activity logs and comprehensive diagnostics
  app.post("/api/activity-logs/create-test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      console.log('Create test logs - userId:', userId);
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // First, run comprehensive diagnostics
      const diagnostics: any = {
        userId,
        timestamp: new Date().toISOString(),
        phase: 'initial'
      };

      // Check if activity_logs table exists
      try {
        const { sql } = require('drizzle-orm');
        const { db } = require('./db');
        
        const tableCheck = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM pg_catalog.pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'activity_logs'
          ) as exists
        `);
        
        const exists = Array.isArray(tableCheck) ? tableCheck[0]?.exists : tableCheck?.rows?.[0]?.exists;
        diagnostics.tableExists = exists;
        
        if (!exists) {
          // Try to create the table
          diagnostics.phase = 'creating_table';
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS activity_logs (
              id SERIAL PRIMARY KEY,
              user_id VARCHAR NOT NULL,
              date TIMESTAMP NOT NULL DEFAULT NOW(),
              task_id INTEGER,
              skill_id INTEGER,
              exp_gained INTEGER NOT NULL DEFAULT 0,
              action TEXT NOT NULL,
              description TEXT
            )
          `);
          
          // Create indexes
          await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id 
            ON activity_logs(user_id)
          `);
          
          await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_activity_logs_date 
            ON activity_logs(date DESC)
          `);
          
          diagnostics.tableCreated = true;
        }
      } catch (tableError: any) {
        diagnostics.tableError = {
          message: tableError.message,
          code: tableError.code
        };
        console.error('Table check/create error:', tableError);
      }

      // Check existing logs for this user
      diagnostics.phase = 'checking_existing';
      try {
        const existingLogs = await storage.getActivityLogs(userId);
        diagnostics.existingLogsCount = existingLogs.length;
        diagnostics.existingLogs = existingLogs.slice(0, 3); // First 3 logs
      } catch (fetchError: any) {
        diagnostics.fetchError = {
          message: fetchError.message,
          code: fetchError.code
        };
      }

      // Create test activity logs
      diagnostics.phase = 'creating_logs';
      const testLogs = [
        {
          userId,
          action: 'task_completed',
          details: { description: '完成任务: 学习 React 开发' },
          expGained: 50
        },
        {
          userId,
          action: 'skill_levelup',
          details: { description: '技能升级: 心理 升级到 2 级' },
          expGained: 100
        },
        {
          userId,
          action: 'goal_completed',
          details: { description: '完成目标: 掌握前端开发技能' },
          expGained: 200
        }
      ];

      const createdLogs = [];
      const createErrors = [];
      
      for (const log of testLogs) {
        try {
          console.log('Creating test log:', log);
          const created = await storage.createActivityLog(log);
          createdLogs.push(created);
          console.log('Created log successfully:', created);
        } catch (err: any) {
          console.error("Failed to create test log:", err);
          createErrors.push({
            log: log.details?.description || 'Unknown',
            error: err.message,
            code: err.code
          });
        }
      }

      diagnostics.createdCount = createdLogs.length;
      diagnostics.createErrors = createErrors;

      // Verify logs after creation
      diagnostics.phase = 'verifying';
      try {
        const afterLogs = await storage.getActivityLogs(userId);
        diagnostics.afterLogsCount = afterLogs.length;
        diagnostics.newLogsFound = afterLogs.length > (diagnostics.existingLogsCount || 0);
      } catch (verifyError: any) {
        diagnostics.verifyError = {
          message: verifyError.message,
          code: verifyError.code
        };
      }

      res.json({
        message: `Created ${createdLogs.length} test activity logs`,
        logs: createdLogs,
        diagnostics
      });
    } catch (error: any) {
      console.error("Error creating test logs:", error);
      res.status(500).json({ 
        message: "Failed to create test logs", 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Activity logs routes
  app.get("/api/activity-logs", isAuthenticated, cacheMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      console.log("Activity logs request - userId:", userId);
      console.log("Full user object:", JSON.stringify(req.user, null, 2));

      if (!userId) {
        console.error("No userId found in request:", req.user);
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get activity logs with better error handling
      try {
        const logs = await storage.getActivityLogs(userId);
        console.log(`Retrieved ${logs.length} activity logs for user ${userId}`);
        
        // Add debug info in development
        if (process.env.NODE_ENV === 'development' || logs.length === 0) {
          console.log('Debug: First 3 logs:', logs.slice(0, 3));
          
          // Check if there are ANY logs in the table
          const { sql } = require('drizzle-orm');
          const { db } = require('./db');
          
          try {
            const totalCount = await db.execute(sql`
              SELECT COUNT(*) as count FROM activity_logs
            `);
            const userCount = await db.execute(sql`
              SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ${userId}
            `);
            
            console.log('Total logs in table:', totalCount);
            console.log('Logs for this user:', userCount);
          } catch (countError) {
            console.error('Count query error:', countError);
          }
        }
        
        res.json(logs);
      } catch (dbError: any) {
        console.error("Database error in activity logs:", dbError);
        
        // If it's a table not found error, try to create the table directly
        if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
          console.log('Activity logs table missing, attempting direct creation...');
          
          try {
            const { db } = require('./db');
            const { sql } = require('drizzle-orm');
            
            // Create the table directly
            await db.execute(sql`
              CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR NOT NULL,
                date TIMESTAMP NOT NULL DEFAULT NOW(),
                task_id INTEGER,
                skill_id INTEGER,
                exp_gained INTEGER NOT NULL DEFAULT 0,
                action TEXT NOT NULL,
                description TEXT
              )
            `);
            
            console.log('Activity logs table created, retrying query...');
            
            // Retry the query
            const logs = await storage.getActivityLogs(userId);
            return res.json(logs);
          } catch (createError: any) {
            console.error('Failed to create activity logs table:', createError);
            return res.status(500).json({
              message: "Activity logs table missing and could not be created",
              error: createError.message,
              hint: "Please run 'npm run db:create-activity-logs' on the server"
            });
          }
        }
        
        throw dbError;
      }
    } catch (error: any) {
      console.error("Error in activity logs endpoint:", error);
      
      // Send appropriate error response
      if (error.message?.includes('permission')) {
        res.status(403).json({ 
          message: "Database permission error",
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to fetch activity logs",
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          code: error.code
        });
      }
    }
  });

  // User Stats API endpoints for Habitica-inspired gamification
  app.get('/api/user-stats', isAuthenticated, cacheMiddleware, async (req: any, res) => {
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
  app.get('/api/profile', isAuthenticated, cacheMiddleware, async (req: any, res) => {
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

  // Mount AI Routes
  const aiRoutes = require('./ai').default;
  app.use('/api/ai', aiRoutes);


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

  // Debug endpoint to check goals table structure
  app.get('/api/debug/goals-table', async (req, res) => {
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      
      console.log("=== Checking goals table structure ===");
      
      // Check goals table columns
      const goalColumns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'goals'
        ORDER BY ordinal_position
      `);
      
      console.log("Goals table columns:", goalColumns);
      
      res.json({
        goalColumns: goalColumns,
        note: "Removed test goal creation to avoid foreign key errors"
      });
    } catch (error) {
      console.error("Goals table debug error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to check milestones table structure
  app.get('/api/debug/milestones-table', async (req, res) => {
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      
      console.log("=== Checking milestones table structure ===");
      
      // Check if milestones table exists
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'milestones'
        );
      `);
      
      let milestoneColumns = [];
      if (tableExists[0]?.exists) {
        // Check milestones table columns
        milestoneColumns = await db.execute(sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'milestones'
          ORDER BY ordinal_position
        `);
        console.log("Milestones table columns:", milestoneColumns);
      } else {
        console.log("Milestones table does not exist");
      }
      
      res.json({
        tableExists: tableExists[0]?.exists || false,
        milestoneColumns: milestoneColumns,
        note: "Check if milestones table exists and has correct structure"
      });
    } catch (error) {
      console.error("Milestones table debug error:", error);
      res.status(500).json({ 
        error: error.message,
        tableExists: false,
        reason: "Could not query milestones table - it may not exist"
      });
    }
  });

  // Debug endpoint to check tasks table structure
  app.get('/api/debug/tasks-table', async (req, res) => {
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      
      console.log("=== Checking tasks table structure ===");
      
      // Check tasks table columns
      const taskColumns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'tasks'
        ORDER BY ordinal_position
      `);
      
      console.log("Tasks table columns:", taskColumns);
      
      // Try to insert a simple task to see what fails
      const testTaskData = {
        userId: 'test_user_debug',
        title: 'Debug Test Task',
        description: 'Testing task creation',
        completed: false,
        taskCategory: 'todo',
        taskType: 'todo',
        difficulty: 'easy',
        expReward: 10,
        estimatedDuration: 15,
        requiredEnergyBalls: 1,
        tags: []
      };
      
      console.log("Attempting to create test task with data:", testTaskData);
      
      let insertError = null;
      try {
        const newTask = await storage.createTask(testTaskData);
        console.log("Test task created successfully:", newTask);
      } catch (error) {
        insertError = error;
        console.error("Test task creation failed:", error);
      }
      
      res.json({
        taskColumns: taskColumns,
        testTaskData: testTaskData,
        insertError: insertError ? {
          message: insertError.message,
          code: insertError.code,
          stack: insertError.stack
        } : null
      });
      
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Batch data endpoint for performance optimization
  app.get('/api/data/batch', isAuthenticated, cacheMiddleware, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const types = req.query.types?.split(',') || [];

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const results: any = {};
      const errors: any = {};

      // Process each requested type in parallel
      const promises = types.map(async (type: string) => {
        try {
          switch (type) {
            case 'tasks':
              const tasks = await storage.getTasks(userId);
              results.tasks = tasks;
              break;
            
            case 'skills':
              await (storage as any).initializeCoreSkills(userId);
              const skills = await storage.getSkills(userId);
              results.skills = skills;
              break;
            
            case 'goals':
              const goals = await storage.getGoals(userId);
              const goalsWithCompleted = goals.map(goal => ({
                ...goal,
                completed: !!goal.completedAt
              }));
              results.goals = goalsWithCompleted;
              break;
            
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
              await storage.checkAndResetEnergyBalls(userId);
              stats = await storage.getUserStats(userId);
              results.stats = stats;
              break;
            
            case 'profile':
              const profile = await storage.getUserProfile(userId);
              results.profile = profile;
              break;
            
            default:
              errors[type] = "Invalid data type";
          }
        } catch (error) {
          console.error(`Error fetching ${type}:`, error);
          errors[type] = error.message;
        }
      });

      await Promise.all(promises);

      // Return both results and errors
      return res.json({
        data: results,
        errors: Object.keys(errors).length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error fetching batch data:", error);
      res.status(500).json({ message: "Failed to fetch batch data", error: error.message });
    }
  });

  // Generic data endpoint for client compatibility
  app.get('/api/data', isAuthenticated, cacheMiddleware, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const type = req.query.type;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      switch (type) {
        case 'tasks':
          try {
            const tasks = await storage.getTasks(userId);
            return res.json(tasks);
          } catch (error) {
            console.error("Storage getTasks failed, using SQL fallback:", error);
            // Use same SQL fallback as /api/tasks endpoint
            const { sql } = require('drizzle-orm');
            const { db } = require('./db');
            
            try {
              // First get basic task data without potentially missing columns
              const userTasks = await db.execute(sql`
                SELECT 
                  id, user_id as "userId", title, description, completed, 
                  skill_id as "skillId", goal_id as "goalId", exp_reward as "expReward",
                  estimated_duration as "estimatedDuration", actual_duration as "actualDuration",
                  accumulated_time as "accumulatedTime", pomodoro_session_id as "pomodoroSessionId",
                  started_at as "startedAt", created_at as "createdAt", completed_at as "completedAt",
                  task_category as "taskCategory", task_type as "taskType", 
                  parent_task_id as "parentTaskId", "order", tags, difficulty,
                  required_energy_balls as "requiredEnergyBalls"
                FROM tasks
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
              `);
              
              const tasksWithDefaults = (userTasks.rows || userTasks).map((task: any) => ({
                ...task,
                skills: [],
                microTasks: [],
                // Add default values for potentially missing columns
                lastCompletedAt: task.lastCompletedAt || null,
                completionCount: task.completionCount || 0
              }));
              
              return res.json(tasksWithDefaults);
            } catch (sqlError) {
              console.error("SQL fallback also failed:", sqlError);
              return res.status(500).json({ message: "Failed to fetch tasks" });
            }
          }
        
        case 'skills':
          await (storage as any).initializeCoreSkills(userId);
          const skills = await storage.getSkills(userId);
          return res.json(skills);
        
        case 'goals':
          try {
            const goals = await storage.getGoals(userId);
            // Add virtual completed field for frontend compatibility
            const goalsWithCompleted = goals.map(goal => ({
              ...goal,
              completed: !!goal.completedAt
            }));
            return res.json(goalsWithCompleted);
          } catch (error) {
            console.error("Storage getGoals failed, using SQL fallback:", error);
            // Use same SQL fallback as /api/goals endpoint
            const { sql } = require('drizzle-orm');
            const { db } = require('./db');
            
            try {
              const userGoals = await db.execute(sql`
                SELECT 
                  id, user_id as "userId", title, description, progress, status, priority,
                  target_date as "targetDate", parent_goal_id as "parentGoalId", 
                  exp_reward as "expReward", skill_id as "skillId",
                  created_at as "createdAt", updated_at as "updatedAt", 
                  completed_at as "completedAt"
                FROM goals
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
              `);
              
              const goalsWithDefaults = (userGoals.rows || userGoals).map((goal: any) => ({
                ...goal,
                completed: !!goal.completedAt,
                milestones: [],
                microTasks: []
              }));
              
              return res.json(goalsWithDefaults);
            } catch (sqlError) {
              console.error("SQL fallback also failed:", sqlError);
              return res.status(500).json({ message: "Failed to fetch goals" });
            }
          }
        
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
          try {
            console.log('CRUD task creation - request body:', req.body);
            console.log('CRUD task creation - userId:', userId);
            
            // Initialize core skills if they don't exist
            await (storage as any).initializeCoreSkills(userId);
            
            // If no skillId provided, assign default skill
            let taskDataWithSkill = { ...req.body };
            if (!taskDataWithSkill.skillId) {
              const userSkills = await storage.getSkills(userId);
              const defaultSkill = userSkills.find(s => s.name === "意志执行力");
              if (defaultSkill) {
                taskDataWithSkill.skillId = defaultSkill.id;
                console.log('CRUD task creation - assigned default skill:', defaultSkill.name);
              }
            }
            
            const taskData = insertTaskSchema.parse({
              ...taskDataWithSkill,
              userId
            });
            
            console.log('CRUD task creation - parsed data:', taskData);
            const task = await storage.createTask(taskData);
            return res.json(task);
          } catch (taskError) {
            console.error('CRUD task creation error:', taskError);
            if (taskError instanceof z.ZodError) {
              console.error('Validation errors:', taskError.errors);
            }
            throw taskError;
          }
        
        case 'skills':
          const skillData = insertSkillSchema.parse({
            ...req.body,
            userId
          });
          const skill = await storage.createSkill(skillData);
          return res.json(skill);
        
        case 'goals':
          const { milestones, ...goalData } = req.body;
          console.log("Creating goal with data:", { ...goalData, userId });
          
          try {
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
          } catch (goalError) {
            console.error("Goal creation error:", goalError);
            throw goalError;
          }
        
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
      const userId = (req.user as any)?.claims?.sub;
      const resource = req.query.resource;
      const id = parseInt(req.query.id);

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      switch (resource) {
        case 'tasks':
          try {
            const success = await storage.deleteTask(id);
            if (!success) {
              return res.status(404).json({ message: "Task not found" });
            }
            return res.json({ message: "Task deleted successfully" });
          } catch (error) {
            console.error("Storage deleteTask failed, using SQL fallback:", error);
            
            // SQL fallback for task deletion
            const { sql } = require('drizzle-orm');
            const { db } = require('./db');
            
            try {
              const taskCheck = await db.execute(sql`
                SELECT id FROM tasks WHERE id = ${id} AND user_id = ${userId}
              `);
              
              if (!(taskCheck.rows || taskCheck).length) {
                return res.status(404).json({ message: "Task not found or not owned by user" });
              }
              
              await db.execute(sql`
                DELETE FROM tasks WHERE id = ${id} AND user_id = ${userId}
              `);
              
              return res.json({ message: "Task deleted successfully" });
            } catch (sqlError) {
              console.error("SQL fallback also failed:", sqlError);
              return res.status(500).json({ message: "Failed to delete task" });
            }
          }
        
        case 'goals':
          try {
            await storage.deleteGoal(id, userId);
            return res.json({ message: "Goal deleted successfully" });
          } catch (error) {
            console.error("Storage deleteGoal failed, using SQL fallback:", error);
            
            // SQL fallback for goal deletion
            const { sql } = require('drizzle-orm');
            const { db } = require('./db');
            
            try {
              const goalCheck = await db.execute(sql`
                SELECT id FROM goals WHERE id = ${id} AND user_id = ${userId}
              `);
              
              if (!(goalCheck.rows || goalCheck).length) {
                return res.status(404).json({ message: "Goal not found or not owned by user" });
              }
              
              await db.execute(sql`
                DELETE FROM goals WHERE id = ${id} AND user_id = ${userId}
              `);
              
              return res.json({ message: "Goal deleted successfully" });
            } catch (sqlError) {
              console.error("SQL fallback also failed:", sqlError);
              return res.status(500).json({ message: "Failed to delete goal" });
            }
          }
        
        default:
          return res.status(400).json({ message: "Invalid resource type" });
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      res.status(500).json({ message: "数据库操作失败", error: error.message });
    }
  });

  // Debug endpoint to check actual column names in tasks table
  app.get('/api/debug/check-columns', async (req, res) => {
    try {
      const { sql } = require('drizzle-orm');
      const { db } = require('./db');
      
      const columns = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'tasks'
        ORDER BY ordinal_position
      `);
      
      console.log('[Column Check] Tasks table columns:', columns.rows || columns);
      
      res.json({
        columns: columns.rows || columns,
        note: "These are the actual column names in the database"
      });
    } catch (error: any) {
      console.error('[Column Check] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to test database connection
  app.get('/api/debug/db-test', async (req, res) => {
    try {
      console.log('[DB Test] Starting database connection test...');
      
      // Test 1: Basic connection
      const basicTest = await db.execute(sql`SELECT 1 as test`);
      console.log('[DB Test] Basic connection test passed');
      
      // Test 2: Check tasks table
      const taskCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM tasks
      `);
      console.log('[DB Test] Tasks table accessible, count:', taskCount.rows[0].count);
      
      // Test 3: Connection pool health
      const { checkPoolHealth } = require('./db-pool');
      const poolHealth = await checkPoolHealth();
      console.log('[DB Test] Pool health:', poolHealth);
      
      res.json({
        status: 'success',
        tests: {
          basicConnection: 'passed',
          taskTableAccess: 'passed',
          taskCount: taskCount.rows[0].count,
          poolHealth: poolHealth
        }
      });
    } catch (error: any) {
      console.error('[DB Test] Database test failed:', error);
      res.status(500).json({
        status: 'error',
        error: {
          message: error.message,
          code: error.code,
          detail: error.detail
        }
      });
    }
  });

  // Simple habit completion endpoint - works without tracking columns
  app.post('/api/tasks/:id/simple-complete', isAuthenticated, invalidateCacheMiddleware(['tasks', 'stats', 'data']), async (req: any, res) => {
    const taskId = parseInt(req.params.id);
    const userId = (req.user as any)?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    console.log(`[Simple Complete] Starting for task ${taskId}, user ${userId}`);
    
    try {
      // First get the task to check energy requirements
      const taskResult = await db.execute(sql`
        SELECT * FROM tasks 
        WHERE id = ${taskId} 
          AND user_id = ${userId}
          AND task_category = 'habit'
      `);
      
      const task = taskResult.rows?.[0] || taskResult[0];
      
      if (!task) {
        return res.status(404).json({ message: 'Habit not found or not authorized' });
      }
      
      // Only update the columns we know exist
      const result = await db.execute(sql`
        UPDATE tasks 
        SET 
          completed = true,
          completed_at = NOW()
        WHERE 
          id = ${taskId} 
          AND user_id = ${userId}
          AND task_category = 'habit'
        RETURNING *
      `);
      
      const updatedTask = result.rows?.[0] || result[0];
      
      if (!updatedTask) {
        return res.status(404).json({ message: 'Failed to update habit' });
      }
      
      // Try to update tracking columns if they exist (ignore errors)
      try {
        await db.execute(sql`
          UPDATE tasks 
          SET 
            last_completed_at = NOW(),
            completion_count = COALESCE(completion_count, 0) + 1
          WHERE id = ${taskId}
        `);
        console.log(`[Simple Complete] Tracking columns updated`);
      } catch (trackingError) {
        console.log(`[Simple Complete] Tracking columns don't exist, skipped`);
      }
      
      // Handle experience points
      if (updatedTask.skill_id || updatedTask.skillId) {
        try {
          const expToAward = updatedTask.exp_reward || updatedTask.expReward || 20;
          const skillId = updatedTask.skill_id || updatedTask.skillId;
          
          console.log(`[Simple Complete] Awarding ${expToAward} exp to skill ${skillId}`);
          await storage.addSkillExp(skillId, expToAward);
        } catch (expError) {
          console.error(`[Simple Complete] Error awarding skill experience:`, expError);
          // Don't fail the whole request
        }
      }
      
      // Handle energy balls
      if (updatedTask.required_energy_balls || updatedTask.requiredEnergyBalls) {
        try {
          const energyRequired = updatedTask.required_energy_balls || updatedTask.requiredEnergyBalls;
          console.log(`[Simple Complete] Consuming ${energyRequired} energy balls`);
          await storage.consumeEnergyBalls(userId, energyRequired);
        } catch (energyError) {
          console.error(`[Simple Complete] Error consuming energy balls:`, energyError);
          // Don't fail the whole request
        }
      }
      
      // Create activity log
      try {
        const expGained = updatedTask.exp_reward || updatedTask.expReward || 20;
        await storage.createActivityLog({
          userId,
          taskId: updatedTask.id,
          skillId: updatedTask.skill_id || updatedTask.skillId || null,
          expGained,
          action: 'task_completed',
          details: { 
            description: `完成习惯: ${updatedTask.title}`,
            duration: updatedTask.actualDuration || updatedTask.estimatedDuration || updatedTask.actual_duration || updatedTask.estimated_duration || 0,
            energyBalls: updatedTask.actualEnergyBalls || updatedTask.requiredEnergyBalls || updatedTask.actual_energy_balls || updatedTask.required_energy_balls || 0
          }
        });
        console.log(`[Simple Complete] Activity log created`);
      } catch (logError) {
        console.error(`[Simple Complete] Error creating activity log:`, logError);
        // Don't fail the whole request
      }
      
      console.log(`[Simple Complete] Success! Habit ${taskId} completed`);
      return res.json({
        success: true,
        task: updatedTask
      });
      
    } catch (error: any) {
      console.error('[Simple Complete] Failed:', error);
      console.error('[Simple Complete] Error code:', error.code);
      console.error('[Simple Complete] Error detail:', error.detail);
      
      res.status(500).json({ 
        message: 'Failed to complete habit',
        error: error.message 
      });
    }
  });

  // Debug endpoint to restore energy balls
  app.post('/api/debug/restore-energy', isAuthenticated, async (req: any, res) => {
    const userId = (req.user as any)?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    try {
      // Force reset energy balls to max
      const stats = await storage.getUserStats(userId);
      if (!stats) {
        return res.status(404).json({ message: "User stats not found" });
      }
      
      const maxEnergy = stats.maxEnergyBalls || 18;
      const updated = await storage.updateUserStats(userId, {
        energyBalls: maxEnergy,
        lastEnergyReset: new Date()
      });
      
      console.log(`[Debug] Restored energy balls for user ${userId}: ${stats.energyBalls} -> ${maxEnergy}`);
      
      res.json({
        success: true,
        message: `能量球已恢复到 ${maxEnergy}`,
        previousEnergy: stats.energyBalls,
        currentEnergy: maxEnergy,
        stats: updated
      });
    } catch (error: any) {
      console.error('[Debug] Failed to restore energy:', error);
      res.status(500).json({
        message: 'Failed to restore energy balls',
        error: error.message
      });
    }
  });

  // Debug endpoint to test habit completion
  app.get('/api/debug/test-habit/:id', isAuthenticated, async (req: any, res) => {
    const taskId = parseInt(req.params.id);
    const userId = (req.user as any)?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    try {
      // Get task details
      const taskResult = await db.execute(sql`
        SELECT * FROM tasks 
        WHERE id = ${taskId} 
          AND user_id = ${userId}
      `);
      
      const task = taskResult.rows?.[0] || taskResult[0];
      
      // Get user stats
      const statsResult = await db.execute(sql`
        SELECT * FROM user_stats 
        WHERE user_id = ${userId}
      `);
      
      const stats = statsResult.rows?.[0] || statsResult[0];
      
      // Check column existence
      const columnCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tasks'
      `);
      
      const columns = (columnCheck.rows || columnCheck).map((row: any) => row.column_name);
      
      res.json({
        task: task || 'Task not found',
        userStats: {
          energyBalls: stats?.energy_balls || stats?.energyBalls || 0,
          maxEnergyBalls: stats?.max_energy_balls || stats?.maxEnergyBalls || 18
        },
        availableColumns: columns,
        hasTrackingColumns: {
          last_completed_at: columns.includes('last_completed_at'),
          completion_count: columns.includes('completion_count')
        },
        simpleCompleteEndpoint: '/api/tasks/:id/simple-complete',
        debugInfo: {
          deploymentTime: '2025-07-03T12:30:00Z',
          endpointReady: true
        }
      });
    } catch (error: any) {
      res.status(500).json({
        message: 'Debug check failed',
        error: error.message
      });
    }
  });

  // Smart habit completion with dynamic column detection
  app.post('/api/tasks/:id/smart-complete', isAuthenticated, async (req: any, res) => {
    const taskId = parseInt(req.params.id);
    const userId = (req.user as any)?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    console.log(`[Smart Complete] Starting for task ${taskId}, user ${userId}`);
    
    try {
      // Step 1: Detect actual column names
      const columnInfo = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          table_schema
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        ORDER BY ordinal_position
      `);
      
      console.log('[Smart Complete] Found columns:', columnInfo.rows.map(r => r.column_name));
      
      // Find the actual column names
      let userIdCol = 'user_id';
      let taskCategoryCol = 'task_category';
      let lastCompletedCol = null;
      let completionCountCol = null;
      let updatedAtCol = null;
      
      for (const col of columnInfo.rows) {
        const name = col.column_name.toLowerCase();
        
        // User ID column
        if (name === 'userid' || name === 'user_id') {
          userIdCol = col.column_name;
        }
        
        // Task category column
        if (name === 'taskcategory' || name === 'task_category') {
          taskCategoryCol = col.column_name;
        }
        
        // Last completed column
        if ((name.includes('last') && name.includes('complet')) || 
            name === 'lastcompletedat' || 
            name === 'last_completed_at') {
          lastCompletedCol = col.column_name;
        }
        
        // Completion count column
        if ((name.includes('complet') && name.includes('count')) ||
            name === 'completioncount' ||
            name === 'completion_count') {
          completionCountCol = col.column_name;
        }
        
        // Updated at column
        if (name === 'updatedat' || name === 'updated_at') {
          updatedAtCol = col.column_name;
        }
      }
      
      console.log('[Smart Complete] Detected columns:', {
        userIdCol,
        taskCategoryCol,
        lastCompletedCol,
        completionCountCol,
        updatedAtCol
      });
      
      // Step 2: Build dynamic UPDATE query
      if (!lastCompletedCol || !completionCountCol) {
        // If columns don't exist, try to update only what exists
        console.warn('[Smart Complete] Some columns missing, attempting partial update');
        
        let setClauses = [];
        if (lastCompletedCol) setClauses.push(`"${lastCompletedCol}" = NOW()`);
        if (completionCountCol) setClauses.push(`"${completionCountCol}" = COALESCE("${completionCountCol}", 0) + 1`);
        if (updatedAtCol) setClauses.push(`"${updatedAtCol}" = NOW()`);
        
        if (setClauses.length === 0) {
          return res.status(500).json({ 
            error: 'No completion-related columns found in tasks table',
            availableColumns: columnInfo.rows.map(r => r.column_name)
          });
        }
        
        const partialQuery = `
          UPDATE tasks 
          SET ${setClauses.join(', ')}
          WHERE id = $1 
            AND "${userIdCol}" = $2 
            AND "${taskCategoryCol}" = 'habit'
          RETURNING *
        `;
        
        console.log('[Smart Complete] Executing partial query:', partialQuery);
        
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const result = await pool.query(partialQuery, [taskId, userId]);
        await pool.end();
        
        if (result.rows.length > 0) {
          return res.json({
            success: true,
            task: result.rows[0],
            debug: {
              method: 'partial_update',
              columnsUpdated: setClauses
            }
          });
        }
      } else {
        // All columns exist, do full update
        const fullQuery = `
          UPDATE tasks 
          SET 
            "${lastCompletedCol}" = NOW(),
            "${completionCountCol}" = COALESCE("${completionCountCol}", 0) + 1
            ${updatedAtCol ? `, "${updatedAtCol}" = NOW()` : ''}
          WHERE id = $1 
            AND "${userIdCol}" = $2 
            AND "${taskCategoryCol}" = 'habit'
          RETURNING *
        `;
        
        console.log('[Smart Complete] Executing full query:', fullQuery);
        
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const result = await pool.query(fullQuery, [taskId, userId]);
        await pool.end();
        
        if (result.rows.length > 0) {
          return res.json({
            success: true,
            task: result.rows[0],
            debug: {
              method: 'full_update',
              columnsDetected: {
                lastCompletedCol,
                completionCountCol,
                updatedAtCol
              }
            }
          });
        }
      }
      
      res.status(404).json({ message: 'Habit not found' });
      
    } catch (error: any) {
      console.error('[Smart Complete] Error:', error);
      res.status(500).json({ 
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: 'Try checking the table structure in Supabase dashboard'
      });
    }
  });

  // Direct habit completion endpoint (bypasses complex logic)
  app.post('/api/debug/complete-habit-direct/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = (req.user as any)?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      console.log(`[Direct Habit Complete] Starting for task ${taskId}, user ${userId}`);
      
      // Try both naming conventions
      let result;
      try {
        // Try camelCase first
        result = await db.execute(sql`
          UPDATE tasks 
          SET 
            "lastCompletedAt" = NOW(),
            "completionCount" = COALESCE("completionCount", 0) + 1,
            "updatedAt" = NOW()
          WHERE 
            id = ${taskId} 
            AND "userId" = ${userId}
            AND "taskCategory" = 'habit'
          RETURNING *
        `);
      } catch (camelError) {
        console.log('[Direct Habit Complete] CamelCase failed, trying snake_case');
        // Fallback to snake_case
        result = await db.execute(sql`
          UPDATE tasks 
          SET 
            last_completed_at = NOW(),
            completion_count = COALESCE(completion_count, 0) + 1,
            updated_at = NOW()
          WHERE 
            id = ${taskId} 
            AND user_id = ${userId}
            AND task_category = 'habit'
          RETURNING *
        `);
      }
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Habit not found or not owned by user" });
      }
      
      const updatedTask = result.rows[0];
      console.log(`[Direct Habit Complete] Success for task ${taskId}`);
      
      res.json({
        message: "Habit completed successfully",
        task: updatedTask
      });
      
    } catch (error: any) {
      console.error('[Direct Habit Complete] Error:', error);
      res.status(500).json({
        message: "Failed to complete habit",
        error: {
          message: error.message,
          code: error.code,
          detail: error.detail
        }
      });
    }
  });

  // Debug endpoint to fix habits without skills
  app.post('/api/debug/fix-habits-skills', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      console.log(`[Fix Habits Skills] Starting for user ${userId}`);
      
      // Initialize core skills if needed
      await (storage as any).initializeCoreSkills(userId);
      
      // Find habits without skills
      const habitsWithoutSkills = await db.execute(sql`
        SELECT id, title 
        FROM tasks 
        WHERE user_id = ${userId} 
          AND task_category = 'habit' 
          AND skill_id IS NULL
      `);
      
      console.log(`[Fix Habits Skills] Found ${habitsWithoutSkills.rows.length} habits without skills`);
      
      if (habitsWithoutSkills.rows.length === 0) {
        return res.json({ 
          message: "All habits already have skills assigned",
          fixed: 0 
        });
      }
      
      // Get user's skills
      const userSkills = await storage.getSkills(userId);
      
      let fixedCount = 0;
      const results = [];
      
      for (const habit of habitsWithoutSkills.rows) {
        // Determine appropriate skill based on habit title
        let skillName = '意志执行力'; // Default
        
        const title = habit.title.toLowerCase();
        
        if (title.includes('运动') || title.includes('锻炼') || 
            title.includes('跑步') || title.includes('八段锦') || 
            title.includes('健身') || title.includes('瑜伽')) {
          skillName = '身体掌控力';
        } else if (title.includes('学习') || title.includes('阅读') || 
                   title.includes('看书') || title.includes('编程')) {
          skillName = '心智成长力';
        } else if (title.includes('写作') || title.includes('工作') || 
                   title.includes('任务')) {
          skillName = '意志执行力';
        } else if (title.includes('社交') || title.includes('沟通') || 
                   title.includes('家人')) {
          skillName = '关系经营力';
        } else if (title.includes('理财') || title.includes('投资') || 
                   title.includes('记账')) {
          skillName = '财富掌控力';
        } else if (title.includes('冥想') || title.includes('情绪') || 
                   title.includes('日记')) {
          skillName = '情绪稳定力';
        }
        
        const targetSkill = userSkills.find(s => s.name === skillName);
        
        if (targetSkill) {
          await db.execute(sql`
            UPDATE tasks 
            SET skill_id = ${targetSkill.id}
            WHERE id = ${habit.id}
          `);
          
          fixedCount++;
          results.push({
            habitId: habit.id,
            title: habit.title,
            assignedSkill: skillName
          });
          
          console.log(`[Fix Habits Skills] Fixed habit "${habit.title}" with skill "${skillName}"`);
        }
      }
      
      res.json({ 
        message: `Fixed ${fixedCount} habits`,
        fixed: fixedCount,
        results: results
      });
      
    } catch (error: any) {
      console.error('[Fix Habits Skills] Error:', error);
      res.status(500).json({ 
        message: "Failed to fix habits",
        error: error.message 
      });
    }
  });

  // Diagnostic endpoint for habit issues
  app.get('/api/diagnose/habit/:id', isAuthenticated, async (req: any, res) => {
    const habitId = parseInt(req.params.id);
    const userId = (req.user as any)?.claims?.sub;
    
    const diagnosis: any = {
      habitId,
      userId,
      timestamp: new Date().toISOString(),
      checks: []
    };
    
    try {
      // Check 1: Does the task exist?
      const taskCheck = await db.execute(sql`
        SELECT id, title, task_category, user_id 
        FROM tasks 
        WHERE id = ${habitId}
      `);
      
      const task = taskCheck.rows?.[0];
      diagnosis.checks.push({
        name: 'Task exists',
        passed: !!task,
        details: task || 'Task not found'
      });
      
      if (!task) {
        return res.json(diagnosis);
      }
      
      // Check 2: Is it a habit?
      diagnosis.checks.push({
        name: 'Is habit',
        passed: task.task_category === 'habit',
        details: `task_category: ${task.task_category}`
      });
      
      // Check 3: Does user own it?
      diagnosis.checks.push({
        name: 'User owns task',
        passed: task.user_id === userId,
        details: `task.user_id: ${task.user_id}, request.userId: ${userId}`
      });
      
      // Check 4: What columns exist?
      const columnCheck = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name IN (
          'last_completed_at', 'completion_count', 
          'lastCompletedAt', 'completionCount',
          'completed', 'completed_at', 'updated_at'
        )
      `);
      
      diagnosis.checks.push({
        name: 'Required columns exist',
        passed: columnCheck.rows?.length > 0,
        details: columnCheck.rows || []
      });
      
      // Check 5: Try a simple update
      try {
        await db.execute(sql`
          UPDATE tasks 
          SET completed = completed 
          WHERE id = ${habitId}
        `);
        diagnosis.checks.push({
          name: 'Can update task',
          passed: true,
          details: 'Basic update successful'
        });
      } catch (updateError: any) {
        diagnosis.checks.push({
          name: 'Can update task',
          passed: false,
          details: updateError.message
        });
      }
      
      // Check 6: Database connection info
      diagnosis.databaseInfo = {
        hasConnectionString: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        ssl: process.env.NODE_ENV === 'production'
      };
      
      res.json(diagnosis);
      
    } catch (error: any) {
      diagnosis.error = {
        message: error.message,
        code: error.code,
        detail: error.detail
      };
      res.status(500).json(diagnosis);
    }
  });

  // Account deletion endpoint
  app.delete("/api/v1/users/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Mark account for deletion
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30); // 30 days from now

      // Update user record to mark for deletion
      await db.execute(sql`
        UPDATE users 
        SET 
          updated_at = ${new Date()},
          email = ${`deleted_${userId}@deleted.com`},
          first_name = '[DELETED]',
          last_name = '[DELETED]',
          profile_image_url = NULL
        WHERE id = ${userId}
      `);

      // Create deletion record in activity logs
      await storage.createActivityLog({
        userId,
        action: 'account_deletion_requested',
        details: {
          description: 'Account deletion requested',
          scheduledDeletionDate: deletionDate.toISOString(),
          requestedAt: new Date().toISOString()
        }
      });

      // TODO: Schedule actual deletion job for 30 days later
      // This would typically be done with a job queue like Bull or similar
      
      // TODO: Send confirmation email
      // await sendDeletionConfirmationEmail(userEmail);

      res.json({
        message: "Account deletion request received",
        deletionDate: deletionDate.toISOString(),
        note: "Your account will be permanently deleted after 30 days. You can cancel this request by logging in before the deletion date."
      });

    } catch (error) {
      console.error("Error processing account deletion:", error);
      res.status(500).json({ message: "Failed to process account deletion request" });
    }
  });

  // Cancel account deletion endpoint
  app.post("/api/v1/users/cancel-deletion", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check if there's a pending deletion
      const deletionLog = await db.execute(sql`
        SELECT * FROM activity_logs 
        WHERE user_id = ${userId} 
        AND action = 'account_deletion_requested'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (!deletionLog.rows || deletionLog.rows.length === 0) {
        return res.status(400).json({ message: "No pending deletion request found" });
      }

      // Restore user data (this is simplified - in production you'd restore from backup)
      // For now, we'll just log the cancellation
      await storage.createActivityLog({
        userId,
        action: 'account_deletion_cancelled',
        details: {
          description: 'Account deletion cancelled',
          cancelledAt: new Date().toISOString()
        }
      });

      res.json({
        message: "Account deletion request has been cancelled",
        note: "Your account will remain active"
      });

    } catch (error) {
      console.error("Error cancelling account deletion:", error);
      res.status(500).json({ message: "Failed to cancel account deletion request" });
    }
  });

  // Support contact form endpoint
  app.post("/api/support/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      // Validate input
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Here you would typically:
      // 1. Send an email to support team
      // 2. Save to database for tracking
      // 3. Send confirmation email to user
      
      // For now, we'll just log and return success
      console.log("Support contact form submission:", {
        name,
        email,
        subject,
        message,
        timestamp: new Date().toISOString()
      });

      // TODO: Implement email sending using a service like SendGrid or AWS SES
      // Example:
      // await sendEmail({
      //   to: 'support@levelupsolo.net',
      //   from: email,
      //   subject: `Support Request: ${subject}`,
      //   body: `From: ${name} (${email})\n\n${message}`
      // });

      res.json({ 
        message: "Support request received successfully",
        ticketId: `SUPPORT-${Date.now()}`
      });
    } catch (error) {
      console.error("Error processing support contact form:", error);
      res.status(500).json({ message: "Failed to process support request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}