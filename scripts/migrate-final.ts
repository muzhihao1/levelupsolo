import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL!;
const NEW_DATABASE_URL = process.env.SUPABASE_DATABASE_URL!;

async function migrateFinal() {
  console.log('🚀 开始最终数据迁移...\n');
  
  const oldDb = postgres(OLD_DATABASE_URL);
  const newDb = postgres(NEW_DATABASE_URL);
  
  try {
    // 1. 迁移任务数据（目标已经迁移了）
    console.log('📋 迁移任务数据...');
    const tasks = await oldDb`SELECT * FROM tasks ORDER BY id`;
    let taskCount = 0;
    
    for (const task of tasks) {
      try {
        await newDb`
          INSERT INTO tasks (
            id, user_id, title, description, completed,
            skill_id, goal_id, exp_reward, created_at, completed_at,
            task_category, task_type, difficulty, required_energy_balls,
            last_completed_at, completion_count, "order", tags,
            estimated_duration, actual_duration, accumulated_time,
            pomodoro_session_id, started_at, goal_tags
          ) VALUES (
            ${task.id}, 
            ${task.user_id}, 
            ${task.title}, 
            ${task.description || null},
            ${task.completed}, 
            ${task.skill_id || null}, 
            ${task.goal_id || null},
            ${task.exp_reward || 10}, 
            ${task.created_at}, 
            ${task.completed_at || null},
            ${task.task_category || 'todo'}, 
            ${task.task_type || 'simple'},
            ${task.difficulty || 'medium'}, 
            ${task.required_energy_balls || 1},
            ${task.last_completed_date || task.completed_at || null}, 
            ${task.completion_count || (task.completed ? 1 : 0)},
            ${task.order || 0}, 
            ${task.tags || []},
            ${task.estimated_duration || null},
            ${task.actual_duration || null},
            ${task.accumulated_time || 0},
            ${task.pomodoro_session_id || null},
            ${task.started_at || null},
            ${task.goal_tags || null}
          )
        `;
        taskCount++;
      } catch (e) {
        console.error(`  ❌ 任务 ${task.id} 迁移失败:`, e.message);
      }
    }
    console.log(`✅ 成功迁移 ${taskCount}/${tasks.length} 个任务`);
    
    // 2. 迁移微任务
    console.log('\n📋 迁移微任务数据...');
    const microTasks = await oldDb`SELECT * FROM micro_tasks ORDER BY id`;
    let microCount = 0;
    
    for (const mt of microTasks) {
      try {
        await newDb`
          INSERT INTO micro_tasks (id, task_id, user_id, title, completed, created_at)
          VALUES (${mt.id}, ${mt.task_id}, ${mt.user_id}, ${mt.title}, ${mt.completed}, ${mt.created_at})
        `;
        microCount++;
      } catch (e) {
        console.error(`  ❌ 微任务 ${mt.id} 迁移失败:`, e.message);
      }
    }
    console.log(`✅ 成功迁移 ${microCount}/${microTasks.length} 个微任务`);
    
    // 3. 迁移里程碑
    console.log('\n📋 迁移里程碑数据...');
    const milestones = await oldDb`SELECT * FROM milestones ORDER BY id`;
    let msCount = 0;
    
    for (const ms of milestones) {
      try {
        await newDb`
          INSERT INTO milestones (
            id, goal_id, title, description, completed,
            progress, "order", created_at, completed_at
          ) VALUES (
            ${ms.id}, ${ms.goal_id}, ${ms.title}, ${ms.description || null},
            ${ms.completed}, ${ms.progress}, ${ms.order || 0},
            ${ms.created_at}, ${ms.completed_at || null}
          )
        `;
        msCount++;
      } catch (e) {
        console.error(`  ❌ 里程碑 ${ms.id} 迁移失败:`, e.message);
      }
    }
    console.log(`✅ 成功迁移 ${msCount}/${milestones.length} 个里程碑`);
    
    // 4. 迁移活动日志
    console.log('\n📋 迁移活动日志...');
    const logs = await oldDb`SELECT * FROM activity_logs ORDER BY id`;
    let logCount = 0;
    
    for (const log of logs) {
      try {
        await newDb`
          INSERT INTO activity_logs (
            id, user_id, action, exp_gained, task_id,
            skill_id, details, created_at
          ) VALUES (
            ${log.id}, ${log.user_id}, ${log.action}, ${log.exp_gained || 0},
            ${log.task_id || null}, ${log.skill_id || null}, 
            ${log.details || null}, ${log.created_at}
          )
        `;
        logCount++;
      } catch (e) {
        console.error(`  ❌ 活动日志 ${log.id} 迁移失败:`, e.message);
      }
    }
    console.log(`✅ 成功迁移 ${logCount}/${logs.length} 条活动日志`);
    
    // 5. 迁移目标任务关联
    console.log('\n📋 迁移目标任务关联...');
    const goalTasks = await oldDb`SELECT * FROM goal_tasks ORDER BY id`;
    let gtCount = 0;
    
    for (const gt of goalTasks) {
      try {
        await newDb`
          INSERT INTO goal_tasks (id, goal_id, task_id)
          VALUES (${gt.id}, ${gt.goal_id}, ${gt.task_id})
        `;
        gtCount++;
      } catch (e) {
        console.error(`  ❌ 关联 ${gt.id} 迁移失败:`, e.message);
      }
    }
    console.log(`✅ 成功迁移 ${gtCount}/${goalTasks.length} 个关联`);
    
    // 6. 重置序列
    console.log('\n🔧 重置序列...');
    const sequences = [
      { seq: 'goals_id_seq', table: 'goals' },
      { seq: 'tasks_id_seq', table: 'tasks' },
      { seq: 'micro_tasks_id_seq', table: 'micro_tasks' },
      { seq: 'milestones_id_seq', table: 'milestones' },
      { seq: 'activity_logs_id_seq', table: 'activity_logs' },
      { seq: 'goal_tasks_id_seq', table: 'goal_tasks' }
    ];
    
    for (const { seq, table } of sequences) {
      try {
        await newDb`SELECT setval(${seq}, (SELECT COALESCE(MAX(id), 0) FROM ${newDb(table)}))`;
        console.log(`  ✓ ${seq} 重置成功`);
      } catch (e) {
        console.log(`  ⚠️  ${seq} 重置失败:`, e.message);
      }
    }
    
    // 7. 验证结果
    console.log('\n📊 验证迁移结果...');
    const counts = await Promise.all([
      newDb`SELECT COUNT(*) as count FROM users`,
      newDb`SELECT COUNT(*) as count FROM tasks`,
      newDb`SELECT COUNT(*) as count FROM skills`,
      newDb`SELECT COUNT(*) as count FROM goals`,
      newDb`SELECT COUNT(*) as count FROM activity_logs`,
      newDb`SELECT COUNT(*) as count FROM micro_tasks`
    ]);
    
    console.log(`   用户: ${counts[0][0].count} 条`);
    console.log(`   任务: ${counts[1][0].count} 条`);
    console.log(`   技能: ${counts[2][0].count} 条`);
    console.log(`   目标: ${counts[3][0].count} 条`);
    console.log(`   活动日志: ${counts[4][0].count} 条`);
    console.log(`   微任务: ${counts[5][0].count} 条`);
    
    console.log('\n🎉 数据迁移完成！');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await oldDb.end();
    await newDb.end();
  }
}

migrateFinal().catch(console.error);