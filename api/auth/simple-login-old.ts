import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

// 简化的 users 表定义
const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  hashedPassword: text("hashed_password"),
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
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "邮箱和密码是必填项" });
    }
    
    // Demo 登录
    if (email === "demo@levelupsolo.net" && password === "demo1234") {
      const token = jwt.sign(
        { userId: "demo_user", email },
        process.env.JWT_SECRET || 'demo-secret',
        { expiresIn: '7d' }
      );
      
      return res.json({
        message: "登录成功",
        accessToken: token,
        refreshToken: token,
        user: {
          id: "demo_user",
          email: "demo@levelupsolo.net",
          firstName: "Demo",
          lastName: "User",
        }
      });
    }
    
    // 真实用户登录
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
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    const user = result[0];
    
    if (!user || !user.hashedPassword) {
      return res.status(401).json({ message: "邮箱或密码错误" });
    }
    
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ message: "邮箱或密码错误" });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email! },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '7d' }
    );
    
    await client.end();
    
    return res.json({
      message: "登录成功",
      accessToken: token,
      refreshToken: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    });
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      message: "登录失败",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}