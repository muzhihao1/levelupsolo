import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { storage } from './lib/storage';
import { sql } from "drizzle-orm";

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
    
    // 真实用户 - 使用 storage 服务获取数据
    try {
      switch (type) {
        case 'profile':
          const profile = await storage.getUserProfile(decoded.userId);
          return res.json(profile || null);
          
        case 'stats':
          let stats = await storage.getUserStats(decoded.userId);
          if (!stats) {
            // Create default stats if they don't exist
            stats = await storage.createUserStats({
              userId: decoded.userId,
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
          return res.json(stats);
          
        case 'skills':
          // Initialize core skills if they don't exist
          await storage.initializeCoreSkills(decoded.userId);
          const skills = await storage.getSkills(decoded.userId);
          return res.json(skills);
          
        case 'goals':
          const goals = await storage.getGoals(decoded.userId);
          return res.json(goals);
          
        case 'tasks':
          const tasks = await storage.getTasks(decoded.userId);
          // Filter tasks if taskType is specified
          if (taskType === 'main') {
            const filteredTasks = tasks.filter(task => task.taskType === 'main' && !task.parentTaskId);
            return res.json(filteredTasks);
          }
          return res.json(tasks);
          
        case 'milestones':
          if (goalId) {
            const goalMilestones = await storage.getMilestones(Number(goalId));
            return res.json(goalMilestones);
          } else {
            const userMilestones = await storage.getMilestonesByUserId(decoded.userId);
            return res.json(userMilestones);
          }
          
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