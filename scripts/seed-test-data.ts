#!/usr/bin/env tsx
/**
 * Seed Test Data Script
 * 用于在开发环境中快速填充测试数据
 * 
 * 使用方法:
 * npm run seed:test
 * 或
 * tsx scripts/seed-test-data.ts
 */

import { config } from 'dotenv';
import { storage } from '../server/storage';
import { setupCompleteTestData, cleanupTestData } from '../test/fixtures';
import { db } from '../server/db';
import bcrypt from 'bcryptjs';

// Load environment variables
config();

async function main() {
  console.log('🌱 Starting test data seeding...\n');

  try {
    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Cannot seed test data in production environment!');
      process.exit(1);
    }

    // Check database connection
    console.log('🔍 Checking database connection...');
    try {
      await db.execute('SELECT 1');
      console.log('✅ Database connected successfully\n');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will create test data in your database.');
    console.log('📊 Test data includes:');
    console.log('   - 3 test users (alice@test.com, bob@test.com, charlie@test.com)');
    console.log('   - 6 core skills for each user');
    console.log('   - Sample tasks (habits, main quests, side quests)');
    console.log('   - Sample goals with milestones');
    console.log('   - User stats and profiles\n');

    // Get command line arguments
    const args = process.argv.slice(2);
    const forceClean = args.includes('--clean');
    const skipConfirm = args.includes('--yes') || args.includes('-y');

    if (forceClean) {
      console.log('🧹 --clean flag detected. Will clean existing test data first.\n');
    }

    if (!skipConfirm) {
      console.log('Do you want to continue? (yes/no)');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question('> ', (answer: string) => {
          readline.close();
          resolve(answer.toLowerCase());
        });
      });

      if (answer !== 'yes' && answer !== 'y') {
        console.log('\n❌ Seeding cancelled.');
        process.exit(0);
      }
    }

    // Clean existing test data if requested
    if (forceClean) {
      console.log('\n🧹 Cleaning existing test data...');
      try {
        await cleanupTestData(storage, db);
        console.log('✅ Test data cleaned successfully');
      } catch (error) {
        console.log('⚠️  No existing test data to clean or error during cleanup:', error);
      }
    }

    // Create test data
    console.log('\n📝 Creating test users...');
    
    // Hash the test password
    const testPassword = await bcrypt.hash('test123', 10);
    
    // Update fixtures with hashed password
    const { testUsers } = await import('../test/fixtures');
    for (const user of Object.values(testUsers)) {
      user.hashedPassword = testPassword;
    }

    // Setup complete test data
    console.log('🎯 Setting up complete test environment...');
    const result = await setupCompleteTestData(storage);

    // Display summary
    console.log('\n✅ Test data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users created: ${Object.keys(result.users).length}`);
    console.log(`   - Tasks created: ${result.tasks.alice?.length || 0}`);
    console.log(`   - Goals created: ${result.goals.alice?.length || 0}`);
    
    console.log('\n🔐 Login credentials:');
    console.log('   Email: alice@test.com');
    console.log('   Password: test123');
    console.log('\n   Email: bob@test.com');
    console.log('   Password: test123');

    console.log('\n🎉 Happy testing!');

  } catch (error) {
    console.error('\n❌ Error seeding test data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});