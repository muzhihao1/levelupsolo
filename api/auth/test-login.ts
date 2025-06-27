import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test 1: Can we import modules?
    let bcryptLoaded = false;
    let zLoaded = false;
    
    try {
      const bcrypt = await import('bcryptjs');
      bcryptLoaded = true;
    } catch (e) {
      console.error("Failed to import bcryptjs:", e);
    }
    
    try {
      const { z } = await import('zod');
      zLoaded = true;
    } catch (e) {
      console.error("Failed to import zod:", e);
    }
    
    // Test 2: Can we import our modules?
    let storageLoaded = false;
    let authLoaded = false;
    
    try {
      await import('../../lib/storage');
      storageLoaded = true;
    } catch (e) {
      console.error("Failed to import storage:", e);
    }
    
    try {
      await import('../../lib/auth');
      authLoaded = true;
    } catch (e) {
      console.error("Failed to import auth:", e);
    }
    
    return res.status(200).json({
      message: "Test login diagnostics",
      imports: {
        bcrypt: bcryptLoaded,
        zod: zLoaded,
        storage: storageLoaded,
        auth: authLoaded,
      },
      body: req.body,
      method: req.method,
    });
  } catch (error) {
    return res.status(500).json({ 
      error: "Test failed", 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}