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

// Step 2: Compile TypeScript server
console.log('🔧 Compiling server...');
try {
  const esbuildPath = path.join(__dirname, '../node_modules/.bin/esbuild');
  
  // Compile the simplified Railway server
  execSync(`${esbuildPath} server/railway-server.ts --bundle --platform=node --target=node18 --outfile=dist/railway-server.js --format=esm --external:express --external:dotenv`, {
    stdio: 'inherit'
  });
  
  console.log('✅ Server compilation complete\n');
} catch (error) {
  console.error('❌ Server compilation failed:', error.message);
  process.exit(1);
}

// Step 3: Create package.json for dist
console.log('📝 Creating dist/package.json...');
const distPackageJson = {
  name: "levelupsolo-server",
  version: "1.0.0",
  type: "module",
  main: "railway-server.js",
  scripts: {
    start: "node railway-server.js"
  }
};

fs.writeFileSync(
  path.join(__dirname, '../dist/package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

console.log('✅ Build complete! Ready for Railway deployment.');