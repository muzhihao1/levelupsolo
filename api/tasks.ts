import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pgTable, varchar, integer, text, serial, boolean, timestamp, real } from "drizzle-orm/pg-core";

// 简化的 tasks 表定义
const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  skillId: integer("skill_id"),
  goalId: integer("goal_id"),
  goalTags: text("goal_tags").array(),
  expReward: integer("exp_reward").notNull().default(0),
  estimatedDuration: integer("estimated_duration").default(25),
  actualDuration: integer("actual_duration"),
  accumulatedTime: integer("accumulated_time").default(0),
  pomodoroSessionId: text("pomodoro_session_id"),
  startedAt: timestamp("started_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  taskCategory: text("task_category").notNull().default("todo"),
  taskType: text("task_type").notNull().default("simple"),
  parentTaskId: integer("parent_task_id"),
  order: integer("order").notNull().default(0),
  tags: text("tags").array().default([]),
  habitDirection: text("habit_direction").default("positive"),
  habitStreak: integer("habit_streak").default(0),
  habitValue: real("habit_value").default(0),
  isDailyTask: boolean("is_daily_task").notNull().default(false),
  dailyStreak: integer("daily_streak").default(0),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPattern: text("recurring_pattern"),
  lastCompletedDate: timestamp("last_completed_date"),
  difficulty: text("difficulty").notNull().default("medium"),
  requiredEnergyBalls: integer("required_energy_balls").notNull().default(1),
});

// 设置 CORS
function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 从 Authorization header 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "未授权" });
    }
    
    const token = authHeader.substring(7);
    
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
    
    // Demo 用户
    if (decoded.userId === 'demo_user') {
      return res.json([
        {
          id: 1,
          userId: "demo_user",
          title: "完成 React 教程",
          description: "学习 React 基础知识",
          completed: false,
          skillId: 1,
          goalId: 1,
          expReward: 20,
          estimatedDuration: 60,
          taskCategory: "todo",
          taskType: "simple",
          order: 0,
          tags: ["学习", "编程"],
          difficulty: "medium",
          requiredEnergyBalls: 2,
          createdAt: new Date().toISOString(),
        }
      ]);
    }
    
    // 真实用户 - 从数据库获取
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    
    if (!connectionString) {
      console.error("No database connection string found");
      return res.status(500).json({ message: "服务器配置错误" });
    }
    
    const client = postgres(connectionString, {
      ssl: 'require',
      max: 1,
    });
    
    const db = drizzle(client);
    
    const result = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, decoded.userId));
    
    await client.end();
    
    return res.json(result);
    
  } catch (error) {
    console.error("Get tasks error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "获取任务失败" });
  }
}