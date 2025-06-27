import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { createInsertSchema } from 'drizzle-zod';
import { tasks } from '@shared/schema';
import { z } from 'zod';

const insertTaskSchema = createInsertSchema(tasks);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get user ID from auth header or query
  const userId = req.headers.authorization?.replace('Bearer ', '') || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    if (req.method === 'GET') {
      const tasks = await storage.getTasks(userId as string);
      return res.status(200).json(tasks);
    }
    
    if (req.method === 'POST') {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId
      });
      
      const task = await storage.createTask(taskData);
      return res.status(200).json(task);
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid task data', errors: error.errors });
    }
    console.error('Error handling tasks:', error);
    return res.status(500).json({ message: 'Failed to handle tasks' });
  }
}