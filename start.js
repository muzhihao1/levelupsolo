// Simple production starter without build step
require('dotenv').config();
const { execSync } = require('child_process');

console.log('Starting Level Up Solo in production mode...');

// Use tsx to run TypeScript directly in production
execSync('npx tsx server/index.ts', { 
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});