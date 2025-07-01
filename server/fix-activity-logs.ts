import { db, sql } from './db';
import { activityLogs } from '../shared/schema';
import { desc, eq } from 'drizzle-orm';
import type { ActivityLog } from '../shared/schema';

/**
 * 安全地获取activity logs，包含完整的错误处理和表创建逻辑
 */
export async function safeGetActivityLogs(userId: string): Promise<ActivityLog[]> {
  try {
    // 首先尝试直接查询
    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.date))
      .limit(50);
    
    return logs;
  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    
    // 检查是否是表不存在的错误
    if (error.code === '42P01' || // PostgreSQL: relation does not exist
        error.message?.toLowerCase().includes('does not exist') ||
        error.message?.toLowerCase().includes('no such table')) {
      
      console.log('Activity logs table does not exist, attempting to create...');
      
      try {
        // 使用事务确保表创建的原子性
        await db.transaction(async (tx) => {
          // 创建表
          await tx.execute(sql`
            CREATE TABLE IF NOT EXISTS activity_logs (
              id SERIAL PRIMARY KEY,
              user_id VARCHAR NOT NULL,
              date TIMESTAMP NOT NULL DEFAULT NOW(),
              task_id INTEGER,
              skill_id INTEGER,
              exp_gained INTEGER NOT NULL DEFAULT 0,
              action TEXT NOT NULL,
              description TEXT
            )
          `);
          
          // 添加外键约束（如果相关表存在）
          try {
            await tx.execute(sql`
              ALTER TABLE activity_logs 
              ADD CONSTRAINT fk_activity_logs_user_id 
              FOREIGN KEY (user_id) REFERENCES users(id) 
              ON DELETE CASCADE
            `);
          } catch (fkError) {
            console.warn('Could not add user_id foreign key:', fkError.message);
          }
          
          try {
            await tx.execute(sql`
              ALTER TABLE activity_logs 
              ADD CONSTRAINT fk_activity_logs_task_id 
              FOREIGN KEY (task_id) REFERENCES tasks(id) 
              ON DELETE SET NULL
            `);
          } catch (fkError) {
            console.warn('Could not add task_id foreign key:', fkError.message);
          }
          
          try {
            await tx.execute(sql`
              ALTER TABLE activity_logs 
              ADD CONSTRAINT fk_activity_logs_skill_id 
              FOREIGN KEY (skill_id) REFERENCES skills(id) 
              ON DELETE SET NULL
            `);
          } catch (fkError) {
            console.warn('Could not add skill_id foreign key:', fkError.message);
          }
          
          // 创建索引
          await tx.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id 
            ON activity_logs(user_id)
          `);
          
          await tx.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_activity_logs_date 
            ON activity_logs(date DESC)
          `);
          
          await tx.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date 
            ON activity_logs(user_id, date DESC)
          `);
        });
        
        console.log('Activity logs table created successfully');
        
        // 表创建成功后，返回空数组（新表没有数据）
        return [];
      } catch (createError: any) {
        console.error('Failed to create activity logs table:', createError);
        console.error('Create error details:', {
          code: createError.code,
          message: createError.message,
          detail: createError.detail,
          hint: createError.hint
        });
        
        // 如果是权限问题，返回更具体的错误信息
        if (createError.code === '42501' || // PostgreSQL: insufficient privilege
            createError.message?.toLowerCase().includes('permission denied')) {
          throw new Error('Database user lacks CREATE TABLE permission. Please contact administrator.');
        }
        
        // 返回空数组以避免前端崩溃
        return [];
      }
    }
    
    // 其他类型的错误，直接抛出
    throw error;
  }
}

/**
 * 检查activity_logs表是否存在
 */
export async function checkActivityLogsTable(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'activity_logs'
      ) as exists
    `);
    
    return result.rows[0]?.exists === true;
  } catch (error) {
    console.error('Error checking activity_logs table:', error);
    return false;
  }
}

/**
 * 运行activity_logs表的迁移
 */
export async function runActivityLogsMigration(): Promise<void> {
  try {
    // 读取迁移文件
    const fs = require('fs').promises;
    const path = require('path');
    
    const migrationPath = path.join(__dirname, '../../migrations/0001_create_activity_logs.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    // 执行迁移
    await db.execute(sql.raw(migrationSQL));
    
    console.log('Activity logs migration completed successfully');
  } catch (error) {
    console.error('Error running activity logs migration:', error);
    throw error;
  }
}