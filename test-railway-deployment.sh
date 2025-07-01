#!/bin/bash

# Level Up Solo - Railway Deployment Test Script
# Usage: ./test-railway-deployment.sh

echo "🚀 Testing Level Up Solo Railway Deployment"
echo "=========================================="

# Set the base URL - update this if your Railway URL is different
BASE_URL="https://levelupsolo-production.up.railway.app"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local method=$2
    local data=$3
    local expected_status=$4
    
    echo -n "Testing $method $endpoint... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC} (Status: $http_code)"
        if [ ! -z "$body" ]; then
            echo "$body" | jq . 2>/dev/null || echo "$body"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $http_code)"
        if [ ! -z "$body" ]; then
            echo "$body" | jq . 2>/dev/null || echo "$body"
        fi
    fi
    echo ""
}

# Test 1: Basic Health Check
echo "1. Basic Health Check"
echo "-------------------"
test_endpoint "/api/health" "GET" "" "200"

# Test 2: Auth Status
echo "2. Authentication Status"
echo "----------------------"
test_endpoint "/api/auth/status" "GET" "" "200"

# Test 3: Database Diagnostics
echo "3. Database Diagnostics"
echo "---------------------"
test_endpoint "/api/diagnostics/database" "GET" "" "200"

# Test 4: Simple Test
echo "4. Simple Test Endpoint"
echo "---------------------"
test_endpoint "/api/test/simple" "GET" "" "200"

# Test 5: Demo Login
echo "5. Demo Login Test"
echo "----------------"
test_endpoint "/api/auth/simple-login" "POST" \
    '{"email":"demo@levelupsolo.net","password":"demo1234"}' "200"

# Test 6: Invalid Login
echo "6. Invalid Login Test"
echo "-------------------"
test_endpoint "/api/auth/simple-login" "POST" \
    '{"email":"invalid@test.com","password":"wrongpass"}' "401"

# Summary
echo "=========================================="
echo "🏁 Deployment Test Complete"
echo ""
echo "Next Steps:"
echo "1. If health check failed: Check if the app is deployed"
echo "2. If auth status shows missing JWT: Set JWT_REFRESH_SECRET in Railway"
echo "3. If database diagnostics failed: Check DATABASE_URL configuration"
echo "4. If login tests failed: Review authentication setup"
echo ""
echo "For detailed diagnostics, visit:"
echo "$BASE_URL/api/diagnostics/database"