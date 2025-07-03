import { db } from './server/db.js';
import { tasks } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testDrizzleUpdate() {
  console.log('=== DRIZZLE ORM UPDATE TEST ===\n');
  
  try {
    // 1. Test what SQL Drizzle generates for camelCase fields
    const testUpdates = {
      lastCompletedAt: new Date(),
      completionCount: 5
    };
    
    console.log('Testing update with camelCase fields:', testUpdates);
    
    // Get a sample habit task
    const [sampleTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.taskCategory, 'habit'))
      .limit(1);
    
    if (!sampleTask) {
      console.log('No habit tasks found for testing');
      return;
    }
    
    console.log('\nSample task ID:', sampleTask.id);
    
    // Try the update and see what happens
    try {
      const [updated] = await db
        .update(tasks)
        .set(testUpdates)
        .where(eq(tasks.id, sampleTask.id))
        .returning();
      
      console.log('\nUpdate successful!');
      console.log('Updated task:', updated);
    } catch (updateError) {
      console.error('\nUpdate failed with error:');
      console.error('Error code:', updateError.code);
      console.error('Error message:', updateError.message);
      console.error('Error detail:', updateError.detail);
      console.error('Error hint:', updateError.hint);
      
      // Try with raw SQL to see what column names work
      console.log('\n--- Testing raw SQL queries ---');
      
      // Test 1: snake_case
      try {
        const result1 = await db.execute`
          UPDATE tasks 
          SET last_completed_at = NOW()
          WHERE id = ${sampleTask.id}
          RETURNING last_completed_at, completion_count
        `;
        console.log('✓ Snake_case update worked:', result1.rows[0]);
      } catch (e) {
        console.log('✗ Snake_case update failed:', e.message);
      }
      
      // Test 2: camelCase with quotes
      try {
        const result2 = await db.execute`
          UPDATE tasks 
          SET "lastCompletedAt" = NOW()
          WHERE id = ${sampleTask.id}
          RETURNING "lastCompletedAt", "completionCount"
        `;
        console.log('✓ CamelCase with quotes worked:', result2.rows[0]);
      } catch (e) {
        console.log('✗ CamelCase with quotes failed:', e.message);
      }
    }
    
    // 2. Check how Drizzle maps fields
    console.log('\n--- Drizzle Column Mapping ---');
    console.log('tasks.lastCompletedAt:', tasks.lastCompletedAt);
    console.log('tasks.completionCount:', tasks.completionCount);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testDrizzleUpdate();