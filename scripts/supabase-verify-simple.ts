import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql as sqlTag } from 'drizzle-orm';

// 必须先加载环境变量
config();

async function verifySupabase() {
  console.log('🔍 检查 Supabase 数据库连接和表状态...\n');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 未设置！');
    console.error('请确保 .env 文件存在并包含 DATABASE_URL');
    process.exit(1);
  }

  console.log('✅ DATABASE_URL 已找到');
  console.log('🔗 连接到 Supabase...');

  try {
    // 创建数据库连接
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      connect_timeout: 10,
    });
    
    const db = drizzle(sql);

    // 测试连接
    const testResult = await db.execute(sqlTag`SELECT current_database() as database, current_user as user`);
    console.log('✅ 数据库连接成功！');
    if (testResult.rows && testResult.rows.length > 0) {
      console.log('📊 数据库信息:', testResult.rows[0]);
    }

    // 检查表是否存在
    console.log('\n📋 检查战报相关表...');
    
    const tableCheck = await db.execute(sqlTag`
      SELECT 
        tablename,
        EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = t.tablename
        ) as exists
      FROM (
        VALUES 
          ('daily_battle_reports'),
          ('pomodoro_sessions'),
          ('tasks')
      ) AS t(tablename)
    `);

    console.log('\n表存在状态:');
    if (tableCheck.rows && tableCheck.rows.length > 0) {
      console.table(tableCheck.rows);
    } else {
      console.log('无法获取表信息');
    }

    // 检查是否需要运行迁移
    const needsMigration = tableCheck.rows && tableCheck.rows.some(row => 
      (row.tablename === 'daily_battle_reports' || row.tablename === 'pomodoro_sessions') && 
      !row.exists
    );

    if (needsMigration) {
      console.log('\n⚠️  检测到缺失的表！');
      console.log('请运行以下命令修复:');
      console.log('\n  npm run db:supabase-fix');
      console.log('\n或者在 Supabase SQL Editor 中运行:');
      console.log('  scripts/supabase-battle-reports-fix.sql');
    } else {
      console.log('\n✅ 所有必需的表都已存在！');
      
      // 检查 tasks 表的列
      const columnsCheck = await db.execute(sqlTag`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tasks'
        AND column_name IN ('actual_energy_balls', 'pomodoro_cycles', 'battle_start_time', 'battle_end_time')
        ORDER BY column_name
      `);

      const requiredColumns = ['actual_energy_balls', 'pomodoro_cycles', 'battle_start_time', 'battle_end_time'];
      const existingColumns = columnsCheck.rows ? columnsCheck.rows.map(row => row.column_name) : [];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        console.log('\n⚠️  Tasks 表缺少以下列:', missingColumns);
        console.log('请运行 npm run db:supabase-fix 来添加这些列');
      } else {
        console.log('✅ Tasks 表包含所有必需的列');
      }
    }

    // 关闭连接
    await sql.end();
    console.log('\n🎉 检查完成！');
    
  } catch (error) {
    console.error('\n❌ 数据库操作失败:', error);
    console.error('\n可能的原因:');
    console.error('1. DATABASE_URL 格式不正确');
    console.error('2. 数据库密码错误');
    console.error('3. 网络连接问题');
    console.error('4. Supabase 项目暂停或不可用');
    process.exit(1);
  }
}

// 运行验证
verifySupabase();