/**
 * Mock data factory functions for testing
 * Uses @faker-js/faker to generate realistic test data
 * Provides type-safe factories for all application entities
 */

import { faker } from '@faker-js/faker';
import type { 
  User, 
  UserStats, 
  Skill, 
  Task, 
  Goal, 
  MicroTask 
} from '@shared/schema';

/**
 * Set faker seed for consistent test data
 * This ensures tests are deterministic
 */
faker.seed(123);

/**
 * User factory
 * Creates mock user data for testing authentication and user features
 */
export const userFactory = {
  create: (overrides?: Partial<User>): User => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    hashedPassword: faker.string.alphanumeric(60),
    profileImageUrl: faker.image.avatar(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }),
  
  createMany: (count: number, overrides?: Partial<User>): User[] => {
    return Array.from({ length: count }, () => userFactory.create(overrides));
  },
};

/**
 * UserStats factory
 * Creates mock user statistics for testing game mechanics
 */
export const userStatsFactory = {
  create: (overrides?: Partial<UserStats>): UserStats => ({
    id: faker.number.int({ min: 1, max: 10000 }),
    userId: faker.string.uuid(),
    level: faker.number.int({ min: 1, max: 100 }),
    totalXp: faker.number.int({ min: 0, max: 100000 }),
    currentEnergy: faker.number.int({ min: 0, max: 18 }),
    maxEnergy: 18,
    currentStreak: faker.number.int({ min: 0, max: 365 }),
    longestStreak: faker.number.int({ min: 0, max: 365 }),
    lastActiveDate: faker.date.recent(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }),
};

/**
 * Skill types
 */
export const SKILL_TYPES = [
  'physical',
  'emotional',
  'mental',
  'relationship',
  'financial',
  'willpower',
] as const;

/**
 * Skill factory
 * Creates mock skill data for testing skill progression
 */
export const skillFactory = {
  create: (overrides?: Partial<Skill>): Skill => ({
    id: faker.number.int({ min: 1, max: 10000 }),
    userId: faker.string.uuid(),
    name: faker.helpers.arrayElement(SKILL_TYPES),
    currentXp: faker.number.int({ min: 0, max: 10000 }),
    level: faker.number.int({ min: 1, max: 50 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }),
  
  createAll: (userId: string): Skill[] => {
    return SKILL_TYPES.map(skillType => 
      skillFactory.create({ userId, name: skillType })
    );
  },
};

/**
 * Task types and priorities
 */
export const TASK_TYPES = ['main_quest', 'side_quest', 'habit'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_STATUSES = ['active', 'completed', 'archived'] as const;

/**
 * Task factory
 * Creates mock task data for testing task management
 */
export const taskFactory = {
  create: (overrides?: Partial<Task>): Task => {
    const taskType = overrides?.type || faker.helpers.arrayElement(TASK_TYPES);
    const isHabit = taskType === 'habit';
    
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      description: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.7 }) || null,
      type: taskType,
      priority: faker.helpers.arrayElement(TASK_PRIORITIES),
      status: faker.helpers.arrayElement(TASK_STATUSES),
      xpReward: faker.number.int({ min: 10, max: 100 }),
      energyCost: faker.number.int({ min: 1, max: 3 }),
      skills: faker.helpers.arrayElements(SKILL_TYPES, { min: 1, max: 3 }),
      dueDate: faker.helpers.maybe(() => faker.date.future(), { probability: 0.5 }) || null,
      completedAt: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.3 }) || null,
      lastCompletedAt: isHabit ? faker.helpers.maybe(() => faker.date.recent(), { probability: 0.5 }) || null : null,
      streak: isHabit ? faker.number.int({ min: 0, max: 30 }) : null,
      goalId: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.3 }) || null,
      parentTaskId: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.2 }) || null,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  },
  
  createMainQuest: (overrides?: Partial<Task>): Task => {
    return taskFactory.create({
      type: 'main_quest',
      xpReward: faker.number.int({ min: 50, max: 200 }),
      energyCost: faker.number.int({ min: 2, max: 4 }),
      ...overrides,
    });
  },
  
  createSideQuest: (overrides?: Partial<Task>): Task => {
    return taskFactory.create({
      type: 'side_quest',
      xpReward: faker.number.int({ min: 20, max: 80 }),
      energyCost: faker.number.int({ min: 1, max: 2 }),
      ...overrides,
    });
  },
  
  createHabit: (overrides?: Partial<Task>): Task => {
    return taskFactory.create({
      type: 'habit',
      xpReward: faker.number.int({ min: 10, max: 30 }),
      energyCost: 1,
      streak: faker.number.int({ min: 0, max: 100 }),
      lastCompletedAt: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.7 }) || null,
      ...overrides,
    });
  },
  
  createMany: (count: number, overrides?: Partial<Task>): Task[] => {
    return Array.from({ length: count }, () => taskFactory.create(overrides));
  },
};

