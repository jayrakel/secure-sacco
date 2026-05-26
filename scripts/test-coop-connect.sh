#!/bin/bash

# Co-op Connect Integration Test Script
# Usage: ./test-coop-connect.sh

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "Co-op Connect Integration Diagnostic Tool"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${COOP_BASE_URL:-https://openapi.co-opbank.co.ke}"
CONSUMER_KEY="${COOP_CONSUMER_KEY:-}"
CONSUMER_SECRET="${COOP_CONSUMER_SECRET:-}"
APP_URL="${APP_URL:-http://localhost:8080}"

echo -e "${BLUE}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  App URL: $APP_URL"
echo "  Consumer Key: ${CONSUMER_KEY:0:10}..."
echo ""

# Test 1: Check environment variables
echo -e "${BLUE}[Test 1] Checking Environment Variables${NC}"
if [ -z "$CONSUMER_KEY" ]; then
    echo -e "${RED}  ✗ COOP_CONSUMER_KEY not set${NC}"
    exit 1
else
    echo -e "${GREEN}  ✓ COOP_CONSUMER_KEY is set${NC}"
fi

if [ -z "$CONSUMER_SECRET" ]; then
    echo -e "${RED}  ✗ COOP_CONSUMER_SECRET not set${NC}"
    exit 1
else
    echo -e "${GREEN}  ✓ COOP_CONSUMER_SECRET is set${NC}"
fi
echo ""

# Test 2: SSL Certificate Check
echo -e "${BLUE}[Test 2] Testing SSL Connection to Co-op Bank${NC}"
if curl -s --connect-timeout 5 "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ SSL connection successful${NC}"
else
    echo -e "${YELLOW}  ⚠ SSL connection may have issues (check output below)${NC}"
    curl -v --connect-timeout 5 "$BASE_URL" 2>&1 | head -20
fi
echo ""

# Test 3: Token Endpoint Connectivity
echo -e "${BLUE}[Test 3] Testing Token Endpoint Connectivity${NC}"
CREDENTIALS="$CONSUMER_KEY:$CONSUMER_SECRET"
ENCODED=$(echo -n "$CREDENTIALS" | base64)

echo "  Attempting to fetch access token..."
RESPONSE=$(curl -s -X POST "$BASE_URL/token" \
    -H "Authorization: Basic $ENCODED" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials" \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "  HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}  ✓ Token endpoint responded with 200${NC}"
    TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        echo -e "${GREEN}  ✓ Successfully obtained access token (first 20 chars): ${TOKEN:0:20}...${NC}"
    else
        echo -e "${RED}  ✗ Response did not contain access_token${NC}"
        echo "  Response: $BODY"
    fi
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}  ✗ Authentication failed ($HTTP_CODE)${NC}"
    echo "  This indicates incorrect consumer key/secret or IP restriction"
    echo "  Response: $BODY"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}  ✗ Connection failed${NC}"
    echo "  Check network connectivity and SSL certificates"
else
    echo -e "${YELLOW}  ⚠ Unexpected HTTP status: $HTTP_CODE${NC}"
    echo "  Response: $BODY"
fi
echo ""

# Test 4: Application Health
echo -e "${BLUE}[Test 4] Checking Application Health${NC}"
HEALTH=$(curl -s "$APP_URL/actuator/health" 2>&1)
if echo "$HEALTH" | grep -q '"status":"UP"'; then
    echo -e "${GREEN}  ✓ Application is UP${NC}"
else
    echo -e "${YELLOW}  ⚠ Application may not be running or not responding${NC}"
    echo "  Response: $HEALTH"
fi
echo ""

# Test 5: IPN Endpoint Accessibility
echo -e "${BLUE}[Test 5] Testing IPN Endpoint${NC}"
IPN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$APP_URL/api/v1/payments/coop/ipn")
echo "  IPN endpoint HTTP status: $IPN_RESPONSE"

if [ "$IPN_RESPONSE" = "200" ] || [ "$IPN_RESPONSE" = "204" ]; then
    echo -e "${GREEN}  ✓ IPN endpoint is accessible${NC}"
else
    echo -e "${YELLOW}  ⚠ IPN endpoint returned: $IPN_RESPONSE${NC}"
fi
echo ""

# Test 6: CSRF Configuration Check (for local testing)
echo -e "${BLUE}[Test 6] Testing CSRF Bypass for IPN${NC}"
TEST_PAYLOAD='{
  "AcctNo": "01120000568900",
  "Amount": "500.0",
  "Currency": "KES",
  "EventType": "CREDIT",
  "Narration": "Test payment",
  "PaymentRef": "TEST001",
  "PostingDate": "2026-05-26",
  "ValueDate": "2026-05-26",
  "TransactionDate": "2026-05-26T10:00:00",
  "TransactionId": "CB_TEST_001",
  "CustMemoLine1": "TESTREF~254712345678~0",
  "CustMemoLine3": "0200~TEST SENDER"
}'

IPN_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$APP_URL/api/v1/payments/coop/ipn" \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD")

echo "  IPN test POST returned: $IPN_TEST"

if [ "$IPN_TEST" = "200" ] || [ "$IPN_TEST" = "400" ] || [ "$IPN_TEST" = "500" ]; then
    echo -e "${GREEN}  ✓ IPN endpoint accepts POST (CSRF bypass working)${NC}"
elif [ "$IPN_TEST" = "403" ]; then
    echo -e "${RED}  ✗ IPN endpoint returned 403 (CSRF protection not bypassed)${NC}"
else
    echo -e "${YELLOW}  ⚠ IPN endpoint returned: $IPN_TEST${NC}"
fi
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════════"
echo -e "${BLUE}Diagnostic Summary:${NC}"
echo "  1. Check if all tests passed ✓"
echo "  2. If Test 3 fails with 403, verify:"
echo "     - COOP_CONSUMER_KEY is correct"
echo "     - COOP_CONSUMER_SECRET is correct"
echo "     - Your server's IP is whitelisted with Co-op Bank"
echo "  3. If Test 5-6 fail, check:"
echo "     - Application is running on $APP_URL"
echo "     - CSRF configuration includes /api/v1/payments/coop/**"
echo ""

exit 0

