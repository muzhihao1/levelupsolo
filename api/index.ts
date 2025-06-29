import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy
app.set('trust proxy', 1);

// Register all routes
const routesPromise = registerRoutes(app);

// Export handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Wait for routes to be registered if not already done
  await routesPromise;
  
  // Handle the request with Express
  app(req as any, res as any);
}