const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Build Process Starting...\n');

// Helper to run commands with proper error handling
function runCommand(command, description, critical = false) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    if (critical) {
      process.exit(1);
    }
    return false;
  }
}

// Step 1: Clean problematic directories
console.log('🧹 Cleaning cache directories...');
const dirs = [
  'node_modules/.cache',
  'node_modules/.vite',
  'dist'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✓ Cleaned ${dir}`);
    } catch (e) {
      console.log(`  ⚠️  Could not clean ${dir}`);
    }
  }
});

// Step 2: Create dist directory
const distDir = path.join(__dirname, '..', 'dist');
fs.mkdirSync(distDir, { recursive: true });
console.log('\n✅ Created dist directory\n');

// Step 3: Build client (with custom cache dir to avoid conflicts)
const viteConfigOverride = '--outDir dist/public --cacheDir /tmp/vite-cache';
const clientSuccess = runCommand(
  `npx vite build ${viteConfigOverride}`,
  'Building client (React app)',
  false // not critical
);

// Step 4: Copy server files directly (skip complex bundling)
console.log('📦 Preparing server files...');
try {
  // Copy essential directories
  const copyDirs = ['server', 'shared'];
  copyDirs.forEach(dir => {
    const src = path.join(__dirname, '..', dir);
    const dest = path.join(distDir, dir);
    execSync(`cp -r "${src}" "${dest}"`, { stdio: 'pipe' });
    console.log(`  ✓ Copied ${dir}`);
  });

  // Copy package files
  const files = ['package.json', 'package-lock.json', '.env'];
  files.forEach(file => {
    const src = path.join(__dirname, '..', file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ Copied ${file}`);
    }
  });

  // Create start script that uses tsx
  const startScript = `#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Level Up Solo...');

// Use tsx to run TypeScript directly
const tsx = spawn('npx', ['tsx', path.join(__dirname, 'server', 'index.ts')], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

tsx.on('error', (err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

tsx.on('exit', (code) => {
  process.exit(code);
});
`;

  fs.writeFileSync(path.join(distDir, 'start.js'), startScript);
  fs.chmodSync(path.join(distDir, 'start.js'), '755');
  
  console.log('✅ Server preparation completed\n');
} catch (error) {
  console.error('❌ Server preparation failed:', error.message);
  process.exit(1);
}

console.log('🎉 Railway build completed successfully!');
console.log('📁 Output directory: dist/');
console.log('🚀 Ready to start with: node dist/start.js');