import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function checkSchemas() {
  const oldDb = postgres(process.env.OLD_DATABASE_URL!);
  
  try {
    console.log('🔍 检查 goals 表结构...\n');
    
    const columns = await oldDb`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'goals'
      ORDER BY ordinal_position
    `;
    
    console.log('原数据库 goals 表字段:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // 检查一条数据看看
    console.log('\n📋 示例数据:');
    const sample = await oldDb`SELECT * FROM goals LIMIT 1`;
    if (sample.length > 0) {
      console.log(JSON.stringify(sample[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await oldDb.end();
  }
}

checkSchemas();