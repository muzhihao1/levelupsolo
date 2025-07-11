import { z } from "zod";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

// Schema for account deletion request
export const deleteAccountSchema = z.object({
  password: z.string(),
  scheduledDeletionDate: z.string().datetime().optional(),
});

// Schema for cancellation
export const cancelDeletionSchema = z.object({});

// Request account deletion
export async function requestAccountDeletion(
  userId: string, 
  password: string,
  scheduledDeletionDate?: string
): Promise<{ message: string; deletionDate: string; note: string }> {
  // Get user and verify password
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Verify password
  const hashedPassword = await storage.getUserPassword(userId);
  if (!hashedPassword) {
    throw new Error("Invalid password");
  }

  const isValidPassword = await bcrypt.compare(password, hashedPassword);
  if (!isValidPassword) {
    throw new Error("Invalid password");
  }

  // Calculate deletion date (30 days from now by default)
  const deletionDate = scheduledDeletionDate 
    ? new Date(scheduledDeletionDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Update user record with deletion request
  await db
    .update(users)
    .set({
      deletionRequestedAt: new Date(),
      deletionScheduledFor: deletionDate,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Create activity log
  await storage.createActivityLog({
    userId,
    action: 'account_deletion_requested',
    details: {
      description: 'Account deletion requested',
      scheduledDeletionDate: deletionDate.toISOString(),
      requestedAt: new Date().toISOString()
    }
  });

  // TODO: Send confirmation email
  // await sendDeletionConfirmationEmail(user.email);

  return {
    message: "Account deletion request received",
    deletionDate: deletionDate.toISOString(),
    note: "Your account will be permanently deleted after 30 days. You can cancel this request by logging in before the deletion date."
  };
}

// Cancel account deletion
export async function cancelAccountDeletion(userId: string): Promise<{ message: string }> {
  // Check if user has a pending deletion
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.deletionRequestedAt || !user.deletionScheduledFor) {
    throw new Error("No pending deletion request found");
  }

  // Clear deletion request
  await db
    .update(users)
    .set({
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Create activity log
  await storage.createActivityLog({
    userId,
    action: 'account_deletion_cancelled',
    details: {
      description: 'Account deletion cancelled',
      cancelledAt: new Date().toISOString()
    }
  });

  return {
    message: "Account deletion request has been cancelled"
  };
}

// Check if account is scheduled for deletion
export async function checkDeletionStatus(userId: string): Promise<{
  isScheduledForDeletion: boolean;
  deletionDate?: string;
  daysRemaining?: number;
}> {
  const user = await storage.getUser(userId);
  if (!user || !user.deletionScheduledFor) {
    return { isScheduledForDeletion: false };
  }

  const deletionDate = new Date(user.deletionScheduledFor);
  const now = new Date();
  const daysRemaining = Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isScheduledForDeletion: true,
    deletionDate: deletionDate.toISOString(),
    daysRemaining: Math.max(0, daysRemaining)
  };
}

// Process scheduled deletions (to be called by a cron job)
export async function processScheduledDeletions(): Promise<void> {
  // Find all users scheduled for deletion where the date has passed
  const usersToDelete = await db
    .select()
    .from(users)
    .where(eq(users.deletionScheduledFor, new Date()));

  for (const user of usersToDelete) {
    try {
      // Perform actual deletion
      // 1. Delete all user data (tasks, goals, skills, etc.)
      // 2. Anonymize or delete the user record
      // 3. Log the deletion
      
      console.log(`Processing deletion for user ${user.id}`);
      
      // TODO: Implement full data deletion
      // This is a placeholder - in production, you'd want to:
      // - Delete all related records (tasks, goals, skills, etc.)
      // - Either hard delete the user or anonymize their data
      // - Send a final confirmation email
      
    } catch (error) {
      console.error(`Failed to delete user ${user.id}:`, error);
    }
  }
}