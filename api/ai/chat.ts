import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCORS, handleChat } from '../_lib/ai-handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  return handleChat(req, res);
}