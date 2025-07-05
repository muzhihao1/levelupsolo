#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔍 Debug Server Starting...');
console.log('==========================');
console.log(`PORT: ${PORT}`);
console.log(`CWD: ${process.cwd()}`);
console.log('');

// List all possible static directories
const possibleDirs = [
  'dist',
  'dist/public', 
  'public',
  'client/dist',
  '../dist/public',
  './dist/public'
];

console.log('📁 Looking for static files:');
possibleDirs.forEach(dir => {
  const fullPath = path.resolve(dir);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ Found: ${dir} -> ${fullPath}`);
    const files = fs.readdirSync(fullPath).slice(0, 3);
    console.log(`     Files: ${files.join(', ')}...`);
  } else {
    console.log(`  ❌ Missing: ${dir}`);
  }
});

// Find the first existing directory
let staticDir = null;
for (const dir of possibleDirs) {
  if (fs.existsSync(dir)) {
    staticDir = dir;
    break;
  }
}

if (staticDir) {
  console.log(`\n✅ Using static directory: ${staticDir}`);
  app.use(express.static(staticDir));
  
  app.get('*', (req, res) => {
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(path.resolve(indexPath));
    } else {
      res.status(404).send('index.html not found');
    }
  });
} else {
  console.log('\n❌ No static directory found!');
  app.get('*', (req, res) => {
    res.status(500).json({
      error: 'No static files found',
      cwd: process.cwd(),
      checked: possibleDirs
    });
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 Debug server running on port ${PORT}`);
});