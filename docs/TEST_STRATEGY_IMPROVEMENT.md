/**
 * 测试环境配置
 * 为所有测试提供统一的setup和teardown
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';

// Mock环境变量
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
});

// 清理DOM
afterEach(() => {
  cleanup();
});

// React Query测试工具
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// 认证Mock
export const mockAuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  claims: { sub: 'test-user-123' }
};

// API Mock工具
export function mockApiRequest(url: string, response: any, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(response),
  });
}

// 数据库Mock (用于集成测试)
export const mockDatabase = {
  tasks: [],
  goals: [],
  users: [mockAuthenticatedUser],
  
  reset() {
    this.tasks = [];
    this.goals = [];
    this.users = [mockAuthenticatedUser];
  },
  
  addTask(task: any) {
    this.tasks.push({ id: this.tasks.length + 1, ...task });
    return this.tasks[this.tasks.length - 1];
  },
  
  addGoal(goal: any) {
    this.goals.push({ id: this.goals.length + 1, ...goal });
    return this.goals[this.goals.length - 1];
  }
};

beforeEach(() => {
  mockDatabase.reset();
});