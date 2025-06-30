// Ultra-simplified server for Railway with minimal database
require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

console.log("🚀 Starting simplified Railway server...");
console.log("PORT:", PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);

// Basic middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// In-memory user storage for demo
const users = new Map();
users.set("demo@levelupsolo.net", {
  id: "demo",
  email: "demo@levelupsolo.net",
  firstName: "Demo",
  lastName: "User",
  hashedPassword: "$2a$10$YourHashedPasswordHere" // demo1234
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV,
    mode: "demo-only",
    database: {
      status: "disabled",
      reason: "Using in-memory storage for demo"
    }
  });
});

// Simple login - demo only
app.post("/api/auth/simple-login", async (req, res) => {
  const { email, password } = req.body;
  
  console.log("Login attempt:", email);
  
  // Demo account
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
  
  res.status(401).json({ error: "邮箱或密码错误" });
});

// Register - demo only
app.post("/api/auth/register", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  console.log("Register attempt:", email);
  
  if (users.has(email)) {
    return res.status(400).json({ error: "该邮箱已被注册" });
  }
  
  const userId = `user_${Date.now()}`;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  users.set(email, {
    id: userId,
    email,
    firstName,
    lastName,
    hashedPassword
  });
  
  const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({
    success: true,
    accessToken: token,
    refreshToken: token,
    user: { id: userId, email, firstName, lastName }
  });
});

// Get user
app.get("/api/auth/user", (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({
      id: "demo",
      email: "demo@levelupsolo.net",
      firstName: "Demo",
      lastName: "User",
      profileImageUrl: null
    });
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.get(decoded.email);
    
    if (user) {
      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: null
      });
    }
  } catch (error) {
    // Ignore token errors
  }
  
  res.json({
    id: "demo",
    email: "demo@levelupsolo.net",
    firstName: "Demo",
    lastName: "User",
    profileImageUrl: null
  });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "public");
  
  console.log("Serving static files from:", clientPath);
  
  app.use(express.static(clientPath, {
    fallthrough: true,
    index: false
  }));
  
  app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
  });
  
  app.get("*", (req, res) => {
    const indexPath = path.join(clientPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).json({ error: "Page not found" });
      }
    });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
  console.log("🌐 Railway URL: https://levelupsolo-production.up.railway.app");
  console.log("📌 Mode: Demo only (no database)");
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});