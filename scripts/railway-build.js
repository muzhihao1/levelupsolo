const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Build Process Starting...\n');

// Helper to run commands with proper error handling
function runCommand(command, description, critical = false) {
  console.log(`📦 ${description}...`);
  console.log(`  Command: ${command}`);
  console.log(`  Working directory: ${process.cwd()}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'pipe' 
    });
    console.log(output);
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed`);
    console.error(`  Exit code: ${error.status}`);
    console.error(`  Error output:`);
    console.error(error.stdout || '(no stdout)');
    console.error(error.stderr || '(no stderr)');
    console.error(`  Error message: ${error.message}`);
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

// Step 3: Check vite config files
console.log('🔍 Checking vite configuration files...');
const rootViteConfig = path.join(__dirname, '..', 'vite.config.ts');
const clientViteConfig = path.join(__dirname, '..', 'client', 'vite.config.ts');

if (fs.existsSync(rootViteConfig)) {
  console.log(`  ✅ Found root vite.config.ts at: ${rootViteConfig}`);
} else {
  console.log(`  ❌ Root vite.config.ts NOT FOUND at: ${rootViteConfig}`);
}

if (fs.existsSync(clientViteConfig)) {
  console.log(`  ✅ Found client vite.config.ts at: ${clientViteConfig}`);
} else {
  console.log(`  ❌ Client vite.config.ts NOT FOUND at: ${clientViteConfig}`);
}

// List files in current directory
console.log('\n📁 Files in current directory:');
const files = fs.readdirSync(process.cwd()).filter(f => !f.startsWith('.'));
console.log(`  ${files.join(', ')}`);
console.log('');

// Step 4: Build client
// Explicitly use the root vite.config.ts in the current directory
const clientSuccess = runCommand(
  `npx vite build --config ./vite.config.ts`,
  'Building client (React app)',
  true // critical - must succeed
);

// Step 5: Verify build output
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

// Step 6: Server preparation (no need to copy files since we'll run from source)
console.log('\n📦 Server preparation...');
console.log('  ℹ️  Server will run directly from source using tsx');
console.log('✅ Server preparation completed\n');

console.log('🎉 Railway build completed successfully!');
console.log('📁 Client built to: dist/public');
console.log('🚀 Server will start with: npm run start:railway');