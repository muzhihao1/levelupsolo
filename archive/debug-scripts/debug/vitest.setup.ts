/**
 * Vitest global setup file
 * This file runs once before all test suites
 * Configures global test environment and utilities
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

/**
 * Initialize fetch mock
 * Allows mocking of fetch requests in tests
 */
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

/**
 * MSW (Mock Service Worker) server setup
 * Used for mocking API endpoints
 */
export const server = setupServer(
  // AI解析端点 - 解决中文字符处理问题
  http.post('/api/ai/parse-input', () => {
    return HttpResponse.json({
      parsed: {
        type: 'task',
        category: 'side_quest',
        title: '测试任务',
        description: '测试任务描述',
        priority: 'medium',
        estimatedDuration: 30,
        confidence: 0.9
      },
      aiGenerated: true,
      timestamp: new Date().toISOString()
    });
  }),

  // CRUD端点 - 防止任务创建失败
  http.post('/api/crud', ({ request }) => {
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource');
    
    if (resource === 'tasks') {
      return HttpResponse.json({
        id: 1,
        title: '新建任务',
        description: '任务描述',
        completed: false,
        userId: 'test-user-123',
        createdAt: new Date().toISOString()
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid resource' },
      { status: 400 }
    );
  }),

  // 认证端点
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: { id: 'test-user-123', email: 'test@example.com' },
      token: 'test-jwt-token'
    });
  }),

  // 健康检查端点
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * Global test lifecycle hooks
 */
beforeAll(() => {
  /**
   * Start MSW server before all tests
   * Enable request interception
   */
  server.listen({ onUnhandledRequest: 'error' });
  
  /**
   * Mock console methods to reduce test output noise
   * Can be removed if you want to see console logs in tests
   */
  global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  
  /**
   * Mock window.matchMedia
   * Required for components that use media queries
   */
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  
  /**
   * Mock IntersectionObserver
   * Required for components that use intersection observer
   */
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
  
  /**
   * Mock ResizeObserver
   * Required for components that observe element resize
   */
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
});

afterEach(() => {
  /**
   * Cleanup after each test
   * Ensures no state leakage between tests
   */
  cleanup();
  
  /**
   * Reset all mocks after each test
   */
  vi.clearAllMocks();
  
  /**
   * Reset MSW handlers to initial state
   */
  server.resetHandlers();
  
  /**
   * Clear all fetch mocks
   */
  fetchMocker.resetMocks();
});

afterAll(() => {
  /**
   * Clean up after all tests
   */
  server.close();
  vi.restoreAllMocks();
});

/**
 * Global test utilities
 * Make frequently used utilities available globally
 */
global.testUtils = {
  /**
   * Wait for a specific amount of time
   * Useful for testing async operations
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Create a mock function with TypeScript support
   */
  createMockFn: <T extends (...args: any[]) => any>() => vi.fn<T>(),
};

/**
 * Environment variables for testing
 * Set test-specific environment variables
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.VITE_API_BASE_URL = 'http://localhost:3000';

/**
 * TypeScript declarations for global test utilities
 */
declare global {
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    createMockFn: <T extends (...args: any[]) => any>() => ReturnType<typeof vi.fn<T>>;
  };
}