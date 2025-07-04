import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, userProfiles, userStats, skills } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const JWT_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

// Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Generate tokens
export function generateAccessToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

// Middleware to authenticate token
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    req.user = decoded as { userId: string; email: string };
    next();
  });
};

// Register endpoint
export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.parse(req.body);
    
    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, parsed.email))
      .limit(1);
      
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(parsed.password, 10);
    
    // Create user
    const [newUser] = await db.insert(users).values({
      email: parsed.email,
      passwordHash: hashedPassword,
      createdAt: new Date(),
    }).returning();
    
    // Create user profile
    await db.insert(userProfiles).values({
      userId: newUser.id,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
    });
    
    // Create user stats
    await db.insert(userStats).values({
      userId: newUser.id,
    });
    
    // Initialize skills
    const skillNames = ['身体', '情绪', '思维', '人际关系', '财务', '意志力'];
    await db.insert(skills).values(
      skillNames.map(name => ({
        userId: newUser.id,
        name,
        level: 1,
        experience: 0,
      }))
    );
    
    // Generate tokens
    const accessToken = generateAccessToken(newUser.id, newUser.email);
    const refreshToken = generateRefreshToken(newUser.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

// Login endpoint
export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.parse(req.body);
    
    // Find user
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, parsed.email))
      .limit(1);
      
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// Refresh token endpoint
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };
    
    if (decoded.type !== "refresh") {
      return res.status(403).json({ error: "Invalid token type" });
    }
    
    // Get user
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);
      
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id);
    
    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};

// Get current user endpoint
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(users.id, userId))
    .limit(1);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
};