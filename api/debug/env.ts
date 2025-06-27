import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow in development or with special header
  if (process.env.NODE_ENV === 'production' && req.headers['x-debug-key'] !== 'levelup-debug-2024') {
    return res.status(404).json({ message: 'Not found' });
  }

  res.json({
    message: 'Environment configuration',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      // List all env vars (without values) for debugging
      availableKeys: Object.keys(process.env).filter(k => 
        !k.includes('SECRET') && 
        !k.includes('KEY') && 
        !k.includes('PASSWORD') &&
        !k.includes('DATABASE_URL')
      ).sort(),
    },
    timestamp: new Date().toISOString(),
  });
}