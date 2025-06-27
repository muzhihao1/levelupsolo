import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getUserByEmail, createUser } from "../../lib/storage.js";
import { generateTokens } from "../../lib/auth.js";

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
    
    // 检查用户是否已存在
    const existingUser = await getUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({ message: "该邮箱已被注册" });
    }
    
    // 哈希密码
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // 创建用户
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = await createUser({
      id: userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      profileImageUrl: null,
      hashedPassword,
    });
    
    // 生成 tokens
    const tokens = generateTokens(user.id, user.email!);
    
    res.json({
      message: "注册成功",
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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