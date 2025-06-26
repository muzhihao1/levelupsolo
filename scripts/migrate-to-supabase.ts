import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 确保加载正确的环境变量文件
dotenv.config({ path: join(__dirname, '..', '.env') });

// 数据库连接配置
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL!; // 原 Neon 数据库
const NEW_DATABASE_URL = process.env.SUPABASE_DATABASE_URL!; // 新 Supabase 数据库

// 检查环境变量
if (!OLD_DATABASE_URL || !NEW_DATABASE_URL) {
  console.error('❌ 缺少必要的环境变量');
  console.log('OLD_DATABASE_URL:', OLD_DATABASE_URL ? '已设置' : '未设置');
  console.log('NEW_DATABASE_URL:', NEW_DATABASE_URL ? '已设置' : '未设置');
  process.exit(1);
}

async function migrateDatabase() {
  console.log('🚀 开始数据库迁移...');
  
  // 连接到旧数据库
  const oldConnection = postgres(OLD_DATABASE_URL);
  const oldDb = drizzle(oldConnection, { schema });
  
  // 连接到新数据库
  const newConnection = postgres(NEW_DATABASE_URL);
  const newDb = drizzle(newConnection, { schema });
  
  try {
    // 1. 迁移用户表
    console.log('📋 迁移用户数据...');
    const users = await oldDb.select().from(schema.users);
    if (users.length > 0) {
      await newDb.insert(schema.users).values(users);
      console.log(`✅ 成功迁移 ${users.length} 个用户`);
    }
    
    // 2. 迁移用户资料
    console.log('📋 迁移用户资料...');
    const profiles = await oldDb.select().from(schema.userProfiles);
    if (profiles.length > 0) {
      await newDb.insert(schema.userProfiles).values(profiles);
      console.log(`✅ 成功迁移 ${profiles.length} 个用户资料`);
    }
    
    // 3. 迁移用户统计
    console.log('📋 迁移用户统计...');
    const stats = await oldDb.select().from(schema.userStats);
    if (stats.length > 0) {
      await newDb.insert(schema.userStats).values(stats);
      console.log(`✅ 成功迁移 ${stats.length} 个用户统计`);
    }
    
    // 4. 迁移技能数据
    console.log('📋 迁移技能数据...');
    const skills = await oldDb.select().from(schema.skills);
    if (skills.length > 0) {
      await newDb.insert(schema.skills).values(skills);
      console.log(`✅ 成功迁移 ${skills.length} 个技能`);
    }
    
    // 5. 迁移目标数据
    console.log('📋 迁移目标数据...');
    const goals = await oldDb.select().from(schema.goals);
    if (goals.length > 0) {
      await newDb.insert(schema.goals).values(goals);
      console.log(`✅ 成功迁移 ${goals.length} 个目标`);
    }
    
    // 6. 迁移里程碑数据
    console.log('📋 迁移里程碑数据...');
    const milestones = await oldDb.select().from(schema.milestones);
    if (milestones.length > 0) {
      await newDb.insert(schema.milestones).values(milestones);
      console.log(`✅ 成功迁移 ${milestones.length} 个里程碑`);
    }
    
    // 7. 迁移任务数据
    console.log('📋 迁移任务数据...');
    const tasks = await oldDb.select().from(schema.tasks);
    if (tasks.length > 0) {
      await newDb.insert(schema.tasks).values(tasks);
      console.log(`✅ 成功迁移 ${tasks.length} 个任务`);
    }
    
    // 8. 迁移微任务数据
    console.log('📋 迁移微任务数据...');
    const microTasks = await oldDb.select().from(schema.microTasks);
    if (microTasks.length > 0) {
      await newDb.insert(schema.microTasks).values(microTasks);
      console.log(`✅ 成功迁移 ${microTasks.length} 个微任务`);
    }
    
    // 9. 迁移活动日志
    console.log('📋 迁移活动日志...');
    const logs = await oldDb.select().from(schema.activityLogs);
    if (logs.length > 0) {
      await newDb.insert(schema.activityLogs).values(logs);
      console.log(`✅ 成功迁移 ${logs.length} 条活动日志`);
    }
    
    // 10. 迁移成就数据
    console.log('📋 迁移成就数据...');
    const achievements = await oldDb.select().from(schema.achievements);
    if (achievements.length > 0) {
      await newDb.insert(schema.achievements).values(achievements);
      console.log(`✅ 成功迁移 ${achievements.length} 个成就`);
    }
    
    console.log('🎉 数据库迁移完成！');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await oldConnection.end();
    await newConnection.end();
  }
}

// 运行迁移
migrateDatabase().catch(console.error);