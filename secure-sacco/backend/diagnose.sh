#!/bin/bash

###############################################################################
# Diagnostic Script - Check Benjamin & Available Loan Products
# Helps identify why loan disbursement is failing
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
echo -e "${BLUE}Database Diagnostic Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

###############################################################################
# STEP 1: LOGIN
###############################################################################

echo -e "${YELLOW}[1/5] Logging in...${NC}"

curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c "$COOKIES_FILE" > /dev/null

echo -e "${GREEN}✓ Logged in${NC}"

###############################################################################
# STEP 2: CHECK BENJAMIN EXISTS
###############################################################################

echo -e "${YELLOW}[2/5] Checking if Benjamin exists...${NC}"

MEMBER_RESPONSE=$(curl -s "$BASE_URL/members/search?memberNumber=$MEMBER_NUMBER" -b "$COOKIES_FILE")

echo "$MEMBER_RESPONSE" > benjamin_member.json

if echo "$MEMBER_RESPONSE" | grep -q '"empty":true'; then
  echo -e "${RED}✗ Benjamin NOT found${NC}"
  echo "Response: $MEMBER_RESPONSE"
else
  echo -e "${GREEN}✓ Benjamin found${NC}"

  # Extract Benjamin's ID
  BENJAMIN_ID=$(echo "$MEMBER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "  ID: ${GREEN}$BENJAMIN_ID${NC}"

  # Extract status
  STATUS=$(echo "$MEMBER_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "  Status: ${GREEN}$STATUS${NC}"

  # Save for later use
  echo "$BENJAMIN_ID" > benjamin_id.txt
fi

###############################################################################
# STEP 3: LIST ALL LOAN PRODUCTS
###############################################################################

echo ""
echo -e "${YELLOW}[3/5] Fetching available loan products...${NC}"

PRODUCTS_RESPONSE=$(curl -s "$BASE_URL/loans/products" -b "$COOKIES_FILE")

echo "$PRODUCTS_RESPONSE" > loan_products.json

# Extract product codes
PRODUCT_CODES=$(echo "$PRODUCTS_RESPONSE" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PRODUCT_CODES" ]; then
  echo -e "${RED}✗ No loan products found${NC}"
else
  echo -e "${GREEN}✓ Found loan products:${NC}"
  echo "$PRODUCT_CODES" | while read code; do
    echo "  - $code"
  done
fi

###############################################################################
# STEP 4: GET BENJAMIN'S EXISTING LOANS
###############################################################################

echo ""
echo -e "${YELLOW}[4/5] Checking Benjamin's existing loans...${NC}"

LOANS_RESPONSE=$(curl -s "$BASE_URL/loans/search?memberNumber=$MEMBER_NUMBER" -b "$COOKIES_FILE")

echo "$LOANS_RESPONSE" > benjamin_loans.json

LOAN_COUNT=$(echo "$LOANS_RESPONSE" | grep -o '"status":"[^"]*"' | wc -l)

if [ $LOAN_COUNT -eq 0 ]; then
  echo -e "${YELLOW}⚠ Benjamin has no loans${NC}"
else
  echo -e "${GREEN}✓ Benjamin has $LOAN_COUNT loan(s):${NC}"

  # Show status of each loan
  echo "$LOANS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 | nl | while read num status; do
    echo "  Loan $num: $status"
  done
fi

###############################################################################
# STEP 5: TEST LOAN DISBURSEMENT
###############################################################################

echo ""
echo -e "${YELLOW}[5/5] Testing loan disbursement...${NC}"

# Extract CSRF
CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

# Try different product codes
PRODUCT_CODES_TO_TRY=(
  "SMART_LOAN"
  "Historical Smart Loan"
  "Smart Loan"
  "DEFAULT"
)

DISBURSEMENT_SUCCESS=false

for PRODUCT_CODE in "${PRODUCT_CODES_TO_TRY[@]}"; do
  echo ""
  echo -e "${YELLOW}  Trying product: $PRODUCT_CODE${NC}"

  DISBURSE_RESPONSE=$(curl -s -X POST "$BASE_URL/loans/disburse" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $CSRF" \
    -b "$COOKIES_FILE" \
    -d '{
      "memberNumber": "'$MEMBER_NUMBER'",
      "loanProductCode": "'$PRODUCT_CODE'",
      "principal": 50000.00,
      "interestRatePercentage": 20,
      "termWeeks": 52,
      "disbursementDate": "2026-04-02",
      "firstInstallmentDate": "2026-04-09"
    }')

  if echo "$DISBURSE_RESPONSE" | grep -q '"id"'; then
    echo -e "    ${GREEN}✓ SUCCESS!${NC}"
    LOAN_ID=$(echo "$DISBURSE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "    Loan ID: $LOAN_ID"
    DISBURSEMENT_SUCCESS=true
    break
  else
    ERROR_MSG=$(echo "$DISBURSE_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    echo -e "    ${RED}✗ Failed${NC}"
    if [ -n "$ERROR_MSG" ]; then
      echo "    Error: $ERROR_MSG"
    fi
  fi
done

if [ "$DISBURSEMENT_SUCCESS" = false ]; then
  echo ""
  echo -e "${RED}✗ All disbursement attempts failed${NC}"
  echo ""
  echo "Last response:"
  echo "$DISBURSE_RESPONSE"
fi

###############################################################################
# SUMMARY
###############################################################################

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DIAGNOSTIC SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Files created:"
echo "  - benjamin_member.json    (Member details)"
echo "  - benjamin_loans.json     (Existing loans)"
echo "  - loan_products.json      (Available products)"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the JSON files above"
echo "2. Check which product code works"
echo "3. Update the test script with correct product code"
echo ""

###############################################################################
# END
###############################################################################


