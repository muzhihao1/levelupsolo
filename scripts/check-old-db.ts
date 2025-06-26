import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '..', '.env.supabase') });

async function checkOldDatabase() {
  console.log('🔍 检查原 Neon 数据库...\n');
  
  const dbUrl = process.env.OLD_DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ 未找到 OLD_DATABASE_URL');
    process.exit(1);
  }
  
  try {
    const sql = postgres(dbUrl);
    console.log('📡 连接到 Neon 数据库...');
    
    // 获取基本信息
    const dbInfo = await sql`SELECT current_database(), current_user`;
    console.log('✅ 连接成功！');
    console.log('   数据库:', dbInfo[0].current_database);
    console.log('   用户:', dbInfo[0].current_user);
    
    // 检查表
    console.log('\n📋 检查现有表...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log(`找到 ${tables.length} 个表:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    
    // 检查数据量
    console.log('\n📊 检查数据量...');
    const counts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM users`.catch(() => ({ count: 0 })),
      sql`SELECT COUNT(*) as count FROM tasks`.catch(() => ({ count: 0 })),
      sql`SELECT COUNT(*) as count FROM skills`.catch(() => ({ count: 0 })),
      sql`SELECT COUNT(*) as count FROM goals`.catch(() => ({ count: 0 }))
    ]);
    
    console.log(`   用户: ${counts[0][0]?.count || 0} 条`);
    console.log(`   任务: ${counts[1][0]?.count || 0} 条`);
    console.log(`   技能: ${counts[2][0]?.count || 0} 条`);
    console.log(`   目标: ${counts[3][0]?.count || 0} 条`);
    
    await sql.end();
    console.log('\n✅ 数据库检查完成！');
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  }
}

checkOldDatabase();