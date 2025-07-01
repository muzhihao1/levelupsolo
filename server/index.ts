import "dotenv/config";

// Run startup diagnostics
if (process.env.NODE_ENV === 'production') {
  try {
    require('./startup-check');
  } catch (e) {
    console.error("Startup check failed:", e);
  }
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import aiRoutes from "./ai";
import { registerMobileRoutes } from "./mobile-routes";
import { setupAuth } from "./simpleAuth";
import { setupSimpleAuth } from "./auth-simple";

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

const app = express();

// Security middleware - always apply security headers
app.use((req, res, next) => {
  // Force HTTPS redirect for non-secure requests
  const isSecure = req.secure || req.header('x-forwarded-proto') === 'https';
  if (!isSecure && req.header('host')?.includes('levelupsolo.net')) {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  
  // Enhanced security headers for all environments
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  
  // Comprehensive Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.openai.com https://*.supabase.co wss: ws:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  
  // Additional security headers
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('🚀 Server starting...');
  console.log('Environment variables check:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- PORT:', process.env.PORT);
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
  
  try {
    // Run database migrations before registering routes
    if (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL) {
      console.log('🔄 Running startup migrations...');
      try {
        const { runStartupMigrations } = require('./startup-migrations');
        await runStartupMigrations();
      } catch (migrationError) {
        console.error('⚠️  Migration error (non-fatal):', migrationError);
        // Continue startup even if migrations fail
      }
    }
    
    console.log('📝 Registering routes...');
    const server = await registerRoutes(app);
    console.log('✅ Routes registered successfully');
    
    console.log('🔐 Setting up authentication...');
    // Setup new simple authentication
    setupSimpleAuth(app);
    console.log('✅ Simple authentication setup complete');
    
    console.log('📱 Registering mobile routes...');
    // Register mobile routes with JWT authentication
    registerMobileRoutes(app);
    console.log('✅ Mobile routes registered');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Express error handler:', {
        status,
        message,
        error: err,
        stack: err.stack
      });

      res.status(status).json({ message });
      // Don't throw the error, it will crash the server
      // throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    console.log(`🔧 Setting up ${process.env.NODE_ENV} environment`);
    
    if (process.env.NODE_ENV === "production") {
      console.log("📦 Production mode: Serving static files");
      serveStatic(app);
    } else {
      console.log("🔧 Development mode: Setting up Vite");
      await setupVite(app, server);
    }

    // Serve the app on port 3000 for development (5000 is in use)
    // this serves both the API and the client.
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
      console.log(`🌐 Visit http://localhost:${port}`);
      console.log('🔍 Health check: /api/health');
      console.log('🔍 Simple test: /api/test/simple');
    });
  } catch (error) {
    console.error('💥 Server startup failed:', error);
    console.error('Error details:', {
      message: (error as any).message,
      stack: (error as any).stack,
      code: (error as any).code
    });
    process.exit(1);
  }
})();
