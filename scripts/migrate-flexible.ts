import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL!;
const NEW_DATABASE_URL = process.env.SUPABASE_DATABASE_URL!;

async function migrateFlexible() {
  console.log('🚀 开始灵活数据迁移...\n');
  
  const oldDb = postgres(OLD_DATABASE_URL);
  const newDb = postgres(NEW_DATABASE_URL);
  
  try {
    // 1. 继续迁移目标数据（映射字段）
    console.log('📋 迁移目标数据...');
    const goals = await oldDb`SELECT * FROM goals`;
    
    for (const goal of goals) {
      await newDb`
        INSERT INTO goals (
          id, user_id, title, description, progress,
          status, priority, target_date, exp_reward, skill_id,
          created_at, completed_at
        ) VALUES (
          ${goal.id}, ${goal.user_id}, ${goal.title}, ${goal.description},
          ${goal.progress}, ${goal.completed ? 'completed' : 'active'}, 
          'medium', ${goal.target_date}, ${goal.exp_reward},
          ${goal.related_skill_ids?.[0] || null},
          ${goal.created_at}, ${goal.completed_at}
        )
      `;
    }
    console.log(`✅ 成功迁移 ${goals.length} 个目标`);
    
    // 2. 迁移任务数据
    console.log('\n📋 迁移任务数据...');
    const tasks = await oldDb`SELECT * FROM tasks`;
    
    for (const task of tasks) {
      // 处理可能缺失的字段
      await newDb`
        INSERT INTO tasks (
          id, user_id, title, description, completed,
          skill_id, goal_id, exp_reward, created_at, completed_at,
          task_category, task_type, difficulty, required_energy_balls,
          last_completed_at, completion_count, "order", tags
        ) VALUES (
          ${task.id}, ${task.user_id}, ${task.title}, ${task.description},
          ${task.completed}, ${task.skill_id}, ${task.goal_id},
          ${task.exp_reward || 10}, ${task.created_at}, ${task.completed_at},
          ${task.task_category || 'todo'}, ${task.task_type || 'simple'},
          ${task.difficulty || 'medium'}, ${task.required_energy_balls || 1},
          ${task.last_completed_at}, ${task.completion_count || 0},
          ${task.order || 0}, ${task.tags || []}
        )
      `;
    }
    console.log(`✅ 成功迁移 ${tasks.length} 个任务`);
    
    // 3. 迁移微任务
    console.log('\n📋 迁移微任务数据...');
    const microTasks = await oldDb`SELECT * FROM micro_tasks`;
    
    for (const mt of microTasks) {
      await newDb`
        INSERT INTO micro_tasks (id, task_id, user_id, title, completed, created_at)
        VALUES (${mt.id}, ${mt.task_id}, ${mt.user_id}, ${mt.title}, ${mt.completed}, ${mt.created_at})
      `;
    }
    console.log(`✅ 成功迁移 ${microTasks.length} 个微任务`);
    
    // 4. 迁移里程碑
    console.log('\n📋 迁移里程碑数据...');
    const milestones = await oldDb`SELECT * FROM milestones`;
    
    for (const ms of milestones) {
      await newDb`
        INSERT INTO milestones (
          id, goal_id, title, description, completed,
          progress, "order", created_at, completed_at
        ) VALUES (
          ${ms.id}, ${ms.goal_id}, ${ms.title}, ${ms.description},
          ${ms.completed}, ${ms.progress}, ${ms.order},
          ${ms.created_at}, ${ms.completed_at}
        )
      `;
    }
    console.log(`✅ 成功迁移 ${milestones.length} 个里程碑`);
    
    // 5. 迁移活动日志
    console.log('\n📋 迁移活动日志...');
    const logs = await oldDb`SELECT * FROM activity_logs`;
    
    for (const log of logs) {
      await newDb`
        INSERT INTO activity_logs (
          id, user_id, action, exp_gained, task_id,
          skill_id, details, created_at
        ) VALUES (
          ${log.id}, ${log.user_id}, ${log.action}, ${log.exp_gained},
          ${log.task_id}, ${log.skill_id}, ${log.details}, ${log.created_at}
        )
      `;
    }
    console.log(`✅ 成功迁移 ${logs.length} 条活动日志`);
    
    // 6. 迁移目标任务关联
    console.log('\n📋 迁移目标任务关联...');
    const goalTasks = await oldDb`SELECT * FROM goal_tasks`;
    
    for (const gt of goalTasks) {
      await newDb`
        INSERT INTO goal_tasks (id, goal_id, task_id)
        VALUES (${gt.id}, ${gt.goal_id}, ${gt.task_id})
      `;
    }
    console.log(`✅ 成功迁移 ${goalTasks.length} 个关联`);
    
    // 7. 重置序列
    console.log('\n🔧 重置序列...');
    await newDb`SELECT setval('goals_id_seq', (SELECT COALESCE(MAX(id), 0) FROM goals))`;
    await newDb`SELECT setval('tasks_id_seq', (SELECT COALESCE(MAX(id), 0) FROM tasks))`;
    await newDb`SELECT setval('micro_tasks_id_seq', (SELECT COALESCE(MAX(id), 0) FROM micro_tasks))`;
    await newDb`SELECT setval('milestones_id_seq', (SELECT COALESCE(MAX(id), 0) FROM milestones))`;
    await newDb`SELECT setval('activity_logs_id_seq', (SELECT COALESCE(MAX(id), 0) FROM activity_logs))`;
    await newDb`SELECT setval('goal_tasks_id_seq', (SELECT COALESCE(MAX(id), 0) FROM goal_tasks))`;
    
    // 8. 验证结果
    console.log('\n📊 验证迁移结果...');
    const counts = await Promise.all([
      newDb`SELECT COUNT(*) as count FROM users`,
      newDb`SELECT COUNT(*) as count FROM tasks`,
      newDb`SELECT COUNT(*) as count FROM skills`,
      newDb`SELECT COUNT(*) as count FROM goals`,
      newDb`SELECT COUNT(*) as count FROM activity_logs`
    ]);
    
    console.log(`   用户: ${counts[0][0].count} 条`);
    console.log(`   任务: ${counts[1][0].count} 条`);
    console.log(`   技能: ${counts[2][0].count} 条`);
    console.log(`   目标: ${counts[3][0].count} 条`);
    console.log(`   活动日志: ${counts[4][0].count} 条`);
    
    console.log('\n🎉 数据迁移完成！');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await oldDb.end();
    await newDb.end();
  }
}

migrateFlexible().catch(console.error);