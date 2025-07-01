import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";
import { pgTable, serial, text, json, integer, boolean } from 'drizzle-orm/pg-core';
import { getDb } from "./db-pool";

// 优先使用 Supabase 数据库，如果没有则使用原 DATABASE_URL
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("🚨 DATABASE_URL is not set!");
  console.error("Available environment variables:", Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('SUPABASE')));
  // Don't throw during module load - let the app start and show proper error
  console.error("Server will start but database operations will fail");
}

// Initialize these variables
let sql: any = null;
let db: any = null;

// In development, allow the server to start without a database
if (process.env.NODE_ENV === 'development' && !databaseUrl) {
  console.warn('⚠️  No DATABASE_URL set in development mode. Using mock storage.');
} else if (databaseUrl) {
  try {
    // 在生产环境使用连接池，在开发环境使用普通连接
    if (process.env.NODE_ENV === 'production' && process.env.USE_CONNECTION_POOL !== 'false') {
      console.log('Using connection pool for database');
      db = getDb();
      sql = null; // 使用连接池时不需要sql实例
    } else {
      console.log('Connecting to database:', databaseUrl.substring(0, 30) + '...');
      
      // Parse the URL to check if it's using IPv6
      const urlObj = new URL(databaseUrl);
      const isIPv6 = urlObj.hostname.includes(':');
      
      if (isIPv6) {
        console.warn('⚠️  Database URL contains IPv6 address. This may cause connection issues on some platforms.');
        console.warn('Consider using IPv4 address or hostname instead.');
      }
      
      // Create connection with additional options for better compatibility
      sql = postgres(databaseUrl, {
        connect_timeout: 30,  // 30 seconds timeout
        idle_timeout: 20,     // Close idle connections after 20 seconds
        max: 10,              // Maximum number of connections
        ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
        prepare: false,       // Disable prepared statements which can cause issues
        connection: {
          application_name: 'levelupsolo'
        }
      });
      
      db = drizzle(sql, { schema, logger: true });
    }
  } catch (error) {
    console.error("🚨 Failed to initialize database connection:", error);
    console.error("Error details:", {
      message: (error as any).message,
      code: (error as any).code,
      stack: (error as any).stack
    });
    
    // In development, don't crash the server
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Continuing without database in development mode.');
      sql = null;
      db = null;
    }
  }
}

export { db, sql };

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  milestones: json('milestones').$type<string[]>().notNull(),
  expReward: integer('exp_reward').notNull(),
  coinReward: integer('coin_reward').notNull(),
  skills: json('skills').$type<string[]>().notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: text('created_at').notNull(),
  microTasks: json('micro_tasks').$type<any[]>().default([]),
  warmupTasks: json('warmup_tasks').$type<any[]>().default([]),
});

export const userStates = pgTable('user_states', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  energyLevel: text('energy_level').notNull().default('medium'),
  availableTime: integer('available_time').notNull().default(30),
  mood: text('mood').notNull().default('neutral'),
  focusLevel: integer('focus_level').notNull().default(5),
  lastUpdated: text('last_updated').notNull(),
});

export const microTaskCompletions = pgTable('micro_task_completions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  goalId: integer('goal_id').notNull(),
  microTaskId: text('micro_task_id').notNull(),
  completedAt: text('completed_at').notNull(),
  timeSpent: integer('time_spent'), // actual time spent in minutes
});