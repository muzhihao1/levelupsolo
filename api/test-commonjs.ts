import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test that we can use require now
    const authHandlers = require('./lib/auth-handlers');
    
    return res.status(200).json({
      message: "CommonJS test successful",
      timestamp: new Date().toISOString(),
      hasAuthHandlers: !!authHandlers,
      handlerKeys: Object.keys(authHandlers || {})
    });
  } catch (error: any) {
    return res.status(200).json({
      message: "CommonJS test failed",
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
  }
}