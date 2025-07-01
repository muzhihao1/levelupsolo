// Simplified authentication system
import { Express } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

// Simple JWT secret with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register schema  
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// Generate JWT token
function generateToken(userId: string, email: string) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// Simple auth middleware
export async function simpleAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.user = decoded;
      return next();
    }
  }
  
  // For demo purposes, allow unauthenticated access
  req.user = { userId: 'demo', email: 'demo@levelupsolo.net' };
  next();
}

export function setupSimpleAuth(app: Express) {
  // Health check for auth
  app.get('/api/auth/status', (req, res) => {
    res.json({
      healthy: true,
      hasJWT: !!process.env.JWT_SECRET,
      hasDB: !!process.env.DATABASE_URL || !!process.env.SUPABASE_DATABASE_URL,
    });
  });

  // Login endpoint
  app.post('/api/auth/simple-login', async (req, res) => {
    console.log('=== SIMPLE LOGIN START ===');
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      hasDB: !!db,
      hasJWT: !!process.env.JWT_SECRET,
      hasRefreshJWT: !!process.env.JWT_REFRESH_SECRET
    });
    
    try {
      // 1. Parse input
      const { email, password } = loginSchema.parse(req.body);
      console.log('Login attempt for:', email);
      
      // 2. Check if database is available
      if (!db) {
        console.error('No database connection available');
        console.error('Database check:', {
          dbModule: !!db,
          hasURL: !!process.env.DATABASE_URL || !!process.env.SUPABASE_DATABASE_URL,
          nodeEnv: process.env.NODE_ENV
        });
        
        // In production, don't fall back to demo mode
        if (process.env.NODE_ENV === 'production') {
          return res.status(503).json({ 
            error: 'Service temporarily unavailable',
            details: 'Database connection error. Please try again later.'
          });
        }
        
        // Development only: demo mode
        if (email === 'demo@levelupsolo.net' && password === 'demo1234') {
          const token = generateToken('demo', email);
          return res.json({
            success: true,
            accessToken: token,
            refreshToken: token,
            user: { id: 'demo', email, firstName: 'Demo', lastName: 'User' }
          });
        }
        return res.status(401).json({ error: 'Invalid credentials (DB unavailable)' });
      }
      
      // 3. Find user in database
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        
        if (!user) {
          console.log('User not found:', email);
          return res.status(401).json({ error: '邮箱或密码错误' });
        }
        
        if (!user.hashedPassword) {
          console.error('User exists but no password hash:', {
            userId: user.id,
            email: user.email,
            hasPassword: !!user.hashedPassword,
            fields: Object.keys(user)
          });
          return res.status(401).json({ error: '账户配置错误，请联系管理员' });
        }
        
        // 4. Verify password
        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) {
          console.log('Invalid password');
          return res.status(401).json({ error: '邮箱或密码错误' });
        }
        
        // 5. Generate token
        const token = generateToken(user.id, user.email!);
        console.log('Login successful');
        
        res.json({
          success: true,
          accessToken: token,
          refreshToken: token, // Same token for simplicity
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        });
      } catch (dbError) {
        console.error('Database query error:', {
          error: (dbError as any).message,
          code: (dbError as any).code,
          detail: (dbError as any).detail
        });
        
        // In production, don't expose demo mode
        if (process.env.NODE_ENV === 'production') {
          return res.status(500).json({ 
            error: '服务暂时不可用',
            requestId: Date.now().toString()
          });
        }
        
        // Development: Allow demo mode and show error details
        if (email === 'demo@levelupsolo.net' && password === 'demo1234') {
          const token = generateToken('demo', email);
          return res.json({
            success: true,
            accessToken: token,
            refreshToken: token,
            user: { id: 'demo', email, firstName: 'Demo', lastName: 'User' }
          });
        }
        
        return res.status(500).json({ 
          error: 'Database error',
          details: (dbError as any).message
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: '输入数据无效' });
      }
      return res.status(500).json({ error: '登录失败' });
    }
  });

  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    console.log('=== REGISTER START ===');
    
    try {
      const data = registerSchema.parse(req.body);
      
      if (!db) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Check if user exists
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);
      
      if (existing) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create user
      const userId = `user_${Date.now()}`;
      const [newUser] = await db
        .insert(users)
        .values({
          id: userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          hashedPassword,
        })
        .returning();
      
      // Generate token
      const token = generateToken(newUser.id, newUser.email!);
      
      res.json({
        success: true,
        accessToken: token,
        refreshToken: token, // Same token for simplicity
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: '输入数据无效' });
      }
      return res.status(500).json({ error: '注册失败' });
    }
  });

  // Get current user
  app.get('/api/auth/user', simpleAuth, async (req: any, res) => {
    try {
      const { userId, email } = req.user;
      
      // For demo user, return static data
      if (userId === 'demo') {
        return res.json({
          id: 'demo',
          email: 'demo@levelupsolo.net',
          firstName: 'Demo',
          lastName: 'User',
          profileImageUrl: null
        });
      }
      
      // For real users, fetch from database
      if (db) {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          
          if (user) {
            return res.json({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl
            });
          }
        } catch (dbError) {
          console.error('Error fetching user from DB:', dbError);
        }
      }
      
      // Fallback response
      res.json({
        id: userId,
        email: email,
        firstName: 'User',
        lastName: '',
        profileImageUrl: null
      });
    } catch (error) {
      console.error('Error in /api/auth/user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Logout (client-side only)
  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
  });
}