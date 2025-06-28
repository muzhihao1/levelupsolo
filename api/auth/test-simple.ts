import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple test response
  try {
    // Test if we can access environment variables
    const envTest = {
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    };

    // Try to do a simple bcryptjs operation
    let bcryptTest = "not tested";
    try {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash("test", 10);
      bcryptTest = hash ? "working" : "failed";
    } catch (e: any) {
      bcryptTest = `error: ${e.message}`;
    }

    // Try to import drizzle-orm
    let drizzleTest = "not tested";
    try {
      const drizzle = await import('drizzle-orm');
      drizzleTest = drizzle ? "imported" : "failed";
    } catch (e: any) {
      drizzleTest = `error: ${e.message}`;
    }

    // Try to import neon
    let neonTest = "not tested";
    try {
      const neon = await import('@neondatabase/serverless');
      neonTest = neon ? "imported" : "failed";
    } catch (e: any) {
      neonTest = `error: ${e.message}`;
    }

    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      env: envTest,
      tests: {
        bcrypt: bcryptTest,
        drizzle: drizzleTest,
        neon: neonTest
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      error: error.message,
      stack: error.stack
    });
  }
}