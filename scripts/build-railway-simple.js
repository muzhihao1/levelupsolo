const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building for Railway (Simplified)...\n');

// Step 1: Build client
console.log('📦 Building client...');
try {
  execSync('npm run build:client', { stdio: 'inherit' });
  console.log('✅ Client build complete\n');
} catch (error) {
  console.error('❌ Client build failed:', error.message);
  process.exit(1);
}

// Step 2: Copy server file
console.log('🔧 Copying server...');
try {
  // Just copy the CommonJS server file
  fs.copyFileSync(
    path.join(__dirname, '../server/railway-server.js'),
    path.join(__dirname, '../dist/railway-server.js')
  );
  
  console.log('✅ Server copy complete\n');
} catch (error) {
  console.error('❌ Server copy failed:', error.message);
  process.exit(1);
}

// Step 3: Create package.json for dist
console.log('📝 Creating dist/package.json...');
const distPackageJson = {
  name: "levelupsolo-server",
  version: "1.0.0",
  main: "railway-server.js",
  scripts: {
    start: "node railway-server.js"
  },
  engines: {
    node: ">=18.0.0"
  }
};

fs.writeFileSync(
  path.join(__dirname, '../dist/package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

console.log('✅ Build complete! Ready for Railway deployment.');