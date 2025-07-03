// 习惯完成的新实现 - 不依赖可能缺失的列

import { Router } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { isAuthenticated } from './simpleAuth';

const router = Router();

// 新的习惯完成端点 - 只更新必定存在的列
router.post('/api/habits/:id/complete', isAuthenticated, async (req: any, res) => {
  const habitId = parseInt(req.params.id);
  const userId = (req.user as any)?.claims?.sub;
  
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  
  console.log(`[Habit Complete] Starting for habit ${habitId}, user ${userId}`);
  
  try {
    // 首先获取当前习惯信息
    const currentHabit = await db.execute(sql`
      SELECT 
        id, 
        title, 
        completed,
        skill_id,
        exp_reward
      FROM tasks 
      WHERE 
        id = ${habitId} 
        AND user_id = ${userId}
        AND task_category = 'habit'
    `);
    
    const habit = currentHabit.rows?.[0] || currentHabit[0];
    
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }
    
    // 只更新核心字段
    const updateResult = await db.execute(sql`
      UPDATE tasks 
      SET 
        completed = true,
        completed_at = NOW()
      WHERE 
        id = ${habitId} 
        AND user_id = ${userId}
      RETURNING *
    `);
    
    const updatedHabit = updateResult.rows?.[0] || updateResult[0];
    
    if (!updatedHabit) {
      throw new Error('Update failed');
    }
    
    // 尝试更新额外的跟踪字段（如果存在）
    try {
      await db.execute(sql`
        UPDATE tasks 
        SET 
          last_completed_at = NOW(),
          completion_count = COALESCE(completion_count, 0) + 1
        WHERE id = ${habitId}
      `);
      console.log(`[Habit Complete] Updated tracking columns`);
    } catch (trackingError) {
      // 忽略跟踪字段更新失败
      console.log(`[Habit Complete] Tracking columns don't exist, skipping`);
    }
    
    // 记录活动日志
    try {
      await db.execute(sql`
        INSERT INTO activity_logs (user_id, task_id, action, exp_gained, created_at)
        VALUES (${userId}, ${habitId}, 'habit_completed', ${habit.exp_reward || 20}, NOW())
      `);
    } catch (logError) {
      console.error('[Habit Complete] Failed to create activity log:', logError);
    }
    
    console.log(`[Habit Complete] Success! Habit ${habitId} completed`);
    
    return res.json({
      success: true,
      task: updatedHabit,
      message: '习惯完成！'
    });
    
  } catch (error: any) {
    console.error('[Habit Complete] Error:', error);
    return res.status(500).json({ 
      message: 'Failed to complete habit',
      error: error.message 
    });
  }
});

// 获取习惯状态的端点
router.get('/api/habits/:id/status', isAuthenticated, async (req: any, res) => {
  const habitId = parseInt(req.params.id);
  const userId = (req.user as any)?.claims?.sub;
  
  try {
    // 构建动态查询，处理可能不存在的列
    let selectColumns = [
      'id',
      'title',
      'completed',
      'completed_at',
      'skill_id',
      'exp_reward'
    ];
    
    // 检查额外列是否存在
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name IN ('last_completed_at', 'completion_count')
    `);
    
    const hasTrackingColumns = columnCheck.rows && columnCheck.rows.length > 0;
    
    if (hasTrackingColumns) {
      selectColumns.push('last_completed_at', 'completion_count');
    }
    
    // 执行查询
    const query = `
      SELECT ${selectColumns.join(', ')}
      FROM tasks 
      WHERE id = $1 AND user_id = $2 AND task_category = 'habit'
    `;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const result = await pool.query(query, [habitId, userId]);
    await pool.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }
    
    const habit = result.rows[0];
    
    // 检查是否今天已完成
    const completedToday = habit.completed_at && 
      new Date(habit.completed_at).toDateString() === new Date().toDateString();
    
    return res.json({
      ...habit,
      completedToday,
      hasTrackingColumns
    });
    
  } catch (error: any) {
    console.error('[Habit Status] Error:', error);
    return res.status(500).json({ 
      message: 'Failed to get habit status',
      error: error.message 
    });
  }
});

export default router;