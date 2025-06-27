import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, isNull, sql } from "drizzle-orm";
import { 
  users, 
  tasks, 
  skills, 
  userStats, 
  activityLogs,
  type InsertTask,
  insertTaskSchema
} from '@shared/schema';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize storage functions
async function getDatabase() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
  
  if (!connectionString) {
    throw new Error("No database connection string found");
  }
  
  const client = postgres(connectionString, {
    ssl: 'require',
    max: 1,
  });
  
  return drizzle(client);
}

// 设置 CORS
export function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Verify JWT token
export function verifyToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('未授权');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
}

// Get all tasks handler
export async function handleGetTasks(req: VercelRequest, res: VercelResponse) {
  let client = null;
  
  try {
    const decoded = verifyToken(req.headers.authorization);
    const userId = decoded.userId;

    // Demo user - return sample tasks
    if (userId === 'demo_user') {
      const demoTasks = [
        {
          id: 1,
          userId: 'demo_user',
          title: '完成每日运动',
          description: '30分钟有氧运动',
          taskCategory: 'habit',
          taskType: 'habit',
          difficulty: 'medium',
          completed: false,
          expReward: 20,
          requiredEnergyBalls: 2,
          habitStreak: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          userId: 'demo_user',
          title: '学习新技能',
          description: '学习一个新的编程概念',
          taskCategory: 'todo',
          taskType: 'side_quest',
          difficulty: 'medium',
          completed: false,
          expReward: 25,
          requiredEnergyBalls: 3,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      return res.json(demoTasks);
    }

    // Real user - fetch from database
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    client = postgres(connectionString, { ssl: 'require', max: 1 });
    const db = drizzle(client);

    const userTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.createdAt);

    return res.json(userTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    if (error instanceof jwt.JsonWebTokenError || (error as any).message === '未授权') {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "获取任务失败" });
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Create task handler
export async function handleCreateTask(req: VercelRequest, res: VercelResponse) {
  let client = null;
  
  try {
    const decoded = verifyToken(req.headers.authorization);
    const userId = decoded.userId;

    // Demo user - return created task without saving
    if (userId === 'demo_user') {
      const taskData = {
        ...req.body,
        id: Date.now(),
        userId: 'demo_user',
        createdAt: new Date(),
        updatedAt: new Date(),
        completed: false
      };
      
      return res.json(taskData);
    }

    // Real user - save to database
    const taskData = insertTaskSchema.parse({
      ...req.body,
      userId
    });

    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    client = postgres(connectionString, { ssl: 'require', max: 1 });
    const db = drizzle(client);

    const [task] = await db.insert(tasks)
      .values(taskData)
      .returning();

    return res.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "无效的任务数据", errors: error.errors });
    }
    if (error instanceof jwt.JsonWebTokenError || (error as any).message === '未授权') {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "创建任务失败" });
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Update task handler
export async function handleUpdateTask(req: VercelRequest, res: VercelResponse) {
  let client = null;
  
  try {
    const decoded = verifyToken(req.headers.authorization);
    const userId = decoded.userId;
    const taskId = parseInt(req.query.id as string);
    const updates = req.body;

    // Demo user - return updated task without saving
    if (userId === 'demo_user') {
      return res.json({
        id: taskId,
        ...updates,
        userId: 'demo_user',
        updatedAt: new Date()
      });
    }

    // Real user - update in database
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    client = postgres(connectionString, { ssl: 'require', max: 1 });
    const db = drizzle(client);

    // Get current task to check ownership and handle habit logic
    const [currentTask] = await db.select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!currentTask) {
      return res.status(404).json({ message: "任务未找到" });
    }

    // Handle habit completion logic
    if (currentTask.taskCategory === "habit" && updates.completed !== undefined) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastCompleted = currentTask.lastCompletedDate ? new Date(currentTask.lastCompletedDate).toISOString().split('T')[0] : null;

      if (updates.completed) {
        if (lastCompleted !== today) {
          // First completion today
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          const wasCompletedYesterday = lastCompleted === yesterdayStr;

          updates.habitStreak = wasCompletedYesterday ? (currentTask.habitStreak || 0) + 1 : 1;
          updates.lastCompletedDate = now;
          updates.habitValue = Math.min((currentTask.habitValue || 0) + 0.25, 3);
        } else {
          return res.status(400).json({ message: "今天已经完成过这个习惯了" });
        }
      } else {
        if (lastCompleted === today) {
          updates.completed = false;
          updates.lastCompletedDate = null;
        } else {
          return res.status(400).json({ message: "只能取消今天完成的习惯" });
        }
      }
    }

    // Update task
    const [updatedTask] = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    return res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    if (error instanceof jwt.JsonWebTokenError || (error as any).message === '未授权') {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "更新任务失败" });
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Delete task handler
export async function handleDeleteTask(req: VercelRequest, res: VercelResponse) {
  let client = null;
  
  try {
    const decoded = verifyToken(req.headers.authorization);
    const userId = decoded.userId;
    const taskId = parseInt(req.query.id as string);

    // Demo user - return success without deleting
    if (userId === 'demo_user') {
      return res.json({ message: "任务删除成功" });
    }

    // Real user - delete from database
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    client = postgres(connectionString, { ssl: 'require', max: 1 });
    const db = drizzle(client);

    const deletedTasks = await db.delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    if (deletedTasks.length === 0) {
      return res.status(404).json({ message: "任务未找到" });
    }

    return res.json({ message: "任务删除成功" });
  } catch (error) {
    console.error("Error deleting task:", error);
    if (error instanceof jwt.JsonWebTokenError || (error as any).message === '未授权') {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "删除任务失败" });
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Analyze task handler
export async function handleAnalyzeTask(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = verifyToken(req.headers.authorization);
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: "任务标题是必需的" });
    }

    // Demo user or no OpenAI key - return default analysis
    if (decoded.userId === 'demo_user' || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      return res.json({
        category: "todo",
        difficulty: "medium",
        skills: ["通用技能"],
        estimatedDuration: 30,
        reasoning: "AI分析暂时不可用，使用默认设置"
      });
    }

    // Real user with OpenAI - analyze task
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
    return res.json(analysis);
  } catch (error: any) {
    console.error("Error analyzing task:", error);
    if (error instanceof jwt.JsonWebTokenError || (error as any).message === '未授权') {
      return res.status(401).json({ message: "无效的令牌" });
    }
    if (error.status === 401) {
      return res.status(500).json({ 
        message: "AI服务认证失败，请检查API配置",
        error: "Authentication failed"
      });
    }
    return res.status(500).json({ message: "分析任务失败" });
  }
}

