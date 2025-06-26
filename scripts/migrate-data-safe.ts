import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '..', '.env') });

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL!;
const NEW_DATABASE_URL = process.env.SUPABASE_DATABASE_URL!;

async function migrateDatabase() {
  console.log('🚀 开始安全数据库迁移...');
  
  const oldConnection = postgres(OLD_DATABASE_URL);
  const newConnection = postgres(NEW_DATABASE_URL);
  
  try {
    // 5. 迁移目标数据（处理字段差异）
    console.log('\n📋 迁移目标数据...');
    const goalsResult = await oldConnection`
      SELECT 
        id, user_id, title, description, progress, status, priority, 
        target_date, parent_goal_id, exp_reward, skill_id, 
        created_at, updated_at, completed_at
      FROM goals
    `;
    
    if (goalsResult.length > 0) {
      for (const goal of goalsResult) {
        await newConnection`
          INSERT INTO goals (
            id, user_id, title, description, progress, status, priority,
            target_date, parent_goal_id, exp_reward, skill_id,
            created_at, updated_at, completed_at
          ) VALUES (
            ${goal.id}, ${goal.user_id}, ${goal.title}, ${goal.description},
            ${goal.progress}, ${goal.status}, ${goal.priority},
            ${goal.target_date}, ${goal.parent_goal_id}, ${goal.exp_reward},
            ${goal.skill_id}, ${goal.created_at}, ${goal.updated_at}, ${goal.completed_at}
          )
        `;
      }
      console.log(`✅ 成功迁移 ${goalsResult.length} 个目标`);
    }
    
    // 6. 迁移里程碑数据
    console.log('\n📋 迁移里程碑数据...');
    const milestonesResult = await oldConnection`SELECT * FROM milestones`;
    if (milestonesResult.length > 0) {
      for (const milestone of milestonesResult) {
        await newConnection`
          INSERT INTO milestones VALUES (
            ${milestone.id}, ${milestone.goal_id}, ${milestone.title},
            ${milestone.description}, ${milestone.completed}, ${milestone.progress},
            ${milestone.order}, ${milestone.created_at}, ${milestone.completed_at}
          )
        `;
      }
      console.log(`✅ 成功迁移 ${milestonesResult.length} 个里程碑`);
    }
    
    // 7. 迁移任务数据
    console.log('\n📋 迁移任务数据...');
    const tasksResult = await oldConnection`SELECT * FROM tasks`;
    if (tasksResult.length > 0) {
      for (const task of tasksResult) {
        await newConnection`
          INSERT INTO tasks (
            id, user_id, title, description, completed, skill_id, goal_id,
            goal_tags, exp_reward, estimated_duration, actual_duration,
            accumulated_time, pomodoro_session_id, started_at, created_at,
            completed_at, task_category, task_type, parent_task_id, "order",
            tags, difficulty, required_energy_balls, last_completed_at,
            completion_count
          ) VALUES (
            ${task.id}, ${task.user_id}, ${task.title}, ${task.description},
            ${task.completed}, ${task.skill_id}, ${task.goal_id}, ${task.goal_tags},
            ${task.exp_reward}, ${task.estimated_duration}, ${task.actual_duration},
            ${task.accumulated_time}, ${task.pomodoro_session_id}, ${task.started_at},
            ${task.created_at}, ${task.completed_at}, ${task.task_category},
            ${task.task_type}, ${task.parent_task_id}, ${task.order}, ${task.tags},
            ${task.difficulty}, ${task.required_energy_balls}, ${task.last_completed_at},
            ${task.completion_count}
          )
        `;
      }
      console.log(`✅ 成功迁移 ${tasksResult.length} 个任务`);
    }
    
    // 8. 迁移微任务数据
    console.log('\n📋 迁移微任务数据...');
    const microTasksResult = await oldConnection`SELECT * FROM micro_tasks`;
    if (microTasksResult.length > 0) {
      for (const microTask of microTasksResult) {
        await newConnection`
          INSERT INTO micro_tasks VALUES (
            ${microTask.id}, ${microTask.task_id}, ${microTask.user_id},
            ${microTask.title}, ${microTask.completed}, ${microTask.created_at}
          )
        `;
      }
      console.log(`✅ 成功迁移 ${microTasksResult.length} 个微任务`);
    }
    
    // 9. 迁移活动日志
    console.log('\n📋 迁移活动日志...');
    const logsResult = await oldConnection`SELECT * FROM activity_logs`;
    if (logsResult.length > 0) {
      for (const log of logsResult) {
        await newConnection`
          INSERT INTO activity_logs VALUES (
            ${log.id}, ${log.user_id}, ${log.action}, ${log.exp_gained},
            ${log.task_id}, ${log.skill_id}, ${log.details}, ${log.created_at}
          )
        `;
      }
      console.log(`✅ 成功迁移 ${logsResult.length} 条活动日志`);
    }
    
    // 10. 重置序列
    console.log('\n🔧 重置序列...');
    const sequences = [
      'user_profiles_id_seq',
      'user_stats_id_seq',
      'skills_id_seq',
      'goals_id_seq',
      'tasks_id_seq',
      'milestones_id_seq',
      'micro_tasks_id_seq',
      'activity_logs_id_seq'
    ];
    
    for (const seq of sequences) {
      const table = seq.replace('_id_seq', '');
      await newConnection`
        SELECT setval(${seq}, (SELECT COALESCE(MAX(id), 0) FROM ${newConnection(table)}))
      `.catch(() => {
        // 忽略序列不存在的错误
      });
    }
    
    console.log('\n🎉 数据库迁移完成！');
    
    // 验证迁移结果
    console.log('\n📊 验证迁移结果...');
    const counts = await Promise.all([
      newConnection`SELECT COUNT(*) as count FROM users`,
      newConnection`SELECT COUNT(*) as count FROM tasks`,
      newConnection`SELECT COUNT(*) as count FROM skills`,
      newConnection`SELECT COUNT(*) as count FROM goals`
    ]);
    
    console.log(`   用户: ${counts[0][0].count} 条`);
    console.log(`   任务: ${counts[1][0].count} 条`);
    console.log(`   技能: ${counts[2][0].count} 条`);
    console.log(`   目标: ${counts[3][0].count} 条`);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await oldConnection.end();
    await newConnection.end();
  }
}

// 运行迁移
migrateDatabase().catch(console.error);