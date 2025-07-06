// Verify user authentication and task mapping
import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as auth from '../server/auth-jwt';
import { storage } from '../server/storage';

async function verifyUserAuth() {
  console.log('🔍 Verifying User Authentication and Task Mapping...\n');
  
  try {
    // 1. Find the user with email 279838958@qq.com
    console.log('📧 Step 1: Finding user by email');
    console.log('=====================================');
    const targetEmail = '279838958@qq.com';
    
    const user = await storage.getUserByEmail(targetEmail);
    if (!user) {
      console.log(`❌ User with email ${targetEmail} not found in users table`);
      return;
    }
    
    console.log(`✅ Found user:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.firstName} ${user.lastName}`);
    
    // 2. Check what would be in JWT token
    console.log('\n🔐 Step 2: JWT Token Simulation');
    console.log('================================');
    console.log(`When user logs in, JWT token will contain:`);
    console.log(`   - userId: ${user.id}`);
    console.log(`   - email: ${user.email}`);
    
    // Simulate token generation
    const tokens = auth.generateTokens(user.id, user.email);
    console.log(`\n📝 Generated tokens:`);
    console.log(`   - Access Token: ${tokens.accessToken.substring(0, 50)}...`);
    
    // Verify the token
    const decoded = auth.verifyAccessToken(tokens.accessToken);
    console.log(`\n🔍 Decoded token claims:`);
    console.log(`   - userId: ${decoded.userId}`);
    console.log(`   - email: ${decoded.email}`);
    
    // 3. Check tasks for this user ID
    console.log('\n📊 Step 3: Checking Tasks for User');
    console.log('==================================');
    
    const tasks = await db.execute(sql`
      SELECT 
        task_category,
        COUNT(*) as count,
        SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_count
      FROM tasks
      WHERE user_id = ${user.id}
      GROUP BY task_category
    `);
    
    const taskRows = tasks.rows || tasks;
    console.log(`Tasks breakdown for user ID "${user.id}":`);
    taskRows.forEach((row: any) => {
      console.log(`   - ${row.task_category || 'null'}: ${row.count} total (${row.completed_count} completed)`);
    });
    
    // 4. Get sample tasks
    console.log('\n📝 Sample tasks:');
    const sampleTasks = await db.execute(sql`
      SELECT id, title, task_category, task_type, completed
      FROM tasks
      WHERE user_id = ${user.id}
      LIMIT 10
    `);
    
    const sampleRows = sampleTasks.rows || sampleTasks;
    sampleRows.forEach((task: any) => {
      const status = task.completed ? '✓' : '○';
      console.log(`   ${status} [${task.task_category}/${task.task_type}] "${task.title}"`);
    });
    
    // 5. Test Pomodoro API directly
    console.log('\n🍅 Step 4: Testing Pomodoro API Logic');
    console.log('=====================================');
    
    // Get active tasks for Pomodoro
    const activeTasks = await storage.getTasks(user.id);
    const today = new Date().toDateString();
    
    const availableTasks = activeTasks.filter(t => {
      // For habits, check if completed today
      if (t.taskCategory === 'habit' || t.taskType === 'daily') {
        if (!t.completed) return true;
        const completedDate = t.completedAt ? new Date(t.completedAt).toDateString() : null;
        return completedDate !== today;
      }
      // For other tasks, only show incomplete
      return !t.completed;
    });
    
    const categorized = {
      goals: availableTasks.filter(t => t.taskCategory === 'goal').length,
      todos: availableTasks.filter(t => t.taskCategory === 'todo' || t.taskCategory === 'side').length,
      habits: availableTasks.filter(t => t.taskCategory === 'habit' || t.taskType === 'daily').length,
    };
    
    console.log(`Available tasks for Pomodoro:`);
    console.log(`   - Goals (主线): ${categorized.goals}`);
    console.log(`   - Todos (支线): ${categorized.todos}`);
    console.log(`   - Habits (习惯): ${categorized.habits}`);
    console.log(`   - Total: ${availableTasks.length}`);
    
    // 6. Recommendations
    console.log('\n💡 Step 5: Debugging Recommendations');
    console.log('====================================');
    console.log('1. Make sure you are logged in with 279838958@qq.com');
    console.log('2. Clear browser localStorage and sessionStorage');
    console.log('3. Log out and log back in');
    console.log('4. Check browser console for the actual user ID in requests');
    console.log('5. Verify the Authorization header contains correct JWT token');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run verification
verifyUserAuth();