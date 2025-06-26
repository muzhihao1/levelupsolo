import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "../shared/schema";

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  hashedPassword?: string;
}

export interface CreateUserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
  hashedPassword: string;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function getUserPassword(userId: string): Promise<string | null> {
  try {
    const result = await db.select({ hashedPassword: users.hashedPassword })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result[0]?.hashedPassword || null;
  } catch (error) {
    console.error("Error fetching user password:", error);
    return null;
  }
}

export async function createUser(userData: CreateUserData): Promise<User> {
  try {
    const result = await db.insert(users)
      .values({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        hashedPassword: userData.hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return result[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create user");
  }
}