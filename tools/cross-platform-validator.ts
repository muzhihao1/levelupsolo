#!/usr/bin/env tsx
/**
 * Cross-Platform Data Validator
 * 跨平台数据验证工具
 * 
 * 用于验证Web端和iOS端之间的数据格式一致性
 * 可以检测类型不匹配、缺失字段、无效值等问题
 * 
 * 使用方法:
 * npm run validate:data
 * 或
 * tsx tools/cross-platform-validator.ts [--type=task|skill|goal] [--fix]
 */

import { z } from 'zod';
import chalk from 'chalk';
import { 
  TaskCategory, 
  TaskType, 
  Difficulty, 
  HabitDirection,
  RecurringPattern,
  isValidTaskCategory,
  isValidDifficulty,
  isValidPriority,
  TaskValidationRules,
  GoalValidationRules
} from '../shared/types/unified-models';

// =====================================================
// Validation Schemas - 验证模式
// =====================================================

/**
 * iOS Task Schema - 基于 UserTask.swift
 */
const iOSTaskSchema = z.object({
  id: z.number(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  completed: z.boolean(),
  skillId: z.number().nullable().optional(),
  goalId: z.number().nullable().optional(),
  goalTags: z.array(z.string()).nullable().optional(),
  expReward: z.number().min(0),
  estimatedDuration: z.number().nullable().optional(),
  actualDuration: z.number().nullable().optional(),
  accumulatedTime: z.number().nullable().optional(),
  pomodoroSessionId: z.string().nullable().optional(),
  startedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  completedAt: z.date().nullable().optional(),
  dueDate: z.date().nullable().optional(),
  priority: z.number().min(0).max(5).default(1),
  
  // Categorization
  taskCategory: z.string().refine(isValidTaskCategory),
  taskType: z.enum(['main', 'stage', 'daily', 'simple']),
  parentTaskId: z.number().nullable().optional(),
  order: z.number(),
  tags: z.array(z.string()),
  skills: z.array(z.string()),
  
  // Habit fields
  habitDirection: z.enum(['positive', 'negative', 'both']).nullable().optional(),
  habitStreak: z.number().nullable().optional(),
  habitValue: z.number().nullable().optional(),
  
  // Daily fields
  isDailyTask: z.boolean(),
  dailyStreak: z.number().nullable().optional(),
  
  // Recurring fields
  isRecurring: z.boolean(),
  recurringPattern: z.enum(['daily', 'weekly', 'weekdays']).nullable().optional(),
  lastCompletedDate: z.date().nullable().optional(),
  
  // Other
  difficulty: z.string().refine(isValidDifficulty),
  requiredEnergyBalls: z.number().min(1).max(18)
});

/**
 * Web Task Schema - 基于 schema.ts
 */
const webTaskSchema = z.object({
  id: z.number(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  completed: z.boolean(),
  skillId: z.number().nullable().optional(),
  goalId: z.number().nullable().optional(),
  goalTags: z.array(z.string()).nullable().optional(),
  expReward: z.number(),
  estimatedDuration: z.number().nullable().optional(),
  actualDuration: z.number().nullable().optional(),
  accumulatedTime: z.number().nullable().optional(),
  pomodoroSessionId: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(), // Note: string in Web, Date in iOS
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
  // Missing in current Web schema:
  // dueDate: z.string().nullable().optional(),
  // priority: z.number().min(0).max(5).default(1),
  
  taskCategory: z.string(),
  taskType: z.string(),
  parentTaskId: z.number().nullable().optional(),
  order: z.number(),
  tags: z.array(z.string()).nullable().optional(),
  skills: z.array(z.string()).nullable().optional(),
  
  habitDirection: z.string().nullable().optional(),
  habitStreak: z.number().nullable().optional(),
  habitValue: z.number().nullable().optional(),
  
  isDailyTask: z.boolean(),
  dailyStreak: z.number().nullable().optional(),
  
  isRecurring: z.boolean(),
  recurringPattern: z.string().nullable().optional(),
  lastCompletedDate: z.string().nullable().optional(),
  
  difficulty: z.string(),
  requiredEnergyBalls: z.number()
});

/**
 * Skill validation schemas
 */
const skillSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  level: z.number().min(1),
  exp: z.number().min(0),
  maxExp: z.number().min(1),
  color: z.string(),
  icon: z.string(),
  skillType: z.string().optional(), // Missing in iOS
  category: z.string().optional(),  // Missing in iOS
  talentPoints: z.number().optional(), // Missing in iOS
  prestige: z.number().optional(),     // Missing in iOS
  unlocked: z.boolean(),
  prerequisites: z.array(z.number()).nullable().optional() // Missing in iOS
});

/**
 * Goal validation schema
 */
