import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pgTable, varchar, integer, text, serial, boolean } from "drizzle-orm/pg-core";

// 简化的 skills 表定义
const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  level: integer("level").notNull().default(1),
  exp: integer("exp").notNull().default(0),
  maxExp: integer("max_exp").notNull().default(100),
  color: text("color").notNull().default("#6366F1"),
  icon: text("icon").notNull().default("fas fa-star"),
  skillType: text("skill_type").notNull().default("basic"),
  category: text("category").notNull().default("general"),
  talentPoints: integer("talent_points").notNull().default(0),
  prestige: integer("prestige").notNull().default(0),
  unlocked: boolean("unlocked").notNull().default(true),
  prerequisites: integer("prerequisites").array(),
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
          name: "编程",
          level: 3,
          exp: 45,
          maxExp: 100,
          color: "#3B82F6",
          icon: "fas fa-code",
          skillType: "basic",
          category: "technical",
          talentPoints: 2,
          prestige: 0,
          unlocked: true,
        },
        {
          id: 2,
          userId: "demo_user",
          name: "写作",
          level: 2,
          exp: 30,
          maxExp: 100,
          color: "#10B981",
          icon: "fas fa-pen",
          skillType: "basic",
          category: "creative",
          talentPoints: 1,
          prestige: 0,
          unlocked: true,
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
      .from(skills)
      .where(eq(skills.userId, decoded.userId));
    
    await client.end();
    
    return res.json(result);
    
  } catch (error) {
    console.error("Get skills error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "获取技能失败" });
  }
}