import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow this endpoint in development or with a secret key
  const secretKey = req.headers['x-debug-key'];
  if (process.env.NODE_ENV === 'production' && secretKey !== process.env.DEBUG_KEY) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Check environment variables (hide sensitive values)
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ Missing',
    SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL ? '✓ Set' : '✗ Missing',
    JWT_SECRET: process.env.JWT_SECRET ? '✓ Set' : '✗ Missing',
    SESSION_SECRET: process.env.SESSION_SECRET ? '✓ Set' : '✗ Missing',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing',
  };

  // Check if database URLs match (they should according to the deployment guide)
  const dbUrlsMatch = process.env.DATABASE_URL === process.env.SUPABASE_DATABASE_URL;

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: envCheck,
    dbUrlsMatch,
    recommendation: !process.env.SUPABASE_DATABASE_URL && process.env.DATABASE_URL 
      ? 'Set SUPABASE_DATABASE_URL to the same value as DATABASE_URL'
      : null
  });
}