const goalSchema = z.object({
  id: z.number(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  completed: z.boolean(),
  progress: z.number().min(0).max(1),
  targetDate: z.date().nullable().optional(),
  expReward: z.number().min(50),
  pomodoroExpReward: z.number().min(5),
  requiredEnergyBalls: z.number().min(1).max(18),
  skillTags: z.array(z.string()).nullable().optional(),
  relatedSkillIds: z.array(z.number()).nullable().optional(),
  createdAt: z.date(),
  completedAt: z.date().nullable().optional()
});

// =====================================================
// Validation Functions - 验证函数
// =====================================================

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Validate task data compatibility
 */
function validateTaskCompatibility(task: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  // Check for iOS required fields that might be missing in Web
  if (task.dueDate === undefined) {
    warnings.push({
      field: 'dueDate',
      message: 'iOS expects dueDate field, but it\'s missing',
      suggestion: 'Add migration to include dueDate in tasks table'
    });
  }
  
  if (task.priority === undefined) {
    errors.push({
      field: 'priority',
      message: 'iOS requires priority field',
      value: 'undefined'
    });
  } else if (!isValidPriority(task.priority)) {
    errors.push({
      field: 'priority',
      message: `Priority must be between 0 and 5, got ${task.priority}`,
      value: task.priority
    });
  }
  
  // Validate task category
  if (!isValidTaskCategory(task.taskCategory)) {
    errors.push({
      field: 'taskCategory',
      message: `Invalid task category: ${task.taskCategory}`,
      value: task.taskCategory
    });
    suggestions.push(`Valid categories: ${Object.values(TaskCategory).join(', ')}`);
  }
  
  // Check date format differences
  if (typeof task.createdAt === 'string' && task.createdAt.includes('T')) {
    warnings.push({
      field: 'createdAt',
      message: 'Date is in string format, iOS expects Date object',
      suggestion: 'Ensure proper date parsing in API responses'
    });
  }
  
  // Validate difficulty
  if (!isValidDifficulty(task.difficulty)) {
    errors.push({
      field: 'difficulty',
      message: `Invalid difficulty: ${task.difficulty}`,
      value: task.difficulty
    });
  }
  
  // Check energy balls range
  if (task.requiredEnergyBalls < 1 || task.requiredEnergyBalls > 18) {
    errors.push({
      field: 'requiredEnergyBalls',
      message: `Energy balls must be between 1 and 18, got ${task.requiredEnergyBalls}`,
      value: task.requiredEnergyBalls
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validate skill data compatibility
 */
function validateSkillCompatibility(skill: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  // Check iOS missing fields
  const iosMissingFields = ['skillType', 'category', 'talentPoints', 'prestige', 'prerequisites'];
  
  iosMissingFields.forEach(field => {
    if (skill[field] !== undefined) {
      warnings.push({
        field,
        message: `iOS model doesn't include ${field} field`,
        suggestion: 'Update iOS Skill model to include this field'
      });
    }
  });
  
  // Validate level
  if (skill.level < 1) {
    errors.push({
      field: 'level',
      message: `Level must be at least 1, got ${skill.level}`,
      value: skill.level
    });
  }
  
  // Validate exp
  if (skill.exp < 0) {
    errors.push({
      field: 'exp',
      message: `Experience cannot be negative, got ${skill.exp}`,
      value: skill.exp
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validate goal data compatibility
 */
function validateGoalCompatibility(goal: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  // Validate progress range
  if (goal.progress < 0 || goal.progress > 1) {
    errors.push({
      field: 'progress',
      message: `Progress must be between 0 and 1, got ${goal.progress}`,
      value: goal.progress
    });
  }
  
  // Check reward values
  if (goal.expReward < GoalValidationRules.expReward.min) {
    errors.push({
      field: 'expReward',
      message: `Goal exp reward must be at least ${GoalValidationRules.expReward.min}`,
      value: goal.expReward
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

// =====================================================
// Data Transformation Functions - 数据转换函数
// =====================================================

/**
 * Transform Web data format to iOS format
 */
function transformWebToiOS(data: any, type: string): any {
  const transformed = { ...data };
  
  if (type === 'task') {
    // Convert date strings to Date objects
    if (transformed.createdAt && typeof transformed.createdAt === 'string') {
      transformed.createdAt = new Date(transformed.createdAt);
    }
    if (transformed.completedAt && typeof transformed.completedAt === 'string') {
      transformed.completedAt = new Date(transformed.completedAt);
    }
    if (transformed.startedAt && typeof transformed.startedAt === 'string') {
      transformed.startedAt = new Date(transformed.startedAt);
    }
    if (transformed.lastCompletedDate && typeof transformed.lastCompletedDate === 'string') {
      transformed.lastCompletedDate = new Date(transformed.lastCompletedDate);
    }
    
    // Add missing fields with defaults
    if (transformed.priority === undefined) {
      transformed.priority = 1;
    }
    if (transformed.dueDate === undefined) {
      transformed.dueDate = null;
    }
  }
  
  return transformed;
}

// =====================================================
// CLI Interface - 命令行界面
// =====================================================

async function testWithSampleData() {
  console.log(chalk.bold.blue('\n📊 Testing with sample data...\n'));
  
  // Sample task data
  const sampleWebTask = {
    id: 1,
    userId: 'user123',
    title: 'Complete project',
    completed: false,
    expReward: 50,
    taskCategory: 'todo',
    taskType: 'simple',
    order: 0,
    tags: ['work'],
    skills: ['Mental'],
    isDailyTask: false,
    isRecurring: false,
    difficulty: 'medium',
    requiredEnergyBalls: 4,
    createdAt: '2024-01-01T00:00:00Z'
    // Missing: priority, dueDate
  };
  
  console.log(chalk.bold('Testing Task Validation:'));
  const taskResult = validateTaskCompatibility(sampleWebTask);
  printValidationResult(taskResult);
  
  // Sample skill data
  const sampleSkill = {
    id: 1,
    userId: 'user123',
    name: '心智成长力',
    level: 5,
    exp: 250,
    maxExp: 500,
    color: '#3B82F6',
    icon: 'fas fa-brain',
    skillType: 'mental', // iOS missing
    category: 'core',    // iOS missing
    unlocked: true
  };
  
  console.log(chalk.bold('\nTesting Skill Validation:'));
  const skillResult = validateSkillCompatibility(sampleSkill);
  printValidationResult(skillResult);
}

function printValidationResult(result: ValidationResult) {
  if (result.valid) {
    console.log(chalk.green('✅ Validation passed'));
  } else {
    console.log(chalk.red('❌ Validation failed'));
  }
  
  if (result.errors.length > 0) {
    console.log(chalk.red('\nErrors:'));
    result.errors.forEach(error => {
      console.log(chalk.red(`  - ${error.field}: ${error.message}`));
      if (error.value !== undefined) {
        console.log(chalk.gray(`    Current value: ${JSON.stringify(error.value)}`));
      }
    });
  }
  
  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    result.warnings.forEach(warning => {
      console.log(chalk.yellow(`  - ${warning.field}: ${warning.message}`));
      if (warning.suggestion) {
        console.log(chalk.gray(`    Suggestion: ${warning.suggestion}`));
      }
    });
  }
  
  if (result.suggestions.length > 0) {
    console.log(chalk.blue('\nSuggestions:'));
    result.suggestions.forEach(suggestion => {
      console.log(chalk.blue(`  - ${suggestion}`));
    });
  }
}

async function validateFromDatabase() {
  console.log(chalk.bold.blue('\n🔍 Validating data from database...\n'));
  
  try {
    const { db } = await import('../server/db');
    const { tasks, skills, goals } = await import('../shared/schema');
    
    // Validate tasks
    console.log(chalk.bold('Validating Tasks:'));
    const allTasks = await db.select().from(tasks).limit(10);
    let taskErrors = 0;
    
    allTasks.forEach((task, index) => {
      const result = validateTaskCompatibility(task);
      if (!result.valid) {
        taskErrors++;
        console.log(chalk.red(`\nTask ${index + 1} (ID: ${task.id}):`));
        printValidationResult(result);
      }
    });
    
    if (taskErrors === 0) {
      console.log(chalk.green('✅ All tasks validated successfully'));
    } else {
      console.log(chalk.red(`\n❌ Found ${taskErrors} tasks with validation errors`));
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Database connection failed'));
    console.log(chalk.gray('Falling back to sample data validation...'));
    await testWithSampleData();
  }
}

async function main() {
  console.log(chalk.bold.cyan('🔧 Cross-Platform Data Validator\n'));
  
  const args = process.argv.slice(2);
  const shouldValidateDB = args.includes('--db');
  const shouldFix = args.includes('--fix');
  const typeFilter = args.find(arg => arg.startsWith('--type='))?.split('=')[1];
  
  if (shouldValidateDB) {
    await validateFromDatabase();
  } else {
    await testWithSampleData();
  }
  
  console.log(chalk.bold.cyan('\n📋 Summary:'));
  console.log(chalk.gray('- Use --db flag to validate database data'));
  console.log(chalk.gray('- Use --type=task|skill|goal to filter validation'));
  console.log(chalk.gray('- Use --fix to attempt automatic fixes (coming soon)'));
  
  console.log(chalk.bold.cyan('\n✨ Validation complete!'));
}

// Run the validator
main().catch(error => {
  console.error(chalk.red('Validator error:'), error);
  process.exit(1);
});