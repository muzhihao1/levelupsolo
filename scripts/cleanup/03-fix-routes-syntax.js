#!/usr/bin/env node

/**
 * Fix the broken syntax in routes.ts caused by incorrect commenting
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'server/routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing routes.ts syntax issues...\n');

// Fix the broken comment patterns
// Pattern: /* SECURITY: Test endpoint disabled\napp.METHOD('/api/test/\n*/ENDPOINT'
const brokenPattern = /\/\* SECURITY: Test endpoint disabled\s*\n\s*app\.(get|post|put|delete)\s*\(\s*'\/api\/test\/\s*\n\s*\*\/([^']+)'/gm;

let fixCount = 0;
content = content.replace(brokenPattern, (match, method, endpoint) => {
  fixCount++;
  console.log(`  Fixing: app.${method}('/api/test/${endpoint}'`);
  
  // Properly comment out the entire endpoint
  const lines = match.split('\n');
  const endpointStart = lines.findIndex(line => line.includes('app.'));
  
  // Find the closing of this endpoint (look for the next app. or end of file)
  const remainingContent = content.substring(content.indexOf(match) + match.length);
  const nextEndpointMatch = remainingContent.match(/\n\s*(app\.|\/\/|\/\*|\})/);
  
  if (nextEndpointMatch) {
    const endpointEnd = content.indexOf(match) + match.length + nextEndpointMatch.index;
    const fullEndpoint = content.substring(content.indexOf(match), endpointEnd);
    
    // Comment out the entire endpoint properly
    return `/* SECURITY: Test endpoint disabled
${fullEndpoint.split('\n').map(line => line.trim() ? '  // ' + line : '').join('\n')}
  */`;
  }
  
  return `/* SECURITY: Test endpoint disabled
  // app.${method}('/api/test/${endpoint}' ...
  */`;
});

// Also fix any standalone broken patterns
content = content.replace(/\*\/([a-zA-Z]+)'/g, (match, text) => {
  if (text.match(/^(simple|db-check|columns|create-user|habitat-completion)$/)) {
    console.log(`  Fixing standalone: */${text}'`);
    return `*/ // '${text}'`;
  }
  return match;
});

// Write the fixed content
fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Fixed ${fixCount} test endpoints`);
console.log('\n🔍 Verifying TypeScript compilation...');

// Run tsc to check if syntax is fixed
const { execSync } = require('child_process');
try {
  execSync('npm run check', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful!');
} catch (error) {
  console.log('❌ TypeScript still has errors. Manual intervention needed.');
  console.log('Run "npm run check" to see remaining issues.');
}