/**
 * Goal factory
 * Creates mock goal data for testing goal planning
 */
export const goalFactory = {
  create: (overrides?: Partial<Goal>): Goal => ({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    title: faker.company.catchPhrase(),
    description: faker.lorem.paragraph(),
    priority: faker.helpers.arrayElement(TASK_PRIORITIES),
    status: faker.helpers.arrayElement(['active', 'completed', 'archived']),
    skills: faker.helpers.arrayElements(SKILL_TYPES, { min: 1, max: 3 }),
    progress: faker.number.int({ min: 0, max: 100 }),
    milestones: faker.helpers.maybe(() => 
      Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, () => ({
        id: faker.string.uuid(),
        title: faker.lorem.sentence(),
        completed: faker.datatype.boolean(),
      }))
    , { probability: 0.8 }) || [],
    dueDate: faker.helpers.maybe(() => faker.date.future(), { probability: 0.6 }) || null,
    completedAt: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.2 }) || null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }),
  
  createWithTasks: (taskCount: number = 3): { goal: Goal; tasks: Task[] } => {
    const goal = goalFactory.create();
    const tasks = Array.from({ length: taskCount }, () => 
      taskFactory.createMainQuest({ 
        goalId: goal.id, 
        userId: goal.userId,
        skills: goal.skills,
      })
    );
    
    return { goal, tasks };
  },
};

/**
 * MicroTask factory
 * Creates mock micro task data for testing subtasks
 */
export const microTaskFactory = {
  create: (overrides?: Partial<MicroTask>): MicroTask => ({
    id: faker.string.uuid(),
    taskId: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 2, max: 5 }),
    completed: faker.datatype.boolean({ probability: 0.3 }),
    order: faker.number.int({ min: 0, max: 10 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }),
  
  createForTask: (taskId: string, count: number = 3): MicroTask[] => {
    return Array.from({ length: count }, (_, index) => 
      microTaskFactory.create({ 
        taskId, 
        order: index,
        completed: index < count / 2, // First half completed
      })
    );
  },
};

/**
 * Mock API response factories
 * Creates mock API responses for testing
 */
export const apiResponseFactory = {
  success: <T>(data: T) => ({
    success: true,
    data,
    error: null,
  }),
  
  error: (message: string, code?: string) => ({
    success: false,
    data: null,
    error: {
      message,
      code: code || 'UNKNOWN_ERROR',
    },
  }),
  
  paginated: <T>(items: T[], page: number = 1, pageSize: number = 10) => ({
    success: true,
    data: {
      items,
      pagination: {
        page,
        pageSize,
        total: items.length,
        totalPages: Math.ceil(items.length / pageSize),
      },
    },
    error: null,
  }),
};

/**
 * Complete user data factory
 * Creates a user with all related data
 */
export const completeUserFactory = {
  create: () => {
    const user = userFactory.create();
    const stats = userStatsFactory.create({ userId: user.id });
    const skills = skillFactory.createAll(user.id);
    const tasks = [
      ...taskFactory.createMany(3, { userId: user.id, type: 'main_quest' }),
      ...taskFactory.createMany(5, { userId: user.id, type: 'side_quest' }),
      ...taskFactory.createMany(4, { userId: user.id, type: 'habit' }),
    ];
    const goals = Array.from({ length: 2 }, () => 
      goalFactory.create({ userId: user.id })
    );
    
    return {
      user,
      stats,
      skills,
      tasks,
      goals,
    };
  },
};

/**
 * Test data seeds
 * Pre-generated data for consistent testing
 */
export const testSeeds = {
  users: {
    alice: userFactory.create({
      id: 'user-alice',
      username: 'alice',
      email: 'alice@example.com',
    }),
    bob: userFactory.create({
      id: 'user-bob',
      username: 'bob',
      email: 'bob@example.com',
    }),
  },
  
  skills: {
    physical: skillFactory.create({
      id: 'skill-physical',
      name: 'physical',
      level: 10,
      currentXp: 2500,
    }),
    mental: skillFactory.create({
      id: 'skill-mental',
      name: 'mental',
      level: 15,
      currentXp: 5000,
    }),
  },
  
  tasks: {
    workout: taskFactory.createHabit({
      id: 'task-workout',
      title: 'Morning Workout',
      skills: ['physical', 'willpower'],
      streak: 30,
    }),
    project: taskFactory.createMainQuest({
      id: 'task-project',
      title: 'Complete Project Alpha',
      skills: ['mental', 'financial'],
    }),
  },
};