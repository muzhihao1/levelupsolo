import { config } from 'dotenv';
import postgres from 'postgres';

// 加载环境变量
config();

async function testConnection() {
  console.log('🔍 测试 Supabase 连接...\n');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 未设置！');
    process.exit(1);
  }

  console.log('✅ DATABASE_URL 已找到');
  
  try {
    // 直接使用 postgres 库测试
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      connect_timeout: 10,
    });

    console.log('🔗 执行简单查询...');
    
    // 测试基本连接
    const result1 = await sql`SELECT 1 as test`;
    console.log('✅ 基本查询成功:', result1);

    // 检查表
    console.log('\n📋 检查表...');
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('daily_battle_reports', 'pomodoro_sessions', 'tasks')
    `;
    
    console.log('现有表:');
    console.table(tables);

    // 检查缺失的表
    const existingTables = tables.map(t => t.tablename);
    const requiredTables = ['daily_battle_reports', 'pomodoro_sessions'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log('\n⚠️  缺失的表:', missingTables);
      console.log('\n运行以下命令来创建缺失的表:');
      console.log('  npm run supabase:fix');
    } else {
      console.log('\n✅ 所有必需的表都存在！');
    }

    // 关闭连接
    await sql.end();
    
  } catch (error) {
    console.error('\n❌ 连接失败:', error);
    console.error('\n请检查:');
    console.error('1. DATABASE_URL 是否正确');
    console.error('2. Supabase 项目是否在运行');
    console.error('3. 密码是否正确');
  }
}

testConnection();