// Diagnose user and task relationship issues
import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function diagnoseUserTasks() {
  console.log('🔍 Diagnosing User-Task Relationship Issues...\n');
  
  try {
    // 1. Get all users
    console.log('📊 Step 1: Checking Users');
    console.log('=========================');
    const users = await db.execute(sql`
      SELECT id, email, created_at 
      FROM users 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    const userRows = users.rows || users;
    console.log(`Found ${userRows.length} users:`);
    userRows.forEach((user: any) => {
      console.log(`  - ID: ${user.id} | Email: ${user.email} | Created: ${new Date(user.created_at).toLocaleDateString()}`);
    });
    
    // 2. Get all unique user_ids from tasks
    console.log('\n📊 Step 2: Checking Task User IDs');
    console.log('==================================');
    const taskUserIds = await db.execute(sql`
      SELECT DISTINCT user_id, COUNT(*) as task_count
      FROM tasks
      GROUP BY user_id
      ORDER BY task_count DESC
    `);
    
    const taskUserRows = taskUserIds.rows || taskUserIds;
    console.log(`Found ${taskUserRows.length} unique user IDs in tasks table:`);
    taskUserRows.forEach((row: any) => {
      console.log(`  - User ID: ${row.user_id} | Tasks: ${row.task_count}`);
    });
    
    // 3. Check for mismatches
    console.log('\n⚠️  Step 3: Checking for User ID Mismatches');
    console.log('============================================');
    
    const userIds = new Set(userRows.map((u: any) => u.id));
    const taskUserIdsSet = new Set(taskUserRows.map((r: any) => r.user_id));
    
    // Tasks with user IDs not in users table
    const orphanedTaskUserIds = [...taskUserIdsSet].filter(id => !userIds.has(id));
    if (orphanedTaskUserIds.length > 0) {
      console.log('❌ Found tasks with user IDs not in users table:');
      orphanedTaskUserIds.forEach(id => {
        const taskCount = taskUserRows.find((r: any) => r.user_id === id)?.task_count || 0;
        console.log(`   - User ID: ${id} (${taskCount} tasks)`);
      });
    } else {
      console.log('✅ All task user IDs exist in users table');
    }
    
    // 4. Sample tasks for each user
    console.log('\n📝 Step 4: Sample Tasks by User');
    console.log('================================');
    
    for (const user of userRows.slice(0, 3)) { // Check first 3 users
      console.log(`\nUser: ${user.email} (ID: ${user.id})`);
      
      const userTasks = await db.execute(sql`
        SELECT id, title, task_category, completed, created_at
        FROM tasks
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      const taskRows = userTasks.rows || userTasks;
      if (taskRows.length === 0) {
        console.log('  No tasks found for this user');
      } else {
        taskRows.forEach((task: any) => {
          const status = task.completed ? '✓' : '○';
          console.log(`  ${status} [${task.task_category}] "${task.title}"`);
        });
      }
    }
    
    // 5. Check auth token format
    console.log('\n🔐 Step 5: Authentication Token Format');
    console.log('======================================');
    console.log('Expected userId format in JWT token:');
    console.log('  - req.user.claims.sub = user ID from database');
    console.log('  - This should match the "id" column in users table');
    console.log('\nCommon issues:');
    console.log('  - Mock storage vs real database user IDs');
    console.log('  - Different auth providers (Clerk, Supabase, etc.)');
    console.log('  - User ID format mismatch (UUID vs numeric)');
    
    // 6. Quick fix suggestion
    console.log('\n💡 Step 6: Debugging Suggestions');
    console.log('=================================');
    console.log('1. Add logging to /api/pomodoro/available-tasks:');
    console.log('   console.log("User ID from token:", userId);');
    console.log('   console.log("Tasks query result:", tasks.length);');
    console.log('\n2. Check if using mock storage:');
    console.log('   console.log("Storage type:", storage.constructor.name);');
    console.log('\n3. Manually test with a known user ID:');
    console.log('   const testTasks = await storage.getTasks("actual-user-id-from-db");');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Run diagnosis
diagnoseUserTasks();