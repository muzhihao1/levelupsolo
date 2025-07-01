/**
 * 测试环境配置
 * 为所有测试提供统一的setup和teardown
 */

import React from 'react';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock环境变量
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
});

// 清理DOM和Mocks
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// React Query测试工具
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

// 认证Mock
export const mockAuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  claims: { sub: 'test-user-123' }
};

// MSW服务器配置 - 模拟API响应
export const server = setupServer(
  // AI解析端点
  rest.post('/api/ai/parse-input', (req, res, ctx) => {
    return res(
      ctx.json({
        parsed: {
          type: 'task',
          category: 'side_quest',
          title: '测试任务',
          description: '这是一个测试任务描述',
          priority: 'medium',
          estimatedDuration: 30,
          confidence: 0.9
        },
        aiGenerated: true,
        timestamp: new Date().toISOString()
      })
    );
  }),

  // 任务CRUD端点
  rest.post('/api/crud', (req, res, ctx) => {
    const { resource } = req.url.searchParams;
    
    if (resource === 'tasks') {
      return res(
        ctx.json({
          id: 1,
          title: '新建任务',
          description: '任务描述',
          completed: false,
          userId: 'test-user-123',
          createdAt: new Date().toISOString()
        })
      );
    }
    
    if (resource === 'goals') {
      return res(
        ctx.json({
          id: 1,
          title: '新建目标',
          description: '目标描述',
          completed: false,
          userId: 'test-user-123',
          createdAt: new Date().toISOString()
        })
      );
    }
    
    return res(ctx.status(400), ctx.json({ message: 'Invalid resource' }));
  }),

  // 数据获取端点
  rest.get('/api/data', (req, res, ctx) => {
    const type = req.url.searchParams.get('type');
    
    if (type === 'tasks') {
      return res(
        ctx.json([
          {
            id: 1,
            title: '示例任务',
            completed: false,
            userId: 'test-user-123'
          }
        ])
      );
    }
    
    if (type === 'goals') {
      return res(
        ctx.json([
          {
            id: 1,
            title: '示例目标',
            completed: false,
            userId: 'test-user-123'
          }
        ])
      );
    }
    
    if (type === 'stats') {
      return res(
        ctx.json({
          level: 1,
          experience: 100,
          energyBalls: 15,
          maxEnergyBalls: 18
        })
      );
    }
    
    return res(ctx.json([]));
  }),

  // 认证端点
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        user: mockAuthenticatedUser,
        token: 'test-jwt-token'
      })
    );
  }),

  // 健康检查
  rest.get('/api/health', (req, res, ctx) => {
    return res(
      ctx.json({
        status: 'ok',
        timestamp: new Date().toISOString()
      })
    );
  }),

  // 默认错误处理 - 未匹配的请求返回401
  rest.get('*', (req, res, ctx) => {
    if (req.url.pathname.startsWith('/api/')) {
      return res(
        ctx.status(401),
        ctx.json({ message: 'Unauthorized' })
      );
    }
    return res(ctx.status(404));
  })
);

// 启动和关闭MSW服务器
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// API Mock工具
export function mockApiSuccess(url: string, response: any, status = 200) {
  server.use(
    rest.all(url, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json(response));
    })
  );
}

export function mockApiError(url: string, status = 500, message = 'Server Error') {
  server.use(
    rest.all(url, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json({ message }));
    })
  );
}

// 测试数据工厂
export const testDataFactory = {
  task: (overrides: any = {}) => ({
    id: 1,
    title: '测试任务',
    description: '测试任务描述',
    completed: false,
    estimatedDuration: 30,
    userId: 'test-user-123',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  goal: (overrides: any = {}) => ({
    id: 1,
    title: '测试目标',
    description: '测试目标描述',
    completed: false,
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    userId: 'test-user-123',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  parsedInput: (overrides: any = {}) => ({
    type: 'task',
    category: 'side_quest',
    title: '解析的任务',
    description: '解析的任务描述',
    priority: 'medium',
    estimatedDuration: 30,
    confidence: 0.8,
    ...overrides
  })
};

// 组件测试工具
export function renderWithProviders(
  ui: React.ReactElement,
  options: {
    queryClient?: QueryClient;
    authenticated?: boolean;
  } = {}
) {
  const { queryClient = createTestQueryClient(), authenticated = false } = options;
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  
  return {
    ...render(ui, { wrapper: Wrapper }),
    queryClient,
  };
}

// 异步测试工具
export async function waitForApiCall(url: string, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkForCall = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`API call to ${url} not made within ${timeout}ms`));
        return;
      }
      
      setTimeout(checkForCall, 100);
    };
    
    checkForCall();
  });
}

// 常用断言helpers
export const assertions = {
  toBeVisible: (element: Element) => {
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  },
  
  toHaveErrorMessage: (container: HTMLElement, message: string) => {
    expect(screen.getByText(message)).toBeInTheDocument();
  },
  
  toHaveSuccessMessage: (container: HTMLElement, message: string) => {
    expect(screen.getByText(message)).toBeInTheDocument();
  }
};

// Export additional testing utilities
export { server, mockAuthenticatedUser, testDataFactory };