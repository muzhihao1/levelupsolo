import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface CacheEntry {
  data: any;
  etag: string;
  timestamp: number;
}

// 内存缓存
const cache = new Map<string, CacheEntry>();

// 缓存配置
const CACHE_DURATION = {
  // 静态数据缓存时间较长
  skills: 30 * 60 * 1000, // 30分钟
  profile: 5 * 60 * 1000,  // 5分钟
  // 动态数据缓存时间较短
  tasks: 2 * 60 * 1000,    // 2分钟
  goals: 2 * 60 * 1000,    // 2分钟
  stats: 1 * 60 * 1000,    // 1分钟
  activity: 30 * 1000,     // 30秒
  default: 1 * 60 * 1000   // 默认1分钟
};

// 生成ETag
function generateETag(data: any): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

// 获取缓存时长
function getCacheDuration(url: string): number {
  if (url.includes('/skills')) return CACHE_DURATION.skills;
  if (url.includes('/profile')) return CACHE_DURATION.profile;
  if (url.includes('/tasks')) return CACHE_DURATION.tasks;
  if (url.includes('/goals')) return CACHE_DURATION.goals;
  if (url.includes('/stats')) return CACHE_DURATION.stats;
  if (url.includes('/activity')) return CACHE_DURATION.activity;
  return CACHE_DURATION.default;
}

// 缓存中间件
export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  // 只缓存GET请求
  if (req.method !== 'GET') {
    return next();
  }

  // 检查用户是否已认证
  const user = (req as any).user;
  if (!user || !user.id || user.id === 'demo') {
    // 不缓存未认证或demo用户的请求
    return next();
  }

  // 构建缓存键
  const userId = user.id;
  const cacheKey = `${userId}:${req.originalUrl}`;

  // 检查缓存
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry) {
    const now = Date.now();
    const cacheDuration = getCacheDuration(req.originalUrl);
    
    // 检查缓存是否过期
    if (now - cachedEntry.timestamp < cacheDuration) {
      // 检查客户端缓存
      const clientETag = req.headers['if-none-match'];
      if (clientETag === cachedEntry.etag) {
        // 客户端缓存仍然有效
        return res.status(304).end();
      }

      // 返回缓存数据
      res.setHeader('ETag', cachedEntry.etag);
      res.setHeader('Cache-Control', `private, max-age=${Math.floor(cacheDuration / 1000)}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedEntry.data);
    } else {
      // 缓存过期，删除
      cache.delete(cacheKey);
    }
  }

  // 拦截响应
  const originalJson = res.json;
  res.json = function(data: any) {
    // 存储到缓存
    const etag = generateETag(data);
    cache.set(cacheKey, {
      data,
      etag,
      timestamp: Date.now()
    });

    // 设置响应头
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', `private, max-age=${Math.floor(getCacheDuration(req.originalUrl) / 1000)}`);
    res.setHeader('X-Cache', 'MISS');

    // 调用原始json方法
    return originalJson.call(this, data);
  };

  next();
}

// 清除特定用户的缓存
export function clearUserCache(userId: string, pattern?: string) {
  const keysToDelete: string[] = [];
  
  cache.forEach((_, key) => {
    if (key.startsWith(`${userId}:`)) {
      if (!pattern || key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
  });

  keysToDelete.forEach(key => cache.delete(key));
}

// 清除所有缓存
export function clearAllCache() {
  cache.clear();
}

// 缓存失效中间件（用于写操作后清除相关缓存）
export function invalidateCacheMiddleware(patterns: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function(data: any) {
      // 如果是成功的写操作，清除相关缓存
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = (req as any).user;
        // 只清除已认证用户的缓存
        if (user && user.id && user.id !== 'demo') {
          patterns.forEach(pattern => {
            clearUserCache(user.id, pattern);
          });
        }
      }
      return originalJson.call(this, data);
    };
    next();
  };
}

// 定期清理过期缓存
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  cache.forEach((entry, key) => {
    const cacheDuration = getCacheDuration(key);
    if (now - entry.timestamp > cacheDuration) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => cache.delete(key));
}, 60 * 1000); // 每分钟清理一次