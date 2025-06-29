#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Start Script');
console.log('======================');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT || 'not set (will use 3000)'}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Node version: ${process.version}`);
console.log('');

// Check what directories exist
console.log('📁 Directory structure:');
const dirs = ['dist', 'dist/public', 'client', 'server'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`  ✅ ${dir} exists`);
    if (dir.startsWith('dist')) {
      try {
        const files = fs.readdirSync(dir).slice(0, 5);
        console.log(`     Files: ${files.join(', ')}${files.length >= 5 ? '...' : ''}`);
      } catch (e) {}
    }
  } else {
    console.log(`  ❌ ${dir} missing`);
  }
});
console.log('');

// Check environment variables
console.log('🔐 Environment Variables Check:');
const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
const optionalEnvVars = ['JWT_SECRET', 'REPLIT_CLIENT_ID', 'REPLIT_CLIENT_SECRET'];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  ✅ ${varName}: Set (${process.env[varName].substring(0, 20)}...)`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET (REQUIRED!)`);
  }
});

optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  ✅ ${varName}: Set`);
  } else {
    console.log(`  ⚠️  ${varName}: Not set (optional)`);
  }
});
console.log('');

// Check if tsx is available
const { execSync } = require('child_process');
try {
  const tsxVersion = execSync('npx tsx --version', { encoding: 'utf-8' });
  console.log(`tsx version: ${tsxVersion.trim()}`);
} catch (e) {
  console.error('❌ tsx not found!');
  process.exit(1);
}

console.log('Starting server with tsx...\n');

// Start the server
const { spawn } = require('child_process');
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});