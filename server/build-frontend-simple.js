// 简化的前端构建脚本 - 专为 Railway 环境设计
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 简化前端构建 (Railway 专用)...');

const rootDir = path.join(__dirname, '..');
const serverPublicDir = path.join(__dirname, 'public');

try {
  // 1. 清理 server/public 目录
  console.log('🧹 清理 server/public 目录...');
  if (fs.existsSync(serverPublicDir)) {
    fs.rmSync(serverPublicDir, { recursive: true, force: true });
  }
  fs.mkdirSync(serverPublicDir, { recursive: true });

  // 2. 检查是否有预构建的 dist 目录
  const distDir = path.join(rootDir, 'dist/public');
  if (fs.existsSync(distDir)) {
    console.log('📁 发现预构建文件，直接复制...');
    
    // 复制 dist/public 到 server/public
    const files = fs.readdirSync(distDir);
    for (const file of files) {
      const srcPath = path.join(distDir, file);
      const destPath = path.join(serverPublicDir, file);
      
      if (fs.statSync(srcPath).isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    console.log('✅ 预构建文件复制完成');
  } else {
    // 3. 从源码构建
    console.log('🔨 从源码构建前端...');
    
    // 切换到根目录
    process.chdir(rootDir);
    
    // 运行客户端构建
    console.log('📦 构建客户端...');
    execSync('npm run build:client', { stdio: 'inherit' });
    
    // 复制构建文件
    console.log('📋 复制构建文件...');
    const newDistDir = path.join(rootDir, 'dist/public');
    if (fs.existsSync(newDistDir)) {
      const files = fs.readdirSync(newDistDir);
      for (const file of files) {
        const srcPath = path.join(newDistDir, file);
        const destPath = path.join(serverPublicDir, file);
        
        if (fs.statSync(srcPath).isDirectory()) {
          fs.cpSync(srcPath, destPath, { recursive: true });
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
    console.log('✅ 源码构建完成');
  }

  // 4. 验证构建结果
  if (fs.existsSync(path.join(serverPublicDir, 'index.html'))) {
    console.log('✅ 构建验证成功 - index.html 存在');
    
    const files = fs.readdirSync(serverPublicDir);
    console.log('📄 构建文件:', files.slice(0, 5).join(', '), files.length > 5 ? '...' : '');
  } else {
    throw new Error('构建验证失败 - index.html 不存在');
  }

} catch (error) {
  console.error('❌ 构建失败:', error.message);
  
  // 创建基本的 HTML 文件作为后备
  console.log('🚑 创建后备 HTML...');
  const fallbackHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Level Up Solo</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
        .container { max-width: 600px; margin: 0 auto; }
        .status { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Level Up Solo</h1>
        <div class="status">
            <h2>⚠️ 前端正在构建中</h2>
            <p>API 服务正常运行，前端文件正在构建...</p>
            <p>请稍后刷新页面</p>
        </div>
        <div class="status">
            <h3>📡 API 状态</h3>
            <p><a href="/api/health">健康检查</a></p>
            <p>注册和登录功能正常</p>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(serverPublicDir, 'index.html'), fallbackHtml);
  console.log('✅ 后备页面已创建');
  
  process.exit(1);
}