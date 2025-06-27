import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCORS, handleGetTasks, handleCreateTask } from '../_lib/task-handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return handleGetTasks(req, res);
  }
  
  if (req.method === 'POST') {
    return handleCreateTask(req, res);
  }
  
  return res.status(405).json({ message: "Method not allowed" });
}