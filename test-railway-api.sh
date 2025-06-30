#!/bin/bash

# 测试 Railway 部署的 API

echo "🔍 测试 Railway 部署的数据库连接..."
echo ""

BASE_URL="https://levelupsolo-production.up.railway.app"

echo "1️⃣ 健康检查..."
curl -s "$BASE_URL/api/health" | python3 -m json.tool
echo ""

echo "2️⃣ 数据库连接测试..."
curl -s "$BASE_URL/api/test/db-connection" | python3 -m json.tool
echo ""

echo "3️⃣ 用户列表（调试）..."
curl -s "$BASE_URL/api/debug/users" | python3 -m json.tool
echo ""

echo "4️⃣ 测试注册功能..."
TEST_EMAIL="test_$(date +%s)@example.com"
echo "使用测试邮箱: $TEST_EMAIL"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"test123456\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

echo "注册响应:"
echo "$REGISTER_RESPONSE" | python3 -m json.tool
echo ""

# 如果注册成功，尝试登录
if echo "$REGISTER_RESPONSE" | grep -q "success"; then
  echo "5️⃣ 测试登录..."
  curl -s -X POST "$BASE_URL/api/auth/simple-login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"test123456\"
    }" | python3 -m json.tool
else
  echo "❌ 注册失败，跳过登录测试"
fi

echo ""
echo "📊 测试完成！"
echo ""
echo "如果看到以下情况，说明数据库连接有问题:"
echo "- health 检查显示 database.status 不是 'connected'"
echo "- db-connection 测试显示错误"
echo "- 注册成功但登录失败"