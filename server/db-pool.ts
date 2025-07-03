import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// 创建连接池配置
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // 连接池优化参数 - 针对Supabase Pooler优化
  max: 10, // 降低最大连接数，Supabase pooler有限制
  min: 2,  // 降低最小连接数
  idleTimeoutMillis: 10000, // 降低空闲超时到10秒
  connectionTimeoutMillis: 30000, // 增加连接超时到30秒
  maxUses: 1000, // 降低单个连接最大使用次数
  // Supabase pooler特定配置
  statement_timeout: 60000, // 语句超时60秒
  query_timeout: 60000, // 查询超时60秒
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// 创建全局连接池实例
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    console.log('[DB Pool] Creating new connection pool...');
    pool = new Pool(poolConfig);
    
    // 连接池错误处理
    pool.on('error', (err, client) => {
      console.error('[DB Pool] Unexpected error on idle client', err);
      console.error('[DB Pool] Error details:', {
        message: err.message,
        code: (err as any).code,
        routine: (err as any).routine,
        severity: (err as any).severity
      });
      
      // 如果是连接错误，尝试重置连接池
      if ((err as any).code === 'ECONNRESET' || (err as any).code === 'ETIMEDOUT') {
        console.log('[DB Pool] Connection error detected, will recreate pool on next request');
        pool = null;
      }
    });

    // 连接池监控
    pool.on('connect', (client) => {
      console.log('[DB Pool] New client connected');
    });

    pool.on('acquire', (client) => {
      const totalCount = pool!.totalCount;
      const idleCount = pool!.idleCount;
      const waitingCount = pool!.waitingCount;
      
      if (waitingCount > 3) {
        console.warn(`[DB Pool] High load: ${waitingCount} waiting, ${idleCount} idle, ${totalCount} total`);
      }
    });

    pool.on('remove', (client) => {
      console.log('[DB Pool] Client removed from pool');
    });
  }

  return pool;
}

// 创建优化的数据库实例
export function getDb() {
  const pool = getPool();
  return drizzle(pool);
}

// 健康检查函数
export async function checkPoolHealth(): Promise<{
  healthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
}> {
  const pool = getPool();
  
  try {
    // 尝试获取连接
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    return {
      healthy: true,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
    };
  } catch (error) {
    console.error('Pool health check failed:', error);
    return {
      healthy: false,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
    };
  }
}

// 优雅关闭连接池
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing connection pool:', error);
    }
  }
}

// 进程退出时清理
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});