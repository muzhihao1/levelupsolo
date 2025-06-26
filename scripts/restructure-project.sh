#!/bin/bash

echo "🔧 开始重构项目为 Monorepo 结构..."

# 创建新的目录结构
mkdir -p apps/web
mkdir -p apps/api
mkdir -p apps/mobile
mkdir -p packages/shared
mkdir -p packages/ui-components

# 移动前端文件到 apps/web
echo "📦 移动前端文件..."
mv client/* apps/web/ 2>/dev/null || true
mv index.html apps/web/ 2>/dev/null || true
mv vite.config.ts apps/web/ 2>/dev/null || true
mv tailwind.config.ts apps/web/ 2>/dev/null || true
mv postcss.config.js apps/web/ 2>/dev/null || true
mv components.json apps/web/ 2>/dev/null || true

# 移动后端文件到 apps/api
echo "📦 移动后端文件..."
mv server/* apps/api/ 2>/dev/null || true

# 移动共享文件到 packages/shared
echo "📦 移动共享文件..."
mv shared/* packages/shared/ 2>/dev/null || true

# 创建各个子项目的 package.json
echo "📝 创建 Web 应用 package.json..."
cat > apps/web/package.json << 'EOF'
{
  "name": "@levelupsolo/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@levelupsolo/shared": "workspace:*"
  }
}
EOF

echo "📝 创建 API 服务 package.json..."
cat > apps/api/package.json << 'EOF'
{
  "name": "@levelupsolo/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch index.ts",
    "build": "esbuild index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@levelupsolo/shared": "workspace:*",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5"
  }
}
EOF

echo "📝 创建共享包 package.json..."
cat > packages/shared/package.json << 'EOF'
{
  "name": "@levelupsolo/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./schema": "./schema.ts"
  }
}
EOF

echo "📝 创建 React Native 项目配置..."
cat > apps/mobile/package.json << 'EOF'
{
  "name": "@levelupsolo/mobile",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "build:ios": "eas build --platform ios"
  },
  "dependencies": {
    "@levelupsolo/shared": "workspace:*",
    "react-native": "0.74.0",
    "expo": "~51.0.0"
  }
}
EOF

echo "📝 更新根目录 package.json..."
cat > package.json << 'EOF'
{
  "name": "levelupsolo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev:api & npm run dev:web",
    "dev:web": "npm run dev -w @levelupsolo/web",
    "dev:api": "npm run dev -w @levelupsolo/api",
    "dev:mobile": "npm run ios -w @levelupsolo/mobile",
    "build": "npm run build:api && npm run build:web",
    "build:web": "npm run build -w @levelupsolo/web",
    "build:api": "npm run build -w @levelupsolo/api",
    "db:push": "drizzle-kit push",
    "migrate": "tsx scripts/migrate-to-supabase.ts"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

# 清理旧目录
echo "🧹 清理旧目录..."
rmdir client 2>/dev/null || true
rmdir server 2>/dev/null || true
rmdir shared 2>/dev/null || true

echo "✅ 项目重构完成！"
echo ""
echo "下一步："
echo "1. 运行 'npm install' 安装依赖"
echo "2. 配置 .env 文件"
echo "3. 运行 'npm run dev' 启动开发环境"