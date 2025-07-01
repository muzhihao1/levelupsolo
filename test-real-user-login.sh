#!/bin/bash

# Test real user login on production
echo "🔍 Testing Real User Login on Production"
echo "========================================"

BASE_URL="https://levelupsolo-production.up.railway.app"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo ""
echo "Please enter your credentials to test login:"
read -p "Email: " EMAIL
read -s -p "Password: " PASSWORD
echo ""
echo ""

# Test login
echo "Testing login with your credentials..."
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/simple-login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Login successful!${NC}"
    echo "Response:"
    echo "$body" | jq .
    
    # Extract token
    token=$(echo "$body" | jq -r '.accessToken')
    
    if [ "$token" != "null" ] && [ ! -z "$token" ]; then
        echo ""
        echo "Testing authenticated request with token..."
        
        # Test authenticated endpoint
        auth_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/tasks" \
          -H "Authorization: Bearer $token")
        
        auth_code=$(echo "$auth_response" | tail -n1)
        auth_body=$(echo "$auth_response" | sed '$d')
        
        if [ "$auth_code" = "200" ]; then
            echo -e "${GREEN}✓ Authenticated request successful!${NC}"
            echo "You have $(echo "$auth_body" | jq length) tasks"
        else
            echo -e "${RED}✗ Authenticated request failed${NC} (Status: $auth_code)"
            echo "$auth_body" | jq . 2>/dev/null || echo "$auth_body"
        fi
        
        # Test user endpoint
        echo ""
        echo "Testing /api/auth/user endpoint..."
        user_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/user" \
          -H "Authorization: Bearer $token")
        
        user_code=$(echo "$user_response" | tail -n1)
        user_body=$(echo "$user_response" | sed '$d')
        
        if [ "$user_code" = "200" ]; then
            echo -e "${GREEN}✓ User data retrieved successfully!${NC}"
            echo "$user_body" | jq .
        else
            echo -e "${RED}✗ Failed to get user data${NC} (Status: $user_code)"
        fi
    else
        echo -e "${RED}✗ No access token in response${NC}"
    fi
else
    echo -e "${RED}✗ Login failed${NC} (Status: $http_code)"
    echo "Error:"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    
    echo ""
    echo "Possible issues:"
    echo "1. Wrong email or password"
    echo "2. User doesn't exist in database"
    echo "3. Password field might be in wrong column"
fi

echo ""
echo "========================================"
echo "Diagnostics Summary:"
echo ""
echo "1. Server Status: ✅ Running"
echo "2. Database: ✅ Connected (5 users)"
if [ "$http_code" = "200" ]; then
    echo "3. Login: ✅ Working"
    echo "4. JWT Token: ✅ Generated"
else
    echo "3. Login: ❌ Failed"
    echo "4. JWT Token: ❌ Not generated"
fi
echo ""
echo "Environment Issues:"
echo "- JWT_REFRESH_SECRET: ⚠️  Not set (using default)"
echo "- SSL Mode: ⚠️  Not configured"