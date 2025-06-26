import { type RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication middleware for production
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // For now, always use the demo user
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
    // Ensure user exists in database
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

export async function setupAuth(app: any) {
  // Simple login endpoint
  app.get("/api/login", async (req: any, res: any) => {
    // Redirect to home, auth is handled by middleware
    res.redirect("/");
  });
  
  // Simple logout endpoint
  app.get("/api/logout", (req: any, res: any) => {
    res.redirect("/");
  });
  
  // User info endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}