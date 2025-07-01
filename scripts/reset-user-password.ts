#!/usr/bin/env tsx
/**
 * Password reset utility for existing users
 * Usage: tsx scripts/reset-user-password.ts <email> <new-password>
 */

import bcrypt from "bcryptjs";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function resetUserPassword(email: string, newPassword: string) {
  console.log(`🔐 Resetting password for user: ${email}`);
  
  try {
    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }
    
    console.log(`✅ User found: ${user.firstName} ${user.lastName}`);
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`🔒 Password hashed`);
    
    // Update password
    const [updated] = await db
      .update(users)
      .set({ hashedPassword })
      .where(eq(users.email, email))
      .returning();
    
    if (updated) {
      console.log(`✅ Password updated successfully for ${email}`);
      console.log(`📝 User can now login with the new password`);
    } else {
      console.error(`❌ Failed to update password`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error resetting password:`, error);
    process.exit(1);
  }
}

// Main execution
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log(`
Usage: tsx scripts/reset-user-password.ts <email> <new-password>

Example:
  tsx scripts/reset-user-password.ts user@example.com NewPassword123!
  
Note: 
  - Password should be at least 8 characters
  - Run this script locally with DATABASE_URL set to production database
  `);
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error(`❌ Password must be at least 8 characters long`);
  process.exit(1);
}

// Confirm action
console.log(`
⚠️  WARNING: This will reset the password for ${email}
Environment: ${process.env.NODE_ENV || 'development'}
Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}

Press Ctrl+C to cancel, or wait 3 seconds to continue...
`);

setTimeout(() => {
  resetUserPassword(email, newPassword);
}, 3000);