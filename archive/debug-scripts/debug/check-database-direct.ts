import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function checkUserData() {
  const userId = '55b0b902-d316-418d-be05-a4f40ceeb5d5'; // 279838958@qq.com
  
  console.log('Checking data for user ID:', userId);
  console.log('Email: 279838958@qq.com');
  console.log('=====================================\n');

  try {
    // Check user
    const user = await db.execute(
      sql`SELECT * FROM users WHERE id = ${userId}`
    );
    console.log('User record found:', user.rows.length > 0);
    if (user.rows.length > 0) {
      console.log('User:', user.rows[0]);
    } else {
      console.log('No user found with ID:', userId);
      // Try to find by email
      const userByEmail = await db.execute(
        sql`SELECT * FROM users WHERE email = ${'279838958@qq.com'}`
      );
      if (userByEmail.rows.length > 0) {
        console.log('Found user by email with different ID:', userByEmail.rows[0]);
        // Update userId for further checks
        const actualUserId = userByEmail.rows[0].id;
        console.log('Using actual user ID:', actualUserId);
        
        // Continue with actual user ID
        const profile = await db.execute(
          sql`SELECT * FROM user_profiles WHERE user_id = ${actualUserId}`
        );
        console.log('\n=====================================\n');
        console.log('Profile record:', profile.rows[0] || 'No profile found');
        
        const tasksCount = await db.execute(
          sql`SELECT COUNT(*) as count FROM tasks WHERE user_id = ${actualUserId}`
        );
        console.log('\n=====================================\n');
        console.log('Total tasks:', tasksCount.rows[0].count);
        
        const tasks = await db.execute(
          sql`SELECT * FROM tasks WHERE user_id = ${actualUserId} ORDER BY created_at DESC LIMIT 5`
        );
        console.log('\nFirst 5 tasks:');
        tasks.rows.forEach((task, i) => {
          console.log(`${i + 1}. ${task.title} (${task.status})`);
        });
        
        const skills = await db.execute(
          sql`SELECT * FROM skills WHERE user_id = ${actualUserId}`
        );
        console.log('\n=====================================\n');
        console.log('Total skills:', skills.rows.length);
        skills.rows.forEach(skill => {
          console.log(`- ${skill.name}: Level ${skill.level}, XP ${skill.experience_points}`);
        });
        
        process.exit(0);
      }
    }
    console.log('\n=====================================\n');

    // Check profile
    const profile = await db.execute(
      sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`
    );
    console.log('Profile record:', profile.rows[0]);
    console.log('\n=====================================\n');

    // Check tasks count
    const tasksCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM tasks WHERE user_id = ${userId}`
    );
    console.log('Total tasks:', tasksCount.rows[0].count);

    // Get first 5 tasks
    const tasks = await db.execute(
      sql`SELECT * FROM tasks WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 5`
    );
    console.log('\nFirst 5 tasks:');
    tasks.rows.forEach((task, i) => {
      console.log(`${i + 1}. ${task.title} (${task.status})`);
    });

    // Check skills
    const skills = await db.execute(
      sql`SELECT * FROM skills WHERE user_id = ${userId}`
    );
    console.log('\n=====================================\n');
    console.log('Total skills:', skills.rows.length);
    skills.rows.forEach(skill => {
      console.log(`- ${skill.name}: Level ${skill.level}, XP ${skill.experience_points}`);
    });

    // Check activities/logs
    const activitiesCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM activities WHERE user_id = ${userId}`
    );
    console.log('\n=====================================\n');
    console.log('Total activities:', activitiesCount.rows[0].count);

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserData();