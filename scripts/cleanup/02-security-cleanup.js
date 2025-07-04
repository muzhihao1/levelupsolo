#!/usr/bin/env node

/**
 * Security Cleanup Script for Level Up Solo
 * Removes test endpoints and adds security checks
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Starting security cleanup...\n');

// Files to check for security issues
const filesToCheck = [
  'server/routes.ts',
  'server/index.ts',
  'server/simpleAuth.ts',
  'client/src/components/unified-rpg-task-manager.tsx'
];

// Patterns to remove or flag
const securityPatterns = [
  {
    pattern: /app\.(get|post|put|delete)\s*\(\s*['"`]\/api\/test\//gm,
    message: 'Found test endpoint',
    action: 'remove'
  },
  {
    pattern: /console\.(log|info|debug)\s*\(/gm,
    message: 'Found console.log statement',
    action: 'flag'
  },
  {
    pattern: /password.*=.*['"`](.*?)['"`]/gm,
    message: 'Found hardcoded password',
    action: 'remove'
  },
  {
    pattern: /as\s+any/gm,
    message: 'Found TypeScript "as any" assertion',
    action: 'flag'
  }
];

let totalIssues = 0;
let criticalIssues = 0;

// Check each file
filesToCheck.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  console.log(`\n📄 Checking ${filePath}...`);
  let content = fs.readFileSync(fullPath, 'utf8');
  let fileIssues = 0;
  let modified = false;
  
  securityPatterns.forEach(({ pattern, message, action }) => {
    const matches = content.match(pattern);
    
    if (matches) {
      fileIssues += matches.length;
      totalIssues += matches.length;
      
      if (action === 'remove') {
        criticalIssues += matches.length;
        console.log(`   ❌ ${message} (${matches.length} occurrences) - CRITICAL`);
        
        // Comment out test endpoints instead of removing
        if (message.includes('test endpoint')) {
          content = content.replace(pattern, (match) => {
            return `/* SECURITY: Test endpoint disabled\n${match}\n*/`;
          });
          modified = true;
        }
      } else {
        console.log(`   ⚠️  ${message} (${matches.length} occurrences)`);
      }
    }
  });
  
  if (fileIssues === 0) {
    console.log('   ✅ No issues found');
  }
  
  // Write back modified content
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('   ✨ File updated with security fixes');
  }
});

// Generate security report
const reportPath = path.join(process.cwd(), 'SECURITY_AUDIT.md');
const report = `# Security Audit Report

Generated: ${new Date().toISOString()}

## Summary
- Total Issues Found: ${totalIssues}
- Critical Issues: ${criticalIssues}
- Files Checked: ${filesToCheck.length}

## Recommendations

### Immediate Actions Required:
1. Review and remove all test endpoints
2. Implement proper logging library to replace console.log
3. Add rate limiting to authentication endpoints
4. Replace all "as any" with proper TypeScript types

### Security Enhancements:
1. Add CSRF protection
2. Implement API rate limiting
3. Add request validation middleware
4. Set up security headers (Helmet.js)
5. Implement proper session management

### Code Quality:
1. Remove all console.log statements
2. Implement structured logging
3. Add input sanitization
4. Implement proper error handling

## Next Steps
1. Run \`npm audit\` to check for vulnerable dependencies
2. Set up ESLint security rules
3. Implement pre-commit hooks for security checks
4. Schedule regular security audits
`;

fs.writeFileSync(reportPath, report, 'utf8');

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Security Cleanup Summary:`);
console.log(`   Total issues found: ${totalIssues}`);
console.log(`   Critical issues: ${criticalIssues}`);
console.log(`\n📄 Security report generated: SECURITY_AUDIT.md`);
console.log('\n⚠️  Please review all changes before committing!');
console.log('\n✅ Security cleanup complete!\n');