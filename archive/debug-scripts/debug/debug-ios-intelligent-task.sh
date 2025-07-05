#!/bin/bash

echo "🔍 Debugging iOS Intelligent Task Creation Issue"
echo "================================================"

API_URL="https://levelupsolo-production.up.railway.app/api"

# First, let's verify the API is up
echo -e "\n1. Checking API health..."
curl -s "$API_URL/health" | jq '.database.status' || echo "API health check failed"

# Test with a minimal request
echo -e "\n\n2. Testing intelligent task creation (no auth)..."
curl -s -X POST "$API_URL/tasks/intelligent-create" \
  -H "Content-Type: application/json" \
  -d '{"description": "每天早上跑步30分钟"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -o /tmp/response.json

cat /tmp/response.json | jq . 2>/dev/null || cat /tmp/response.json

# Test with a mock auth token
echo -e "\n\n3. Testing with mock auth token..."
curl -s -X POST "$API_URL/tasks/intelligent-create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token-123" \
  -d '{"description": "每天早上跑步30分钟"}' \
  -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  -o /tmp/response2.json

cat /tmp/response2.json | jq . 2>/dev/null || cat /tmp/response2.json

# Check server logs endpoint if available
echo -e "\n\n4. Checking server status..."
curl -s "$API_URL/diagnostics/database" \
  -w "\nHTTP Status: %{http_code}\n" | jq . 2>/dev/null || echo "Database diagnostics not available"

echo -e "\n\n5. Testing with verbose output..."
curl -v -X POST "$API_URL/tasks/intelligent-create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"description": "Test task"}' \
  2>&1 | grep -E "(HTTP/|< |> )" | head -20

echo -e "\n\nAnalysis:"
echo "- If you see 502/503 errors, the Railway server is having issues"
echo "- If you see 401, authentication is working correctly"
echo "- If requests timeout, the server might be overloaded"
echo -e "\nNext steps:"
echo "1. Check Railway dashboard for deployment status"
echo "2. View Railway logs for any errors"
echo "3. Consider restarting the Railway deployment"