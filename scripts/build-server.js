const { build } = require('esbuild');
const path = require('path');

async function buildServer() {
  console.log('Building server...');
  
  try {
    await build({
      entryPoints: [path.join(__dirname, '..', 'server', 'index.ts')],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: path.join(__dirname, '..', 'dist', 'index.js'),
      // Mark all node_modules as external to avoid bundling issues
      packages: 'external',
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx'
      },
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });
    
    console.log('Server build completed successfully!');
  } catch (error) {
    console.error('Server build failed:', error);
    process.exit(1);
  }
}

buildServer();