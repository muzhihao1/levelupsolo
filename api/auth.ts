import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCORS, handleLogin, handleRefresh, handleGetUser } from './_lib/auth-handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  switch (action) {
    case 'login':
    case 'simple-login':
      if (req.method !== 'POST') {
        return res.status(405).json({ message: "Method not allowed" });
      }
      return handleLogin(req, res);
    
    case 'refresh':
      if (req.method !== 'POST') {
        return res.status(405).json({ message: "Method not allowed" });
      }
      return handleRefresh(req, res);
    
    case 'user':
      if (req.method !== 'GET') {
        return res.status(405).json({ message: "Method not allowed" });
      }
      return handleGetUser(req, res);
    
    default:
      return res.status(400).json({ 
        message: "Invalid action. Available actions: login, simple-login, refresh, user" 
      });
  }
}