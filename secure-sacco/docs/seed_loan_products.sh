#!/bin/bash

###############################################################################
# Seed Loan Products - Creates default loan products if they don't exist
# Must run before attempting to disburse loans
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Seed Loan Products${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

###############################################################################
# STEP 1: LOGIN
###############################################################################

echo -e "${YELLOW}[1/3] Logging in...${NC}"

curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c "$COOKIES_FILE" > /dev/null

echo -e "${GREEN}✓ Logged in${NC}"

###############################################################################
# STEP 2: EXTRACT CSRF
###############################################################################

echo -e "${YELLOW}[2/3] Extracting CSRF...${NC}"

CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

echo -e "${GREEN}✓ CSRF extracted${NC}"

###############################################################################
# STEP 3: CREATE LOAN PRODUCTS
###############################################################################

echo -e "${YELLOW}[3/3] Creating loan products...${NC}"

# Smart Loan Product
echo "  Creating: Smart Loan"
SMART_LOAN=$(curl -s -X POST "$BASE_URL/loans/products/create" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b "$COOKIES_FILE" \
  -d '{
    "name": "Smart Loan",
    "code": "SMART_LOAN",
    "description": "Standard smart loan product",
    "minAmount": 10000,
    "maxAmount": 1000000,
    "defaultTermWeeks": 52,
    "defaultInterestRate": 10,
    "isActive": true
  }')

if echo "$SMART_LOAN" | grep -q '"id"'; then
  echo -e "    ${GREEN}✓ Created${NC}"
else
  echo -e "    ${YELLOW}⚠ May already exist or failed${NC}"
fi

# Historical Smart Loan (for migration data)
echo "  Creating: Historical Smart Loan"
HIST_LOAN=$(curl -s -X POST "$BASE_URL/loans/products/create" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b "$COOKIES_FILE" \
  -d '{
    "name": "Historical Smart Loan",
    "code": "HISTORICAL_SMART_LOAN",
    "description": "For migrating historical loan data",
    "minAmount": 10000,
    "maxAmount": 5000000,
    "defaultTermWeeks": 104,
    "defaultInterestRate": 20,
    "isActive": true
  }')

if echo "$HIST_LOAN" | grep -q '"id"'; then
  echo -e "    ${GREEN}✓ Created${NC}"
else
  echo -e "    ${YELLOW}⚠ May already exist or failed${NC}"
fi

# Standard Loan
echo "  Creating: Standard Loan"
STD_LOAN=$(curl -s -X POST "$BASE_URL/loans/products/create" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b "$COOKIES_FILE" \
  -d '{
    "name": "Standard Loan",
    "code": "STANDARD_LOAN",
    "description": "Standard loan with fixed terms",
    "minAmount": 50000,
    "maxAmount": 500000,
    "defaultTermWeeks": 26,
    "defaultInterestRate": 5,
    "isActive": true
  }')

if echo "$STD_LOAN" | grep -q '"id"'; then
  echo -e "    ${GREEN}✓ Created${NC}"
else
  echo -e "    ${YELLOW}⚠ May already exist or failed${NC}"
fi

echo ""
echo -e "${GREEN}✓ Loan products seeding complete${NC}"
echo ""

###############################################################################
# VERIFY PRODUCTS WERE CREATED
###############################################################################

echo -e "${YELLOW}Verifying products...${NC}"

PRODUCTS=$(curl -s "$BASE_URL/loans/products" -b "$COOKIES_FILE")

if echo "$PRODUCTS" | grep -q '"name"'; then
  echo -e "${GREEN}✓ Products found in database${NC}"

  # Extract product codes
  echo "$PRODUCTS" | grep -o '"code":"[^"]*"' | cut -d'"' -f4 | nl | while read num code; do
    echo "  $num. $code"
  done
else
  echo -e "${RED}✗ No products found${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Loan products setup complete!${NC}"
echo -e "${BLUE}========================================${NC}"


