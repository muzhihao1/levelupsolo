/**
 * Custom render function for testing React components
 * Wraps components with all necessary providers
 * Provides utilities for testing components in isolation
 */

import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Router } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { vi } from 'vitest';

/**
 * Extended render options
 * Allows customization of providers and initial state
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial route for wouter
   * Default: '/'
   */
  initialRoute?: string;
  
  /**
   * Custom QueryClient instance
   * Useful for testing with specific query cache state
   */
  queryClient?: QueryClient;
  
  /**
   * Initial theme
   * Default: 'light'
   */
  theme?: 'light' | 'dark' | 'system';
  
  /**
   * Whether to show React Query devtools
   * Default: false in tests
   */
  showDevtools?: boolean;
}

/**
 * Create a new QueryClient for testing
 * Configured with sensible defaults for tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Disable retries in tests for faster failures
         */
        retry: false,
        
        /**
         * Set stale time to 0 to always fetch fresh data
         */
        staleTime: 0,
        
        /**
         * Disable automatic refetching in tests
         */
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
      mutations: {
        /**
         * Disable retries for mutations
         */
        retry: false,
      },
    },
    /**
     * Silence query errors in test output
     * Errors are still thrown and can be tested
     */
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * Provider wrapper component
 * Wraps children with all necessary providers
 */
interface ProvidersProps {
  children: React.ReactNode;
  options?: CustomRenderOptions;
}

function Providers({ children, options = {} }: ProvidersProps) {
  const {
    initialRoute = '/',
    queryClient = createTestQueryClient(),
    theme = 'light',
  } = options;

  return (
    <QueryClientProvider client={queryClient}>
      <Router base={initialRoute}>
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  );
}

/**
 * Custom render function
 * Use this instead of @testing-library/react's render
 * 
 * @example
 * ```tsx
 * import { render, screen } from '@/test-utils/render';
 * 
 * test('renders component', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
export function render(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  const { ...renderOptions } = options || {};

  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <Providers options={options}>{children}</Providers>
    ),
    ...renderOptions,
  });
}

/**
 * Re-export everything from @testing-library/react
 * This allows using a single import for all testing utilities
 */
export * from '@testing-library/react';

/**
 * Re-export userEvent for convenience
 */
export { default as userEvent } from '@testing-library/user-event';

/**
 * Additional test utilities
 */
export const testUtils = {
  /**
   * Create a wrapper for testing hooks
   * 
   * @example
   * ```tsx
   * const { result } = renderHook(() => useMyHook(), {
   *   wrapper: testUtils.createWrapper()
   * });
   * ```
   */
  createWrapper: (options?: CustomRenderOptions) => {
    return ({ children }: { children: React.ReactNode }) => (
      <Providers options={options}>{children}</Providers>
    );
  },
  
  /**
   * Wait for queries to settle
   * Useful when testing components that fetch data on mount
   */
  waitForQueries: async (queryClient?: QueryClient) => {
    const client = queryClient || createTestQueryClient();
    await client.invalidateQueries();
    await new Promise(resolve => setTimeout(resolve, 0));
  },
  
  /**
   * Create a mock router push function
   * Useful for testing navigation
   */
  createMockRouter: () => {
    const push = vi.fn();
    const replace = vi.fn();
    const back = vi.fn();
    
    return {
      push,
      replace,
      back,
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
};