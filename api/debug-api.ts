import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 列出所有已部署的 API 端点
  const endpoints = [
    '/api/auth/simple-login',
    '/api/auth/user',
    '/api/auth/refresh',
    '/api/profile',
    '/api/user-stats',
    '/api/skills',
    '/api/goals',
    '/api/tasks',
  ];
  
  res.status(200).json({
    message: "API Debug Info",
    method: req.method,
    url: req.url,
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'None',
    },
    availableEndpoints: endpoints,
    timestamp: new Date().toISOString(),
  });
}