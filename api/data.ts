import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";

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
    const { type, taskType, goalId } = req.query;
    
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
            onboardingCompleted: true
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
          return res.json([]);
          
        case 'goals':
          return res.json([]);
          
        case 'tasks':
          return res.json([]);
          
        default:
          return res.status(400).json({ message: "未知的查询类型" });
      }
    }
    
    // 真实用户 - 连接数据库
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
    if (!connectionString) {
      console.error("No database connection string found");
      return res.status(500).json({ message: "服务器配置错误: 缺少数据库连接" });
    }
    
    let client = null;
    let result: any;
    
    try {
      client = postgres(connectionString, {
        ssl: 'require',
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      
      const db = drizzle(client);
      
      switch (type) {
        case 'profile':
          result = await db.execute(
            sql`SELECT * FROM user_profiles WHERE user_id = ${decoded.userId} LIMIT 1`
          );
          const profileResult = Array.isArray(result) ? result[0] : result.rows?.[0];
          return res.json(profileResult || null);
          
        case 'stats':
          result = await db.execute(
            sql`SELECT * FROM user_stats WHERE user_id = ${decoded.userId} LIMIT 1`
          );
          const statsResult = Array.isArray(result) ? result[0] : result.rows?.[0];
          if (!statsResult) {
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
          return res.json(statsResult);
          
        case 'skills':
          result = await db.execute(
            sql`SELECT * FROM skills WHERE user_id = ${decoded.userId}`
          );
          const skillsRows = Array.isArray(result) ? result : (result.rows || []);
          return res.json(skillsRows);
          
        case 'goals':
          result = await db.execute(
            sql`SELECT * FROM goals WHERE user_id = ${decoded.userId}`
          );
          const goalsRows = Array.isArray(result) ? result : (result.rows || []);
          return res.json(goalsRows);
          
        case 'tasks':
          let query = sql`SELECT * FROM tasks WHERE user_id = ${decoded.userId}`;
          
          // 如果指定了 taskType，添加过滤条件
          if (taskType === 'main') {
            query = sql`SELECT * FROM tasks WHERE user_id = ${decoded.userId} AND task_type = 'main' AND parent_task_id IS NULL`;
          }
          
          result = await db.execute(query);
          const tasksRows = Array.isArray(result) ? result : (result.rows || []);
          return res.json(tasksRows);
          
        case 'milestones':
          if (goalId) {
            result = await db.execute(
              sql`SELECT * FROM milestones WHERE goal_id = ${goalId}`
            );
          } else {
            result = await db.execute(
              sql`SELECT * FROM milestones WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ${decoded.userId})`
            );
          }
          const milestonesRows = Array.isArray(result) ? result : (result.rows || []);
          return res.json(milestonesRows);
          
        default:
          return res.status(400).json({ message: "未知的查询类型" });
      }
      
    } catch (dbError) {
      console.error("Database query error:", dbError);
      return res.status(500).json({ 
        message: "数据库查询失败",
        error: dbError instanceof Error ? dbError.message : String(dbError),
        details: process.env.NODE_ENV === 'development' ? dbError : undefined
      });
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (endError) {
          console.error("Error closing database connection:", endError);
        }
      }
    }
    
  } catch (error) {
    console.error("Get data error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ 
      message: "获取数据失败",
      error: error instanceof Error ? error.message : String(error),
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}