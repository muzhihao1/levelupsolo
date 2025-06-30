// Simplified server for Railway deployment (CommonJS)
require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Simple JWT secret with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🚀 Starting Railway server...");
console.log("PORT:", PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ Configured" : "❌ Not configured");
console.log("Current directory:", __dirname);

// Database connection (simple postgres client)
let db = null;
if (process.env.DATABASE_URL) {
  try {
    const postgres = require("postgres");
    const sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      connect_timeout: 30
    });
    db = sql;
    console.log("✅ Database connection initialized");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
} else {
  console.log("⚠️  No DATABASE_URL, running in demo mode only");
}

// Basic middleware
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  let dbStatus = "unknown";
  let dbError = null;
  let tableCheck = null;
  
  if (db) {
    try {
      // Basic connection test
      await db`SELECT 1 as test`;
      dbStatus = "connected";
      
      // Check if users table exists
      try {
        const tableResult = await db`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          ) as exists
        `;
        tableCheck = tableResult[0].exists ? "users table exists" : "users table NOT found";
      } catch (tableError) {
        tableCheck = "Error checking tables: " + tableError.message;
      }
    } catch (error) {
      dbStatus = "error";
      dbError = error.message;
    }
  } else if (!process.env.DATABASE_URL) {
    dbStatus = "not configured";
    dbError = "DATABASE_URL environment variable not set";
  } else {
    dbStatus = "initialization failed";
    dbError = "Database client failed to initialize";
  }
  
  res.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV,
    database: {
      status: dbStatus,
      error: dbError,
      hasUrl: !!process.env.DATABASE_URL,
      urlPreview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + "..." : null,
      tableCheck: tableCheck
    }
  });
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// Debug endpoint to check directory structure
app.get("/api/debug/files", (req, res) => {
  const fs = require("fs");
  const distPath = path.join(__dirname, "..");
  const publicPath = path.join(__dirname, "public");
  
  const result = {
    cwd: process.cwd(),
    __dirname: __dirname,
    distContents: fs.existsSync(distPath) ? fs.readdirSync(distPath) : "dist not found",
    publicExists: fs.existsSync(publicPath),
    publicContents: fs.existsSync(publicPath) ? fs.readdirSync(publicPath).slice(0, 10) : "public not found"
  };
  
  res.json(result);
});

