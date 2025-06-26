import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users, userStats, userProfiles } from '../shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

// JWT Token 类型
interface JWTPayload {
  userId: string;
  email: string;
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// 生成 Token
export function generateTokens(userId: string, email: string) {
  const payload: JWTPayload = { userId, email };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '15m' 
  });
  
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: '7d' 
  });
  
  return { accessToken, refreshToken };
}

// 验证 Access Token (同步方法)
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// 验证 Token 中间件
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = decoded as JWTPayload;
    next();
  });
}

// 刷新 Token
export async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JWTPayload;
    const tokens = generateTokens(decoded.userId, decoded.email);
    
    res.json(tokens);
  } catch (err) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
}

// 注册新用户
export async function register(req: Request, res: Response) {
  const { email, password, firstName, lastName } = req.body;
  
  try {
    // 检查用户是否已存在
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.email, email));
      
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // 创建新用户（移动端用户 ID 使用 email 的 hash）
    const userId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 插入用户
    await db.insert(users).values({
      id: userId,
      email,
      firstName,
      lastName,
      // 移动端用户密码存储在 profileImageUrl 字段（临时方案）
      profileImageUrl: hashedPassword
    });
    
    // 创建用户统计
    await db.insert(userStats).values({
      userId
    });
    
    // 创建用户资料
    if (firstName || lastName) {
      await db.insert(userProfiles).values({
        userId,
        name: `${firstName || ''} ${lastName || ''}`.trim() || email
      });
    }
    
    // 生成 token
    const tokens = generateTokens(userId, email);
    
    res.status(201).json({
      message: 'User created successfully',
      ...tokens,
      user: {
        id: userId,
        email,
        firstName,
        lastName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

// 登录
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  
  try {
    // 查找用户
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email));
      
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // 验证密码（临时从 profileImageUrl 字段读取）
    const isValidPassword = await bcrypt.compare(password, user.profileImageUrl || '');
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // 生成 token
    const tokens = generateTokens(user.id, user.email!);
    
    res.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

// 获取当前用户信息
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
      
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 不返回密码字段
    const { profileImageUrl, ...safeUser } = user;
    
    res.json(safeUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}