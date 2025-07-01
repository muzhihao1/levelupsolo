import "dotenv/config";
import { db, sql } from "../server/db";

/**
 * 手动创建activity_logs表的脚本
 * 可以在Railway控制台中运行: npm run create-activity-logs
 */
async function createActivityLogsTable() {
  console.log('🚀 Starting activity_logs table creation...');
  
  try {
    // 测试数据库连接
    console.log('🔌 Testing database connection...');
    const testResult = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful');
    
    // 检查表是否已存在
    console.log('🔍 Checking if activity_logs table exists...');
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'activity_logs'
      ) as exists
    `);
    
    if (tableExists.rows[0]?.exists) {
      console.log('⚠️  activity_logs table already exists');
      
      // 显示表结构
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'activity_logs'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Current table structure:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      return;
    }
    
    // 创建表
    console.log('📋 Creating activity_logs table...');
    await db.execute(sql`
      CREATE TABLE activity_logs (
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
    console.log('✅ Table created successfully');
    
    // 添加外键约束（捕获错误，因为相关表可能不存在）
    console.log('🔗 Adding foreign key constraints...');
    
    try {
      await db.execute(sql`
        ALTER TABLE activity_logs 
        ADD CONSTRAINT fk_activity_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE
      `);
      console.log('  ✅ Added user_id foreign key');
    } catch (error: any) {
      console.log('  ⚠️  Could not add user_id foreign key:', error.message);
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE activity_logs 
        ADD CONSTRAINT fk_activity_logs_task_id 
        FOREIGN KEY (task_id) REFERENCES tasks(id) 
        ON DELETE SET NULL
      `);
      console.log('  ✅ Added task_id foreign key');
    } catch (error: any) {
      console.log('  ⚠️  Could not add task_id foreign key:', error.message);
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE activity_logs 
        ADD CONSTRAINT fk_activity_logs_skill_id 
        FOREIGN KEY (skill_id) REFERENCES skills(id) 
        ON DELETE SET NULL
      `);
      console.log('  ✅ Added skill_id foreign key');
    } catch (error: any) {
      console.log('  ⚠️  Could not add skill_id foreign key:', error.message);
    }
    
    // 创建索引
    console.log('📊 Creating indexes...');
    await db.execute(sql`
      CREATE INDEX idx_activity_logs_user_id 
      ON activity_logs(user_id)
    `);
    console.log('  ✅ Created user_id index');
    
    await db.execute(sql`
      CREATE INDEX idx_activity_logs_date 
      ON activity_logs(date DESC)
    `);
    console.log('  ✅ Created date index');
    
    await db.execute(sql`
      CREATE INDEX idx_activity_logs_user_date 
      ON activity_logs(user_id, date DESC)
    `);
    console.log('  ✅ Created composite user_id/date index');
    
    // 插入一条测试数据
    console.log('🧪 Inserting test data...');
    const testUser = await db.execute(sql`
      SELECT id FROM users LIMIT 1
    `);
    
    if (testUser.rows.length > 0) {
      await db.execute(sql`
        INSERT INTO activity_logs (user_id, action, description, exp_gained)
        VALUES (${testUser.rows[0].id}, 'table_created', 'Activity logs table created successfully', 0)
      `);
      console.log('  ✅ Test data inserted');
    }
    
    console.log('🎉 activity_logs table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating activity_logs table:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    process.exit(1);
  }
  
  process.exit(0);
}

// 运行脚本
createActivityLogsTable();