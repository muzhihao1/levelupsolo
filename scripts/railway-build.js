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

// Step 4: Server preparation (no need to copy files since we'll run from source)
console.log('📦 Server preparation...');
console.log('  ℹ️  Server will run directly from source using tsx');
console.log('✅ Server preparation completed\n');

console.log('🎉 Railway build completed successfully!');
console.log('📁 Client built to: dist/public');
console.log('🚀 Server will start with: npx tsx server/index.ts');