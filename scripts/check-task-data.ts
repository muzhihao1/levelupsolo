import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function checkTaskData() {
  const oldDb = postgres(process.env.OLD_DATABASE_URL!);
  
  try {
    console.log('🔍 检查 tasks 表结构...\n');
    
    const columns = await oldDb`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tasks'
      ORDER BY ordinal_position
    `;
    
    console.log('原数据库 tasks 表字段:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n📋 检查第一条任务数据:');
    const sample = await oldDb`SELECT * FROM tasks LIMIT 1`;
    if (sample.length > 0) {
      console.log(JSON.stringify(sample[0], null, 2));
    }
    
    console.log('\n📊 检查数据统计:');
    const stats = await oldDb`
      SELECT 
        COUNT(*) as total,
        COUNT(skill_id) as with_skill,
        COUNT(goal_id) as with_goal,
        COUNT(difficulty) as with_difficulty
      FROM tasks
    `;
    console.log(stats[0]);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await oldDb.end();
  }
}

checkTaskData();