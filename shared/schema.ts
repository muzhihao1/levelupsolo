import { pgTable, text, serial, integer, boolean, timestamp, real, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  hashedPassword: text("hashed_password"), // 密码字段
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  deletionRequestedAt: timestamp("deletion_requested_at"),
  deletionScheduledFor: timestamp("deletion_scheduled_for"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  age: text("age"),
  occupation: text("occupation"),
  mission: text("mission"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false),
  hasCompletedTutorial: boolean("has_completed_tutorial").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User game stats table - inspired by Habitica with Energy Ball system
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  experienceToNext: integer("experience_to_next").notNull().default(100),
  // Energy Ball System (replacing health)
  energyBalls: integer("energy_balls").notNull().default(18), // 当前能量球数量
  maxEnergyBalls: integer("max_energy_balls").notNull().default(18), // 每日最大能量球
  energyBallDuration: integer("energy_ball_duration").notNull().default(15), // 单个能量球时长(分钟)
  energyPeakStart: integer("energy_peak_start").notNull().default(9), // 能量高峰开始时间(小时)
  energyPeakEnd: integer("energy_peak_end").notNull().default(12), // 能量高峰结束时间(小时)

  streak: integer("streak").notNull().default(0), // 连续完成每日任务的天数
  totalTasksCompleted: integer("total_tasks_completed").notNull().default(0),
  lastEnergyReset: timestamp("last_energy_reset").defaultNow(), // 上次能量球重置时间
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  level: integer("level").notNull().default(1),
  exp: integer("exp").notNull().default(0),
  maxExp: integer("max_exp").notNull().default(100),
  color: text("color").notNull().default("#6366F1"),
  icon: text("icon").notNull().default("fas fa-star"),
  skillType: text("skill_type").notNull().default("basic"), // basic, advanced, mastery
  category: text("category").notNull().default("general"), // general, technical, creative, physical, social
  talentPoints: integer("talent_points").notNull().default(0),
  prestige: integer("prestige").notNull().default(0), // 声望等级
  unlocked: boolean("unlocked").notNull().default(true),
  prerequisites: integer("prerequisites").array(), // 前置技能ID数组
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  skillId: integer("skill_id").references(() => skills.id),
  goalId: integer("goal_id").references(() => goals.id), // 关联的目标ID
  goalTags: text("goal_tags").array(), // 关联的目标标签
  expReward: integer("exp_reward").notNull().default(0),
  estimatedDuration: integer("estimated_duration").default(25), // 预估时长（分钟）
  actualDuration: integer("actual_duration"), // 实际耗时（分钟）
  accumulatedTime: integer("accumulated_time").default(0), // 累积时间（分钟）
  pomodoroSessionId: text("pomodoro_session_id"), // 番茄钟会话ID
  startedAt: timestamp("started_at"), // 开始时间
  actualEnergyBalls: integer("actual_energy_balls"), // 实际消耗的能量球
  pomodoroCycles: integer("pomodoro_cycles").default(0), // 完成的番茄钟周期数
  battleStartTime: timestamp("battle_start_time"), // 战斗开始时间
  battleEndTime: timestamp("battle_end_time"), // 战斗结束时间
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  // Habitica-inspired task categorization
  taskCategory: text("task_category").notNull().default("todo"), // 'habit', 'daily', 'todo'
  taskType: text("task_type").notNull().default("simple"), // 'main', 'stage', 'daily', 'simple'
  parentTaskId: integer("parent_task_id"), // 父任务ID
  order: integer("order").notNull().default(0), // 在同级任务中的排序
  tags: text("tags").array().default([]), // 任务标签（写作、编程、生活等）
  
  // Actual database fields that exist (matching production database):
  lastCompletedAt: timestamp("last_completed_at"), // 最后完成时间
  completionCount: integer("completion_count").notNull().default(0), // 完成次数

  // Task difficulty and rewards
  difficulty: text("difficulty").notNull().default("medium"), // 'trivial', 'easy', 'medium', 'hard'

  // Energy Ball System
  requiredEnergyBalls: integer("required_energy_balls").notNull().default(1), // 所需能量球数量
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  // Note: completed field does not exist in production database - derive from completedAt
  progress: real("progress").notNull().default(0),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'paused'
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high'
  targetDate: timestamp("target_date"),
  parentGoalId: integer("parent_goal_id"), // 父目标ID
  expReward: integer("exp_reward").notNull().default(100), // 目标完成经验奖励
  skillId: integer("skill_id"), // 关联的技能ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(), // 更新时间
  completedAt: timestamp("completed_at"), // 完成时间
});

