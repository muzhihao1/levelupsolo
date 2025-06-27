# Testing Guide

This document describes the testing infrastructure and best practices for the Level Up Solo project.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Generate coverage report
npm run test:coverage
```

## Testing Stack

- **Vitest**: Fast unit test framework with native ESM support
- **@testing-library/react**: React component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **MSW (Mock Service Worker)**: API mocking
- **@faker-js/faker**: Test data generation
- **happy-dom**: Lightweight DOM implementation
- **vitest-fetch-mock**: Fetch request mocking

## Project Structure

```
├── vitest.config.ts          # Vitest configuration
├── vitest.setup.ts           # Global test setup
├── client/
│   └── src/
│       ├── test-utils/       # Client testing utilities
│       │   ├── render.tsx    # Custom render with providers
│       │   └── mock-data.ts  # Mock data factories
│       └── components/
│           └── **/*.test.tsx # Component tests
├── server/
│   ├── test-utils/           # Server testing utilities
│   │   └── db-mock.ts        # Database mocking
│   └── **/*.test.ts          # Server tests
└── .github/
    └── workflows/
        └── test.yml          # CI/CD pipeline
```

## Writing Tests

### Component Tests

```tsx
import { render, screen, userEvent } from '@/test-utils/render';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(<MyComponent onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### API Tests

```ts
import { createMockStorage, createMockContext } from '../test-utils/db-mock';
import { userFactory } from '@/test-utils/mock-data';

describe('API Endpoint', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  
  beforeEach(() => {
    mockStorage = createMockStorage();
    mockStorage.db.reset();
  });

  it('handles requests', async () => {
    const user = userFactory.create();
    await mockStorage.db.userOps.create(user);
    
    const { req, res } = createMockContext({ user });
    await myHandler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

### Hook Tests

```tsx
import { renderHook, waitFor } from '@/test-utils/render';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('returns expected value', async () => {
    const { result } = renderHook(() => useMyHook());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

## Mock Data Factories

The project includes comprehensive mock data factories for all entities:

```ts
import { userFactory, taskFactory, goalFactory } from '@/test-utils/mock-data';

// Create a single user
const user = userFactory.create({ username: 'testuser' });

// Create multiple tasks
const tasks = taskFactory.createMany(5, { userId: user.id });

// Create specific task types
const habit = taskFactory.createHabit({ title: 'Daily Exercise' });
const mainQuest = taskFactory.createMainQuest();

// Create complete user data
const fullUser = completeUserFactory.create();
```

## Testing Best Practices

### 1. Test Structure

Follow the AAA pattern:
- **Arrange**: Set up test data and dependencies
- **Act**: Execute the code being tested
- **Assert**: Verify the results

### 2. Test Isolation

- Each test should be independent
- Reset mocks and database between tests
- Don't rely on test execution order

### 3. Descriptive Test Names

```ts
// Good
it('displays error message when form submission fails')

// Bad
it('handles errors')
```

### 4. Focus on Behavior

Test what the component does, not how it does it:

```tsx
// Good - tests behavior
expect(screen.getByText('Task completed!')).toBeInTheDocument();

// Bad - tests implementation
expect(component.state.isCompleted).toBe(true);
```

### 5. Use Testing Library Queries Correctly

Priority order for queries:
1. `getByRole` (most preferred)
2. `getByLabelText`
3. `getByPlaceholderText`
4. `getByText`
5. `getByTestId` (last resort)

### 6. Mock External Dependencies

```ts
// Mock API calls
server.use(
  rest.get('/api/tasks', (req, res, ctx) => {
    return res(ctx.json({ tasks: [...] }));
  })
);

// Mock modules
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));
```

## Coverage Goals

The project aims for the following coverage thresholds:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

View coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

## Debugging Tests

### Run specific tests
```bash
# Run tests matching pattern
npm test Button

# Run tests in specific file
npm test button.test.tsx
```

### Debug in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["--inspect-brk", "--no-coverage"],
  "console": "integratedTerminal"
}
```

### Common Issues

1. **Import errors**: Ensure path aliases match tsconfig
2. **DOM not found**: Check that happy-dom is properly configured
3. **Async issues**: Use `waitFor` or `findBy` queries
4. **State not updating**: Wrap state changes in `act()`

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests

The CI pipeline:
1. Runs type checking
2. Executes all tests
3. Generates coverage reports
4. Uploads results to Codecov
5. Builds the application

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)