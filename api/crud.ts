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
      return res.status(500).json({ message: "服务器配置错误: 缺少数据库连接" });
    }
    
    let client = null;
    let result;
    
    try {
      client = postgres(connectionString, {
        ssl: 'require',
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      
      const db = drizzle(client);
      
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
              return res.json((result as any).rows[0]);
              
            case 'tasks':
              const taskData = {
                ...req.body,
                user_id: decoded.userId,
                created_at: new Date()
              };
              result = await db.execute(
                sql`INSERT INTO tasks (user_id, title, description, skill_id, goal_id, exp_reward, task_category, task_type, parent_task_id, difficulty, required_energy_balls)
                    VALUES (${taskData.user_id}, ${taskData.title}, ${taskData.description}, ${taskData.skillId || null}, ${taskData.goalId || null}, ${taskData.expReward || 10}, ${taskData.taskCategory || 'todo'}, ${taskData.taskType || 'simple'}, ${taskData.parentTaskId || null}, ${taskData.difficulty || 'medium'}, ${taskData.requiredEnergyBalls || 1})
                    RETURNING *`
              );
              return res.json((result as any).rows[0]);
              
            case 'goals':
              const goalData = {
                ...req.body,
                user_id: decoded.userId,
                created_at: new Date()
              };
              result = await db.execute(
                sql`INSERT INTO goals (user_id, title, description, target_date, exp_reward, required_energy_balls)
                    VALUES (${goalData.user_id}, ${goalData.title}, ${goalData.description}, ${goalData.targetDate || null}, ${goalData.expReward || 50}, ${goalData.requiredEnergyBalls || 4})
                    RETURNING *`
              );
              return res.json((result as any).rows[0]);
              
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
              return res.json((result as any).rows[0]);
              
            case 'milestones':
              const milestoneData = {
                ...req.body,
                created_at: new Date()
              };
              result = await db.execute(
                sql`INSERT INTO milestones (goal_id, title, description, is_completed)
                    VALUES (${milestoneData.goalId}, ${milestoneData.title}, ${milestoneData.description || ''}, ${false})
                    RETURNING *`
              );
              return res.json((result as any).rows[0]);
              
            default:
              return res.status(400).json({ message: "Invalid resource" });
          }
          
        case 'PUT':
        case 'PATCH':
          // 更新资源
          if (!id) {
            return res.status(400).json({ message: "ID is required" });
          }
          
          switch (resource) {
            case 'tasks':
              const taskUpdate = req.body;
              let updateFields = [];
              let values = [];
              let valueIndex = 1;
              
              if (taskUpdate.title !== undefined) {
                updateFields.push(`title = $${valueIndex++}`);
                values.push(taskUpdate.title);
              }
              if (taskUpdate.description !== undefined) {
                updateFields.push(`description = $${valueIndex++}`);
                values.push(taskUpdate.description);
              }
              if (taskUpdate.completed !== undefined) {
                updateFields.push(`completed = $${valueIndex++}`);
                values.push(taskUpdate.completed);
                updateFields.push(`completed_at = $${valueIndex++}`);
                values.push(taskUpdate.completed ? new Date() : null);
              }
              
              if (updateFields.length === 0) {
                return res.status(400).json({ message: "No fields to update" });
              }
              
              values.push(id);
              values.push(decoded.userId);
              
              result = await db.execute(
                sql.raw(`UPDATE tasks SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${valueIndex} AND user_id = $${valueIndex + 1} RETURNING *`, values)
              );
              
              if ((result as any).rows.length === 0) {
                return res.status(404).json({ message: "Task not found" });
              }
              
              return res.json((result as any).rows[0]);
              
            case 'goals':
              const goalUpdate = req.body;
              let goalUpdateFields = [];
              let goalValues = [];
              let goalValueIndex = 1;
              
              if (goalUpdate.title !== undefined) {
                goalUpdateFields.push(`title = $${goalValueIndex++}`);
                goalValues.push(goalUpdate.title);
              }
              if (goalUpdate.description !== undefined) {
                goalUpdateFields.push(`description = $${goalValueIndex++}`);
                goalValues.push(goalUpdate.description);
              }
              if (goalUpdate.completed !== undefined) {
                goalUpdateFields.push(`completed = $${goalValueIndex++}`);
                goalValues.push(goalUpdate.completed);
              }
              if (goalUpdate.progress !== undefined) {
                goalUpdateFields.push(`progress = $${goalValueIndex++}`);
                goalValues.push(goalUpdate.progress);
              }
              
              if (goalUpdateFields.length === 0) {
                return res.status(400).json({ message: "No fields to update" });
              }
              
              goalValues.push(id);
              goalValues.push(decoded.userId);
              
              result = await db.execute(
                sql.raw(`UPDATE goals SET ${goalUpdateFields.join(', ')}, updated_at = NOW() WHERE id = $${goalValueIndex} AND user_id = $${goalValueIndex + 1} RETURNING *`, goalValues)
              );
              
              if ((result as any).rows.length === 0) {
                return res.status(404).json({ message: "Goal not found" });
              }
              
              return res.json((result as any).rows[0]);
              
            case 'milestones':
              const milestoneUpdate = req.body;
              result = await db.execute(
                sql`UPDATE milestones 
                    SET title = ${milestoneUpdate.title}, 
                        description = ${milestoneUpdate.description || ''}, 
                        is_completed = ${milestoneUpdate.isCompleted || false},
                        updated_at = NOW()
                    WHERE id = ${id}
                    RETURNING *`
              );
              
              if ((result as any).rows.length === 0) {
                return res.status(404).json({ message: "Milestone not found" });
              }
              
              return res.json((result as any).rows[0]);
              
            default:
              return res.status(400).json({ message: "Invalid resource" });
          }
          
        case 'DELETE':
          // 删除资源
          if (!id) {
            return res.status(400).json({ message: "ID is required" });
          }
          
          switch (resource) {
            case 'tasks':
              result = await db.execute(
                sql`DELETE FROM tasks WHERE id = ${id} AND user_id = ${decoded.userId} RETURNING id`
              );
              break;
            case 'goals':
              result = await db.execute(
                sql`DELETE FROM goals WHERE id = ${id} AND user_id = ${decoded.userId} RETURNING id`
              );
              break;
            case 'skills':
              result = await db.execute(
                sql`DELETE FROM skills WHERE id = ${id} AND user_id = ${decoded.userId} RETURNING id`
              );
              break;
            case 'milestones':
              result = await db.execute(
                sql`DELETE FROM milestones WHERE id = ${id} RETURNING id`
              );
              break;
            default:
              return res.status(400).json({ message: "Invalid resource" });
          }
          
          if ((result as any).rows.length === 0) {
            return res.status(404).json({ message: "Resource not found" });
          }
          
          return res.json({ success: true, id });
          
        default:
          return res.status(405).json({ message: "Method not allowed" });
      }
      
    } catch (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ 
        message: "数据库操作失败",
        error: dbError instanceof Error ? dbError.message : String(dbError),
        details: process.env.NODE_ENV === 'development' ? dbError : undefined
      });
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (endError) {
          console.error("Error closing database connection:", endError);
        }
      }
    }
    
  } catch (error) {
    console.error("CRUD error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "无效的令牌" });
    }
    return res.status(500).json({ 
      message: "操作失败",
      error: error instanceof Error ? error.message : String(error),
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}