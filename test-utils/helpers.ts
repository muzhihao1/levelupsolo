/**
 * Test Utilities and Helpers
 * 测试工具和辅助函数
 * 
 * Common utilities for all test types
 * 所有测试类型的通用工具
 */

import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import type { User, Task, Goal, Skill } from '@shared/schema';

// =====================================================
// Mock Data Factories
// =====================================================

/**
 * Create mock user data
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    email: faker.internet.email(),
    username: faker.internet.username(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Create mock task data
 */
export function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    userId: faker.number.int({ min: 1, max: 100 }),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    completed: faker.datatype.boolean(),
    xpReward: faker.number.int({ min: 10, max: 100 }),
    energyCost: faker.number.int({ min: 1, max: 3 }),
    skillId: faker.number.int({ min: 1, max: 6 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Create mock goal data
 */
export function createMockGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    userId: faker.number.int({ min: 1, max: 100 }),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    targetDate: faker.date.future(),
    completed: faker.datatype.boolean(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Create mock skill data
 */
export function createMockSkill(overrides?: Partial<Skill>): Skill {
  const skills = ['physical', 'emotional', 'mental', 'relationship', 'financial', 'willpower'];
  return {
    id: faker.number.int({ min: 1, max: 6 }),
    userId: faker.number.int({ min: 1, max: 100 }),
    name: faker.helpers.arrayElement(skills),
    currentXP: faker.number.int({ min: 0, max: 1000 }),
    level: faker.number.int({ min: 1, max: 10 }),
    color: faker.color.rgb(),
    icon: faker.helpers.arrayElement(['🏃', '❤️', '🧠', '👥', '💰', '💪']),
    ...overrides,
  };
}

// =====================================================
// API Response Mocks
// =====================================================

/**
 * Create successful API response
 */
export function mockSuccessResponse<T>(data: T, meta?: any) {
  return {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create error API response
 */
export function mockErrorResponse(code: string, message: string, details?: any) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

// =====================================================
// Test Database Utilities
// =====================================================

/**
 * Create in-memory test database
 */
export async function createTestDatabase() {
  // This would typically use a real test database
  // For now, returning a mock implementation
  return {
    query: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
    cleanup: vi.fn(),
    reset: vi.fn(),
  };
}

/**
 * Seed test database with sample data
 */
export async function seedTestDatabase(db: any) {
  const users = Array(5).fill(null).map(() => createMockUser());
  const tasks = Array(20).fill(null).map(() => createMockTask());
  const goals = Array(10).fill(null).map(() => createMockGoal());
  
  // Insert test data
  // await db.insert('users', users);
  // await db.insert('tasks', tasks);
  // await db.insert('goals', goals);
  
  return { users, tasks, goals };
}

// =====================================================
// Test Server Utilities
// =====================================================

/**
 * Create test Express app with mocked dependencies
 */
export function createTestApp(config?: any) {
  // This would typically create a real Express app
  // For now, returning a mock
  return {
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    listen: vi.fn(),
    close: vi.fn(),
  };
}

/**
 * Create authenticated test client
 */
export function createAuthenticatedClient(app: any, token: string) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

// =====================================================
// Async Test Utilities
// =====================================================

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
) {
  const { timeout = 5000, interval = 50 } = options;
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Retry async operation
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delay?: number } = {}
): Promise<T> {
  const { attempts = 3, delay = 100 } = options;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw new Error('Retry failed');
}

// =====================================================
// Mock Timers and Dates
// =====================================================

/**
 * Mock current date for consistent testing
 */
export function mockDate(date: string | Date) {
  const mockedDate = new Date(date);
  vi.setSystemTime(mockedDate);
  return () => vi.useRealTimers();
}

/**
 * Advance time by specified duration
 */
export function advanceTime(ms: number) {
  vi.advanceTimersByTime(ms);
}

// =====================================================
// Assertion Helpers
// =====================================================

/**
 * Assert API response shape
 */
export function expectApiResponse(response: any) {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('timestamp');
  
  if (response.success) {
    expect(response).toHaveProperty('data');
  } else {
    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('code');
    expect(response.error).toHaveProperty('message');
  }
}

/**
 * Assert pagination meta
 */
export function expectPaginationMeta(meta: any) {
  expect(meta).toHaveProperty('page');
  expect(meta).toHaveProperty('limit');
  expect(meta).toHaveProperty('total');
  expect(meta).toHaveProperty('hasMore');
  expect(typeof meta.page).toBe('number');
  expect(typeof meta.limit).toBe('number');
  expect(typeof meta.total).toBe('number');
  expect(typeof meta.hasMore).toBe('boolean');
}

// =====================================================
// Performance Testing
// =====================================================

/**
 * Measure function execution time
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  threshold: number
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  if (duration > threshold) {
    console.warn(`Performance warning: Operation took ${duration}ms (threshold: ${threshold}ms)`);
  }
  
  return { result, duration };
}

// =====================================================
// Snapshot Testing Utilities
// =====================================================

/**
 * Sanitize data for consistent snapshots
 */
export function sanitizeForSnapshot(data: any): any {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // Replace dynamic values with static ones
    if (key === 'id' || key.endsWith('Id')) return '[ID]';
    if (key === 'createdAt' || key === 'updatedAt') return '[TIMESTAMP]';
    if (key === 'token') return '[TOKEN]';
    if (key === 'password') return '[REDACTED]';
    return value;
  }));
}

// =====================================================
// Browser Testing Utilities
// =====================================================

/**
 * Mock browser APIs
 */
export function mockBrowserAPIs() {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  // Mock fetch
  global.fetch = vi.fn();

  // Mock window.location
  delete (window as any).location;
  window.location = { href: '', reload: vi.fn() } as any;

  return {
    localStorage: localStorageMock,
    fetch: global.fetch,
    location: window.location,
  };
}

// =====================================================
// Accessibility Testing
// =====================================================

/**
 * Check element has proper ARIA attributes
 */
export function expectAccessible(element: HTMLElement) {
  const role = element.getAttribute('role');
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  
  // Element should have role or semantic HTML
  const semanticTags = ['button', 'a', 'input', 'select', 'textarea'];
  const hasSemanticTag = semanticTags.includes(element.tagName.toLowerCase());
  
  if (!hasSemanticTag && !role) {
    throw new Error('Element lacks semantic meaning (no role or semantic tag)');
  }
  
  // Interactive elements should be labelled
  if (element.tagName.toLowerCase() === 'button' || role === 'button') {
    if (!element.textContent?.trim() && !ariaLabel && !ariaLabelledBy) {
      throw new Error('Button lacks accessible label');
    }
  }
}