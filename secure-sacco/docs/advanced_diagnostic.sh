#!/bin/bash

###############################################################################
# Advanced Diagnostic - Test disbursement with different parameters
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="http://localhost:8080/api/v1"
COOKIES_FILE="cookies.txt"
MEMBER_NUMBER="BVL-2022-000001"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Advanced Loan Disbursement Diagnostic${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

###############################################################################
# STEP 1: LOGIN
###############################################################################

echo -e "${YELLOW}[1/4] Logging in...${NC}"

curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c "$COOKIES_FILE" > /dev/null

echo -e "${GREEN}✓ Logged in${NC}"

###############################################################################
# STEP 2: GET BENJAMIN'S DETAILS
###############################################################################

echo -e "${YELLOW}[2/4] Getting Benjamin's full details...${NC}"

BENJAMIN=$(curl -s "$BASE_URL/members/search?memberNumber=$MEMBER_NUMBER" -b "$COOKIES_FILE")
BENJAMIN_ID=$(echo "$BENJAMIN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
BENJAMIN_STATUS=$(echo "$BENJAMIN" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "  ID: $BENJAMIN_ID"
echo "  Status: $BENJAMIN_STATUS"
echo "  Full response:"
echo "$BENJAMIN" > benjamin_details.json
cat benjamin_details.json | head -20
echo ""

###############################################################################
# STEP 3: TEST DISBURSEMENT WITH DIFFERENT APPROACHES
###############################################################################

echo -e "${YELLOW}[3/4] Testing disbursement with different approaches...${NC}"
echo ""

CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

# Approach 1: migration/loans/disburse with Historical Smart Loan
echo "Approach 1: migration/loans/disburse (Historical Smart Loan)"
RESPONSE1=$(curl -s -X POST "$BASE_URL/migration/loans/disburse" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b "$COOKIES_FILE" \
  -d '{
    "memberNumber": "'$MEMBER_NUMBER'",
    "loanProductCode": "Historical Smart Loan",
    "principal": 100000.00,
    "interestRate": 10,
    "termWeeks": 104,
    "disbursementDate": "2026-04-02",
    "referenceNumber": "TEST-001"
  }')

echo "Response:"
echo "$RESPONSE1" > disburse_test1.json
cat disburse_test1.json
echo ""

# Approach 2: loans/disburse with direct parameters
echo "Approach 2: loans/disburse (direct API)"
RESPONSE2=$(curl -s -X POST "$BASE_URL/loans/disburse" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b "$COOKIES_FILE" \
  -d '{
    "memberId": "'$BENJAMIN_ID'",
    "loanProductCode": "Historical Smart Loan",
    "principal": 100000.00,
    "interestRatePercentage": 10,
    "termWeeks": 104,
    "disbursementDate": "2026-04-02"
  }')

echo "Response:"
echo "$RESPONSE2" > disburse_test2.json
cat disburse_test2.json
echo ""

# Approach 3: With simpler parameters
echo "Approach 3: migration/loans/disburse (minimal params)"
RESPONSE3=$(curl -s -X POST "$BASE_URL/migration/loans/disburse" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b "$COOKIES_FILE" \
  -d '{
    "memberNumber": "'$MEMBER_NUMBER'",
    "loanProductCode": "Historical Smart Loan",
    "principal": 50000.00,
    "termWeeks": 52
  }')

echo "Response:"
echo "$RESPONSE3" > disburse_test3.json
cat disburse_test3.json
echo ""

###############################################################################
# STEP 4: SUMMARY
###############################################################################

echo -e "${YELLOW}[4/4] Summary...${NC}"
echo ""

echo "Files created for inspection:"
echo "  - benjamin_details.json"
echo "  - disburse_test1.json"
echo "  - disburse_test2.json"
echo "  - disburse_test3.json"
echo ""

echo "Check which approach succeeded (has \"id\" field)"
echo ""

if grep -q '"id"' disburse_test1.json; then
  echo -e "${GREEN}✓ Approach 1 SUCCEEDED${NC}"
elif grep -q '"id"' disburse_test2.json; then
  echo -e "${GREEN}✓ Approach 2 SUCCEEDED${NC}"
elif grep -q '"id"' disburse_test3.json; then
  echo -e "${GREEN}✓ Approach 3 SUCCEEDED${NC}"
else
  echo -e "${RED}✗ All approaches failed${NC}"
  echo ""
  echo "Checking for error patterns..."
  grep -o '"message":"[^"]*"' disburse_test1.json 2>/dev/null || echo "  No error message in test 1"
  grep -o '"error":"[^"]*"' disburse_test1.json 2>/dev/null || echo "  No error in test 1"
fi

echo ""
echo -e "${BLUE}========================================${NC}"


