import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users } from '../../shared/schema';

// 设置 CORS
export function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Login handler
export async function handleLogin(req: VercelRequest, res: VercelResponse) {
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
    
    let client = null;
    
    try {
      client = postgres(connectionString, {
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
      
      // 特殊处理：如果是 279838958@qq.com，使用旧系统的用户ID
      let userId = user.id;
      if (email === "279838958@qq.com") {
        userId = "31581595";
      }
      
      const token = jwt.sign(
        { userId, email: user.email! },
        process.env.JWT_SECRET || 'demo-secret',
        { expiresIn: '7d' }
      );
      
      const refreshToken = jwt.sign(
        { userId, email: user.email!, type: 'refresh' },
        process.env.JWT_SECRET || 'demo-secret',
        { expiresIn: '30d' }
      );
      
      return res.json({
        message: "登录成功",
        accessToken: token,
        refreshToken: refreshToken,
        user: {
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
      
    } finally {
      if (client) {
        await client.end();
      }
    }
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      message: "登录失败",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Refresh token handler
export async function handleRefresh(req: VercelRequest, res: VercelResponse) {
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

// Get user handler
export async function handleGetUser(req: VercelRequest, res: VercelResponse) {
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
      firstName: "",
      lastName: "",
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