import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, serial, boolean } from "drizzle-orm/pg-core";

// 简化的 userProfiles 表定义
const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  age: text("age"),
  occupation: text("occupation"),
  mission: text("mission"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false),
  hasCompletedTutorial: boolean("has_completed_tutorial").notNull().default(false),
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
        name: "Demo User",
        age: "25",
        occupation: "软件工程师",
        mission: "成为全栈开发专家",
        hasCompletedOnboarding: true,
        hasCompletedTutorial: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      .from(userProfiles)
      .where(eq(userProfiles.userId, decoded.userId))
      .limit(1);
    
    await client.end();
    
    if (result.length === 0) {
      // 用户没有 profile，返回 404
      return res.status(404).json({ message: "用户档案未找到" });
    }
    
    return res.json(result[0]);
    
  } catch (error) {
    console.error("Get profile error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "获取用户档案失败" });
  }
}