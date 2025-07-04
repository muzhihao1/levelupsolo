#!/usr/bin/env node

/**
 * Script to replace console.log statements with logger utility
 * Part of Phase 3: Code Quality cleanup
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CLIENT_PATTERNS = [
  'client/src/**/*.{ts,tsx}',
  '!client/src/**/*.test.{ts,tsx}',
  '!client/src/**/*.spec.{ts,tsx}',
  '!client/src/lib/logger.ts',
  '!client/src/test-utils/**',
  '!client/src/**/mock-*.{ts,tsx}'
];

const SERVER_PATTERNS = [
  'server/**/*.{ts,tsx}',
  '!server/**/*.test.{ts,tsx}',
  '!server/**/*.spec.{ts,tsx}',
  '!server/utils/logger.ts',
  '!server/**/test-*.{ts,tsx}'
];

// Logger import statements
const CLIENT_LOGGER_IMPORT = `import { logger } from '@/lib/logger';`;
const SERVER_LOGGER_IMPORT = `import { logger } from './utils/logger';`;

// Simple console.log patterns to replace
const REPLACEMENTS = {
  // Basic console methods
  'console.log': 'logger.debug',
  'console.info': 'logger.info',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error',
  'console.debug': 'logger.debug',
  
  // Time methods
  'console.time': 'const timer = logger.time',
  'console.timeEnd': 'timer',
  
  // Group methods
  'console.group': 'logger.group',
  'console.groupEnd': '() => {}',
  
  // Table method
  'console.table': 'logger.table'
};

function processFile(filePath, isClient) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if file contains console statements
  const hasConsole = Object.keys(REPLACEMENTS).some(pattern => 
    content.includes(pattern)
  );
  
  if (!hasConsole) {
    return;
  }
  
  // Add logger import if not present
  const loggerImport = isClient ? CLIENT_LOGGER_IMPORT : SERVER_LOGGER_IMPORT;
  if (!content.includes('logger') && !content.includes('Logger')) {
    // Find the right place to insert import
    const importMatch = content.match(/^import.*from.*;$/m);
    if (importMatch) {
      const lastImportIndex = content.lastIndexOf(importMatch[0]);
      content = content.slice(0, lastImportIndex + importMatch[0].length) +
                '\n' + loggerImport +
                content.slice(lastImportIndex + importMatch[0].length);
      modified = true;
    }
  }
  
  // Replace console statements
  Object.entries(REPLACEMENTS).forEach(([pattern, replacement]) => {
    const regex = new RegExp(`\\b${pattern.replace('.', '\\.')}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      modified = true;
    }
  });
  
  // Handle special cases
  // console.log with multiple arguments
  content = content.replace(
    /logger\.debug\(([^,]+),\s*(.+?)\)/g,
    'logger.debug($1, $2)'
  );
  
  // console.error with error object
  content = content.replace(
    /logger\.error\((['"`][^'"`]+['"`]),\s*(error|err|e)\)/g,
    'logger.error($1, $2)'
  );
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Replaced console statements in ${filePath}`);
  }
}

function main() {
  console.log('🔧 Replacing console.log statements with logger utility...\n');
  
  let processedCount = 0;
  
  // Process client files
  console.log('📁 Processing client files...');
  CLIENT_PATTERNS.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(file => {
      processFile(file, true);
      processedCount++;
    });
  });
  
  // Process server files
  console.log('\n📁 Processing server files...');
  SERVER_PATTERNS.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(file => {
      processFile(file, false);
      processedCount++;
    });
  });
  
  console.log(`\n✅ Processed ${processedCount} files`);
  console.log('\n⚠️  Please review the changes and test thoroughly!');
  console.log('Note: Some complex console statements may need manual adjustment.');
}

// Run the script
main();