import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    method: req.method,
    body: req.body,
    env: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    errors: []
  };

  try {
    // Test 1: Can we import auth-handlers?
    diagnostics.importTest = "Starting import test...";
    const authHandlers = await import('../lib/auth-handlers');
    diagnostics.importTest = "Import successful";
    diagnostics.availableFunctions = Object.keys(authHandlers);
    
    // Test 2: Can we import db?
    diagnostics.dbImportTest = "Starting db import test...";
    const dbModule = await import('../lib/db');
    diagnostics.dbImportTest = "DB import successful";
    diagnostics.dbExports = Object.keys(dbModule);
    
    // Test 3: Try to get db instance
    diagnostics.dbInstanceTest = "Getting db instance...";
    try {
      const db = dbModule.getDb();
      diagnostics.dbInstanceTest = "DB instance created";
    } catch (dbError: any) {
      diagnostics.dbInstanceTest = "DB instance failed";
      diagnostics.dbError = {
        message: dbError.message,
        stack: dbError.stack
      };
    }
    
    // Test 4: Check if handleLogin exists
    if (authHandlers.handleLogin) {
      diagnostics.handleLoginExists = true;
      
      // If this is a POST request, try to call handleLogin
      if (req.method === 'POST') {
        try {
          diagnostics.callingHandleLogin = true;
          return authHandlers.handleLogin(req, res);
        } catch (loginError: any) {
          diagnostics.loginError = {
            message: loginError.message,
            stack: loginError.stack
          };
        }
      }
    } else {
      diagnostics.handleLoginExists = false;
    }
    
  } catch (error: any) {
    diagnostics.errors.push({
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
  }

  return res.status(200).json(diagnostics);
}