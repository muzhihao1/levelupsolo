import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token } = req.body || {};
  
  if (!token) {
    return res.status(400).json({ error: "Token required" });
  }
  
  try {
    // Try to decode without verification first
    const decoded = jwt.decode(token);
    
    // Try to verify with the environment JWT_SECRET
    let verified = null;
    let verifyError = null;
    
    try {
      verified = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
    } catch (e) {
      verifyError = e.message;
    }
    
    return res.json({
      decoded,
      verified: !!verified,
      verifyError,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    });
  } catch (error) {
    return res.status(400).json({ 
      error: "Failed to decode token",
      message: error.message 
    });
  }
}