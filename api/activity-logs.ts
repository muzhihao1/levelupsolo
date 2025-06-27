import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { storage } from './_lib/storage';

// 设置 CORS
function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    
    // 只支持 GET 方法获取活动日志
    if (req.method === 'GET') {
      // Demo 用户返回空数组
      if (decoded.userId === 'demo_user') {
        return res.json([]);
      }
      
      // 真实用户 - 获取活动日志
      const logs = await storage.getActivityLogs(decoded.userId);
      return res.json(logs);
    }
    
    return res.status(405).json({ message: "方法不允许" });
    
  } catch (error) {
    console.error("Activity logs error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ 
      message: "获取活动日志失败",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}