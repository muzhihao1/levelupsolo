import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// 创建连接池配置
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // 连接池优化参数
  max: 20, // 最大连接数
  min: 5,  // 最小连接数
  idleTimeoutMillis: 30000, // 空闲连接超时（30秒）
  connectionTimeoutMillis: 5000, // 连接超时（5秒）
  maxUses: 7500, // 单个连接最大使用次数
};

// 创建全局连接池实例
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);
    
    // 连接池错误处理
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // 连接池监控
    pool.on('connect', () => {
      console.log('New client connected to pool');
    });

    pool.on('acquire', () => {
      const totalCount = pool!.totalCount;
      const idleCount = pool!.idleCount;
      const waitingCount = pool!.waitingCount;
      
      if (waitingCount > 5) {
        console.warn(`High connection pool load: ${waitingCount} waiting, ${idleCount} idle, ${totalCount} total`);
      }
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