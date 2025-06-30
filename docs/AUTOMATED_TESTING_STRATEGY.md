# Automated Testing Strategy
# 自动化测试策略 v1.0

## 目录
1. [测试理念](#测试理念)
2. [测试金字塔](#测试金字塔)
3. [测试覆盖率目标](#测试覆盖率目标)
4. [测试工具和框架](#测试工具和框架)
5. [测试类型详解](#测试类型详解)
6. [跨平台测试策略](#跨平台测试策略)
7. [最佳实践](#最佳实践)
8. [CI/CD 集成](#cicd-集成)
9. [测试流程](#测试流程)
10. [实施路线图](#实施路线图)

## 测试理念

### 核心原则
1. **测试优先**：在编写功能代码前先写测试（TDD）
2. **持续测试**：每次代码变更都触发自动化测试
3. **快速反馈**：测试执行速度要快，及时发现问题
4. **全面覆盖**：覆盖关键业务逻辑和边界情况
5. **跨平台一致**：确保 Web 和 iOS 行为一致

### 质量目标
- 单元测试覆盖率：≥ 80%
- 集成测试覆盖率：≥ 60%
- 关键路径覆盖率：100%
- 零严重缺陷发布
- 测试执行时间：< 10 分钟

## 测试金字塔

```
        /\
       /E2E\      (5%)  - 端到端测试
      /------\
     /  集成  \    (25%) - 集成测试
    /----------\
   /    单元    \  (70%) - 单元测试
  /--------------\
```

### 分层策略
- **单元测试（70%）**：快速、独立、大量
- **集成测试（25%）**：API、数据库、服务间通信
- **E2E 测试（5%）**：关键用户流程

## 测试覆盖率目标

### 代码覆盖率
```yaml
coverage:
  statements: 80%    # 语句覆盖率
  branches: 75%      # 分支覆盖率
  functions: 85%     # 函数覆盖率
  lines: 80%         # 行覆盖率
```

### 业务覆盖率
| 功能模块 | 目标覆盖率 | 优先级 |
|---------|-----------|--------|
| 用户认证 | 100% | 高 |
| 任务管理 | 95% | 高 |
| 技能系统 | 90% | 高 |
| AI 功能 | 85% | 中 |
| 数据同步 | 95% | 高 |
| 支付系统 | 100% | 高 |

## 测试工具和框架

### Web 端测试栈
```json
{
  "unit": {
    "framework": "Vitest",
    "assertion": "Vitest built-in",
    "mocking": "Vitest mocks",
    "coverage": "@vitest/coverage-v8"
  },
  "component": {
    "framework": "@testing-library/react",
    "utilities": "@testing-library/user-event",
    "dom": "happy-dom"
  },
  "integration": {
    "api": "msw (Mock Service Worker)",
    "database": "In-memory PostgreSQL"
  },
  "e2e": {
    "framework": "Playwright",
    "browsers": ["chromium", "firefox", "webkit"]
  }
}
```

### iOS 端测试栈
```swift
// 单元测试
import XCTest

// UI 测试
import XCUITest

// 快照测试
import SnapshotTesting

// 模拟
import Mockingbird
```

### API 测试工具
- **Postman/Newman**: API 集合测试
- **K6**: 负载测试
- **OWASP ZAP**: 安全测试

## 测试类型详解

### 1. 单元测试

#### 测试范围
- 纯函数和工具函数
- React 组件（隔离测试）
- 业务逻辑类
- 数据转换和验证

#### 示例：React 组件测试
```typescript
// TaskItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from './TaskItem';

describe('TaskItem', () => {
  const mockTask = {
    id: 1,
    title: 'Test Task',
    completed: false,
    xpReward: 50
  };

  it('should render task title', () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should call onComplete when checkbox clicked', () => {
    const onComplete = vi.fn();
    render(<TaskItem task={mockTask} onComplete={onComplete} />);
    
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onComplete).toHaveBeenCalledWith(1);
  });

  it('should show XP reward', () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
  });
});
```

#### 示例：业务逻辑测试
```typescript
// xpCalculator.test.ts
import { calculateLevelProgress, getRequiredXP } from './xpCalculator';

describe('XP Calculator', () => {
  describe('calculateLevelProgress', () => {
    it('should calculate progress correctly', () => {
      const result = calculateLevelProgress(150, 2);
      expect(result).toEqual({
        currentLevel: 2,
        progress: 0.5,
        xpInCurrentLevel: 50,
        xpForNextLevel: 100
      });
    });
  });

  describe('getRequiredXP', () => {
    it('should follow exponential curve', () => {
      expect(getRequiredXP(1)).toBe(100);
      expect(getRequiredXP(2)).toBe(200);
      expect(getRequiredXP(3)).toBe(400);
    });
  });
});
```

### 2. 集成测试

#### 测试范围
- API 端点
- 数据库操作
- 第三方服务集成
- 认证流程

#### 示例：API 集成测试
```typescript
// api/tasks.test.ts
import { createTestClient } from '../test-utils';
import { setupTestDatabase } from '../test-db';

describe('Tasks API', () => {
  let client: TestClient;
  let db: TestDatabase;

  beforeEach(async () => {
    db = await setupTestDatabase();
    client = createTestClient({ db });
  });

  afterEach(async () => {
    await db.cleanup();
  });

  describe('POST /api/tasks', () => {
    it('should create task with valid data', async () => {
      const response = await client
        .post('/api/tasks')
        .set('Authorization', 'Bearer test-token')
        .send({
          title: 'New Task',
          skillId: 1,
          xpReward: 25
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(Number),
          title: 'New Task',
          skillId: 1,
          xpReward: 25
        }
      });
    });

    it('should validate required fields', async () => {
      const response = await client
        .post('/api/tasks')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### 3. E2E 测试

#### 测试范围
- 关键用户旅程
- 跨页面工作流
- 真实浏览器行为
- 支付流程

#### 示例：E2E 测试
```typescript
// e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Journey', () => {
  test('complete daily routine', async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 验证登录成功
    await expect(page).toHaveURL('/dashboard');
    
    // 创建新任务
    await page.click('button:has-text("New Task")');
    await page.fill('[name="title"]', 'Morning Exercise');
    await page.selectOption('[name="skillId"]', 'physical');
    await page.click('button:has-text("Create")');
    
    // 完成任务
    await page.click('text=Morning Exercise');
    await page.click('button:has-text("Complete")');
    
    // 验证 XP 增加
    await expect(page.locator('.xp-display')).toContainText('+25 XP');
  });
});
```

## 跨平台测试策略

### 数据一致性测试
```typescript
// cross-platform/data-sync.test.ts
describe('Cross-Platform Data Sync', () => {
  it('should sync task completion between platforms', async () => {
    // Web 端创建任务
    const webTask = await webClient.createTask({
      title: 'Cross-platform task',
      priority: 3
    });
    
    // 等待同步
    await waitForSync();
    
    // iOS 端验证
    const iosTask = await iosClient.getTask(webTask.id);
    expect(iosTask).toEqual(webTask);
    
    // iOS 端完成任务
    await iosClient.completeTask(webTask.id);
    await waitForSync();
    
    // Web 端验证
    const updatedWebTask = await webClient.getTask(webTask.id);
    expect(updatedWebTask.completed).toBe(true);
  });
});
```

### 平台特定测试
```yaml
web:
  browsers:
    - Chrome (latest)
    - Firefox (latest)
    - Safari (latest)
    - Edge (latest)
  viewports:
    - Desktop: 1920x1080
    - Tablet: 768x1024
    - Mobile: 375x667

ios:
  devices:
    - iPhone 15 Pro
    - iPhone 14
    - iPhone SE
    - iPad Pro
  os_versions:
    - iOS 17
    - iOS 16
    - iOS 15
```

## 最佳实践

### 1. 测试命名规范
```typescript
// ✅ 好的命名
describe('TaskService', () => {
  describe('createTask', () => {
    it('should create task with valid data', () => {});
    it('should throw error when title is empty', () => {});
    it('should assign default priority when not provided', () => {});
  });
});

// ❌ 不好的命名
describe('test', () => {
  it('works', () => {});
  it('test1', () => {});
});
```

### 2. 测试结构（AAA 模式）
```typescript
it('should calculate XP correctly', () => {
  // Arrange（准备）
  const user = createMockUser({ level: 5, currentXP: 250 });
  const task = createMockTask({ xpReward: 50 });
  
  // Act（执行）
  const result = calculateXPGain(user, task);
  
  // Assert（断言）
  expect(result.newXP).toBe(300);
  expect(result.levelUp).toBe(false);
});
```

### 3. 测试隔离
```typescript
describe('UserService', () => {
  let service: UserService;
  let mockDb: MockDatabase;
  
  beforeEach(() => {
    // 每个测试前重置状态
    mockDb = createMockDatabase();
    service = new UserService(mockDb);
  });
  
  afterEach(() => {
    // 清理资源
    mockDb.cleanup();
  });
  
  // 测试之间完全独立
  it('test 1', () => {});
  it('test 2', () => {});
});
```

### 4. 避免测试反模式
```typescript
// ❌ 避免：测试实现细节
it('should call setState', () => {
  const setState = jest.spyOn(component, 'setState');
  // 不要测试内部实现
});

// ✅ 推荐：测试行为结果
it('should display error message', () => {
  render(<Form />);
  fireEvent.click(screen.getByText('Submit'));
  expect(screen.getByText('Please fill all fields')).toBeVisible();
});
```

## CI/CD 集成

### GitHub Actions 配置
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage.json

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run integration tests
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/test
      run: |
        npm run db:push
        npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload test artifacts
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: playwright-report
        path: playwright-report/
```

### 测试报告和监控
```yaml
reporting:
  coverage:
    tool: Codecov
    threshold: 80%
    fail_on_decrease: true
  
  performance:
    tool: Lighthouse CI
    budgets:
      - metric: FCP
        budget: 2000
      - metric: LCP
        budget: 2500
  
  quality:
    tool: SonarCloud
    gates:
      - bugs: 0
      - vulnerabilities: 0
      - code_smells: < 50
```

## 测试流程

### 1. 开发阶段
```bash
# 开发新功能前
npm run test:watch

# 提交代码前
npm run test:all
npm run lint
npm run type-check
```

### 2. Code Review 阶段
- [ ] 所有测试通过
- [ ] 新功能有对应测试
- [ ] 测试覆盖率不降低
- [ ] 无跳过的测试

### 3. 部署阶段
```mermaid
graph LR
    A[代码提交] --> B[单元测试]
    B --> C[集成测试]
    C --> D[E2E测试]
    D --> E[性能测试]
    E --> F[安全扫描]
    F --> G[部署到预发布]
    G --> H[冒烟测试]
    H --> I[部署到生产]
```

## 实施路线图

### Phase 1: 基础建设（第 1-2 周）
- [x] 设置测试框架
- [ ] 配置测试环境
- [ ] 创建测试工具函数
- [ ] 编写测试指南

### Phase 2: 单元测试（第 3-4 周）
- [ ] 工具函数测试（100%）
- [ ] React 组件测试（80%）
- [ ] 业务逻辑测试（90%）
- [ ] 达到 80% 覆盖率

### Phase 3: 集成测试（第 5-6 周）
- [ ] API 端点测试
- [ ] 数据库操作测试
- [ ] 认证流程测试
- [ ] 第三方服务测试

### Phase 4: E2E 测试（第 7-8 周）
- [ ] 关键用户流程
- [ ] 跨平台场景
- [ ] 性能基准测试
- [ ] 可访问性测试

### Phase 5: 优化和维护（持续）
- [ ] 测试速度优化
- [ ] 测试稳定性改进
- [ ] 测试文档更新
- [ ] 团队培训

## 测试指标和 KPI

### 质量指标
| 指标 | 目标 | 测量方法 |
|-----|------|---------|
| 测试覆盖率 | ≥ 80% | Coverage 报告 |
| 测试通过率 | ≥ 98% | CI/CD 统计 |
| 缺陷逃逸率 | < 5% | 生产问题/总缺陷 |
| 测试执行时间 | < 10分钟 | CI/CD 日志 |
| 测试稳定性 | > 95% | Flaky 测试比例 |

### 投资回报（ROI）
- 减少 80% 的回归缺陷
- 缩短 60% 的发布周期
- 降低 70% 的生产故障
- 提高 90% 的开发信心

## 故障排查

### 常见问题
1. **测试运行缓慢**
   - 使用并行执行
   - 优化数据库操作
   - 减少不必要的等待

2. **测试不稳定（Flaky）**
   - 增加重试机制
   - 改善测试隔离
   - 使用确定性数据

3. **难以测试的代码**
   - 重构提高可测试性
   - 使用依赖注入
   - 分离业务逻辑

## 工具和资源

### 学习资源
- [Testing Library 文档](https://testing-library.com/)
- [Vitest 指南](https://vitest.dev/)
- [Playwright 教程](https://playwright.dev/)
- [iOS 测试最佳实践](https://developer.apple.com/documentation/xctest)

### 测试模板
- 单元测试模板：`templates/unit-test.template.ts`
- 集成测试模板：`templates/integration-test.template.ts`
- E2E 测试模板：`templates/e2e-test.template.ts`

### 辅助工具
- **测试数据生成**：Faker.js
- **API 模拟**：MSW
- **性能分析**：Lighthouse
- **可访问性**：axe-core

---

💡 **记住**：好的测试是项目成功的保障。投资于测试就是投资于代码质量和团队效率。