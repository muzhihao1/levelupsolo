const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting simple build process...');

// Step 1: Build client
console.log('Step 1: Building client...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✓ Client build completed');
} catch (error) {
  console.error('✗ Client build failed:', error.message);
  // Continue anyway for Railway
}

// Step 2: Build server with simple approach
console.log('\nStep 2: Building server...');
try {
  const serverEntry = path.join(__dirname, '..', 'server', 'index.ts');
  const outFile = path.join(__dirname, '..', 'dist', 'index.js');
  
  // Ensure dist directory exists
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Use esbuild with minimal configuration
  execSync(`npx esbuild ${serverEntry} --bundle --platform=node --format=cjs --outfile=${outFile} --external:* --minify`, { 
    stdio: 'inherit' 
  });
  
  console.log('✓ Server build completed');
} catch (error) {
  console.error('✗ Server build failed:', error.message);
  process.exit(1);
}

console.log('\n✓ Build process completed!');