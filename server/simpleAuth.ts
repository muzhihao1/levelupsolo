import { type RequestHandler, type Express } from "express";
import { storage } from "./storage";
import * as auth from "./auth-jwt";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Schema for registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// Schema for login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// JWT-based authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check for JWT token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = auth.verifyAccessToken(token);
      const user = await storage.getUser(decoded.userId);
      if (user) {
        (req as any).user = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          }
        };
        return next();
      }
    } catch (error) {
      // Token invalid, continue to check session
    }
  }

  // For web app compatibility - use demo user if no auth
  const demoUser = {
    claims: {
      sub: "31581595",
      email: "demo@levelupsolo.net",
      first_name: "Demo",
      last_name: "User",
      profile_image_url: null
    }
  };
  
  try {
    // Ensure demo user exists
    await storage.upsertUser({
      id: demoUser.claims.sub,
      email: demoUser.claims.email,
      firstName: demoUser.claims.first_name,
      lastName: demoUser.claims.last_name,
      profileImageUrl: demoUser.claims.profile_image_url,
    });
    
    (req as any).user = demoUser;
    return next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ message: "Authentication failed" });
  }
};

export async function setupAuth(app: Express) {
  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
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
  });
  
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      // Get user by email
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "邮箱或密码错误" });
      }
      
      // Verify password
      const hashedPassword = await storage.getUserPassword(user.id);
      if (!hashedPassword) {
        return res.status(401).json({ message: "邮箱或密码错误" });
      }
      
      const isValid = await bcrypt.compare(data.password, hashedPassword);
      if (!isValid) {
        return res.status(401).json({ message: "邮箱或密码错误" });
      }
      
      // Generate tokens
      const tokens = auth.generateTokens(user.id, user.email);
      
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
  });
  
  // Refresh token endpoint
  app.post("/api/auth/refresh", auth.refreshToken);
  
  // Get current user endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Logout endpoint (for compatibility)
  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "已登出" });
  });
}