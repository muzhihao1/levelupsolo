import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  setCORS, 
  handleGetTasks, 
  handleCreateTask, 
  handleUpdateTask, 
  handleDeleteTask,
  handleAnalyzeTask,
  handleIntelligentCreate
} from './_lib/task-handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { url } = req;
  
  // Parse the URL path
  const urlParts = url?.split('?')[0].split('/').filter(Boolean) || [];
  const apiIndex = urlParts.indexOf('api');
  const pathAfterApi = urlParts.slice(apiIndex + 1);
  
  // /api/tasks
  if (pathAfterApi.length === 1 && pathAfterApi[0] === 'tasks') {
    if (req.method === 'GET') {
      return handleGetTasks(req, res);
    }
    if (req.method === 'POST') {
      return handleCreateTask(req, res);
    }
  }
  
  // /api/tasks/analyze-task
  if (pathAfterApi.length === 2 && pathAfterApi[1] === 'analyze-task') {
    if (req.method === 'POST') {
      return handleAnalyzeTask(req, res);
    }
  }
  
  // /api/tasks/intelligent-create
  if (pathAfterApi.length === 2 && pathAfterApi[1] === 'intelligent-create') {
    if (req.method === 'POST') {
      return handleIntelligentCreate(req, res);
    }
  }
  
  // /api/tasks/[id] - numeric ID
  if (pathAfterApi.length === 2 && /^\d+$/.test(pathAfterApi[1])) {
    // Add the ID to req.query for backward compatibility
    req.query.id = pathAfterApi[1];
    
    if (req.method === 'PATCH') {
      return handleUpdateTask(req, res);
    }
    if (req.method === 'DELETE') {
      return handleDeleteTask(req, res);
    }
  }
  
  return res.status(404).json({ message: "Not found" });
}