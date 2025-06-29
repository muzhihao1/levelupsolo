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

// Step 3: Build client
// Explicitly use the root vite.config.ts instead of the one in client directory
const clientSuccess = runCommand(
  `npx vite build --config ../vite.config.ts`,
  'Building client (React app)',
  true // critical - must succeed
);

// Step 4: Verify build output
console.log('🔍 Verifying build output...');
const publicDir = path.join(__dirname, '..', 'dist', 'public');
if (fs.existsSync(publicDir)) {
  const files = fs.readdirSync(publicDir);
  console.log(`  ✅ Found ${files.length} files in dist/public`);
  console.log(`  📄 Files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
} else {
  console.error('  ❌ ERROR: dist/public directory not found!');
  console.error('  Build may have failed or output to wrong location');
  process.exit(1);
}

// Step 5: Server preparation (no need to copy files since we'll run from source)
console.log('\n📦 Server preparation...');
console.log('  ℹ️  Server will run directly from source using tsx');
console.log('✅ Server preparation completed\n');

console.log('🎉 Railway build completed successfully!');
console.log('📁 Client built to: dist/public');
console.log('🚀 Server will start with: npm run start:railway');