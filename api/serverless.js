import express from 'express';
import { registerRoutes } from '../server/routes.js';

const app = express();

// 注册所有路由
registerRoutes(app);

// Vercel serverless handler
export default app;