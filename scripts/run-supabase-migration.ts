import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { db } from '../server/db';
import { readFileSync } from 'fs';
import { join } from 'path';

// 加载环境变量
config();

async function runSupabaseMigration() {
  console.log('🚀 开始运行 Supabase 战报功能修复...\n');

  try {
    // 读取 SQL 文件
    const migrationSQL = readFileSync(
      join(__dirname, 'supabase-battle-reports-fix.sql'),
      'utf-8'
    );

    // 将 SQL 分成多个语句（以分号分隔）
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // 执行每个语句
    for (const statement of statements) {
      if (statement.includes('SELECT') && statement.includes('as table_name')) {
        // 这是验证查询，特殊处理
        const result = await db.execute(sql.raw(statement));
        console.log('\n📊 表创建验证结果:');
        console.table(result.rows);
      } else {
        // 执行其他 DDL 语句
        console.log(`执行: ${statement.substring(0, 50)}...`);
        await db.execute(sql.raw(statement));
        console.log('✅ 成功');
      }
    }

    console.log('\n🎉 Supabase 迁移完成！战报功能应该可以正常使用了。');
    console.log('\n下一步:');
    console.log('1. 刷新您的应用页面');
    console.log('2. 检查战报功能是否正常工作');
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    console.log('\n建议直接在 Supabase Dashboard 中运行 SQL:');
    console.log('1. 访问 https://app.supabase.com');
    console.log('2. 选择您的项目');
    console.log('3. 点击 SQL Editor');
    console.log('4. 复制 scripts/supabase-battle-reports-fix.sql 的内容并运行');
  }

  process.exit(0);
}

// 运行迁移
runSupabaseMigration();