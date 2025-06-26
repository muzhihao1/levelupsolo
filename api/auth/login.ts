import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getUserByEmail, getUserPassword } from "../../lib/storage";
import { generateTokens } from "../../lib/auth";

// 允许跨域
function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
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
    const data = loginSchema.parse(req.body);
    
    // Demo 登录检查（保持兼容性）
    if (data.email === "demo@levelupsolo.net" && data.password === "demo1234") {
      return res.json({
        message: "登录成功",
        accessToken: "demo_token",
        refreshToken: "demo_refresh_token",
        user: {
          id: "demo_user",
          email: "demo@levelupsolo.net",
          firstName: "Demo",
          lastName: "User",
        }
      });
    }
    
    // 真实用户登录
    const user = await getUserByEmail(data.email);
    if (!user) {
      return res.status(401).json({ message: "邮箱或密码错误" });
    }
    
    // 验证密码
    const hashedPassword = await getUserPassword(user.id);
    if (!hashedPassword) {
      return res.status(401).json({ message: "邮箱或密码错误" });
    }
    
    const isValid = await bcrypt.compare(data.password, hashedPassword);
    if (!isValid) {
      return res.status(401).json({ message: "邮箱或密码错误" });
    }
    
    // 生成 tokens
    const tokens = generateTokens(user.id, user.email!);
    
    res.json({
      message: "登录成功",
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
    console.error("Login error:", error);
    res.status(500).json({ message: "登录失败" });
  }
}