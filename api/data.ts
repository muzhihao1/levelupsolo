import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users, userProfiles, userStats, skills, goals, tasks } from "../shared/schema";

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
    
    // 获取查询类型
    const { type } = req.query;
    
    // Demo 用户数据
    if (decoded.userId === 'demo_user') {
      switch (type) {
        case 'profile':
          return res.json({
            id: 1,
            userId: "demo_user",
            name: "Demo User",
            age: "25",
            occupation: "软件工程师",
            mission: "成为全栈开发专家",
            hasCompletedOnboarding: true,
            hasCompletedTutorial: true,
          });
        case 'stats':
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
          });
        case 'skills':
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
            }
          ]);
        case 'goals':
          return res.json([
            {
              id: 1,
              userId: "demo_user",
              title: "学习 React Native",
              description: "开发一个移动应用",
              completed: false,
              progress: 30,
            }
          ]);
        case 'tasks':
          return res.json([
            {
              id: 1,
              userId: "demo_user",
              title: "完成 React 教程",
              description: "学习 React 基础知识",
              completed: false,
            }
          ]);
        default:
          return res.status(400).json({ message: "Invalid type parameter" });
      }
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
    
    const db = drizzle(client, { schema: { users, userProfiles, userStats, skills, goals, tasks } });
    
    let result;
    
    switch (type) {
      case 'profile':
        result = await db.select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, decoded.userId))
          .limit(1);
        await client.end();
        return res.json(result[0] || null);
        
      case 'stats':
        result = await db.select()
          .from(userStats)
          .where(eq(userStats.userId, decoded.userId))
          .limit(1);
        await client.end();
        if (result.length === 0) {
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
          });
        }
        return res.json(result[0]);
        
      case 'skills':
        result = await db.select()
          .from(skills)
          .where(eq(skills.userId, decoded.userId));
        await client.end();
        return res.json(result);
        
      case 'goals':
        result = await db.select()
          .from(goals)
          .where(eq(goals.userId, decoded.userId));
        await client.end();
        return res.json(result);
        
      case 'tasks':
        result = await db.select()
          .from(tasks)
          .where(eq(tasks.userId, decoded.userId));
        await client.end();
        return res.json(result);
        
      default:
        await client.end();
        return res.status(400).json({ message: "Invalid type parameter" });
    }
    
  } catch (error) {
    console.error("Get data error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "获取数据失败" });
  }
}