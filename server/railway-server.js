// Simplified server for Railway deployment (CommonJS)
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🚀 Starting Railway server...");
console.log("PORT:", PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Current directory:", __dirname);

// Basic middleware
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV,
    database: !!process.env.DATABASE_URL ? "configured" : "not configured"
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

// Simple auth endpoints for testing
app.post("/api/auth/simple-login", (req, res) => {
  const { email, password } = req.body;
  
  console.log("Login attempt:", email);
  
  // Demo login
  if (email === "demo@levelupsolo.net" && password === "demo1234") {
    const token = "demo-token-" + Date.now();
    res.json({
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
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get("/api/auth/user", (req, res) => {
  // Return demo user for now
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