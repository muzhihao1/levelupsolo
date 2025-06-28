import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;
    
    // Demo login - no database needed
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
    
    // For now, just return error for non-demo users
    return res.status(401).json({ message: "邮箱或密码错误" });
    
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      message: "登录失败",
      error: error.message
    });
  }
}