// Intelligent create handler
export async function handleIntelligentCreate(req: VercelRequest, res: VercelResponse) {
  let client = null;
  
  try {
    const decoded = verifyToken(req.headers.authorization);
    const userId = decoded.userId;
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: "任务描述是必需的" });
    }

    // Demo user or no OpenAI key - use simple rule-based creation
    if (decoded.userId === 'demo_user' || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
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
        requiredEnergyBalls: energyBalls,
        completed: false
      };

      if (userId === 'demo_user') {
        return res.json({
          ...taskData,
          id: Date.now(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Save to database for real user
      const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
      client = postgres(connectionString, { ssl: 'require', max: 1 });
      const db = drizzle(client);

      const [task] = await db.insert(tasks)
        .values(taskData)
        .returning();

      return res.json(task);
    }

    // Real user with OpenAI - intelligent task creation
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `基于用户输入的描述，创建一个智能任务。描述："${description}"

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
    const requiredEnergyBalls = analysis.energyBalls || (difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 4);

    const taskData = {
      userId,
      title: analysis.title || description.trim(),
      description: null,
      taskCategory: taskCategory,
      taskType: taskCategory === "habit" ? "habit" : "side_quest",
      difficulty: difficulty,
      expReward: rewards.xp,
      requiredEnergyBalls: requiredEnergyBalls,
      completed: false,
      skills: analysis.skillName ? [analysis.skillName] : []
    };

    // Save to database
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    client = postgres(connectionString, { ssl: 'require', max: 1 });
    const db = drizzle(client);

    const [task] = await db.insert(tasks)
      .values(taskData)
      .returning();

    return res.json(task);
  } catch (error) {
    console.error("Error creating intelligent task:", error);
    if (error instanceof jwt.JsonWebTokenError || (error as any).message === '未授权') {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "创建智能任务失败" });
  } finally {
    if (client) {
      await client.end();
    }
  }
}