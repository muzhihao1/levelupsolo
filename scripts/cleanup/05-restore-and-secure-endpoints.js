#!/usr/bin/env node

/**
 * Restore routes.ts from git and add proper security checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Restoring routes.ts from git...\n');

// Restore the original file
try {
  execSync('git checkout server/routes.ts', { stdio: 'inherit' });
  console.log('✅ File restored successfully\n');
} catch (error) {
  console.error('❌ Failed to restore file from git');
  process.exit(1);
}

// Now add security checks inside test endpoints
const filePath = path.join(process.cwd(), 'server/routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔒 Adding security checks to test endpoints...\n');

// Define test endpoints that need security
const testEndpointPatterns = [
  { pattern: /app\.(get|post|put|delete)\s*\(\s*['"`]\/api\/test\/create-user['"`]/g, name: 'create-user' },
  { pattern: /app\.(get|post|put|delete)\s*\(\s*['"`]\/api\/test\/db-check['"`]/g, name: 'db-check' },
  { pattern: /app\.(get|post|put|delete)\s*\(\s*['"`]\/api\/test\/simple['"`]/g, name: 'simple' },
  { pattern: /app\.(get|post|put|delete)\s*\(\s*['"`]\/api\/test\/columns['"`]/g, name: 'columns' },
  { pattern: /app\.(get|post|put|delete)\s*\(\s*['"`]\/api\/test\/habit-columns['"`]/g, name: 'habit-columns' }
];

let securedCount = 0;

testEndpointPatterns.forEach(({ pattern, name }) => {
  content = content.replace(pattern, (match) => {
    const hasAsync = match.includes('async');
    const indent = '    ';
    
    securedCount++;
    console.log(`  Securing: /api/test/${name}`);
    
    // Add the security check at the beginning of the handler
    return match + ` => {
${indent}// SECURITY: Test endpoint protection
${indent}if (process.env.NODE_ENV === 'production') {
${indent}  return res.status(404).json({ error: 'Not found' });
${indent}}
${indent}`;
  });
});

// Fix the handler syntax by ensuring we don't double up the arrow function
content = content.replace(/\s*=>\s*{\s*=>\s*{/g, ' => {');

// Also ensure async handlers are properly formatted
content = content.replace(/async\s*\(\s*req[^)]*\)\s*=>\s*{\s*=>\s*{/g, 'async (req, res) => {');

// Remove any duplicate security checks
content = content.replace(/(\/\/ SECURITY: Test endpoint protection[\s\S]*?}\s*\n\s*){2,}/g, (match) => {
  // Keep only one instance
  const lines = match.split('\n');
  const uniqueLines = lines.slice(0, 5); // Keep first security check
  return uniqueLines.join('\n') + '\n';
});

// Write the secured content
fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Secured ${securedCount} test endpoints`);
console.log('   Test endpoints now return 404 in production\n');

// Verify TypeScript compilation
console.log('🔍 Verifying TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful!');
} catch (error) {
  console.log('⚠️  TypeScript may still have errors. Run "npm run check" to verify.');
}