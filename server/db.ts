import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";
import { pgTable, serial, text, json, integer, boolean } from 'drizzle-orm/pg-core';

// 优先使用 Supabase 数据库，如果没有则使用原 DATABASE_URL
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Connecting to database:', databaseUrl.substring(0, 30) + '...');

// Parse the URL to check if it's using IPv6
const urlObj = new URL(databaseUrl);
const isIPv6 = urlObj.hostname.includes(':');

if (isIPv6) {
  console.warn('⚠️  Database URL contains IPv6 address. This may cause connection issues on some platforms.');
  console.warn('Consider using IPv4 address or hostname instead.');
}

// Create connection with additional options for better compatibility
const sql = postgres(databaseUrl, {
  connect_timeout: 30,  // 30 seconds timeout
  idle_timeout: 20,     // Close idle connections after 20 seconds
  max: 10,              // Maximum number of connections
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  prepare: false,       // Disable prepared statements which can cause issues
  connection: {
    application_name: 'levelupsolo'
  }
});

export const db = drizzle(sql, { schema });

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