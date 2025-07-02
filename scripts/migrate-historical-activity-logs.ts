import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { storage } from "../server/storage";

/**
 * Generate historical activity logs from existing completed tasks and goals
 */
async function migrateHistoricalActivityLogs() {
  console.log('📚 Starting historical activity logs migration...\n');
  
  try {
    // Get all users
    const users = await db.execute(sql`
      SELECT DISTINCT id, email FROM users
    `);
    
    const userList = Array.isArray(users) ? users : users.rows || [];
    console.log(`Found ${userList.length} users to process\n`);
    
    let totalCreated = 0;
    
    for (const user of userList) {
      console.log(`\n👤 Processing user: ${user.email} (${user.id})`);
      
      // Check existing activity logs for this user
      const existingLogs = await db.execute(sql`
        SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ${user.id}
      `);
      
      const existingCount = Array.isArray(existingLogs) ? existingLogs[0]?.count : existingLogs.rows?.[0]?.count;
      console.log(`  Existing logs: ${existingCount || 0}`);
      
      // 1. Get completed tasks
      const completedTasks = await db.execute(sql`
        SELECT 
          t.id,
          t.title,
          t.exp_reward,
          t.skill_id,
          t.completed_at,
          t.task_category,
          t.completion_count,
          s.name as skill_name
        FROM tasks t
        LEFT JOIN skills s ON t.skill_id = s.id
        WHERE t.user_id = ${user.id}
          AND t.completed = true
          AND t.completed_at IS NOT NULL
        ORDER BY t.completed_at DESC
      `);
      
      const tasks = Array.isArray(completedTasks) ? completedTasks : completedTasks.rows || [];
      console.log(`  Found ${tasks.length} completed tasks`);
      
      // Create activity logs for completed tasks
      let taskLogsCreated = 0;
      for (const task of tasks) {
        try {
          // Check if log already exists for this task
          const existing = await db.execute(sql`
            SELECT id FROM activity_logs 
            WHERE user_id = ${user.id} 
              AND task_id = ${task.id}
              AND action = 'task_completed'
            LIMIT 1
          `);
          
          const hasExisting = (Array.isArray(existing) ? existing : existing.rows || []).length > 0;
          
          if (!hasExisting && task.completed_at) {
            await db.execute(sql`
              INSERT INTO activity_logs (user_id, task_id, skill_id, exp_gained, action, details, created_at)
              VALUES (
                ${user.id},
                ${task.id},
                ${task.skill_id},
                ${task.exp_reward || 20},
                'task_completed',
                ${JSON.stringify({ 
                  description: `完成任务: ${task.title}`,
                  skillName: task.skill_name,
                  category: task.task_category
                })},
                ${task.completed_at}
              )
            `);
            taskLogsCreated++;
          }
        } catch (error: any) {
          console.error(`    Failed to create log for task ${task.id}:`, error.message);
        }
      }
      
      console.log(`  Created ${taskLogsCreated} task completion logs`);
      
      // 2. Get completed goals
      const completedGoals = await db.execute(sql`
        SELECT 
          g.id,
          g.title,
          g.exp_reward,
          g.completed_at,
          g.skill_id
        FROM goals g
        WHERE g.user_id = ${user.id}
          AND g.completed_at IS NOT NULL
        ORDER BY g.completed_at DESC
      `);
      
      const goals = Array.isArray(completedGoals) ? completedGoals : completedGoals.rows || [];
      console.log(`  Found ${goals.length} completed goals`);
      
      // Create activity logs for completed goals
      let goalLogsCreated = 0;
      for (const goal of goals) {
        try {
          // Check if log already exists for this goal
          const existing = await db.execute(sql`
            SELECT id FROM activity_logs 
            WHERE user_id = ${user.id} 
              AND action = 'goal_completed'
              AND (details->>'description' LIKE '%${goal.title}%' OR details IS NULL)
            LIMIT 1
          `);
          
          const hasExisting = (Array.isArray(existing) ? existing : existing.rows || []).length > 0;
          
          if (!hasExisting && goal.completed_at) {
            await db.execute(sql`
              INSERT INTO activity_logs (user_id, skill_id, exp_gained, action, details, created_at)
              VALUES (
                ${user.id},
                ${goal.skill_id},
                ${goal.exp_reward || 100},
                'goal_completed',
                ${JSON.stringify({ 
                  description: `完成目标: ${goal.title}`,
                  goalId: goal.id
                })},
                ${goal.completed_at}
              )
            `);
            goalLogsCreated++;
          }
        } catch (error: any) {
          console.error(`    Failed to create log for goal ${goal.id}:`, error.message);
        }
      }
      
      console.log(`  Created ${goalLogsCreated} goal completion logs`);
      
      // 3. Get completed milestones
      const completedMilestones = await db.execute(sql`
        SELECT 
          m.id,
          m.title,
          m.completed_at,
          g.title as goal_title,
          g.user_id
        FROM milestones m
        JOIN goals g ON m.goal_id = g.id
        WHERE g.user_id = ${user.id}
          AND m.completed = true
          AND m.completed_at IS NOT NULL
        ORDER BY m.completed_at DESC
      `);
      
      const milestones = Array.isArray(completedMilestones) ? completedMilestones : completedMilestones.rows || [];
      console.log(`  Found ${milestones.length} completed milestones`);
      
      // Create activity logs for completed milestones
      let milestoneLogsCreated = 0;
      for (const milestone of milestones) {
        try {
          // Check if log already exists
          const existing = await db.execute(sql`
            SELECT id FROM activity_logs 
            WHERE user_id = ${user.id} 
              AND action = 'milestone_completed'
              AND created_at = ${milestone.completed_at}
            LIMIT 1
          `);
          
          const hasExisting = (Array.isArray(existing) ? existing : existing.rows || []).length > 0;
          
          if (!hasExisting) {
            await db.execute(sql`
              INSERT INTO activity_logs (user_id, exp_gained, action, details, created_at)
              VALUES (
                ${user.id},
                0,
                'milestone_completed',
                ${JSON.stringify({ 
                  description: `完成里程碑: ${milestone.title}`,
                  goalTitle: milestone.goal_title
                })},
                ${milestone.completed_at}
              )
            `);
            milestoneLogsCreated++;
          }
        } catch (error: any) {
          console.error(`    Failed to create log for milestone ${milestone.id}:`, error.message);
        }
      }
      
      console.log(`  Created ${milestoneLogsCreated} milestone completion logs`);
      
      totalCreated += taskLogsCreated + goalLogsCreated + milestoneLogsCreated;
    }
    
    console.log(`\n✅ Migration complete! Created ${totalCreated} historical activity logs.`);
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
  }
}

// Run migration
migrateHistoricalActivityLogs()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });