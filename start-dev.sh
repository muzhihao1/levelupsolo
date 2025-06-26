#!/bin/bash

# 加载环境变量
export $(cat .env | grep -v '^#' | xargs)

# 设置 DATABASE_URL 为 Supabase URL
export DATABASE_URL=$SUPABASE_DATABASE_URL

echo "🚀 启动开发服务器..."
echo "📡 数据库: Supabase (Tokyo)"
echo "🌐 地址: http://localhost:5000"
echo ""

npm run dev