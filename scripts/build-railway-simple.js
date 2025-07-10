const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building for Railway (Simplified)...\n');

// Step 1: Build client
console.log('📦 Building client...');
try {
  // Run vite build directly instead of npm run build:client to avoid the || echo suppression
  execSync('npx vite build', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ Client build complete\n');
} catch (error) {
  console.error('❌ Client build failed:', error.message);
  process.exit(1);
}

// Step 2: Copy client files to server/public directory
console.log('🔧 Copying client files to server/public...');
try {
  const distPath = path.join(__dirname, '../dist');
  const serverPublicPath = path.join(__dirname, '../server/public');
  
  // Remove existing public directory
  if (fs.existsSync(serverPublicPath)) {
    fs.rmSync(serverPublicPath, { recursive: true, force: true });
  }
  
  // Create server/public directory
  fs.mkdirSync(serverPublicPath, { recursive: true });
  
  // Debug: Check what's in dist directory
  console.log('📂 Checking dist directory...');
  if (fs.existsSync(distPath)) {
    const distContents = fs.readdirSync(distPath);
    console.log('  Contents of dist:', distContents);
  } else {
    console.log('  ❌ dist directory does not exist!');
  }
  
  // Copy all files from dist/public to server/public
  const distPublicPath = path.join(distPath, 'public');
  if (fs.existsSync(distPublicPath)) {
    const files = fs.readdirSync(distPublicPath);
    for (const file of files) {
      const srcPath = path.join(distPublicPath, file);
      const destPath = path.join(serverPublicPath, file);
      
      if (fs.statSync(srcPath).isDirectory()) {
        // Copy directory recursively
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        // Copy file
        fs.copyFileSync(srcPath, destPath);
      }
    }
    console.log('✅ Client files copied to server/public');
  } else {
    console.error('❌ Dist/public directory not found');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Client copy failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Build complete! Ready for Railway deployment.');
console.log('🚀 Frontend files are now available at server/public/');
console.log('🚀 Server will run from server/railway-server.js');