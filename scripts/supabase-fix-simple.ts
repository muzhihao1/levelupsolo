import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql as sqlTag } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

// 必须先加载环境变量
config();

async function runSupabaseFix() {
  console.log('🚀 开始修复 Supabase 战报功能...\n');

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
    await db.execute(sqlTag`SELECT 1`);
    console.log('✅ 数据库连接成功！\n');

    // 读取并执行迁移脚本
    console.log('📝 执行迁移脚本...\n');
    
    const migrationSQL = readFileSync(
      join(__dirname, 'supabase-battle-reports-fix.sql'),
      'utf-8'
    );

    // 分割 SQL 语句
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^DO\s*\$\$/));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // 跳过验证查询
        if (statement.includes('SELECT') && statement.includes('as table_name')) {
          console.log('🔍 运行验证查询...');
          const result = await sql.unsafe(statement + ';');
          console.log('📊 表状态:');
          console.table(result);
        } else if (statement.length > 10) {
          console.log(`⚙️  执行: ${statement.substring(0, 60)}...`);
          await sql.unsafe(statement + ';');
          console.log('✅ 成功\n');
          successCount++;
        }
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('⏭️  跳过（已存在）\n');
        } else {
          console.error(`❌ 失败: ${error.message}\n`);
          errorCount++;
        }
      }
    }

    // 验证结果
    console.log('\n📋 验证迁移结果...');
    
    const verification = await db.execute(sqlTag`
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
          ('pomodoro_sessions')
      ) AS t(tablename)
    `);

    console.table(verification.rows);

    // 检查 tasks 表的列
    const columnsCheck = await db.execute(sqlTag`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tasks'
      AND column_name IN ('actual_energy_balls', 'pomodoro_cycles', 'battle_start_time', 'battle_end_time')
      ORDER BY column_name
    `);

    console.log('\nTasks 表战斗相关列:');
    console.table(columnsCheck.rows);

    // 关闭连接
    await sql.end();

    // 总结
    console.log('\n' + '='.repeat(50));
    console.log(`✅ 成功执行: ${successCount} 个操作`);
    if (errorCount > 0) {
      console.log(`⚠️  失败: ${errorCount} 个操作`);
    }
    
    const allTablesExist = verification.rows.every(row => row.exists);
    if (allTablesExist && columnsCheck.rows.length === 4) {
      console.log('\n🎉 修复完成！战报功能应该可以正常使用了。');
      console.log('\n下一步:');
      console.log('1. 刷新您的应用页面');
      console.log('2. 检查战报功能是否正常工作');
    } else {
      console.log('\n⚠️  部分操作未完成，请检查错误信息。');
    }
    
  } catch (error) {
    console.error('\n❌ 数据库操作失败:', error);
    console.error('\n建议直接在 Supabase Dashboard 中运行 SQL:');
    console.error('1. 访问 https://app.supabase.com');
    console.error('2. 选择您的项目');
    console.error('3. 点击 SQL Editor');
    console.error('4. 复制 scripts/supabase-battle-reports-fix.sql 的内容并运行');
    process.exit(1);
  }
}

// 运行修复
runSupabaseFix();