// Simplified server for Railway deployment
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🚀 Starting Railway server...");
console.log("PORT:", PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);

// Basic middleware
app.use(express.json());

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

// Simple auth endpoints for testing
app.post("/api/auth/simple-login", (req, res) => {
  const { email, password } = req.body;
  
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
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientPath = path.join(__dirname, "../dist");
  
  console.log("Serving static files from:", clientPath);
  
  app.use(express.static(clientPath));
  
  // Catch all handler
  app.get("*", (req, res) => {
    const indexPath = path.join(clientPath, "index.html");
    console.log("Serving index.html from:", indexPath);
    res.sendFile(indexPath);
  });
}

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
  console.log("🌐 Railway URL: https://levelupsolo-production.up.railway.app");
});