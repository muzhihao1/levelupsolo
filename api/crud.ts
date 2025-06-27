import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

// 设置 CORS
function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 从 Authorization header 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "未授权" });
    }
    
    const token = authHeader.substring(7);
    
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
    
    // 获取资源类型和操作
    const { resource, id } = req.query;
    
    // Demo 用户 - 返回成功但不做实际操作
    if (decoded.userId === 'demo_user') {
      switch (req.method) {
        case 'POST':
          return res.json({ id: Date.now(), ...req.body });
        case 'PUT':
        case 'PATCH':
          return res.json({ id, ...req.body });
        case 'DELETE':
          return res.json({ success: true });
        default:
          return res.status(405).json({ message: "Method not allowed" });
      }
    }
    
    // 真实用户 - 连接数据库
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    
    if (!connectionString) {
      console.error("No database connection string found");
      return res.status(500).json({ message: "服务器配置错误" });
    }
    
    const client = postgres(connectionString, {
      ssl: 'require',
      max: 1,
    });
    
    const db = drizzle(client);
    
    let result;
    
    try {
      switch (req.method) {
        case 'POST':
          // 创建资源
          switch (resource) {
            case 'profile':
              const profileData = {
                ...req.body,
                user_id: decoded.userId,
                created_at: new Date(),
                updated_at: new Date()
              };
              result = await db.execute(
                sql`INSERT INTO user_profiles (user_id, name, age, occupation, mission, has_completed_onboarding, has_completed_tutorial)
                    VALUES (${profileData.user_id}, ${profileData.name}, ${profileData.age}, ${profileData.occupation}, ${profileData.mission}, ${profileData.hasCompletedOnboarding || false}, ${profileData.hasCompletedTutorial || false})
                    ON CONFLICT (user_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    age = EXCLUDED.age,
                    occupation = EXCLUDED.occupation,
                    mission = EXCLUDED.mission,
                    has_completed_onboarding = EXCLUDED.has_completed_onboarding,
                    has_completed_tutorial = EXCLUDED.has_completed_tutorial,
                    updated_at = NOW()
                    RETURNING *`
              );
              break;
            case 'tasks':
              const taskData = {
                ...req.body,
                user_id: decoded.userId,
                created_at: new Date()
              };
              result = await db.execute(
                sql`INSERT INTO tasks (user_id, title, description, skill_id, goal_id, exp_reward, task_category, task_type, difficulty, required_energy_balls)
                    VALUES (${taskData.user_id}, ${taskData.title}, ${taskData.description}, ${taskData.skillId}, ${taskData.goalId}, ${taskData.expReward || 10}, ${taskData.taskCategory || 'todo'}, ${taskData.taskType || 'simple'}, ${taskData.difficulty || 'medium'}, ${taskData.requiredEnergyBalls || 1})
                    RETURNING *`
              );
              break;
            case 'goals':
              const goalData = {
                ...req.body,
                user_id: decoded.userId,
                created_at: new Date()
              };
              result = await db.execute(
                sql`INSERT INTO goals (user_id, title, description, target_date, exp_reward, required_energy_balls)
                    VALUES (${goalData.user_id}, ${goalData.title}, ${goalData.description}, ${goalData.targetDate}, ${goalData.expReward || 50}, ${goalData.requiredEnergyBalls || 4})
                    RETURNING *`
              );
              break;
            case 'skills':
              const skillData = {
                ...req.body,
                user_id: decoded.userId
              };
              result = await db.execute(
                sql`INSERT INTO skills (user_id, name, color, icon, category)
                    VALUES (${skillData.user_id}, ${skillData.name}, ${skillData.color || '#6366F1'}, ${skillData.icon || 'fas fa-star'}, ${skillData.category || 'general'})
                    RETURNING *`
              );
              break;
            default:
              await client.end();
              return res.status(400).json({ message: "Invalid resource" });
          }
          await client.end();
          return res.json((result as any).rows[0]);
          
        case 'PUT':
        case 'PATCH':
          // 更新资源
          if (!id) {
            await client.end();
            return res.status(400).json({ message: "ID is required" });
          }
          
          switch (resource) {
            case 'tasks':
              result = await db.execute(
                sql`UPDATE tasks SET 
                    title = COALESCE(${req.body.title}, title),
                    description = COALESCE(${req.body.description}, description),
                    completed = COALESCE(${req.body.completed}, completed),
                    completed_at = CASE WHEN ${req.body.completed} = true THEN NOW() ELSE completed_at END
                    WHERE id = ${id} AND user_id = ${decoded.userId}
                    RETURNING *`
              );
              break;
            case 'goals':
              result = await db.execute(
                sql`UPDATE goals SET 
                    title = COALESCE(${req.body.title}, title),
                    description = COALESCE(${req.body.description}, description),
                    progress = COALESCE(${req.body.progress}, progress),
                    completed = COALESCE(${req.body.completed}, completed),
                    completed_at = CASE WHEN ${req.body.completed} = true THEN NOW() ELSE completed_at END
                    WHERE id = ${id} AND user_id = ${decoded.userId}
                    RETURNING *`
              );
              break;
            case 'skills':
              result = await db.execute(
                sql`UPDATE skills SET 
                    exp = COALESCE(${req.body.exp}, exp),
                    level = COALESCE(${req.body.level}, level),
                    max_exp = COALESCE(${req.body.maxExp}, max_exp)
                    WHERE id = ${id} AND user_id = ${decoded.userId}
                    RETURNING *`
              );
              break;
            default:
              await client.end();
              return res.status(400).json({ message: "Invalid resource" });
          }
          await client.end();
          return res.json((result as any).rows[0]);
          
        case 'DELETE':
          // 删除资源
          if (!id) {
            await client.end();
            return res.status(400).json({ message: "ID is required" });
          }
          
          switch (resource) {
            case 'tasks':
              await db.execute(
                sql`DELETE FROM tasks WHERE id = ${id} AND user_id = ${decoded.userId}`
              );
              break;
            case 'goals':
              await db.execute(
                sql`DELETE FROM goals WHERE id = ${id} AND user_id = ${decoded.userId}`
              );
              break;
            case 'skills':
              await db.execute(
                sql`DELETE FROM skills WHERE id = ${id} AND user_id = ${decoded.userId}`
              );
              break;
            default:
              await client.end();
              return res.status(400).json({ message: "Invalid resource" });
          }
          await client.end();
          return res.json({ success: true });
          
        default:
          await client.end();
          return res.status(405).json({ message: "Method not allowed" });
      }
    } catch (dbError) {
      await client.end();
      throw dbError;
    }
    
  } catch (error) {
    console.error("CRUD error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ 
      message: "操作失败",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}