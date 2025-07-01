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

  // In production, require authentication
  if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // In development, allow demo user for testing
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
    // Only in development: ensure demo user exists
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
    console.error("Demo user setup error:", error);
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
  
  // Login handler function
  const loginHandler = async (req: any, res: any) => {
    console.log("=== LOGIN ATTEMPT START ===");
    console.log("Request body:", JSON.stringify(req.body));
    console.log("Environment:", process.env.NODE_ENV);
    
    try {
      // Step 1: Validate input
      console.log("Step 1: Validating input...");
      const data = loginSchema.parse(req.body);
      console.log("Input validated successfully");
      
      // Step 2: Check database connection
      console.log("Step 2: Testing database connection...");
      try {
        // Test query
        const testQuery = await storage.getUserByEmail('test@test.com');
        console.log("Database connection OK");
      } catch (dbError) {
        console.error("Database connection FAILED:", dbError);
        console.error("Database error details:", {
          message: (dbError as any).message,
          code: (dbError as any).code,
          detail: (dbError as any).detail
        });
      }
      
      // Step 3: Get user by email
      console.log("Step 3: Getting user by email:", data.email);
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        console.log("User not found for email:", data.email);
        return res.status(401).json({ message: "邮箱或密码错误" });
      }
      console.log("User found:", { id: user.id, email: user.email });
      
      // Step 4: Get password
      console.log("Step 4: Getting user password...");
      const hashedPassword = await storage.getUserPassword(user.id);
      if (!hashedPassword) {
        console.log("No password found for user:", user.id);
        return res.status(401).json({ message: "邮箱或密码错误" });
      }
      console.log("Password hash retrieved");
      
      // Step 5: Verify password
      console.log("Step 5: Verifying password...");
      const isValid = await bcrypt.compare(data.password, hashedPassword);
      if (!isValid) {
        console.log("Invalid password for user:", user.id);
        return res.status(401).json({ message: "邮箱或密码错误" });
      }
      console.log("Password verified successfully");
      
      // Step 6: Generate tokens
      console.log("Step 6: Generating tokens...");
      const tokens = auth.generateTokens(user.id, user.email);
      console.log("Tokens generated successfully");
      
      // Step 7: Send response
      console.log("Step 7: Sending success response");
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
      console.log("=== LOGIN ATTEMPT SUCCESS ===");
    } catch (error) {
      console.error("=== LOGIN ATTEMPT FAILED ===");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", (error as any)?.message);
      console.error("Error code:", (error as any)?.code);
      console.error("Error detail:", (error as any)?.detail);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      console.error("Error stack:", (error as any)?.stack);
      
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", error.errors);
        return res.status(400).json({ message: "输入数据无效", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: "登录失败",
        error: (error as any)?.message || "Unknown error",
        code: (error as any)?.code,
        type: error?.constructor?.name
      });
    }
  };
  
  // Register both login endpoints (for compatibility)
  app.post("/api/auth/login", loginHandler);
  app.post("/api/auth/simple-login", loginHandler);
  
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