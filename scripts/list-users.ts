#!/usr/bin/env tsx
/**
 * List all users in the database
 * Usage: tsx scripts/list-users.ts
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";

async function listUsers() {
  console.log(`📋 Listing all users in the database...\n`);
  
  try {
    // Get all users
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
        hasPassword: sql<boolean>`${users.hashedPassword} IS NOT NULL`,
      })
      .from(users)
      .orderBy(users.createdAt);
    
    if (allUsers.length === 0) {
      console.log(`No users found in the database.`);
      return;
    }
    
    console.log(`Found ${allUsers.length} users:\n`);
    console.log(`ID                     | Email                          | Name                  | Has Password | Created`);
    console.log(`-----------------------|--------------------------------|-----------------------|--------------|-------------------------`);
    
    allUsers.forEach((user) => {
      const id = user.id.padEnd(21);
      const email = (user.email || 'N/A').padEnd(30);
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim().padEnd(21);
      const hasPass = user.hasPassword ? '✅ Yes      ' : '❌ No       ';
      const created = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';
      
      console.log(`${id} | ${email} | ${name} | ${hasPass} | ${created}`);
    });
    
    // Summary
    const withPassword = allUsers.filter(u => u.hasPassword).length;
    const withoutPassword = allUsers.filter(u => !u.hasPassword).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total users: ${allUsers.length}`);
    console.log(`- With password: ${withPassword}`);
    console.log(`- Without password: ${withoutPassword}`);
    
    if (withoutPassword > 0) {
      console.log(`\n⚠️  ${withoutPassword} users don't have passwords set!`);
      console.log(`Use the reset-user-password.ts script to set passwords for these users.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error listing users:`, error);
    process.exit(1);
  }
}

// Check database connection
if (!process.env.DATABASE_URL && !process.env.SUPABASE_DATABASE_URL) {
  console.error(`
❌ No database URL configured!

Please set DATABASE_URL or SUPABASE_DATABASE_URL environment variable.

For production data:
  export DATABASE_URL="your-production-database-url"
  tsx scripts/list-users.ts
`);
  process.exit(1);
}

console.log(`
Environment: ${process.env.NODE_ENV || 'development'}
Database: ${process.env.DATABASE_URL ? 'Connected' : 'Using Supabase URL'}
`);

listUsers();