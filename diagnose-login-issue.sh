#!/bin/bash

# Comprehensive login issue diagnosis
echo "🔍 Diagnosing Level Up Solo Login Issues"
echo "========================================"

BASE_URL="https://levelupsolo-production.up.railway.app"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Test 1: Check if server is responding
echo "1. Server Health Check"
echo "----------------------"
health_response=$(curl -s -w "\nSTATUS:%{http_code}" "$BASE_URL/api/health")
health_status=$(echo "$health_response" | grep "STATUS:" | cut -d: -f2)
health_body=$(echo "$health_response" | grep -v "STATUS:")

if [ "$health_status" = "200" ]; then
    echo -e "${GREEN}✓ Server is running${NC}"
    db_status=$(echo "$health_body" | jq -r '.database.status')
    user_count=$(echo "$health_body" | jq -r '.database.userCount')
    echo "  Database: $db_status"
    echo "  Users in DB: $user_count"
else
    echo -e "${RED}✗ Server not responding${NC}"
    exit 1
fi

# Test 2: Check database diagnostics
echo ""
echo "2. Database Diagnostics"
echo "----------------------"
diag_response=$(curl -s "$BASE_URL/api/diagnostics/database")
warnings=$(echo "$diag_response" | jq -r '.summary.warnings')
failures=$(echo "$diag_response" | jq -r '.summary.failed')

if [ "$failures" = "0" ]; then
    echo -e "${GREEN}✓ No database failures${NC}"
else
    echo -e "${RED}✗ Database has $failures failures${NC}"
fi

if [ "$warnings" -gt "0" ]; then
    echo -e "${YELLOW}⚠ $warnings warnings found:${NC}"
    echo "$diag_response" | jq -r '.recommendations[]' | while read rec; do
        echo "  - $rec"
    done
fi

# Test 3: Check authentication endpoints
echo ""
echo "3. Authentication Endpoints"
echo "--------------------------"

# Test auth status endpoint
auth_status=$(curl -s -w "\nSTATUS:%{http_code}" "$BASE_URL/api/auth/status" | grep "STATUS:" | cut -d: -f2)
if [ "$auth_status" = "200" ]; then
    echo -e "${GREEN}✓ Auth status endpoint working${NC}"
else
    echo -e "${RED}✗ Auth status endpoint failed${NC}"
fi

# Test 4: Check for common issues
echo ""
echo "4. Common Issue Checks"
echo "---------------------"

# Check if trying to access protected endpoint without auth returns 401
unauth_response=$(curl -s -w "\nSTATUS:%{http_code}" "$BASE_URL/api/tasks" | grep "STATUS:" | cut -d: -f2)
if [ "$unauth_response" = "401" ]; then
    echo -e "${GREEN}✓ Protected endpoints require authentication${NC}"
else
    echo -e "${RED}✗ Protected endpoints not secured (got $unauth_response)${NC}"
fi

# Test 5: Frontend availability
echo ""
echo "5. Frontend Check"
echo "----------------"
frontend_response=$(curl -s -w "\nSTATUS:%{http_code}" "$BASE_URL/" | grep "STATUS:" | cut -d: -f2)
if [ "$frontend_response" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is being served${NC}"
else
    echo -e "${RED}✗ Frontend not available${NC}"
fi

# Test 6: Create a test user and try login
echo ""
echo "6. Test User Creation & Login"
echo "-----------------------------"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

echo "Creating test user: $TEST_EMAIL"
register_response=$(curl -s -w "\nSTATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\"}")

register_status=$(echo "$register_response" | grep "STATUS:" | cut -d: -f2)
register_body=$(echo "$register_response" | grep -v "STATUS:")

if [ "$register_status" = "200" ]; then
    echo -e "${GREEN}✓ Test user created successfully${NC}"
    
    # Try to login with the test user
    echo "Testing login with new user..."
    login_response=$(curl -s -w "\nSTATUS:%{http_code}" -X POST "$BASE_URL/api/auth/simple-login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    login_status=$(echo "$login_response" | grep "STATUS:" | cut -d: -f2)
    login_body=$(echo "$login_response" | grep -v "STATUS:")
    
    if [ "$login_status" = "200" ]; then
        echo -e "${GREEN}✓ Login successful with test user${NC}"
        token=$(echo "$login_body" | jq -r '.accessToken')
        
        if [ "$token" != "null" ] && [ ! -z "$token" ]; then
            echo -e "${GREEN}✓ JWT token generated${NC}"
        else
            echo -e "${RED}✗ No JWT token in response${NC}"
        fi
    else
        echo -e "${RED}✗ Login failed with test user${NC}"
        echo "Error: $(echo "$login_body" | jq -r '.error' 2>/dev/null || echo "$login_body")"
    fi
else
    echo -e "${RED}✗ Failed to create test user${NC}"
    echo "Error: $(echo "$register_body" | jq -r '.error' 2>/dev/null || echo "$register_body")"
fi

# Summary
echo ""
echo "========================================"
echo "DIAGNOSIS SUMMARY"
echo "========================================"
echo ""

if [ "$health_status" = "200" ] && [ "$failures" = "0" ] && [ "$auth_status" = "200" ] && [ "$unauth_response" = "401" ]; then
    echo -e "${GREEN}✓ Backend API is working correctly${NC}"
    
    if [ "$register_status" = "200" ] && [ "$login_status" = "200" ]; then
        echo -e "${GREEN}✓ Authentication system is functional${NC}"
        echo ""
        echo "The issue might be:"
        echo "1. Existing user passwords might need reset"
        echo "2. Frontend might have cached old data"
        echo "3. Browser might have stale tokens"
        echo ""
        echo "Try:"
        echo "- Clear browser cache and localStorage"
        echo "- Try incognito/private browsing mode"
        echo "- Create a new account"
    else
        echo -e "${RED}✗ Authentication has issues${NC}"
    fi
else
    echo -e "${RED}✗ Backend has issues${NC}"
fi

echo ""
echo "Environment warnings to fix:"
echo "- JWT_REFRESH_SECRET not set"
echo "- SSL mode not configured in DATABASE_URL"