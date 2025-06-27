import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pgTable, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";

// 简化的 userStats 表定义
const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  experienceToNext: integer("experience_to_next").notNull().default(100),
  energyBalls: integer("energy_balls").notNull().default(18),
  maxEnergyBalls: integer("max_energy_balls").notNull().default(18),
  energyBallDuration: integer("energy_ball_duration").notNull().default(15),
  energyPeakStart: integer("energy_peak_start").notNull().default(9),
  energyPeakEnd: integer("energy_peak_end").notNull().default(12),
  streak: integer("streak").notNull().default(0),
  totalTasksCompleted: integer("total_tasks_completed").notNull().default(0),
  lastEnergyReset: timestamp("last_energy_reset").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
      return res.json({
        id: 1,
        userId: "demo_user",
        level: 1,
        experience: 0,
        experienceToNext: 100,
        energyBalls: 18,
        maxEnergyBalls: 18,
        energyBallDuration: 15,
        energyPeakStart: 9,
        energyPeakEnd: 12,
        streak: 0,
        totalTasksCompleted: 0,
        lastEnergyReset: new Date().toISOString(),
      });
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
      .from(userStats)
      .where(eq(userStats.userId, decoded.userId))
      .limit(1);
    
    await client.end();
    
    if (result.length === 0) {
      // 返回默认统计数据
      return res.json({
        id: 1,
        userId: decoded.userId,
        level: 1,
        experience: 0,
        experienceToNext: 100,
        energyBalls: 18,
        maxEnergyBalls: 18,
        energyBallDuration: 15,
        energyPeakStart: 9,
        energyPeakEnd: 12,
        streak: 0,
        totalTasksCompleted: 0,
        lastEnergyReset: new Date().toISOString(),
      });
    }
    
    return res.json(result[0]);
    
  } catch (error) {
    console.error("Get user stats error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "获取用户统计失败" });
  }
}