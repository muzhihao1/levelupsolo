import { config } from 'dotenv';
import postgres from 'postgres';

// 加载环境变量
config();

async function createBattleTables() {
  console.log('🚀 创建战报相关表...\n');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 未设置！');
    process.exit(1);
  }

  try {
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      connect_timeout: 10,
    });

    console.log('✅ 连接到 Supabase 成功\n');

    // 1. 创建 daily_battle_reports 表
    console.log('📋 创建 daily_battle_reports 表...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS daily_battle_reports (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR NOT NULL,
            date TIMESTAMP NOT NULL,
            total_battle_time INTEGER DEFAULT 0,
            energy_balls_consumed INTEGER DEFAULT 0,
            tasks_completed INTEGER DEFAULT 0,
            pomodoro_cycles INTEGER DEFAULT 0,
            task_details JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('✅ daily_battle_reports 表创建成功\n');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  daily_battle_reports 表已存在\n');
      } else {
        throw e;
      }
    }

    // 2. 创建 pomodoro_sessions 表
    console.log('📋 创建 pomodoro_sessions 表...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS pomodoro_sessions (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR NOT NULL,
            task_id INTEGER,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP DEFAULT NULL,
            work_duration INTEGER DEFAULT 0,
            rest_duration INTEGER DEFAULT 0,
            cycles_completed INTEGER DEFAULT 0,
            actual_energy_balls INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('✅ pomodoro_sessions 表创建成功\n');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  pomodoro_sessions 表已存在\n');
      } else {
        throw e;
      }
    }

    // 3. 为 tasks 表添加列
    console.log('📋 更新 tasks 表...');
    const columns = [
      { name: 'actual_energy_balls', type: 'INTEGER' },
      { name: 'pomodoro_cycles', type: 'INTEGER DEFAULT 0' },
      { name: 'battle_start_time', type: 'TIMESTAMP' },
      { name: 'battle_end_time', type: 'TIMESTAMP' }
    ];

    for (const col of columns) {
      try {
        await sql.unsafe(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✅ 添加列 ${col.name}`);
      } catch (e: any) {
        console.log(`⏭️  列 ${col.name} 已存在或添加失败: ${e.message}`);
      }
    }

    // 4. 创建索引
    console.log('\n📋 创建索引...');
    const indexes = [
      { table: 'daily_battle_reports', column: 'user_id' },
      { table: 'daily_battle_reports', column: 'date DESC' },
      { table: 'pomodoro_sessions', column: 'user_id' },
      { table: 'pomodoro_sessions', column: 'task_id' }
    ];

    for (const idx of indexes) {
      const indexName = `idx_${idx.table}_${idx.column.split(' ')[0]}`;
      try {
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${idx.table}(${idx.column})`);
        console.log(`✅ 创建索引 ${indexName}`);
      } catch (e: any) {
        console.log(`⏭️  索引 ${indexName} 已存在`);
      }
    }

    // 5. 创建唯一约束
    console.log('\n📋 创建唯一约束...');
    try {
      await sql`
        ALTER TABLE daily_battle_reports 
        ADD CONSTRAINT daily_battle_reports_user_date_unique 
        UNIQUE(user_id, date)
      `;
      console.log('✅ 创建唯一约束成功');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  唯一约束已存在');
      }
    }

    // 验证结果
    console.log('\n📊 验证表创建结果...');
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('daily_battle_reports', 'pomodoro_sessions')
    `;
    
    console.log('创建的表:');
    console.table(tables);

    await sql.end();
    
    console.log('\n🎉 战报功能修复完成！');
    console.log('\n下一步:');
    console.log('1. 刷新您的应用页面');
    console.log('2. 战报功能应该可以正常使用了');
    
  } catch (error) {
    console.error('\n❌ 创建表失败:', error);
    console.error('\n请在 Supabase SQL Editor 中手动运行:');
    console.error('scripts/create-battle-tables.sql');
    process.exit(1);
  }
}

createBattleTables();