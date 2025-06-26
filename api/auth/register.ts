import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from "zod";
import bcrypt from "bcryptjs";
import { storage } from "../../server/storage";
import * as auth from "../../server/auth-jwt";

// 允许跨域
function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const data = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({ message: "该邮箱已被注册" });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Create user with password
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await storage.upsertUser({
      id: userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      profileImageUrl: null,
      hashedPassword,
    });
    
    // Generate tokens
    const tokens = auth.generateTokens(userId, data.email);
    
    res.json({
      message: "注册成功",
      ...tokens,
      user: {
        id: userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "输入数据无效", errors: error.errors });
    }
    console.error("Registration error:", error);
    res.status(500).json({ message: "注册失败" });
  }
}