import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { db } from '../server/db';

// 加载环境变量
config();

async function verifySupabaseTables() {
  console.log('🔍 检查 Supabase 数据库表状态...\n');

  try {
    // 检查表是否存在
    const tableCheck = await db.execute(sql`
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

    console.log('📊 表存在状态:');
    console.table(tableCheck.rows);

    // 检查 tasks 表的列
    const columnsCheck = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tasks'
      AND column_name IN ('actual_energy_balls', 'pomodoro_cycles', 'battle_start_time', 'battle_end_time')
      ORDER BY column_name
    `);

    console.log('\n📋 Tasks 表战斗相关列:');
    if (columnsCheck.rows.length > 0) {
      console.table(columnsCheck.rows);
    } else {
      console.log('❌ 缺少战斗相关列');
    }

    // 检查最近的战报数据
    const reportCheck = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM daily_battle_reports
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `).catch(() => ({ rows: [{ count: 'Table not found' }] }));

    console.log('\n📈 最近7天的战报记录数:', reportCheck.rows[0]?.count || 0);

    // 测试连接信息
    console.log('\n🔗 数据库连接信息:');
    console.log('- 连接成功 ✅');
    console.log('- 数据库类型: Supabase PostgreSQL');
    
  } catch (error) {
    console.error('\n❌ 检查失败:', error);
    console.log('\n可能的原因:');
    console.log('1. 数据库连接配置错误');
    console.log('2. 表尚未创建');
    console.log('3. 权限不足');
    console.log('\n建议运行: npm run db:supabase-fix');
  }
}

// 运行验证
verifySupabaseTables();