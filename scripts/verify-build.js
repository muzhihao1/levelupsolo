#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build output...\n');

const distPath = path.join(__dirname, '..', 'dist', 'public');
const indexPath = path.join(distPath, 'index.html');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: dist/public directory not found!');
  process.exit(1);
}

// Check if index.html exists
if (!fs.existsSync(indexPath)) {
  console.error('❌ Error: index.html not found in dist/public!');
  process.exit(1);
}

// Read index.html
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Check for React chunk
const reactChunkMatch = indexContent.match(/react\.[a-zA-Z0-9-_]+\.js/);
if (reactChunkMatch) {
  console.log(`✅ React chunk found: ${reactChunkMatch[0]}`);
} else {
  console.error('❌ Error: React chunk not found in index.html!');
  process.exit(1);
}

// Check for vendor chunk
const vendorChunkMatch = indexContent.match(/vendor\.[a-zA-Z0-9-_]+\.js/);
if (vendorChunkMatch) {
  console.log(`✅ Vendor chunk found: ${vendorChunkMatch[0]}`);
} else {
  console.error('❌ Error: Vendor chunk not found in index.html!');
  process.exit(1);
}

// Check for main index chunk
const indexChunkMatch = indexContent.match(/index\.[a-zA-Z0-9-_]+\.js/);
if (indexChunkMatch) {
  console.log(`✅ Main index chunk found: ${indexChunkMatch[0]}`);
} else {
  console.error('❌ Error: Main index chunk not found in index.html!');
  process.exit(1);
}

// Check module preloading order
const modulePreloads = [...indexContent.matchAll(/link rel="modulepreload"[^>]+href="([^"]+)"/g)]
  .map(match => match[1]);

console.log('\n📦 Module preload order:');
modulePreloads.forEach((module, index) => {
  console.log(`   ${index + 1}. ${module}`);
});

// Verify React is preloaded before vendor
const reactPreloadIndex = modulePreloads.findIndex(m => m.includes('react'));
const vendorPreloadIndex = modulePreloads.findIndex(m => m.includes('vendor'));

if (reactPreloadIndex >= 0 && vendorPreloadIndex >= 0) {
  if (reactPreloadIndex < vendorPreloadIndex) {
    console.log('\n✅ React is correctly preloaded before vendor chunk');
  } else {
    console.warn('\n⚠️  Warning: Vendor chunk is preloaded before React chunk');
  }
}

// Check file sizes
console.log('\n📊 Chunk sizes:');
const assetsDir = path.join(distPath, 'assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  jsFiles.forEach(file => {
    const stats = fs.statSync(path.join(assetsDir, file));
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   ${file}: ${sizeKB} KB`);
  });
}

console.log('\n✅ Build verification complete!');