// Debug endpoint to check database users
app.get("/api/debug/users", async (req, res) => {
  if (!db) {
    return res.json({ error: "Database not connected", hasUrl: !!process.env.DATABASE_URL });
  }
  
  try {
    const users = await db`
      SELECT id, email, first_name, last_name, 
             CASE WHEN hashed_password IS NOT NULL THEN true ELSE false END as has_password,
             created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    res.json({
      count: users.length,
      users: users,
      database: "connected"
    });
  } catch (error) {
    res.json({
      error: "Database query failed",
      message: error.message,
      database: "error"
    });
  }
});

// Simple auth endpoints for testing
app.post("/api/auth/simple-login", async (req, res) => {
  const { email, password } = req.body;
  
  console.log("Login attempt:", email);
  
  // Demo login (always available)
  if (email === "demo@levelupsolo.net" && password === "demo1234") {
    const token = jwt.sign({ userId: "demo", email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      success: true,
      accessToken: token,
      refreshToken: token,
      user: {
        id: "demo",
        email: "demo@levelupsolo.net",
        firstName: "Demo",
        lastName: "User"
      }
    });
  }
  
  // Database login
  if (db) {
    try {
      console.log("Querying database for user:", email);
      const users = await db`
        SELECT id, email, first_name, last_name, hashed_password 
        FROM users 
        WHERE email = ${email} 
        LIMIT 1
      `;
      
      if (users.length === 0) {
        console.log("User not found:", email);
        return res.status(401).json({ error: "邮箱或密码错误" });
      }
      
      const user = users[0];
      console.log("User found, verifying password");
      
      if (!user.hashed_password) {
        console.log("No password set for user");
        return res.status(401).json({ error: "邮箱或密码错误" });
      }
      
      const valid = await bcrypt.compare(password, user.hashed_password);
      if (!valid) {
        console.log("Invalid password");
        return res.status(401).json({ error: "邮箱或密码错误" });
      }
      
      console.log("Login successful for:", email);
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        success: true,
        accessToken: token,
        refreshToken: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      });
    } catch (error) {
      console.error("Database error during login:", error);
      res.status(500).json({ 
        error: "数据库错误", 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  } else {
    // No database connection
    console.log("No database connection available");
    res.status(401).json({ error: "Invalid credentials (database not connected)" });
  }
});

// Register endpoint
app.post("/api/auth/register", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  console.log("Register attempt:", email);
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "所有字段都是必填的" });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ error: "密码至少需要8个字符" });
  }
  
  if (!db) {
    return res.status(500).json({ error: "数据库未连接" });
  }
  
  try {
    // Check if user exists
    const existing = await db`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `;
    
    if (existing.length > 0) {
      return res.status(400).json({ error: "该邮箱已被注册" });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db`
      INSERT INTO users (id, email, first_name, last_name, hashed_password, created_at, updated_at)
      VALUES (${userId}, ${email}, ${firstName}, ${lastName}, ${hashedPassword}, NOW(), NOW())
    `;
    
    console.log("User registered successfully:", email);
    
    // Generate token
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      accessToken: token,
      refreshToken: token,
      user: {
        id: userId,
        email: email,
        firstName: firstName,
        lastName: lastName
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      error: "注册失败", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

app.get("/api/auth/user", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Return demo user for backwards compatibility
    return res.json({
      id: "demo",
      email: "demo@levelupsolo.net",
      firstName: "Demo",
      lastName: "User",
      profileImageUrl: null
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // If it's the demo user
    if (decoded.userId === "demo") {
      return res.json({
        id: "demo",
        email: "demo@levelupsolo.net",
        firstName: "Demo",
        lastName: "User",
        profileImageUrl: null
      });
    }
    
    // For real users, fetch from database
    if (db) {
      const users = await db`
        SELECT id, email, first_name, last_name, profile_image_url 
        FROM users 
        WHERE id = ${decoded.userId} 
        LIMIT 1
      `;
      
      if (users.length > 0) {
        const user = users[0];
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          profileImageUrl: user.profile_image_url
        });
      }
    }
    
    // Fallback
    res.json({
      id: decoded.userId,
      email: decoded.email,
      firstName: "User",
      lastName: "",
      profileImageUrl: null
    });
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  // Client files are in dist/public, but server is in dist/
  const clientPath = path.join(__dirname, "public");
  
  console.log("Serving static files from:", clientPath);
  
  // Check if client path exists
  const fs = require("fs");
  if (!fs.existsSync(clientPath)) {
    console.error("⚠️  Client build directory not found:", clientPath);
    console.error("Make sure to run 'npm run build:client' first");
  } else {
    console.log("✅ Client directory found with files:", fs.readdirSync(clientPath).slice(0, 5).join(", "), "...");
  }
  
  // Serve static files with proper error handling
  app.use(express.static(clientPath, {
    fallthrough: true,
    index: false
  }));
  
  // Explicitly handle favicon to avoid errors
  app.get("/favicon.ico", (req, res) => {
    const faviconPath = path.join(clientPath, "favicon.ico");
    res.sendFile(faviconPath, (err) => {
      if (err) {
        console.log("Favicon not found, sending 204");
        res.status(204).end();
      }
    });
  });
  
  // Catch all handler - must be last
  app.get("*", (req, res) => {
    const indexPath = path.join(clientPath, "index.html");
    console.log("Serving index.html for:", req.path);
    
    // Check if index.html exists
    if (!fs.existsSync(indexPath)) {
      console.error("index.html not found at:", indexPath);
      res.status(404).json({ error: "Application not built. Run 'npm run build:client'" });
      return;
    }
    
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("Error serving index.html:", err);
        res.status(404).json({ error: "Page not found" });
      }
    });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  console.error("Stack:", err.stack);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
  console.log("🌐 Railway URL: https://levelupsolo-production.up.railway.app");
  console.log("📁 Server directory:", __dirname);
  console.log("📁 Static files directory:", path.join(__dirname, "public"));
  console.log("\n📍 Test endpoints:");
  console.log(`   - Health: http://0.0.0.0:${PORT}/api/health`);
  console.log(`   - Test: http://0.0.0.0:${PORT}/api/test`);
  console.log(`   - Debug: http://0.0.0.0:${PORT}/api/debug/files`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});