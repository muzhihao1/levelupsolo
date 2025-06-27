import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

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
        id: "demo_user",
        email: "demo@levelupsolo.net",
        firstName: "Demo",
        lastName: "User",
        hasCompletedOnboarding: true,
      });
    }
    
    // 真实用户 - 暂时返回基本信息
    return res.json({
      id: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName || "",
      lastName: decoded.lastName || "",
      hasCompletedOnboarding: true,
    });
    
  } catch (error) {
    console.error("Get user error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ message: "获取用户信息失败" });
  }
}