/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    /**
     * Test environment configuration
     * Using happy-dom for faster test execution compared to jsdom
     */
    environment: 'happy-dom',
    
    /**
     * Global test setup
     * Runs before all test suites
     */
    setupFiles: ['./vitest.setup.ts'],
    
    /**
     * Test file patterns
     * Matches all .test.ts, .test.tsx, .spec.ts, .spec.tsx files
     */
    include: [
      'client/src/**/*.{test,spec}.{ts,tsx}',
      'server/**/*.{test,spec}.{ts,tsx}',
      'shared/**/*.{test,spec}.{ts,tsx}'
    ],
    
    /**
     * Files to exclude from testing
     */
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.idea',
      '.git',
      '.cache'
    ],
    
    /**
     * Coverage configuration
     */
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/test-utils/**'
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    },
    
    /**
     * Global variables available in tests
     */
    globals: true,
    
    /**
     * CSS handling
     * Process CSS modules and inject styles
     */
    css: {
      modules: {
        classNameStrategy: 'non-scoped'
      }
    },
    
    /**
     * Reporter configuration
     * Use verbose reporter for detailed test output
     */
    reporters: ['verbose'],
    
    /**
     * Test timeout
     * 10 seconds for each test
     */
    testTimeout: 10000,
    
    /**
     * Hook timeout
     * 10 seconds for hooks (before, after, etc.)
     */
    hookTimeout: 10000,
    
    /**
     * Mock configuration
     */
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },
  
  /**
   * Path resolution
   * Matches the tsconfig.json path aliases
   */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  }
});