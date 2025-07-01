import { db } from './db';
import { sql } from 'drizzle-orm';
import { checkActivityLogsTable, runActivityLogsMigration } from './fix-activity-logs';

/**
 * 在应用启动时运行必要的数据库迁移
 */
export async function runStartupMigrations(): Promise<void> {
  console.log('🔄 Running startup migrations...');
  
  try {
    // 检查数据库连接
    if (!db) {
      console.warn('⚠️  Database not initialized, skipping migrations');
      return;
    }
    
    // 测试数据库连接
    try {
      await db.execute(sql`SELECT 1`);
      console.log('✅ Database connection verified');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return;
    }
    
    // 检查并创建activity_logs表
    const activityLogsExists = await checkActivityLogsTable();
    console.log('Activity logs table exists:', activityLogsExists);
    
    if (!activityLogsExists) {
      console.log('📋 Creating activity_logs table...');
      try {
        // 直接执行SQL，避免文件系统依赖
        await db.execute(sql`
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
        
        // 尝试添加外键（如果失败则忽略）
        try {
          await db.execute(sql`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_activity_logs_user_id'
              ) THEN
                ALTER TABLE activity_logs 
                ADD CONSTRAINT fk_activity_logs_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) 
                ON DELETE CASCADE;
              END IF;
            END $$;
          `);
        } catch (e) {
          console.warn('⚠️  Could not add user_id foreign key (may already exist)');
        }
        
        // 创建索引
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id 
          ON activity_logs(user_id)
        `);
        
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_activity_logs_date 
          ON activity_logs(date DESC)
        `);
        
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date 
          ON activity_logs(user_id, date DESC)
        `);
        
        console.log('✅ activity_logs table created successfully');
      } catch (error: any) {
        console.error('❌ Failed to create activity_logs table:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          detail: error.detail
        });
      }
    } else {
      console.log('✅ activity_logs table already exists');
    }
    
    // 可以在这里添加其他迁移
    
    console.log('✅ Startup migrations completed');
  } catch (error) {
    console.error('❌ Error during startup migrations:', error);
    // 不要因为迁移失败而阻止应用启动
  }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  runStartupMigrations()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}