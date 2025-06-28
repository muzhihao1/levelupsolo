import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;
  
  res.status(200).json({ 
    message: 'Test endpoint working',
    method: req.method,
    action: action || 'no action',
    query: req.query,
    hasEnvVars: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      SUPABASE_DATABASE_URL: !!process.env.SUPABASE_DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    },
    timestamp: new Date().toISOString()
  });
}