import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCORS } from './_lib/auth-handlers';
import { generateSuggestions, parseUserInput, handleChat } from './_lib/ai-handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { action } = req.query;

  switch (action) {
    case 'suggestions':
      return generateSuggestions(req, res);
    
    case 'parse-input':
      return parseUserInput(req, res);
    
    case 'chat':
      return handleChat(req, res);
    
    default:
      return res.status(400).json({ 
        message: "Invalid action. Available actions: suggestions, parse-input, chat" 
      });
  }
}