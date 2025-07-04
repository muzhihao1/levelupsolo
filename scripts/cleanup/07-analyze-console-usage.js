#!/usr/bin/env node

/**
 * Script to analyze console.log usage patterns in the codebase
 * Helps understand what needs to be replaced with logger
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to search
const FILE_PATTERNS = [
  'client/src/**/*.{ts,tsx}',
  'server/**/*.{ts,tsx}',
  '!**/node_modules/**',
  '!**/*.test.{ts,tsx}',
  '!**/*.spec.{ts,tsx}'
];

// Console methods to track
const CONSOLE_METHODS = [
  'console.log',
  'console.info',
  'console.warn',
  'console.error',
  'console.debug',
  'console.time',
  'console.timeEnd',
  'console.group',
  'console.groupEnd',
  'console.table',
  'console.trace'
];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const results = [];
  
  lines.forEach((line, index) => {
    CONSOLE_METHODS.forEach(method => {
      if (line.includes(method)) {
        // Extract context
        const lineNum = index + 1;
        const trimmedLine = line.trim();
        
        // Try to categorize the log
        let category = 'general';
        if (trimmedLine.includes('error') || trimmedLine.includes('Error')) {
          category = 'error';
        } else if (trimmedLine.includes('debug') || trimmedLine.includes('Debug')) {
          category = 'debug';
        } else if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME')) {
          category = 'development';
        } else if (trimmedLine.includes('performance') || trimmedLine.includes('time')) {
          category = 'performance';
        }
        
        results.push({
          file: filePath,
          line: lineNum,
          method: method,
          category: category,
          content: trimmedLine.substring(0, 100) + (trimmedLine.length > 100 ? '...' : '')
        });
      }
    });
  });
  
  return results;
}

function main() {
  console.log('🔍 Analyzing console usage in the codebase...\n');
  
  const allResults = [];
  const stats = {
    byMethod: {},
    byCategory: {},
    byFile: {},
    total: 0
  };
  
  // Initialize stats
  CONSOLE_METHODS.forEach(method => {
    stats.byMethod[method] = 0;
  });
  
  // Process all files
  FILE_PATTERNS.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(file => {
      const results = analyzeFile(file);
      if (results.length > 0) {
        allResults.push(...results);
        stats.byFile[file] = results.length;
        
        results.forEach(result => {
          stats.byMethod[result.method]++;
          stats.byCategory[result.category] = (stats.byCategory[result.category] || 0) + 1;
          stats.total++;
        });
      }
    });
  });
  
  // Print statistics
  console.log('📊 Console Usage Statistics:');
  console.log(`Total console statements: ${stats.total}\n`);
  
  console.log('By Method:');
  Object.entries(stats.byMethod)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, count]) => {
      console.log(`  ${method}: ${count}`);
    });
  
  console.log('\nBy Category:');
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
  
  console.log('\nTop 10 Files with Most Console Statements:');
  Object.entries(stats.byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`  ${path.relative(process.cwd(), file)}: ${count}`);
    });
  
  // Save detailed results
  const outputPath = path.join(process.cwd(), 'console-usage-report.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    stats,
    details: allResults
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${outputPath}`);
  
  // Print some examples
  console.log('\n📝 Example Console Statements:');
  const examples = allResults.slice(0, 5);
  examples.forEach(example => {
    console.log(`\n  File: ${path.relative(process.cwd(), example.file)}:${example.line}`);
    console.log(`  Type: ${example.method} (${example.category})`);
    console.log(`  Code: ${example.content}`);
  });
}

// Run the script
main();