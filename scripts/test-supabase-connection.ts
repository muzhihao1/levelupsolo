import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '..', '.env.supabase') });

async function testConnection() {
  console.log('🔍 测试 Supabase 连接...\n');
  
  // 检查环境变量
  if (!process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DATABASE_URL.includes('[YOUR-PASSWORD]')) {
    console.error('❌ 错误：请先在 .env.supabase 文件中设置数据库密码');
    console.log('   SUPABASE_DATABASE_URL 应该包含你的实际密码');
    process.exit(1);
  }
  
  try {
    // 连接数据库
    const sql = postgres(process.env.SUPABASE_DATABASE_URL);
    console.log('📡 连接到 Supabase 数据库...');
    
    // 测试查询
    const result = await sql`SELECT current_database(), current_user, version()`;
    console.log('✅ 连接成功！');
    console.log('   数据库:', result[0].current_database);
    console.log('   用户:', result[0].current_user);
    console.log('   版本:', result[0].version.split(',')[0]);
    
    // 检查表是否存在
    console.log('\n📋 检查数据库表...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const expectedTables = [
      'users', 'user_profiles', 'user_stats', 'skills', 
      'tasks', 'goals', 'milestones', 'micro_tasks',
      'activity_logs', 'achievements', 'sessions'
    ];
    
    const existingTables = tables.map(t => t.table_name);
    
    console.log(`\n找到 ${existingTables.length} 个表:`);
    existingTables.forEach(table => {
      console.log(`   ✓ ${table}`);
    });
    
    // 检查缺失的表
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    if (missingTables.length > 0) {
      console.log('\n⚠️  缺失的表:');
      missingTables.forEach(table => {
        console.log(`   ✗ ${table}`);
      });
      console.log('\n请在 Supabase SQL Editor 中运行 scripts/supabase-schema.sql');
    } else {
      console.log('\n🎉 所有必需的表都已创建！');
    }
    
    // 关闭连接
    await sql.end();
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.log('\n可能的原因:');
    console.log('1. 数据库密码不正确');
    console.log('2. 网络连接问题');
    console.log('3. Supabase 项目未启动');
    process.exit(1);
  }
}

testConnection();