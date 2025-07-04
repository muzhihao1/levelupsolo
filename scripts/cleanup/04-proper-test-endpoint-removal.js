#!/usr/bin/env node

/**
 * Properly disable test endpoints in routes.ts
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'server/routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔒 Properly disabling test endpoints in routes.ts...\n');

// First, restore any broken comments
content = content.replace(/\/\* SECURITY: Test endpoint disabled\s*\n\s*app\.(get|post|put|delete)\s*\(\s*'\/api\/test\/\s*\n\s*\*\/([^']+)'/gm, 
  (match, method, endpoint) => {
    return `app.${method}('/api/test/${endpoint}'`;
  });

// Now find all test endpoints and wrap them properly
const testEndpoints = [
  '/api/test/db-check',
  '/api/test/simple',
  '/api/test/columns',
  '/api/test/create-user',
  '/api/test/habit-columns'
];

let disabledCount = 0;

testEndpoints.forEach(endpoint => {
  // Find the endpoint definition
  const regex = new RegExp(`(\\s*)(app\\.(get|post|put|delete)\\s*\\(\\s*['"\`]${endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`].*?\\n(?:.*?\\n)*?\\s*\\}\\);?)`, 'gms');
  
  content = content.replace(regex, (match, indent, fullMatch) => {
    disabledCount++;
    console.log(`  Disabling: ${endpoint}`);
    
    // Add environment check instead of commenting out
    return `${indent}// SECURITY: Test endpoint - only available in development
${indent}if (process.env.NODE_ENV !== 'production') {
${fullMatch.split('\n').map(line => indent + '  ' + line.trim()).join('\n')}
${indent}}`;
  });
});

// Write the fixed content
fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Disabled ${disabledCount} test endpoints`);
console.log('   Test endpoints are now only available in development mode');

// Add a helper to remove any remaining syntax errors
content = fs.readFileSync(filePath, 'utf8');

// Fix any remaining broken comment blocks
content = content.replace(/\/\*[^*]*\*\/[a-zA-Z]+['"`]/g, (match) => {
  return match.replace(/\*\/([a-zA-Z]+)(['"`])/, '*/ // $1$2');
});

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ Syntax cleanup complete!');