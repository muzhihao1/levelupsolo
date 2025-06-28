import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      hasDBUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    },
    // 测试数据库URL是否相同
    dbUrlsMatch: process.env.DATABASE_URL === process.env.SUPABASE_DATABASE_URL,
    // 环境变量总数
    envCount: Object.keys(process.env).length,
  });
}