import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: "API is working",
    env: {
      hasJWT: !!process.env.JWT_SECRET,
      hasDB: !!process.env.DATABASE_URL,
      hasSupabaseDB: !!process.env.SUPABASE_DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  });
}