export const goalTasks = pgTable("goal_tasks", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goals.id),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  expReward: integer("exp_reward").notNull().default(0),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  // Note: No userId field in production database - milestones are linked via goalId
  goalId: integer("goal_id").notNull().references(() => goals.id),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  progress: real("progress").notNull().default(0), // Added to match production database
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(), // Changed to match actual database (nullable)
  completedAt: timestamp("completed_at"),
});

export const microTasks = pgTable("micro_tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  duration: integer("duration").notNull().default(5), // 预计完成时间（分钟）
  expReward: integer("exp_reward").notNull().default(5), // 经验奖励
  difficulty: text("difficulty").notNull().default("easy"), // 'easy', 'medium', 'hard'
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(), // Changed from 'date' to match production
  taskId: integer("task_id").references(() => tasks.id),
  skillId: integer("skill_id").references(() => skills.id),
  expGained: integer("exp_gained").notNull().default(0),
  action: text("action").notNull(), // 'task_completed', 'skill_levelup', 'goal_completed'
  details: jsonb("details"), // Changed from 'description' text to match production
});

// Daily Battle Reports table
export const dailyBattleReports = pgTable("daily_battle_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  totalBattleTime: integer("total_battle_time").default(0), // 总战斗时间（分钟）
  energyBallsConsumed: integer("energy_balls_consumed").default(0), // 消耗的能量球数
  tasksCompleted: integer("tasks_completed").default(0), // 完成的任务数
  pomodoroCycles: integer("pomodoro_cycles").default(0), // 完成的番茄钟周期数
  taskDetails: jsonb("task_details").default([]), // 详细任务信息
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pomodoro Sessions table
export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  workDuration: integer("work_duration").default(0), // 工作时间（分钟）
  restDuration: integer("rest_duration").default(0), // 休息时间（分钟）
  cyclesCompleted: integer("cycles_completed").default(0),
  actualEnergyBalls: integer("actual_energy_balls").default(0),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertGoalTaskSchema = createInsertSchema(goalTasks).omit({
  id: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertMicroTaskSchema = createInsertSchema(microTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type GoalTask = typeof goalTasks.$inferSelect;
export type InsertGoalTask = z.infer<typeof insertGoalTaskSchema>;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export type MicroTask = typeof microTasks.$inferSelect;
export type InsertMicroTask = z.infer<typeof insertMicroTaskSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export const insertDailyBattleReportSchema = createInsertSchema(dailyBattleReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPomodoroSessionSchema = createInsertSchema(pomodoroSessions).omit({
  id: true,
  createdAt: true,
});

export type DailyBattleReport = typeof dailyBattleReports.$inferSelect;
export type InsertDailyBattleReport = z.infer<typeof insertDailyBattleReportSchema>;

export type PomodoroSession = typeof pomodoroSessions.$inferSelect;
export type InsertPomodoroSession = z.infer<typeof insertPomodoroSessionSchema>;

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export interface UserState {
  energyLevel: 'high' | 'medium' | 'low';
  availableTime: number; // minutes
  mood: 'good' | 'neutral' | 'tired';
  focusLevel: number; // 1-10
  lastUpdated: string;
}

export interface TaskRecommendation {
  taskId: string;
  reason: string;
  confidence: number;
  type: 'micro' | 'milestone' | 'warmup';
}

export interface GoalInterface {
  id: number;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  progress: number;
  targetDate: Date | null;
  expReward: number;
  pomodoroExpReward: number;
  requiredEnergyBalls: number;
  skillTags: string[];
  relatedSkillIds: number[];
  createdAt: string;
  completedAt: Date | null;
  microTasks: MicroTaskInterface[];
  warmupTasks: MicroTaskInterface[];
}

export interface MicroTaskInterface {
  id: string;
  title: string;
  description: string;
  duration: number;
  expReward: number;
  parentMilestone: string;
  completed: boolean;
  createdAt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  userState?: UserState;
  recommendations?: TaskRecommendation[];
}