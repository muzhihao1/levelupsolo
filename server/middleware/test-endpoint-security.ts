import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to protect test endpoints in production
 */
export function testEndpointSecurity(req: Request, res: Response, next: NextFunction) {
  // Check if this is a test endpoint
  if (req.path.startsWith('/api/test/')) {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'This endpoint is not available in production'
      });
    }
    
    // Log access in development
    console.log(`[TEST ENDPOINT] ${req.method} ${req.path} accessed`);
  }
  
  next();
}