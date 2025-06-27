import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCORS, handleIntelligentCreate } from '../_lib/task-handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  return handleIntelligentCreate(req, res);
}