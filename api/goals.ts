import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pgTable, varchar, integer, text, serial, boolean, real, timestamp } from "drizzle-orm/pg-core";

// 简化的 goals 表定义
const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  progress: real("progress").notNull().default(0),
  targetDate: timestamp("target_date"),
  expReward: integer("exp_reward").notNull().default(50),
  pomodoroExpReward: integer("pomodoro_exp_reward").notNull().default(10),
  requiredEnergyBalls: integer("required_energy_balls").notNull().default(4),
  skillTags: text("skill_tags").array(),
  relatedSkillIds: integer("related_skill_ids").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
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
          title: "学习 React Native",
          description: "开发一个移动应用",
          completed: false,
          progress: 30,
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          expReward: 100,
          pomodoroExpReward: 10,
          requiredEnergyBalls: 4,
          skillTags: ["编程"],
          relatedSkillIds: [1],
          createdAt: new Date().toISOString(),
          completedAt: null,
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
      .from(goals)
      .where(eq(goals.userId, decoded.userId));
    
    await client.end();
    
    return res.json(result);
    
  } catch (error) {
    console.error("Get goals error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "获取目标失败" });
  }
}