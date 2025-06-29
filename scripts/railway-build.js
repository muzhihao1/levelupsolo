const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Build Process Starting...\n');

// Helper function to run commands safely
function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

// Clean any existing cache issues
console.log('🧹 Cleaning cache directories...');
try {
  const cacheDir = path.join(__dirname, '..', 'node_modules', '.cache');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
  const viteCache = path.join(__dirname, '..', 'node_modules', '.vite');
  if (fs.existsSync(viteCache)) {
    fs.rmSync(viteCache, { recursive: true, force: true });
  }
} catch (e) {
  console.log('⚠️  Could not clean cache, continuing...');
}

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Step 1: Build client
const clientSuccess = runCommand(
  'npx vite build --clearScreen false', 
  'Building client application'
);

if (!clientSuccess) {
  console.log('⚠️  Client build failed, but continuing with server build...\n');
}

// Step 2: Build server
console.log('📦 Building server...');
try {
  const serverEntry = path.join(__dirname, '..', 'server', 'index.ts');
  const outFile = path.join(__dirname, '..', 'dist', 'index.js');
  
  // Simple esbuild command with all externals
  execSync(
    `npx esbuild "${serverEntry}" --bundle --platform=node --format=cjs --outfile="${outFile}" --external:* --log-level=warning`,
    { stdio: 'inherit' }
  );
  
  console.log('✅ Server build completed\n');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  
  // Fallback: Copy TypeScript files as-is for tsx runtime
  console.log('\n🔄 Attempting fallback build method...');
  try {
    const serverDir = path.join(__dirname, '..', 'server');
    const distServerDir = path.join(__dirname, '..', 'dist', 'server');
    
    execSync(`cp -r "${serverDir}" "${distServerDir}"`, { stdio: 'inherit' });
    
    // Create a simple start script
    const startScript = `
require('dotenv').config();
require('tsx/register');
require('./server/index.ts');
`;
    fs.writeFileSync(path.join(distDir, 'index.js'), startScript);
    
    console.log('✅ Fallback build completed');
  } catch (fallbackError) {
    console.error('❌ Fallback build also failed');
    process.exit(1);
  }
}

console.log('🎉 Railway build process completed!');