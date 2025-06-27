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
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: "刷新令牌是必需的" });
    }
    
    // 验证 refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'demo-secret') as any;
    
    // 生成新的 tokens
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '7d' }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, type: 'refresh' },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '30d' }
    );
    
    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
    
  } catch (error) {
    console.error("Refresh token error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的刷新令牌" });
    }
    return res.status(500).json({ message: "刷新令牌失败" });
  }
}