import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

// 设置 CORS
function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 从 Authorization header 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "未授权" });
    }
    
    const token = authHeader.substring(7);
    
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
    
    // 返回解码的 token 信息和数据库查询结果
    const result = {
      tokenInfo: {
        userId: decoded.userId,
        email: decoded.email
      }
    };
    
    // 如果不是 demo 用户，查询数据库
    if (decoded.userId !== 'demo_user') {
      const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
      if (!connectionString) {
        return res.json({
          ...result,
          dbError: "No database connection string"
        });
      }
      
      let client = null;
      try {
        client = postgres(connectionString, {
          ssl: 'require',
          max: 1,
          idle_timeout: 20,
          connect_timeout: 10,
        });
        
        const db = drizzle(client);
        
        // 查询用户的任务数量
        const taskCountResult = await db.execute(
          sql`SELECT COUNT(*) as count FROM tasks WHERE user_id = ${decoded.userId}`
        );
        
        // 查询用户的技能数量
        const skillCountResult = await db.execute(
          sql`SELECT COUNT(*) as count FROM skills WHERE user_id = ${decoded.userId}`
        );
        
        // 查询用户统计信息
        const statsResult = await db.execute(
          sql`SELECT * FROM user_stats WHERE user_id = ${decoded.userId} LIMIT 1`
        );
        
        return res.json({
          ...result,
          dbQueries: {
            taskCount: (taskCountResult as any).rows[0]?.count || 0,
            skillCount: (skillCountResult as any).rows[0]?.count || 0,
            stats: (statsResult as any).rows[0] || null
          }
        });
        
      } catch (dbError) {
        return res.json({
          ...result,
          dbError: dbError instanceof Error ? dbError.message : String(dbError)
        });
      } finally {
        if (client) {
          try {
            await client.end();
          } catch (endError) {
            console.error("Error closing connection:", endError);
          }
        }
      }
    }
    
    return res.json(result);
    
  } catch (error) {
    return res.status(500).json({ 
      message: "Error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}