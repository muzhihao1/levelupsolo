import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { storage } from "../server/storage";
import { InsertTask } from "../shared/schema";

/**
 * Test task creation to debug issues
 */
async function testTaskCreation() {
  console.log('🧪 Testing task creation...\n');
  
  try {
    // Get a real user
    const users = await db.execute(sql`
      SELECT id, email FROM users LIMIT 1
    `);
    
    const user = Array.isArray(users) ? users[0] : users.rows?.[0];
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`👤 Using user: ${user.email} (ID: ${user.id})\n`);
    
    // Test 1: Create a simple task
    console.log('1️⃣ Creating simple task...');
    try {
      const simpleTask: InsertTask = {
        userId: user.id,
        title: "Test Simple Task",
        description: "This is a test task",
        taskCategory: "todo",
        taskType: "simple",
        difficulty: "medium",
        expReward: 20,
        estimatedDuration: 30,
        requiredEnergyBalls: 2,
        completed: false
      };
      
      console.log('Task data:', JSON.stringify(simpleTask, null, 2));
      const created = await storage.createTask(simpleTask);
      console.log('✅ Simple task created successfully:', created.id);
      
      // Clean up
      await db.execute(sql`DELETE FROM tasks WHERE id = ${created.id}`);
    } catch (error: any) {
      console.error('❌ Simple task creation failed:', error.message);
      console.error('Error details:', error);
    }
    
    // Test 2: Create a habit task
    console.log('\n2️⃣ Creating habit task...');
    try {
      const habitTask: InsertTask = {
        userId: user.id,
        title: "Test Habit Task",
        description: "Daily habit task",
        taskCategory: "habit",
        taskType: "daily",
        difficulty: "easy",
        expReward: 10,
        estimatedDuration: 15,
        requiredEnergyBalls: 1,
        completed: false
      };
      
      console.log('Task data:', JSON.stringify(habitTask, null, 2));
      const created = await storage.createTask(habitTask);
      console.log('✅ Habit task created successfully:', created.id);
      
      // Clean up
      await db.execute(sql`DELETE FROM tasks WHERE id = ${created.id}`);
    } catch (error: any) {
      console.error('❌ Habit task creation failed:', error.message);
      console.error('Error details:', error);
    }
    
    // Test 3: Check table schema
    console.log('\n3️⃣ Checking tasks table schema...');
    try {
      const schemaResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'tasks'
        ORDER BY ordinal_position
      `);
      
      const schema = Array.isArray(schemaResult) ? schemaResult : schemaResult.rows || [];
      console.log('Tasks table columns:');
      schema.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch schema:', error.message);
    }
    
    console.log('\n✅ Task creation tests complete!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run test
testTaskCreation()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));